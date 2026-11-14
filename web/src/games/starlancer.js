// STAR LANCER — a horizontal scrolling shooter in the spirit of 1985's power-meter shooters: your ship
// fires on its own; shoot down the red craft to earn capsules, each one moves the light along the power
// meter, and pressing A buys whatever is lit: speed, missiles, a double shot, a laser, an option drone
// that copies your fire, or a shield.
import { Game, aiInput, clamp } from './base.js';

const W = 256, H = 192, TOP = 14;
const METER = ['SPEED', 'MISSILE', 'DOUBLE', 'LASER', 'OPTION', 'SHIELD'];
const SHORT = ['SPD', 'MSL', 'DBL', 'LSR', 'OPT', 'SHD'];

export class StarLancer extends Game {
  constructor(sfx) { super({ id: 'starlancer', w: W, h: H, sfx }); this.title = 'STAR LANCER'; }
  reset() {
    this.lives = 3; this.scroll = 0; this.stars = Array.from({ length: 50 }, () => ({ x: Math.random() * W, y: TOP + Math.random() * (H - TOP), s: 0.3 + Math.random() }));
    this.waveT = 1; this.wave = 0; this.spawn();
  }
  spawn() { // power-ups are lost with the ship, as in the classics
    this.x = 40; this.y = H / 2; this.trail = []; this.shots = []; this.foes = []; this.bullets = []; this.caps = []; this.boom = [];
    this.cursor = -1; this.dead = 0; this.inv = 2; this.cool = 0;
    this.pw = { speed: 0, missile: false, double: false, laser: false, options: 0, shield: 0 };
  }
  // the cave walls: smooth noise from the scroll position
  wall(x, top) { const s = this.scroll + x; return top ? TOP + 8 + Math.max(0, Math.sin(s * 0.013) * 14 + Math.sin(s * 0.031 + 1) * 8) : H - 8 - Math.max(0, Math.sin(s * 0.011 + 2) * 16 + Math.sin(s * 0.027) * 8); }
  ai() {
    if (this.dead) return aiInput();
    // stay between the walls, keep away from foes and bullets, buy speed once then double/options/shield
    const mid = (this.wall(this.x, true) + this.wall(this.x, false)) / 2;
    let ty = mid;
    const near = [...this.foes, ...this.bullets].filter(o => o.x > this.x - 10 && o.x - this.x < 70);
    if (near.length) { const o = near.sort((a, b) => a.x - b.x)[0]; ty = o.y > this.y ? Math.max(this.wall(this.x, true) + 14, o.y - 34) : Math.min(this.wall(this.x, false) - 14, o.y + 34); }
    const target = this.foes.find(f => f.x > this.x);
    if (!near.length && target) ty = target.y;
    const tx = 50 + Math.sin(this.t * 0.7) * 20;
    const want = this.pw.speed < 1 ? 0 : !this.pw.double ? 2 : this.pw.options < 2 ? 4 : 5;
    return aiInput({ up: this.y > ty + 4, down: this.y < ty - 4, left: this.x > tx + 6, right: this.x < tx - 6 }, { a: this.cursor === want });
  }
  update(dt, inp) {
    this.scroll += 40 * dt;
    for (const s of this.stars) { s.x -= s.s * 40 * dt; if (s.x < 0) { s.x += W; s.y = TOP + Math.random() * (H - TOP); } }
    // waves
    this.waveT -= dt;
    if (this.waveT <= 0) {
      this.wave++; this.waveT = Math.max(1.4, 3 - this.wave * 0.05);
      const k = this.wave % 4, y0 = 40 + Math.random() * (H - 80);
      if (k === 0) { this.foes.push({ kind: 'turret', x: W + 10, y: this.wall(W, false) - 6, hp: 3, t: 1, red: false }); this.foes.push({ kind: 'turret', x: W + 60, y: this.wall(W + 50, true) + 6, hp: 3, t: 1.5, red: false, top: true }); }
      else for (let i = 0; i < 5; i++) this.foes.push({ kind: 'flyer', x: W + 10 + i * 18, y: y0, base: y0, ph: i * 0.6, hp: 1, red: i === 4 || (k === 2 && i === 2), t: 0 });
    }
    // foes
    for (const f of this.foes) {
      if (f.kind === 'flyer') { f.x -= 70 * dt; f.ph += dt * 3; f.y = f.base + Math.sin(f.ph) * 24; }
      else { f.x -= 40 * dt; f.y = f.top ? this.wall(f.x, true) + 6 : this.wall(f.x, false) - 6; f.t -= dt; if (f.t <= 0 && f.x < W && !this.dead) { f.t = 1.6; const a = Math.atan2(this.y - f.y, this.x - f.x); this.bullets.push({ x: f.x, y: f.y, vx: Math.cos(a) * 70, vy: Math.sin(a) * 70 }); } }
    }
    this.foes = this.foes.filter(f => f.x > -20 && f.hp > 0);
    for (const b of this.bullets) { b.x += b.vx * dt; b.y += b.vy * dt; }
    this.bullets = this.bullets.filter(b => b.x > -5 && b.x < W + 5 && b.y > TOP && b.y < H);
    for (const p of this.caps) p.x -= 40 * dt;
    this.caps = this.caps.filter(p => p.x > -10);
    for (const b of this.boom) b.t -= dt;
    this.boom = this.boom.filter(b => b.t > 0);
    if (this.dead) { this.dead -= dt; if (this.dead <= 0) { if (this.lives <= 0) { this.gameOver(); return; } this.spawn(); } return; }
    // ship
    const sp = 70 + this.pw.speed * 22;
    this.x = clamp(this.x + ((inp.right ? 1 : 0) - (inp.left ? 1 : 0)) * sp * dt, 8, W - 16);
    this.y = clamp(this.y + ((inp.down ? 1 : 0) - (inp.up ? 1 : 0)) * sp * dt, TOP + 6, H - 6);
    this.trail.unshift([this.x, this.y]); if (this.trail.length > 40) this.trail.pop();
    this.inv = Math.max(0, this.inv - dt);
    // power meter
    if (inp.tap.a && this.cursor >= 0) {
      const p = this.pw, name = METER[this.cursor];
      if (name === 'SPEED' && p.speed < 4) p.speed++;
      else if (name === 'MISSILE') p.missile = true;
      else if (name === 'DOUBLE') { p.double = true; p.laser = false; }
      else if (name === 'LASER') { p.laser = true; p.double = false; }
      else if (name === 'OPTION' && p.options < 2) p.options++;
      else if (name === 'SHIELD') p.shield = 4;
      this.cursor = -1; this.sound('power');
    }
    // automatic fire from the ship and each option
    this.cool -= dt;
    if (this.cool <= 0) {
      this.cool = this.pw.laser ? 0.35 : 0.2;
      const guns = [[this.x, this.y], ...[16, 32].slice(0, this.pw.options).map(k => this.trail[Math.min(k, this.trail.length - 1)])];
      for (const [gx, gy] of guns) {
        if (this.pw.laser) this.shots.push({ x: gx + 8, y: gy, vx: 260, vy: 0, len: 26, pierce: true });
        else this.shots.push({ x: gx + 8, y: gy, vx: 220, vy: 0, len: 4 });
        if (this.pw.double) this.shots.push({ x: gx + 6, y: gy, vx: 160, vy: -160, len: 3 });
        if (this.pw.missile && Math.random() < 0.5) this.shots.push({ x: gx, y: gy + 4, vx: 90, vy: 90, len: 3, missile: true });
      }
      this.sound('shoot');
    }
    for (const s of this.shots) { s.x += s.vx * dt; s.y += s.vy * dt; if (s.missile && s.y > this.wall(s.x, false) - 2) { s.y = this.wall(s.x, false) - 2; s.vy = 0; s.vx = 120; } }
    this.shots = this.shots.filter(s => s.x < W + 30 && s.y > TOP && s.y < H && !s.gone);
    for (const s of this.shots) for (const f of this.foes) {
      if (f.hp > 0 && s.x + s.len > f.x - 6 && s.x < f.x + 6 && Math.abs(s.y - f.y) < 7) {
        f.hp--; if (!s.pierce) s.gone = true;
        if (f.hp <= 0) { this.addScore(f.kind === 'turret' ? 300 : 100); this.boom.push({ x: f.x, y: f.y, t: 0.4 }); this.sound('hit'); if (f.red) this.caps.push({ x: f.x, y: f.y }); }
      }
    }
    this.shots = this.shots.filter(s => !s.gone);
    for (const p of this.caps) if (Math.abs(p.x - this.x) < 10 && Math.abs(p.y - this.y) < 10) { p.x = -99; this.cursor = (this.cursor + 1) % METER.length; this.addScore(50); this.sound('gem'); }
    // getting hit: walls, foes, bullets
    if (this.inv > 0) return;
    const hitWall = this.y - 4 < this.wall(this.x, true) || this.y + 4 > this.wall(this.x, false);
    const hitFoe = this.foes.some(f => Math.abs(f.x - this.x) < 9 && Math.abs(f.y - this.y) < 7);
    const hitBullet = this.bullets.findIndex(b => Math.abs(b.x - this.x) < 6 && Math.abs(b.y - this.y) < 5);
    if (hitBullet >= 0 || hitFoe || hitWall) {
      if (hitBullet >= 0) this.bullets.splice(hitBullet, 1);
      if (this.pw.shield > 0 && !hitWall) { this.pw.shield--; this.inv = 0.5; this.sound('wall'); return; }
      this.lives--; this.dead = 1.5; this.boom.push({ x: this.x, y: this.y, t: 0.8, big: true }); this.sound('die');
    }
  }
  draw(c) {
    c.fillStyle = '#000'; c.fillRect(0, 0, W, H);
    for (const s of this.stars) { c.fillStyle = s.s > 0.9 ? '#fff' : '#6a6a8a'; c.fillRect(s.x, s.y, 1, 1); }
    // cave walls
    c.fillStyle = '#2a7a3a';
    for (let x = 0; x < W; x += 2) { const t = this.wall(x, true), b = this.wall(x, false); c.fillRect(x, TOP, 2, t - TOP); c.fillRect(x, b, 2, H - b); }
    c.fillStyle = '#5ad86a';
    for (let x = 0; x < W; x += 2) { c.fillRect(x, this.wall(x, true) - 1, 2, 1); c.fillRect(x, this.wall(x, false), 2, 1); }
    for (const f of this.foes) {
      if (f.kind === 'flyer') { c.fillStyle = f.red ? '#ff3030' : '#4090ff'; c.beginPath(); c.arc(f.x, f.y, 5, 0, Math.PI * 2); c.fill(); c.fillStyle = '#fff'; c.fillRect(f.x - 2 + Math.round(Math.sin(f.ph) * 2), f.y - 1, 2, 2); }
      else { c.fillStyle = '#c0a060'; c.fillRect(f.x - 6, f.y - 4, 12, 8); c.fillStyle = '#806030'; c.fillRect(f.x - 2, f.top ? f.y + 2 : f.y - 8, 4, 6); }
    }
    c.fillStyle = '#ff9a3a'; for (const b of this.bullets) c.fillRect(b.x - 1, b.y - 1, 3, 3);
    for (const p of this.caps) { c.fillStyle = Math.floor(this.t * 8) % 2 ? '#ff6020' : '#ffb040'; c.fillRect(p.x - 4, p.y - 3, 8, 6); }
    for (const s of this.shots) { c.fillStyle = s.pierce ? '#7ad8ff' : s.missile ? '#ffe14d' : '#fff'; c.fillRect(s.x, s.y - (s.pierce ? 0 : 1), s.len, s.pierce ? 1 : 2); }
    for (const b of this.boom) { const r = (b.big ? 14 : 8) * (1 - b.t / (b.big ? 0.8 : 0.4)) + 2; c.strokeStyle = '#ffd040'; c.beginPath(); c.arc(b.x, b.y, r, 0, Math.PI * 2); c.stroke(); }
    if (!this.dead && !(this.inv > 0 && Math.floor(this.t * 16) % 2)) {
      // options
      for (const k of [16, 32].slice(0, this.pw.options)) { const [ox, oy] = this.trail[Math.min(k, this.trail.length - 1)]; c.fillStyle = Math.floor(this.t * 10) % 2 ? '#ff7020' : '#ffb060'; c.beginPath(); c.arc(ox, oy, 3.5, 0, Math.PI * 2); c.fill(); }
      // the lancer: a slim original fighter with swept wings
      const x = Math.round(this.x), y = Math.round(this.y);
      c.fillStyle = '#e0e0f0'; c.fillRect(x - 6, y - 1, 14, 3);
      c.beginPath(); c.moveTo(x - 4, y); c.lineTo(x - 8, y - 6); c.lineTo(x + 2, y); c.lineTo(x - 8, y + 6); c.fill();
      c.fillStyle = '#4ad0ff'; c.fillRect(x + 2, y - 1, 3, 2);
      c.fillStyle = Math.floor(this.t * 20) % 2 ? '#ff8030' : '#ffd040'; c.fillRect(x - 9, y, 3, 1);
      if (this.pw.shield > 0) { c.strokeStyle = '#7ad8ff'; c.beginPath(); c.arc(x + 1, y, 10, -1.2, 1.2); c.stroke(); }
    }
    // HUD + power meter
    c.fillStyle = '#000'; c.fillRect(0, 0, W, TOP);
    this.text(`${this.score}`, 4, 3, { size: 8, align: 'left' });
    this.text(`SHIPS ${this.lives}`, W - 4, 3, { size: 8, align: 'right' });
    METER.forEach((m, i) => {
      const x = 52 + i * 26, lit = i === this.cursor;
      c.fillStyle = lit ? '#ff6020' : '#202040'; c.fillRect(x, 2, 24, 10);
      this.text(SHORT[i], x + 12, 3, { size: 7, color: lit ? '#fff' : '#8080b0' });
    });
  }
}
