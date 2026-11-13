// HOP ACROSS — guide a chick across a busy road and a river of drifting logs, in the style of 1981's
// Frogger. Fill all five nests at the top. Original characters and layout.
import { Game, aiInput } from './base.js';

const T = 16, COLS = 13, ROWS = 13, TOP = 12, W = COLS * T, H = ROWS * T + TOP + 14;
// lanes from the top row (0) to the bottom (12): nests, 5 river lanes, a verge, 5 road lanes, the start
const LANES = [
  null,
  { kind: 'log', speed: 34, len: 4, gap: 3 }, { kind: 'turtle', speed: -40, len: 3, gap: 3 }, { kind: 'log', speed: 50, len: 5, gap: 4 },
  { kind: 'log', speed: 26, len: 3, gap: 3 }, { kind: 'turtle', speed: -32, len: 2, gap: 3 },
  null,
  { kind: 'truck', speed: -30, len: 2, gap: 4 }, { kind: 'car', speed: 52, len: 1, gap: 4 }, { kind: 'car', speed: -40, len: 1, gap: 3 },
  { kind: 'car', speed: 34, len: 1, gap: 4 }, { kind: 'car', speed: -46, len: 1, gap: 3 },
  null,
];
const NESTS = [1, 3.5, 6, 8.5, 11];

