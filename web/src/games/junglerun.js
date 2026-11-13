// JUNGLE RUN — a screen-by-screen jungle dash in the style of 1982's Pitfall!: jump pits and rolling
// logs, swing across wide swamps on vines, and grab treasure before the clock runs out. Every screen is
// generated from its number, the same trick that let the original fit hundreds of screens in a tiny cartridge.
import { Game, aiInput, clamp } from './base.js';

const W = 256, H = 180, GROUND = 132, G = 520;

function hash(n) { let x = (n * 2654435761) >>> 0; x ^= x >>> 15; x = Math.imul(x, 2246822519) >>> 0; x ^= x >>> 13; return x; }

export class JungleRun extends Game {
  constructor(sfx) { super({ id: 'junglerun', w: W, h: H, sfx }); this.title = 'JUNGLE RUN'; }
  reset() { this.lives = 3; this.time = 150; this.got = new Set(); this.go(0); this.spawn(); }
  spawn() { this.x = 16; this.y = GROUND; this.vx = 0; this.vy = 0; this.onVine = false; this.dead = 0; this.stumble = 0; this.face = 1; }
  // describe a screen from its number
  go(n) {
    this.screen = n;
    const h = hash(n + 7);
    const kind = n === 0 ? 0 : h % 5; // 0 plain, 1 pit, 2 logs, 3 swamp + vine, 4 pit + logs
    this.pit = kind === 1 || kind === 4 ? { x0: 100 + (h >>> 4) % 40, w: 34 } : kind === 3 ? { x0: 78, w: 100, swamp: true } : null;
    this.vine = kind === 3 ? { ax: 128, ay: 34, len: 74 } : null;
    this.logs = kind === 2 || kind === 4 ? Array.from({ length: 1 + ((h >>> 8) % 3) }, (_, i) => ({ x: 170 + i * 26 })) : [];
    this.treasure = (h >>> 12) % 3 === 0 && n !== 0 && !this.got.has(n) ? { x: kind === 3 ? 214 : 200 + (h >>> 16) % 30, kind: (h >>> 20) % 4 } : null;
    this.trees = Array.from({ length: 5 }, (_, i) => 20 + i * 52 + ((h >>> (i * 3)) % 18));
  }
  vineEnd() { const a = Math.sin(this.t * 1.9) * 0.75; return [this.vine.ax + Math.sin(a) * this.vine.len, this.vine.ay + Math.cos(a) * this.vine.len, a]; }
  overPit(x) { return this.pit && x > this.pit.x0 + 3 && x < this.pit.x0 + this.pit.w - 3; }
  ai() {
    if (this.dead) return aiInput();
    if (this.onVine) { const [, , a] = this.vineEnd(); return aiInput({ right: true }, { a: a > 0.55 }); }
    const ahead = (d) => this.overPit(this.x + d) || this.logs.some(l => l.x - this.x > 0 && l.x - this.x < d);
    if (this.pit?.swamp && this.y >= GROUND && this.x > this.pit.x0 - 30 && this.x < this.pit.x0) {
      const [ex, , a] = this.vineEnd();
      return aiInput({ right: false }, { a: a < -0.35 && ex < this.x + 40 });
    }
    return aiInput({ right: true }, { a: this.y >= GROUND && ahead(22) });
  }
  update(dt, inp) {
    this.time -= dt; if (this.time <= 0) { this.time = 0; this.gameOver(); return; }
    for (const l of this.logs) { l.x -= 34 * dt; if (l.x < -10) l.x += W + 20; }
    if (this.dead > 0) { this.dead -= dt; if (this.dead <= 0) { if (this.lives <= 0) { this.gameOver(); return; } this.spawn(); } return; }
    if (this.onVine) {
      const [ex, ey, a] = this.vineEnd(); this.x = ex; this.y = ey + 10;
      if (inp.tap.a || inp.tap.down) { this.onVine = false; this.vx = Math.cos(a) * 95 * Math.sign(Math.cos(this.t * 1.9)); this.vy = -60; this.sound('paddle'); }
      return;
    }
    const grounded = this.y >= GROUND && !this.overPit(this.x);
    const run = (inp.right ? 1 : 0) - (inp.left ? 1 : 0);
    if (run) this.face = run;
    if (grounded) {
      this.vx = run * (this.stumble > 0 ? 30 : 72);
      if (inp.tap.a || inp.tap.up) { this.vy = -175; this.sound('wall'); }
    }
    this.stumble -= dt;
    this.vy += G * dt; this.x += this.vx * dt; this.y += this.vy * dt;
    if (this.y >= GROUND && !this.overPit(this.x)) { this.y = GROUND; this.vy = 0; }
    // grab the vine while airborne
    if (this.vine && this.vy !== 0) { const [ex, ey] = this.vineEnd(); if (Math.hypot(ex - this.x, ey + 10 - this.y) < 12) { this.onVine = true; this.sound('gem'); } }
    if (this.y > GROUND + 18) { this.lives--; this.dead = 1.4; this.sound('die'); return; }
    for (const l of this.logs) if (this.y > GROUND - 8 && Math.abs(l.x - this.x) < 9 && this.stumble <= 0) { this.addScore(-50); this.stumble = 0.8; this.sound('point'); }
    if (this.treasure && Math.abs(this.treasure.x - this.x) < 10 && this.y > GROUND - 20) { this.addScore(([2000, 3000, 4000, 5000][this.treasure.kind] || 2000)); this.got.add(this.screen); this.treasure = null; this.sound('start'); }
    if (this.x > W - 4) { this.go(this.screen + 1); this.x = 6; }
    if (this.x < 4) { this.go(this.screen - 1); this.x = W - 8; }
    this.x = clamp(this.x, 2, W - 2);
  }
  draw(c) {
    c.fillStyle = '#0d2b12'; c.fillRect(0, 0, W, H);
    c.fillStyle = '#1f5e2a'; c.fillRect(0, 0, W, 42);
    for (let i = 0; i < 16; i++) { c.fillStyle = i % 2 ? '#2b7a35' : '#246b2e'; c.beginPath(); c.arc(i * 18, 40, 14, 0, Math.PI); c.fill(); }
    for (const x of this.trees) { c.fillStyle = '#5a3a1a'; c.fillRect(x - 3, 42, 6, GROUND - 42); }
    c.fillStyle = '#8a6a2a'; c.fillRect(0, GROUND, W, 8);
    c.fillStyle = '#4a3410'; c.fillRect(0, GROUND + 8, W, H - GROUND - 8);
    if (this.pit) { c.fillStyle = this.pit.swamp ? '#1e5aa0' : '#000'; c.fillRect(this.pit.x0, GROUND, this.pit.w, this.pit.swamp ? 12 : 30);
      if (this.pit.swamp) { c.fillStyle = '#4c8fd6'; for (let x = 0; x < this.pit.w; x += 10) c.fillRect(this.pit.x0 + x + (Math.floor(this.t * 4) % 3), GROUND + 3, 5, 1); } }
    if (this.vine) { const [ex, ey] = this.vineEnd(); c.strokeStyle = '#a0c060'; c.lineWidth = 2; c.beginPath(); c.moveTo(this.vine.ax, this.vine.ay); c.lineTo(ex, ey); c.stroke(); }
    for (const l of this.logs) { c.fillStyle = '#7a4a1a'; c.beginPath(); c.arc(l.x, GROUND - 5, 6, 0, Math.PI * 2); c.fill(); c.fillStyle = '#a8743d'; c.fillRect(l.x - 1 + Math.sin(this.t * 6) * 3, GROUND - 6, 2, 2); }
    if (this.treasure) { const tx = this.treasure.x, col = ['#c0a060', '#d8d8d8', '#ffd23f', '#9fe8ff'][this.treasure.kind]; c.fillStyle = col; c.fillRect(tx - 5, GROUND - 10, 10, 8); c.fillStyle = '#fff'; if (Math.floor(this.t * 4) % 2) c.fillRect(tx + 2, GROUND - 9, 2, 2); }
    // the explorer: hat, body and legs, simple and original
    if (!this.dead || Math.floor(this.t * 10) % 2) {
      const x = Math.round(this.x), y = Math.round(this.y), step = this.y >= GROUND && this.vx ? Math.floor(this.t * 10) % 2 : 0;
      c.fillStyle = '#e8c070'; c.fillRect(x - 3, y - 22, 6, 5);
      c.fillStyle = '#c0a050'; c.fillRect(x - 5, y - 24, 10, 2);
      c.fillStyle = '#2f8f3f'; c.fillRect(x - 3, y - 17, 6, 8);
      c.fillStyle = '#e8c070'; c.fillRect(x + this.face * 3, y - 16, 3, 2);
      c.fillStyle = '#5a3a1a'; c.fillRect(x - 3 + step * 2, y - 9, 2, 9); c.fillRect(x + 1 - step * 2, y - 9, 2, 9);
    }
    this.text(`${this.score}`, 6, 4, { size: 9, align: 'left' });
    this.text(`${Math.floor(this.time / 60)}:${String(Math.floor(this.time % 60)).padStart(2, '0')}`, W / 2, 4, { size: 9 });
    this.text(`LIVES ${this.lives}`, W - 6, 4, { size: 9, align: 'right' });
  }
}
