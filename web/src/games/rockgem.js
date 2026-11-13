// ROCK & GEM — a digging game in the style of 1984's Boulder Dash: tunnel through earth, collect gems,
// and keep out from under boulders, which fall and roll off each other. Enough gems open the exit.
import { Game, aiInput } from './base.js';

const T = 10, COLS = 24, ROWS = 14, TOP = 14, W = COLS * T, H = ROWS * T + TOP;
const EMPTY = 0, DIRT = 1, WALL = 2, STEEL = 3, ROCK = 4, GEM = 5, EXIT = 6;
const DIRS = [[0, -1], [1, 0], [0, 1], [-1, 0]];

export class RockGem extends Game {
  constructor(sfx) { super({ id: 'rockgem', w: W, h: H, sfx }); this.title = 'ROCK & GEM'; }
  reset() { this.lives = 3; this.cave = 0; this.nextCave(); }
  nextCave() {
    this.cave++;
    const m = this.m = Array.from({ length: ROWS }, (_, y) => Array.from({ length: COLS }, (_, x) => (x === 0 || y === 0 || x === COLS - 1 || y === ROWS - 1 ? STEEL : DIRT)));
    let gems = 0;
    for (let y = 1; y < ROWS - 1; y++) for (let x = 1; x < COLS - 1; x++) {
      const r = Math.random();
      if (r < 0.16) m[y][x] = ROCK; else if (r < 0.25) { m[y][x] = GEM; gems++; } else if (r < 0.29) m[y][x] = EMPTY;
    }
    for (let k = 0; k < 3; k++) { const y = 3 + ((Math.random() * (ROWS - 6)) | 0), x0 = 2 + ((Math.random() * (COLS - 10)) | 0); for (let x = x0; x < x0 + 6; x++) m[y][x] = WALL; }
    this.px = 2; this.py = 2;
    for (let y = 1; y <= 3; y++) for (let x = 1; x <= 3; x++) m[y][x] = DIRT;
    m[this.py][this.px] = EMPTY;
    this.ex = COLS - 2; this.ey = ROWS - 2; m[this.ey][this.ex] = EXIT;
    this.need = Math.min(gems, 8 + this.cave * 2); this.got = 0; this.time = 120;
    this.tick = 0; this.mt = 0; this.falling = new Set(); this.dead = 0; this.boom = null;
  }
  ai() {
    if (this.dead) return aiInput();
    if ((this.aiT = (this.aiT || 0) + 1) % 2) return aiInput();
    const m = this.m, open = this.got >= this.need;
    const dangerous = (x, y) => m[y - 1]?.[x] === ROCK || m[y - 1]?.[x] === GEM && this.falling.has((y - 1) * COLS + x);
    const start = this.py * COLS + this.px, prev = new Map([[start, -1]]), q = [[this.px, this.py]];
    let found = null;
    while (q.length) {
      const [x, y] = q.shift(), k = y * COLS + x;
      if (k !== start && (open ? m[y][x] === EXIT : m[y][x] === GEM)) { found = k; break; }
      for (const [dx, dy] of DIRS) {
        const nx = x + dx, ny = y + dy, t = m[ny][nx], nk = ny * COLS + nx;
        if (prev.has(nk) || !(t === EMPTY || t === DIRT || t === GEM || (t === EXIT && open)) || dangerous(nx, ny)) continue;
        prev.set(nk, k); q.push([nx, ny]);
      }
    }
    if (found === null) return aiInput({}, [{ left: true }, { right: true }, { up: true }, { down: true }][(Math.random() * 4) | 0]);
    let k = found; while (prev.get(k) !== start) k = prev.get(k);
    const nx = k % COLS, ny = (k / COLS) | 0;
    return aiInput({ left: nx < this.px, right: nx > this.px, up: ny < this.py, down: ny > this.py });
  }
  update(dt, inp) {
    if (this.boom) { this.boom.t -= dt; if (this.boom.t <= 0) this.boom = null; }
    if (this.dead > 0) { this.dead -= dt; if (this.dead <= 0) { if (this.lives <= 0) { this.gameOver(); return; } const c = this.cave; this.cave = c - 1; this.nextCave(); } return; }
    this.time -= dt; if (this.time <= 0) { this.time = 0; return this.die(); }
    const m = this.m;
    // the player moves on a short beat; holding a direction keeps walking
    this.mt -= dt;
    const d = inp.up ? 0 : inp.right ? 1 : inp.down ? 2 : inp.left ? 3 : inp.tap.up ? 0 : inp.tap.right ? 1 : inp.tap.down ? 2 : inp.tap.left ? 3 : -1;
    if (d >= 0 && this.mt <= 0) {
      this.mt = 0.13;
      const nx = this.px + DIRS[d][0], ny = this.py + DIRS[d][1], t = m[ny][nx];
      if (t === EMPTY || t === DIRT) { m[ny][nx] = EMPTY; this.px = nx; this.py = ny; if (t === DIRT) this.sfx && this.mode === 'play' && this.sfx.play('step1'); }
      else if (t === GEM) { m[ny][nx] = EMPTY; this.px = nx; this.py = ny; this.got++; this.addScore(this.got > this.need ? 25 : 10); this.sound('gem'); if (this.got === this.need) this.sound('power'); }
      else if (t === ROCK && DIRS[d][1] === 0 && m[ny][nx + DIRS[d][0]] === EMPTY && Math.random() < 0.6) { m[ny][nx + DIRS[d][0]] = ROCK; m[ny][nx] = EMPTY; this.px = nx; this.py = ny; }
      else if (t === EXIT && this.got >= this.need) { this.addScore(Math.round(this.time) * 5 + 200); this.sound('start'); this.nextCave(); return; }
    }
    // physics: boulders and gems fall, and roll off rounded things
    this.tick -= dt;
    if (this.tick <= 0) {
      this.tick = 0.14;
      const nowFalling = new Set();
      for (let y = ROWS - 2; y >= 1; y--) for (let x = 1; x < COLS - 1; x++) {
        const t = m[y][x]; if (t !== ROCK && t !== GEM) continue;
        const k = y * COLS + x, below = m[y + 1][x], playerBelow = this.px === x && this.py === y + 1;
        if (below === EMPTY && !playerBelow) { m[y + 1][x] = t; m[y][x] = EMPTY; nowFalling.add((y + 1) * COLS + x); continue; }
        if (playerBelow && this.falling.has(k)) { this.boom = { x, y: y + 1, t: 0.6 }; return this.die(); }
        if (below === ROCK || below === GEM || below === WALL) {
          for (const sx of [-1, 1]) {
            if (m[y][x + sx] === EMPTY && m[y + 1][x + sx] === EMPTY && !(this.px === x + sx && (this.py === y || this.py === y + 1))) { m[y][x + sx] = t; m[y][x] = EMPTY; nowFalling.add(y * COLS + x + sx); break; }
          }
        }
      }
      this.falling = nowFalling;
    }
  }
  die() { this.lives--; this.dead = 1.6; this.sound('die'); }
  draw(c) {
    c.fillStyle = '#000'; c.fillRect(0, 0, W, H);
    const open = this.got >= this.need;
    for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) {
      const t = this.m[y][x], px = x * T, py = TOP + y * T;
      if (t === DIRT) { c.fillStyle = '#7a4a1a'; c.fillRect(px, py, T, T); c.fillStyle = '#5a3410'; c.fillRect(px + 2, py + 3, 2, 2); c.fillRect(px + 6, py + 6, 2, 2); }
      else if (t === WALL) { c.fillStyle = '#9a9aa8'; c.fillRect(px, py, T, T); c.fillStyle = '#5a5a68'; c.fillRect(px, py + 4, T, 1); c.fillRect(px + 4, py, 1, 4); }
      else if (t === STEEL) { c.fillStyle = '#4a5a6a'; c.fillRect(px, py, T, T); c.fillStyle = '#8aa0b0'; c.fillRect(px + 1, py + 1, 2, 2); }
      else if (t === ROCK) { c.fillStyle = '#b0a090'; c.beginPath(); c.arc(px + T / 2, py + T / 2, T / 2 - 0.5, 0, Math.PI * 2); c.fill(); c.fillStyle = '#d8ccbc'; c.fillRect(px + 3, py + 2, 2, 2); }
      else if (t === GEM) { const sh = Math.floor(this.t * 6 + x + y) % 3; c.fillStyle = ['#7ad8ff', '#c7f0ff', '#4cc9f0'][sh]; c.beginPath(); c.moveTo(px + T / 2, py + 1); c.lineTo(px + T - 1, py + T / 2); c.lineTo(px + T / 2, py + T - 1); c.lineTo(px + 1, py + T / 2); c.closePath(); c.fill(); }
      else if (t === EXIT) { c.fillStyle = open && Math.floor(this.t * 4) % 2 ? '#ffffff' : '#4a5a6a'; c.fillRect(px, py, T, T); }
    }
    if (!this.dead) { const px = this.px * T, py = TOP + this.py * T; c.fillStyle = '#ffe14d'; c.fillRect(px + 3, py + 1, 4, 3); c.fillStyle = '#ff7a1a'; c.fillRect(px + 2, py + 4, 6, 3); c.fillStyle = '#ffe14d'; c.fillRect(px + 2, py + 7, 2, 3); c.fillRect(px + 6, py + 7, 2, 3); }
    if (this.boom) { c.fillStyle = `rgba(255,255,255,${this.boom.t})`; c.fillRect((this.boom.x - 1) * T, TOP + (this.boom.y - 1) * T, T * 3, T * 3); }
    this.text(`GEMS ${this.got}/${this.need}`, 4, 3, { size: 8, align: 'left', color: open ? '#7cff6b' : '#7ad8ff' });
    this.text(`TIME ${Math.ceil(this.time)}`, W / 2, 3, { size: 8 });
    this.text(`${this.score}  x${this.lives}`, W - 4, 3, { size: 8, align: 'right' });
  }
}