export class HopAcross extends Game {
  constructor(sfx) { super({ id: 'hopacross', w: W, h: H, sfx }); this.title = 'HOP ACROSS'; }
  reset() { this.lives = 3; this.level = 0; this.filled = new Set(); this.nextLevel(); }
  nextLevel() {
    this.level++; this.filled = new Set();
    this.lanes = LANES.map((l, row) => l && { ...l, speed: l.speed * (1 + (this.level - 1) * 0.15), offset: Math.random() * (l.len + l.gap) * T, row });
    this.spawn();
  }
  spawn() { this.x = 6 * T; this.row = 12; this.best = 12; this.dead = 0; this.time = 30; }
  // which cells of a lane are occupied at pixel x
  covered(l, x) {
    const period = (l.len + l.gap) * T;
    const p = (((x - l.offset) % period) + period) % period;
    return p < l.len * T;
  }
  ai() {
    if (this.dead || (this.aiT = (this.aiT || 0) + 1) % 7) return aiInput();
    const safe = (row, x) => {
      const l = this.lanes[row]; if (!l) return row !== 0 || NESTS.some(n => Math.abs(n * T - x) < 10);
      const over = this.covered(l, x + T / 2) && this.covered(l, x + 2) && this.covered(l, x + T - 2);
      return l.kind === 'log' || l.kind === 'turtle' ? over && this.covered(l, x + T / 2 + l.speed * 0.3) : !this.covered(l, x + T / 2) && !this.covered(l, x + T / 2 + T) && !this.covered(l, x + T / 2 - T);
    };
    if (safe(this.row - 1, this.x)) return aiInput({}, { up: true });
    if (!safe(this.row, this.x)) { for (const d of [-1, 1]) if (safe(this.row, this.x + d * T)) return aiInput({}, { left: d < 0, right: d > 0 }); }
    if (this.row === 1) { const n = NESTS.find(k => !this.filled.has(k)); if (n !== undefined) return aiInput({}, { left: n * T < this.x - 4, right: n * T > this.x + 4 }); }
    return aiInput();
  }
  update(dt, inp) {
    for (const l of this.lanes) if (l) l.offset += l.speed * dt;
    if (this.dead > 0) { this.dead -= dt; if (this.dead <= 0) { if (this.lives <= 0) { this.gameOver(); return; } this.spawn(); } return; }
    this.time -= dt; if (this.time <= 0) return this.die();
    if (inp.tap.up) { this.row--; this.sound('wall'); if (this.row < this.best) { this.best = this.row; this.addScore(10); } }
    if (inp.tap.down && this.row < 12) { this.row++; this.sound('wall'); }
    if (inp.tap.left) { this.x = Math.max(0, this.x - T); this.sound('wall'); }
    if (inp.tap.right) { this.x = Math.min((COLS - 1) * T, this.x + T); this.sound('wall'); }
    const l = this.lanes[this.row];
    if (this.row === 0) {
      const n = NESTS.find(k => Math.abs(k * T - this.x) < 9);
      if (n === undefined || this.filled.has(n)) return this.die();
      this.filled.add(n); this.addScore(50 + Math.round(this.time) * 10); this.sound('start');
      if (this.filled.size === NESTS.length) { this.addScore(1000); this.nextLevel(); } else this.spawn();
      return;
    }
    if (!l) return;
    if (l.kind === 'log' || l.kind === 'turtle') {
      if (!this.covered(l, this.x + T / 2)) return this.die();
      this.x += l.speed * dt;
      if (this.x < -4 || this.x > (COLS - 1) * T + 4) return this.die();
    } else if (this.covered(l, this.x + 3) || this.covered(l, this.x + T - 3)) return this.die();
  }
  die() { this.lives--; this.dead = 1.2; this.sound('die'); }
  draw(c) {
    c.fillStyle = '#0a0a24'; c.fillRect(0, 0, W, H);
    const Y = (row) => TOP + row * T;
    c.fillStyle = '#1b3d8f'; c.fillRect(0, Y(1), W, 5 * T);            // river
    c.fillStyle = '#2d6b2d'; c.fillRect(0, Y(0), W, T);                // bank with nests
    c.fillStyle = '#5b3a8a'; c.fillRect(0, Y(6), W, T); c.fillRect(0, Y(12), W, T); // verges
    c.fillStyle = '#16161d'; c.fillRect(0, Y(7), W, 5 * T);            // road
    c.fillStyle = '#ffffff22'; for (let r = 8; r < 12; r++) for (let x = 0; x < W; x += 16) c.fillRect(x, Y(r), 8, 1);
    for (const n of NESTS) { c.fillStyle = '#0a0a24'; c.fillRect(n * T - 1, Y(0) + 2, T + 2, T - 2); if (this.filled.has(n)) { c.fillStyle = '#ffe14d'; c.beginPath(); c.arc(n * T + T / 2, Y(0) + T / 2 + 1, 5, 0, Math.PI * 2); c.fill(); } }
    for (const l of this.lanes) {
      if (!l) continue;
      const period = (l.len + l.gap) * T;
      for (let k = -1; k <= Math.ceil(W / period) + 1; k++) {
        const x0 = ((l.offset % period) + period) % period + (k - 1) * period;
        const y = Y(l.row);
        if (l.kind === 'log') { c.fillStyle = '#8b5a2b'; c.fillRect(x0, y + 2, l.len * T, T - 4); c.fillStyle = '#a8743d'; c.fillRect(x0 + 2, y + 5, l.len * T - 4, 2); }
        else if (l.kind === 'turtle') { for (let i = 0; i < l.len; i++) { c.fillStyle = '#2fa36b'; c.beginPath(); c.arc(x0 + i * T + T / 2, y + T / 2, T / 2 - 2, 0, Math.PI * 2); c.fill(); c.fillStyle = '#1d6e47'; c.fillRect(x0 + i * T + 5, y + 6, 6, 4); } }
        else {
          const col = l.kind === 'truck' ? '#e0e0e0' : ['#ff4d6d', '#ffb703', '#4cc9f0', '#c77dff'][l.row % 4];
          c.fillStyle = col; c.fillRect(x0 + 1, y + 3, l.len * T - 2, T - 6);
          c.fillStyle = '#ffffffaa'; c.fillRect(x0 + (l.speed > 0 ? l.len * T - 5 : 2), y + 5, 3, T - 10);
        }
      }
    }
    // the chick
    if (!this.dead || Math.floor(this.t * 10) % 2) {
      const x = this.x + T / 2, y = Y(this.row) + T / 2;
      c.fillStyle = this.dead ? '#ff4d6d' : '#ffe14d'; c.beginPath(); c.arc(x, y + 1, 6, 0, Math.PI * 2); c.fill();
      c.fillStyle = '#ff8c42'; c.fillRect(x - 1, y - 8, 3, 3); c.fillStyle = '#000'; c.fillRect(x - 3, y - 2, 2, 2); c.fillRect(x + 2, y - 2, 2, 2);
    }
    this.text(`${this.score}`, 4, 1, { size: 8, align: 'left' });
    this.text(`LIVES ${this.lives}`, W - 4, 1, { size: 8, align: 'right' });
    c.fillStyle = this.time < 8 ? '#ff4d6d' : '#7cff6b'; c.fillRect(4, H - 9, (W - 8) * Math.max(0, this.time) / 30, 4);
  }
}
