// JEWEL DROP — a falling-jewel puzzle in the spirit of the late-1980s handheld puzzlers: columns of three
// jewels drop into the well; move them with LEFT and RIGHT, press A to cycle their order, DOWN to drop
// faster and UP to drop at once. Line up three or more of a kind in any direction to clear them, and
// chain clears for bonus points. Drawn in four shades of green, with a different shape for each jewel.
import { Game, aiInput } from './base.js';

const W = 160, H = 144, COLS = 6, ROWS = 13, C = 10, WX = 14, WY = 7, KINDS = 6;
const SHADES = ['#0f380f', '#306230', '#8bac0f', '#9bbc0f'];
const DIRS = [[1, 0], [0, 1], [1, 1], [1, -1]];

export class JewelDrop extends Game {
  constructor(sfx) { super({ id: 'jeweldrop', w: W, h: H, sfx, fg: SHADES[0], font: 'Courier New, monospace' }); this.title = 'JEWEL DROP'; }
  reset() {
    this.well = Array.from({ length: ROWS }, () => Array(COLS).fill(-1));
    this.level = 1; this.cleared = 0; this.next = this.newPiece(); this.fall = 0; this.flash = null; this.chain = 0; this.plan = null;
    this.spawnPiece();
  }
  newPiece() { const k = Math.min(KINDS, 4 + Math.floor(this.level / 3)); return [0, 0, 0].map(() => (Math.random() * k) | 0); }
  spawnPiece() {
    this.piece = this.next; this.next = this.newPiece(); this.px = 2; this.py = -2; this.fall = 0; this.plan = null;
    if (this.well[0][2] >= 0) this.gameOver();
  }
  cell(x, y) { return x < 0 || x >= COLS || y >= ROWS ? 9 : y < 0 ? -1 : this.well[y][x]; }
  fits(x, y) { for (let i = 0; i < 3; i++) if (this.cell(x, y + i) !== -1) return false; return true; }
  // all runs of three or more, as a set of "x,y" keys
  matches(g) {
    const hit = new Set();
    for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) {
      const k = g[y][x]; if (k < 0) continue;
      for (const [dx, dy] of DIRS) {
        let n = 1; while (x + dx * n >= 0 && x + dx * n < COLS && y + dy * n >= 0 && y + dy * n < ROWS && g[y + dy * n][x + dx * n] === k) n++;
        if (n >= 3) for (let i = 0; i < n; i++) hit.add(`${x + dx * i},${y + dy * i}`);
      }
    }
    return hit;
  }
  settle(g) { for (let x = 0; x < COLS; x++) { const col = []; for (let y = ROWS - 1; y >= 0; y--) if (g[y][x] >= 0) col.push(g[y][x]); for (let y = ROWS - 1, i = 0; y >= 0; y--, i++) g[y][x] = i < col.length ? col[i] : -1; } }
  // attract-mode player: try each column and order, score by clears and height
  ai() {
    if (this.flash || !this.piece) return aiInput();
    if (!this.plan) {
      let best = null;
      for (let rot = 0; rot < 3; rot++) for (let x = 0; x < COLS; x++) {
        const p = [0, 1, 2].map(i => this.piece[(i + 3 - rot) % 3]);
        let y = this.py; if (!this.fits(x, Math.max(y, -2))) continue;
        while (this.fits(x, y + 1)) y++;
        const g = this.well.map(r => r.slice());
        for (let i = 0; i < 3; i++) if (y + i >= 0) g[y + i][x] = p[i];
        let total = 0, m; while ((m = this.matches(g)).size) { total += m.size; for (const k of m) { const [mx, my] = k.split(',').map(Number); g[my][mx] = -1; } this.settle(g); }
        let height = 0; for (let yy = 0; yy < ROWS; yy++) if (g[yy].some(v => v >= 0)) { height = ROWS - yy; break; }
        const score = total * 10 - height * 2 - Math.abs(x - 2.5) * 0.1 + Math.random() * 0.5;
        if (!best || score > best.score) best = { x, rot, score };
      }
      this.plan = best || { x: this.px, rot: 0 };
      this.plan.rotLeft = this.plan.rot;
    }
    const p = this.plan;
    if (p.rotLeft > 0 && Math.floor(this.t * 8) % 2) { p.rotLeft--; return aiInput({}, { a: true }); }
    if (this.px < p.x) return aiInput({}, { right: Math.floor(this.t * 10) % 2 === 0 });
    if (this.px > p.x) return aiInput({}, { left: Math.floor(this.t * 10) % 2 === 0 });
    return aiInput({ down: p.rotLeft <= 0 });
  }
  update(dt, inp) {
    if (this.flash) {
      this.flash.t -= dt;
      if (this.flash.t <= 0) {
        for (const k of this.flash.cells) { const [x, y] = k.split(',').map(Number); this.well[y][x] = -1; }
        this.settle(this.well);
        const m = this.matches(this.well);
        if (m.size) { this.chain++; this.clearCells(m); } else { this.flash = null; this.chain = 0; this.spawnPiece(); }
      }
      return;
    }
    if (inp.tap.left && this.fits(this.px - 1, this.py)) { this.px--; this.sound('wall'); }
    if (inp.tap.right && this.fits(this.px + 1, this.py)) { this.px++; this.sound('wall'); }
    if (inp.tap.a) { this.piece.unshift(this.piece.pop()); this.sound('paddle'); }
    if (inp.tap.up) { while (this.fits(this.px, this.py + 1)) { this.py++; this.addScore(1); } this.fall = 99; }
    const speed = inp.down ? 0.04 : Math.max(0.12, 0.8 - this.level * 0.06);
    this.fall += dt;
    if (this.fall >= speed) {
      this.fall = 0;
      if (this.fits(this.px, this.py + 1)) { this.py++; if (inp.down) this.addScore(1); }
      else this.lock();
    }
  }
  lock() {
    if (this.py < 0) { this.gameOver(); return; }
    for (let i = 0; i < 3; i++) this.well[this.py + i][this.px] = this.piece[i];
    this.piece = null; this.sound('step2');
    const m = this.matches(this.well);
    if (m.size) { this.chain = 1; this.clearCells(m); } else this.spawnPiece();
  }
  clearCells(m) {
    this.flash = { cells: m, t: 0.35 };
    this.addScore(m.size * 10 * this.level * this.chain);
    this.cleared += m.size;
    this.level = 1 + Math.floor(this.cleared / 30);
    this.sound(this.chain > 1 ? 'power' : 'gem');
  }
  jewel(c, kind, x, y) {
    const cx = x + C / 2, cy = y + C / 2;
    c.fillStyle = SHADES[kind % 2 === 0 ? 0 : 1];
    c.beginPath();
    switch (kind) {
      case 0: c.arc(cx, cy, 4, 0, Math.PI * 2); break;                                                       // round
      case 1: c.rect(x + 1, y + 1, 8, 8); break;                                                                // square
      case 2: c.moveTo(cx, y + 1); c.lineTo(x + 9, y + 9); c.lineTo(x + 1, y + 9); break;                       // triangle
      case 3: c.moveTo(cx, y); c.lineTo(x + 9, cy); c.lineTo(cx, y + 10); c.lineTo(x + 1, cy); break;            // diamond
      case 4: c.rect(x + 3.5, y + 1, 3, 8); c.rect(x + 1, y + 3.5, 8, 3); break;                               // cross
      default: for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? 2 : 4.6; c.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r); } // star
    }
    c.fill();
    c.fillStyle = SHADES[3]; c.fillRect(cx - 2, cy - 2, 1, 1); // a glint
  }
  draw(c) {
    c.fillStyle = SHADES[3]; c.fillRect(0, 0, W, H);
    // the well
    c.fillStyle = SHADES[2]; c.fillRect(WX, WY, COLS * C, ROWS * C);
    c.strokeStyle = SHADES[0]; c.lineWidth = 2; c.strokeRect(WX - 1, WY - 1, COLS * C + 2, ROWS * C + 2);
    for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) {
      const k = this.well[y][x]; if (k < 0) continue;
      if (this.flash && this.flash.cells.has(`${x},${y}`) && Math.floor(this.t * 16) % 2) continue;
      this.jewel(c, k, WX + x * C, WY + y * C);
    }
    if (this.piece) for (let i = 0; i < 3; i++) if (this.py + i >= 0) this.jewel(c, this.piece[i], WX + this.px * C, WY + (this.py + i) * C);
    // side panel
    const sx = 90;
    this.text('NEXT', sx + 20, 8, { size: 8, align: 'center', color: SHADES[0] });
    c.fillStyle = SHADES[2]; c.fillRect(sx + 14, 20, 12, 34);
    for (let i = 0; i < 3; i++) this.jewel(c, this.next[i], sx + 15, 22 + i * C);
    this.text('SCORE', sx + 20, 62, { size: 8, color: SHADES[0] });
    this.text(String(this.score), sx + 20, 74, { size: 9, color: SHADES[1] });
    this.text('LEVEL', sx + 20, 92, { size: 8, color: SHADES[0] });
    this.text(String(this.level), sx + 20, 104, { size: 9, color: SHADES[1] });
    if (this.chain > 1) this.text(`CHAIN x${this.chain}`, sx + 20, 124, { size: 8, color: SHADES[0] });
  }
  overlay(c) {
    // the same attract and game-over banners as every machine, in LCD colours
    const blink = Math.floor(this.t * 2) % 2 === 0;
    if (this.mode === 'attract' || this.mode === 'over') {
      c.fillStyle = 'rgba(15,56,15,0.85)'; c.fillRect(0, H / 2 - 20, W, 40);
      this.text(this.mode === 'attract' ? this.title : 'GAME OVER', W / 2, H / 2 - 16, { size: 11, color: SHADES[3] });
      if (this.mode === 'over') this.text(`SCORE ${this.score}  HI ${this.hi}`, W / 2, H / 2, { size: 8, color: SHADES[2] });
      if (blink && (this.mode === 'attract' || this.overT <= 0)) this.text('PRESS A', W / 2, H / 2 + (this.mode === 'over' ? 10 : 2), { size: 8, color: SHADES[3] });
    }
  }
}
