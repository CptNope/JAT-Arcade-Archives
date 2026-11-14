// BLOCK HOPPER — a side-scrolling platformer in the spirit of 1985's console platform games: run right,
// jump gaps and columns, bump gem blocks for coins, stomp the beetles, and reach the flag before time runs
// out. Each course is generated from its number, and they get longer and busier as you go.
import { Game, aiInput, clamp } from './base.js';

const T = 12, ROWS = 16, W = 256, H = 192, GRAV = 760, JUMP = -285, RUN = 92;
const AIR = 0, GROUND = 1, BRICK = 2, QBLOCK = 3, USED = 4, PILLAR = 5, STAIR = 6, COIN = 7;
const SOLIDS = new Set([GROUND, BRICK, QBLOCK, USED, PILLAR, STAIR]);

function rng(seed) { let s = seed >>> 0 || 1; return () => { s ^= s << 13; s ^= s >>> 17; s ^= s << 5; return ((s >>> 0) % 10000) / 10000; }; }

export class BlockHopper extends Game {
  constructor(sfx) { super({ id: 'blockhopper', w: W, h: H, sfx }); this.title = 'BLOCK HOPPER'; }
  reset() { this.lives = 3; this.course = 0; this.coins = 0; this.nextCourse(); }
  nextCourse() {
    this.course++;
    const r = rng(this.course * 7919), len = 120 + this.course * 30;
    const m = this.map = Array.from({ length: ROWS }, () => Array(len).fill(AIR));
    for (let x = 0; x < len; x++) { m[14][x] = GROUND; m[15][x] = GROUND; }
    this.enemies = [];
    let x = 16;
    while (x < len - 22) {
      const k = r();
      if (k < 0.22) { const w = 2 + (r() < 0.3 + this.course * 0.05 ? 1 : 0); for (let i = 0; i < w; i++) { m[14][x + i] = AIR; m[15][x + i] = AIR; } x += w + 4; }
      else if (k < 0.42) { const h = 2 + ((r() * 2) | 0); for (let y = 14 - h; y < 14; y++) { m[y][x] = PILLAR; m[y][x + 1] = PILLAR; } x += 6; }
      else if (k < 0.7) {
        const w = 3 + ((r() * 4) | 0), row = r() < 0.5 ? 10 : 9;
        for (let i = 0; i < w; i++) m[row][x + i] = r() < 0.3 ? QBLOCK : BRICK;
        if (r() < 0.5) for (let i = 0; i < w; i++) m[row - 3][x + i] = COIN;
        x += w + 3;
      } else if (k < 0.9) { this.enemies.push({ x: x * T, y: 14 * T - 10, vx: -22, vy: 0, alive: true, squash: 0 }); x += 5; }
      else { for (let i = 0; i < 4; i++) m[11][x + i] = COIN; x += 6; }
    }
    // staircase and flag
    const sx = len - 18;
    for (let s = 0; s < 5; s++) for (let y = 13 - s; y < 14; y++) m[y][sx + s] = STAIR;
    for (let y = 9; y < 14; y++) m[y][sx + 4] = STAIR;
    this.flagX = (len - 8) * T;
    this.len = len;
    this.time = 240;
    this.spawn();
  }
  spawn() { this.x = 3 * T; this.y = 13 * T; this.vx = 0; this.vy = 0; this.cam = 0; this.dead = 0; this.onGround = false; this.face = 1; this.won = 0; }
  tile(cx, cy) { if (cx < 0 || cx >= this.len) return GROUND; if (cy < 0 || cy >= ROWS) return AIR; return this.map[cy][cx]; }
  solid(px, py) { return SOLIDS.has(this.tile(Math.floor(px / T), Math.floor(py / T))); }
  ai() {
    if (this.dead || this.won) return aiInput();
    const cx = Math.floor((this.x + 6) / T);
    let jump = false;
    for (let d = 1; d <= 2; d++) {
      if (this.tile(cx + d, 14) === AIR) jump = true;                                   // a gap ahead
      if (SOLIDS.has(this.tile(cx + d, 13)) || SOLIDS.has(this.tile(cx + d, 12))) jump = true; // a pillar or stair ahead
    }
    if (this.enemies.some(e => e.alive && !e.squash && e.x - this.x > 0 && e.x - this.x < 34)) jump = true;
    return aiInput({ right: true, a: jump || (!this.onGround && this.vy < 0) }, { a: jump && this.onGround });
  }
  update(dt, inp) {
    if (this.won) {
      this.won -= dt;
      if (this.time > 0) { const n = Math.min(this.time, dt * 120); this.time -= n; this.addScore(Math.round(n) * 10); }
      if (this.won <= 0) this.nextCourse();
      return;
    }
    if (this.dead) {
      this.dead -= dt; this.vy += GRAV * dt; this.y += this.vy * dt;
      if (this.dead <= 0) { this.lives--; if (this.lives < 0) { this.lives = 0; this.gameOver(); return; } this.spawn(); this.time = 240; }
      return;
    }
    this.time -= dt * 2; if (this.time <= 0) { this.time = 0; this.die(); return; }
    const want = (inp.right ? 1 : 0) - (inp.left ? 1 : 0);
    if (want) this.face = want;
    this.vx += (want * RUN - this.vx) * Math.min(1, dt * (this.onGround ? 10 : 4));
    if ((inp.tap.a || inp.tap.up) && this.onGround) { this.vy = JUMP; this.onGround = false; this.sound('paddle'); }
    if (!(inp.a || inp.up) && this.vy < -120) this.vy = -120; // short hop when the button is let go
    this.vy = Math.min(this.vy + GRAV * dt, 420);
    // move and collide: x then y (box 10x12 from x..x+10, y-12..y)
    this.x += this.vx * dt;
    if (this.x < this.cam) { this.x = this.cam; this.vx = 0; }
    for (const yy of [this.y - 11, this.y - 1]) {
      if (this.solid(this.x + 10, yy)) { this.x = Math.floor((this.x + 10) / T) * T - 10.01; this.vx = 0; }
      if (this.solid(this.x, yy)) { this.x = Math.floor(this.x / T + 1) * T + 0.01; this.vx = 0; }
    }
    this.y += this.vy * dt; this.onGround = false;
    if (this.vy >= 0 && (this.solid(this.x + 1, this.y) || this.solid(this.x + 9, this.y))) { this.y = Math.floor(this.y / T) * T; this.vy = 0; this.onGround = true; }
    if (this.vy < 0) for (const xx of [this.x + 2, this.x + 8]) {
      if (this.solid(xx, this.y - 12)) {
        const cx = Math.floor(xx / T), cy = Math.floor((this.y - 12) / T);
        if (this.tile(cx, cy) === QBLOCK) { this.map[cy][cx] = USED; this.coins++; this.addScore(200); this.sound('gem'); }
        else this.sound('wall');
        this.y = (cy + 1) * T + 12; this.vy = 30; break;
      }
    }
    // coins
    for (const [xx, yy] of [[this.x + 5, this.y - 6]]) {
      const cx = Math.floor(xx / T), cy = Math.floor(yy / T);
      if (this.tile(cx, cy) === COIN) { this.map[cy][cx] = AIR; this.coins++; this.addScore(100); this.sound('gem'); }
    }
    if (this.y > H + 20) { this.die(); return; }
    // enemies
    for (const e of this.enemies) {
      if (!e.alive) continue;
      if (e.squash) { e.squash -= dt; if (e.squash <= 0) e.alive = false; continue; }
      if (e.x > this.cam + W + 40) continue; // asleep until on screen
      e.vy = Math.min(e.vy + GRAV * dt, 400); e.x += e.vx * dt;
      if (this.solid(e.vx < 0 ? e.x : e.x + 10, e.y - 4)) { e.vx = -e.vx; e.x += e.vx * dt * 2; }
      e.y += e.vy * dt;
      if (this.solid(e.x + 5, e.y)) { e.y = Math.floor(e.y / T) * T; e.vy = 0; }
      if (e.y > H + 20) { e.alive = false; continue; }
      if (Math.abs(e.x - this.x) < 10 && Math.abs(e.y - this.y) < 11) {
        if (this.vy > 40 && this.y < e.y - 3) { e.squash = 0.4; this.vy = -180; this.addScore(100); this.sound('hit'); }
        else { this.die(); return; }
      }
    }
    // camera only moves forward, like the classics
    this.cam = clamp(Math.max(this.cam, this.x - W * 0.4), 0, this.len * T - W);
    if (this.x >= this.flagX) { this.won = 2.2; this.addScore(1000 + Math.max(0, Math.round((13 * T - this.y) * 20))); this.sound('start'); }
  }
  die() { this.dead = 1.6; this.vy = -240; this.sound('die'); }
  draw(c) {
    const sky = c.createLinearGradient(0, 0, 0, H); sky.addColorStop(0, '#3a2a78'); sky.addColorStop(0.6, '#d8607a'); sky.addColorStop(1, '#f8b060');
    c.fillStyle = sky; c.fillRect(0, 0, W, H);
    c.fillStyle = '#fff2c0'; c.beginPath(); c.arc(200, 60, 16, 0, Math.PI * 2); c.fill();
    const cam = Math.floor(this.cam), x0 = Math.floor(cam / T), off = cam % T;
    // hills and clouds (slow parallax)
    for (let i = -1; i < 5; i++) {
      const hx = i * 90 - ((cam * 0.4) % 90);
      c.fillStyle = '#6a3a6a'; c.fillRect(hx + 10, 14 * T - 30 - (i % 2) * 14, 60, 30 + (i % 2) * 14); c.fillRect(hx + 20, 14 * T - 38 - (i % 2) * 14, 40, 8);
    }
    for (let cy = 0; cy < ROWS; cy++) for (let i = 0; i <= W / T + 1; i++) {
      const t = this.tile(x0 + i, cy); if (t === AIR) continue;
      const px = i * T - off, py = cy * T;
      if (t === GROUND) { c.fillStyle = '#5a4a3a'; c.fillRect(px, py, T, T); c.fillStyle = '#3a2e24'; c.fillRect(px + 3, py + 6, 3, 2); c.fillRect(px + 8, py + 2, 2, 2); if (cy === 14) { c.fillStyle = '#d8a848'; c.fillRect(px, py, T, 3); } }
      else if (t === BRICK) { c.fillStyle = '#7a8aa8'; c.fillRect(px, py, T, T); c.fillStyle = '#4a5878'; c.fillRect(px, py + T - 2, T, 2); c.fillRect(px + T - 2, py, 2, T); c.fillStyle = '#a8b8d8'; c.fillRect(px + 1, py + 1, T - 3, 1); }
      else if (t === QBLOCK) { c.fillStyle = '#2ac0a0'; c.fillRect(px, py, T, T); c.fillStyle = '#145a4a'; c.fillRect(px, py + T - 2, T, 2); c.fillStyle = Math.floor(this.t * 3) % 3 ? '#e8fff8' : '#9af0d8'; c.beginPath(); c.moveTo(px + 6, py + 2); c.lineTo(px + 10, py + 6); c.lineTo(px + 6, py + 10); c.lineTo(px + 2, py + 6); c.fill(); }
      else if (t === USED) { c.fillStyle = '#4a5878'; c.fillRect(px, py, T, T); c.fillStyle = '#3a4660'; c.fillRect(px + 1, py + 1, T - 2, T - 2); }
      else if (t === PILLAR) { c.fillStyle = '#c8b898'; c.fillRect(px + 1, py, T - 2, T); c.fillStyle = '#9a8a6a'; c.fillRect(px + 3, py, 1, T); c.fillRect(px + 7, py, 1, T); }
      else if (t === STAIR) { c.fillStyle = '#9a6a3a'; c.fillRect(px, py, T, T); c.fillStyle = '#5a3a1a'; c.fillRect(px, py, T, 1); c.fillRect(px, py, 1, T); }
      else if (t === COIN) { const w = [6, 4, 2, 4][Math.floor(this.t * 6) % 4]; c.fillStyle = '#fcd83c'; c.fillRect(px + 6 - w / 2, py + 2, w, 9); }
    }
    // flag
    const fx = this.flagX - cam;
    if (fx > -10 && fx < W + 10) { c.fillStyle = '#e0e0e0'; c.fillRect(fx, 3 * T, 2, 11 * T); c.fillStyle = '#2ac0a0'; c.beginPath(); c.moveTo(fx, 3 * T + 2); c.lineTo(fx - 14, 3 * T + 7); c.lineTo(fx, 3 * T + 12); c.fill(); c.fillStyle = '#fcd83c'; c.fillRect(fx - 1, 3 * T - 4, 4, 4); }
    // beetles
    for (const e of this.enemies) {
      if (!e.alive) continue; const ex = Math.round(e.x - cam), ey = Math.round(e.y);
      if (ex < -12 || ex > W + 12) continue;
      if (e.squash) { c.fillStyle = '#6a2a8a'; c.fillRect(ex, ey - 3, 10, 3); continue; }
      c.fillStyle = '#7a3aa8'; c.fillRect(ex, ey - 9, 10, 7); c.fillStyle = '#c08ae8'; c.fillRect(ex + 2, ey - 8, 2, 2);
      c.fillStyle = '#222'; const s = Math.floor(this.t * 8) % 2; c.fillRect(ex + (s ? 0 : 2), ey - 2, 3, 2); c.fillRect(ex + (s ? 7 : 5), ey - 2, 3, 2);
    }
    // the hopper: a round orange creature with big ears and sneakers (an original design)
    if (!this.dead || Math.floor(this.t * 12) % 2) {
      const px = Math.round(this.x - cam), py = Math.round(this.y), f = this.face;
      c.fillStyle = '#ff8c1a'; c.fillRect(px + 1, py - 11, 8, 8); c.fillRect(px, py - 9, 10, 4);
      c.fillRect(px + 1, py - 14, 2, 4); c.fillRect(px + 7, py - 14, 2, 4); // ears
      c.fillStyle = '#fff'; c.fillRect(px + (f > 0 ? 5 : 2), py - 9, 3, 3); c.fillStyle = '#111'; c.fillRect(px + (f > 0 ? 7 : 2), py - 8, 1, 2);
      const step = this.onGround && Math.abs(this.vx) > 10 ? Math.floor(this.t * 12) % 2 : 0;
      c.fillStyle = '#e02828'; c.fillRect(px + 1 + step, py - 3, 3, 3); c.fillRect(px + 6 - step, py - 3, 3, 3);
    }
    c.fillStyle = 'rgba(0,0,0,0.25)'; c.fillRect(0, 0, W, 13);
    this.text(`${String(this.score).padStart(6, '0')}`, 6, 3, { size: 8, align: 'left' });
    this.text(`¢${this.coins}  COURSE ${this.course}`, W / 2, 3, { size: 8 });
    this.text(`TIME ${Math.ceil(this.time)}  ♥${this.lives}`, W - 6, 3, { size: 8, align: 'right' });
  }
}
