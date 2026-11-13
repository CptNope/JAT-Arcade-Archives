// GOLD DIGGER — a puzzle-platformer in the style of 1983's Lode Runner: collect every gold pile while
// guards chase you, dig holes in brick floors to trap them, then climb the ladder that appears to escape.
// Levels are generated so every floor is reachable.
import { Game, aiInput } from './base.js';

const T = 9, COLS = 26, ROWS = 16, TOP = 12, W = COLS * T, H = ROWS * T + TOP + 2;
const EMPTY = 0, BRICK = 1, SOLID = 2, LADDER = 3, ROPE = 4, GOLD = 5, HIDDEN = 6;

export class GoldDigger extends Game {
  constructor(sfx) { super({ id: 'golddigger', w: W, h: H, sfx }); this.title = 'GOLD DIGGER'; }
  reset() { this.lives = 4; this.level = 0; this.nextLevel(); }
  nextLevel() {
    this.level++;
    const m = this.map = Array.from({ length: ROWS }, () => Array(COLS).fill(EMPTY));
    for (let x = 0; x < COLS; x++) m[ROWS - 1][x] = SOLID;
    const floors = [3, 6, 9, 12];
    for (const fy of floors) {
      for (let x = 0; x < COLS; x++) m[fy][x] = BRICK;
      const gap = 3 + ((Math.random() * (COLS - 8)) | 0); m[fy][gap] = EMPTY; // a hole to drop through
      for (let k = 0; k < 3; k++) m[fy][(Math.random() * COLS) | 0] = SOLID;
    }
    // ladders: at least two between each pair of levels (including from the bottom floor up)
    const levels = [...floors, ROWS - 1];
    for (let i = 0; i < levels.length - 1; i++) {
      const top = levels[i], bot = levels[i + 1];
      for (let k = 0; k < 2; k++) { const x = 1 + ((Math.random() * (COLS - 2)) | 0); for (let y = top; y < bot; y++) m[y][x] = LADDER; }
      if (Math.random() < 0.6) { const x0 = 2 + ((Math.random() * (COLS - 12)) | 0); for (let x = x0; x < x0 + 6; x++) if (m[top + 1][x] === EMPTY) m[top + 1][x] = ROPE; }
    }
    // the escape ladder from the top floor to the ceiling, hidden until all gold is collected
    this.escapeX = COLS - 3; for (let y = 0; y <= floors[0]; y++) m[y][this.escapeX] = HIDDEN;
    // gold on standing rows
    const stand = [floors[0] - 1, floors[1] - 1, floors[2] - 1, floors[3] - 1, ROWS - 2];
    let n = 0;
    while (n < 6 + this.level) { const y = stand[(Math.random() * stand.length) | 0], x = (Math.random() * COLS) | 0; if (m[y][x] === EMPTY) { m[y][x] = GOLD; n++; } }
    this.gold = n;
    this.holes = [];
    this.guards = [[3, floors[0] - 1], [COLS - 5, floors[1] - 1]].concat(this.level > 2 ? [[COLS / 2 | 0, floors[2] - 1]] : []).map(([x, y]) => ({ x, y, sx: x, sy: y, trap: 0, t: 0 }));
    this.spawn();
  }
  spawn() { this.px = 2; this.py = ROWS - 2; this.face = 1; this.pt = 0; this.dead = 0; for (const g of this.guards) { g.x = g.sx; g.y = g.sy; g.trap = 0; } }
  tile(x, y) { return x < 0 || x >= COLS || y < 0 ? SOLID : y >= ROWS ? SOLID : this.map[y][x]; }
  hole(x, y) { return this.holes.find(h => h.x === x && h.y === y); }
  blocked(x, y) { const t = this.tile(x, y); return (t === BRICK && !this.hole(x, y)) || t === SOLID; }
  climbable(t) { return t === LADDER; }
  supported(x, y, isGuard) {
    const here = this.tile(x, y), below = this.tile(x, y + 1);
    if (here === LADDER || here === ROPE) return true;
    if (below === LADDER || this.blocked(x, y + 1)) return true;
    if (!isGuard && this.guards.some(g => g.trap > 0 && g.x === x && g.y === y + 1)) return true;
    if (isGuard && this.hole(x, y) ) return true;
    return false;
  }
  ai() {
    if (this.dead) return aiInput();
    // head for the nearest gold (or the escape ladder) with a breadth-first search over legal moves
    const goal = (x, y) => (this.gold > 0 ? this.tile(x, y) === GOLD : y === 0);
    const start = this.py * COLS + this.px, prev = new Map([[start, -1]]), q = [[this.px, this.py]];
    let found = null;
    while (q.length) {
      const [x, y] = q.shift(); const k = y * COLS + x;
      if (k !== start && goal(x, y)) { found = k; break; }
      for (const [nx, ny] of this.moves(x, y)) { const nk = ny * COLS + nx; if (!prev.has(nk) && !this.guards.some(g => Math.abs(g.x - nx) + Math.abs(g.y - ny) < 2)) { prev.set(nk, k); q.push([nx, ny]); } }
    }
    if (found === null) {
      const g = this.guards.find(o => o.y === this.py && Math.abs(o.x - this.px) < 5 && !o.trap);
      return g ? aiInput({}, { a: true, left: g.x < this.px && this.face > 0, right: g.x > this.px && this.face < 0 }) : aiInput();
    }
    let k = found; while (prev.get(k) !== start) k = prev.get(k);
    const nx = k % COLS, ny = (k / COLS) | 0;
    return aiInput({ left: nx < this.px, right: nx > this.px, up: ny < this.py, down: ny > this.py });
  }
  moves(x, y) {
    const out = [];
    if (!this.supported(x, y)) return [[x, y + 1]];
    if (!this.blocked(x - 1, y)) out.push([x - 1, y]);
    if (!this.blocked(x + 1, y)) out.push([x + 1, y]);
    if (this.climbable(this.tile(x, y)) && !this.blocked(x, y - 1)) out.push([x, y - 1]);
    if ((this.tile(x, y + 1) === LADDER || this.tile(x, y) === ROPE || this.tile(x, y) === LADDER) && !this.blocked(x, y + 1)) out.push([x, y + 1]);
    return out;
  }
  update(dt, inp) {
    if (this.dead > 0) { this.dead -= dt; if (this.dead <= 0) { if (this.lives <= 0) { this.gameOver(); return; } this.spawn(); } return; }
    // holes refill over time
    for (const h of this.holes) h.t -= dt;
    for (const h of this.holes.filter(o => o.t <= 0)) {
      if (this.px === h.x && this.py === h.y) return this.die();
      for (const g of this.guards) if (g.x === h.x && g.y === h.y) { g.x = g.sx; g.y = 0; g.trap = 0; this.addScore(75); }
    }
    this.holes = this.holes.filter(o => o.t > 0);
    // player steps on a fixed beat so movement lines up with the grid
    this.pt -= dt;
    if (this.pt <= 0) {
      this.pt = 0.1;
      if (inp.a || inp.tap.a) {
        const dx = this.px + this.face, dy = this.py + 1;
        if (this.tile(dx, dy) === BRICK && !this.hole(dx, dy) && !this.blocked(dx, this.py) && this.tile(dx, this.py) !== LADDER) { this.holes.push({ x: dx, y: dy, t: 6 }); this.sound('hit'); }
      } else if (!this.supported(this.px, this.py)) this.py++;
      else if (inp.left && !this.blocked(this.px - 1, this.py)) { this.px--; this.face = -1; }
      else if (inp.right && !this.blocked(this.px + 1, this.py)) { this.px++; this.face = 1; }
      else if (inp.up && this.climbable(this.tile(this.px, this.py)) && !this.blocked(this.px, this.py - 1)) this.py--;
      else if (inp.down && !this.blocked(this.px, this.py + 1)) this.py++;
      if (this.tile(this.px, this.py) === GOLD) { this.map[this.py][this.px] = EMPTY; this.gold--; this.addScore(250); this.sound('gem'); if (!this.gold) { for (let y = 0; y < ROWS; y++) if (this.map[y][this.escapeX] === HIDDEN) this.map[y][this.escapeX] = LADDER; this.sound('power'); } }
      if (this.py <= 0 && !this.gold) { this.addScore(1500); this.sound('start'); this.nextLevel(); return; }
    }
    // guards: slower, chase directly, fall into holes and climb out after a few seconds
    for (const g of this.guards) {
      g.t -= dt; if (g.t > 0) continue; g.t = 0.19 - Math.min(0.06, this.level * 0.01);
      if (g.trap > 0) { g.trap -= 0.19; if (g.trap <= 0) { g.y--; g.x += this.px > g.x ? 1 : -1; } continue; }
      if (this.hole(g.x, g.y) && !g.trap) { g.trap = 2.8; continue; }
      if (!this.supported(g.x, g.y, true)) { g.y++; continue; }
      const opts = this.moves(g.x, g.y).filter(([x, y]) => !this.guards.some(o => o !== g && o.x === x && o.y === y));
      if (!opts.length) continue;
      const best = opts.reduce((b, m) => { const d = Math.abs(m[0] - this.px) + Math.abs(m[1] - this.py) * 3; return d < b.d ? { m, d } : b; }, { d: Infinity });
      [g.x, g.y] = best.m;
      if (this.hole(g.x, g.y)) g.trap = 2.8;
    }
    if (this.guards.some(g => g.x === this.px && g.y === this.py && !g.trap)) this.die();
  }
  die() { this.lives--; this.dead = 1.4; this.sound('die'); }
  draw(c) {
    c.fillStyle = '#000'; c.fillRect(0, 0, W, H);
    for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) {
      const t = this.map[y][x], px = x * T, py = TOP + y * T;
      if (t === BRICK) {
        const h = this.hole(x, y);
        if (h && h.t > 0.6) continue;
        c.fillStyle = '#c4501a'; c.fillRect(px, py, T, T); c.fillStyle = '#7a2a08'; c.fillRect(px, py + 4, T, 1); c.fillRect(px + (y % 2 ? 2 : 6), py, 1, 4); c.fillRect(px + (y % 2 ? 6 : 2), py + 5, 1, 4);
      } else if (t === SOLID) { c.fillStyle = '#7d7d8a'; c.fillRect(px, py, T, T); c.fillStyle = '#a8a8b5'; c.fillRect(px + 1, py + 1, T - 3, 2); }
      else if (t === LADDER) { c.fillStyle = '#e8e8e8'; c.fillRect(px + 1, py, 1, T); c.fillRect(px + T - 2, py, 1, T); c.fillRect(px + 1, py + 2, T - 2, 1); c.fillRect(px + 1, py + 6, T - 2, 1); }
      else if (t === ROPE) { c.fillStyle = '#d8c090'; c.fillRect(px, py + 1, T, 1); }
      else if (t === GOLD) { c.fillStyle = '#ffd23f'; c.fillRect(px + 2, py + 4, 5, 4); c.fillStyle = '#fff3a0'; c.fillRect(px + 3, py + 4, 2, 1); }
    }
    const fig = (x, y, col, hat) => { const px = x * T + 4, py = TOP + y * T; c.fillStyle = col; c.fillRect(px - 1, py + 1, 3, 3); c.fillRect(px - 2, py + 4, 5, 3); c.fillRect(px - 2, py + 7, 2, 2); c.fillRect(px + 1, py + 7, 2, 2); if (hat) { c.fillRect(px - 2, py, 5, 1); } };
    for (const g of this.guards) fig(g.x, g.y, g.trap > 0 ? '#ff9e9e' : '#ff3b3b', true);
    if (!this.dead || Math.floor(this.t * 10) % 2) fig(this.px, this.py, '#ffffff', false);
    this.text(`SCORE ${this.score}`, 4, 2, { size: 8, align: 'left' });
    this.text(this.gold ? `GOLD LEFT ${this.gold}` : 'ESCAPE UP THE LADDER!', W / 2, 2, { size: 8, color: this.gold ? '#ffd23f' : '#7cff6b' });
    this.text(`MEN ${this.lives}  LV ${this.level}`, W - 4, 2, { size: 8, align: 'right' });
  }
}
