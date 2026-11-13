// MAZE MONSTER — a first-person maze escape in the style of 1981's 3D Monster Maze: chunky block
// graphics, one exit, and a dinosaur that hunts you through the corridors. Original maze generator and art.
import { Game, aiInput } from './base.js';

const W = 256, H = 192, LW = 64, LH = 40, N = 15;
const DIRS = [[0, -1], [1, 0], [0, 1], [-1, 0]]; // N E S W
// frame edges for each depth step (in low-res units): how far the corridor walls sit from the screen edge
const FX = [0, 9, 17, 22, 25, 27, 28, 29], FY = [0, 6, 11, 14, 16, 17, 18, 18.5];

export class MazeMonster extends Game {
  constructor(sfx) {
    super({ id: 'mazemonster', w: W, h: H, sfx, fg: '#111', bg: '#f2f2ea' });
    this.title = 'MAZE MONSTER';
    this.lo = document.createElement('canvas'); this.lo.width = LW; this.lo.height = LH;
    this.lc = this.lo.getContext('2d');
  }
  reset() { this.level = 0; this.nextMaze(); }
  nextMaze() {
    this.level++;
    const g = Array.from({ length: N }, () => Array(N).fill(1));
    const stack = [[1, 1]]; g[1][1] = 0;
    while (stack.length) {
      const [x, y] = stack[stack.length - 1];
      const opts = DIRS.map(([dx, dy]) => [x + dx * 2, y + dy * 2, dx, dy]).filter(([nx, ny]) => nx > 0 && ny > 0 && nx < N - 1 && ny < N - 1 && g[ny][nx] === 1);
      if (!opts.length) { stack.pop(); continue; }
      const [nx, ny, dx, dy] = opts[(Math.random() * opts.length) | 0];
      g[y + dy][x + dx] = 0; g[ny][nx] = 0; stack.push([nx, ny]);
    }
    // knock out a few extra walls so there are loops to escape through
    for (let i = 0; i < 10; i++) { const x = 1 + ((Math.random() * (N - 2)) | 0), y = 1 + ((Math.random() * (N - 2)) | 0); if ((x + y) % 2 === 1) g[y][x] = 0; }
    this.g = g; this.px = 1; this.py = 1; this.face = g[1][2] === 0 ? 1 : 2;
    this.ex = N - 2; this.ey = N - 2;
    this.mx = N - 2; this.my = 1; this.mT = 0; this.wake = 4; this.moveT = 0; this.caught = 0; this.steps = 0;
    this.msg = 'FIND THE EXIT';
  }
  open(x, y) { return x >= 0 && y >= 0 && x < N && y < N && this.g[y][x] === 0; }
  bfs(sx, sy, tx, ty) {
    const prev = new Map([[sy * N + sx, -1]]), q = [[sx, sy]];
    while (q.length) {
      const [x, y] = q.shift();
      if (x === tx && y === ty) { const path = []; let k = y * N + x; while (k !== -1) { path.unshift(k); k = prev.get(k); } return path; }
      for (const [dx, dy] of DIRS) { const nx = x + dx, ny = y + dy, k = ny * N + nx; if (this.open(nx, ny) && !prev.has(k)) { prev.set(k, y * N + x); q.push([nx, ny]); } }
    }
    return null;
  }
  // how many cells straight ahead (in direction d) until x,y, or -1 if not in a straight line of sight
  sight(d, x, y) {
    let cx = this.px, cy = this.py;
    for (let k = 0; k < 8; k++) { if (cx === x && cy === y) return k; cx += DIRS[d][0]; cy += DIRS[d][1]; if (!this.open(cx, cy)) return -1; }
    return -1;
  }
  ai() {
    if (this.caught) return aiInput();
    if ((this.aiT = (this.aiT || 0) + 1) % 8) return aiInput();
    const path = this.bfs(this.px, this.py, this.ex, this.ey);
    if (!path || path.length < 2) return aiInput();
    const nx = path[1] % N, ny = (path[1] / N) | 0;
    const want = DIRS.findIndex(([dx, dy]) => dx === nx - this.px && dy === ny - this.py);
    if (want === this.face) return aiInput({}, { up: true });
    return aiInput({}, (want - this.face + 4) % 4 === 3 ? { left: true } : { right: true });
  }
  update(dt, inp) {
    if (this.caught) { this.caught -= dt; if (this.caught <= 0) { if (this.mode === 'play') this.gameOver(); else this.reset(); } return; }
    if (inp.tap.left) { this.face = (this.face + 3) % 4; this.sound('wall'); }
    if (inp.tap.right) { this.face = (this.face + 1) % 4; this.sound('wall'); }
    this.moveT -= dt;
    const fwd = inp.tap.up || (inp.up && this.moveT <= 0), back = inp.tap.down;
    if (fwd || back) {
      const s = fwd ? 1 : -1, nx = this.px + DIRS[this.face][0] * s, ny = this.py + DIRS[this.face][1] * s;
      if (this.open(nx, ny)) { this.px = nx; this.py = ny; this.steps++; this.addScore(5); this.moveT = 0.28; this.sound('step2'); }
    }
    if (this.px === this.ex && this.py === this.ey) { this.addScore(1000 + this.level * 250); this.sound('start'); this.nextMaze(); return; }
    // the monster wakes after a moment, then walks the shortest path toward you
    this.wake -= dt;
    if (this.wake <= 0) {
      this.mT -= dt;
      if (this.mT <= 0) {
        this.mT = Math.max(0.4, 0.95 - this.level * 0.08);
        const path = this.bfs(this.mx, this.my, this.px, this.py);
        if (path && path.length > 1) { this.mx = path[1] % N; this.my = (path[1] / N) | 0; }
      }
    }
    if (this.mx === this.px && this.my === this.py) { this.msg = 'THE MONSTER HAS YOU!'; this.caught = 2.2; this.sound('die'); return; }
    const dist = (this.bfs(this.mx, this.my, this.px, this.py) || []).length - 1;
    const ahead = this.sight(this.face, this.mx, this.my), behind = this.sight((this.face + 2) % 4, this.mx, this.my);
    this.msg = this.wake > 0 ? 'THE MONSTER SLEEPS... FOR NOW' : ahead > 0 ? 'IT HAS SEEN YOU! TURN AND RUN' : behind > 0 ? 'IT IS RIGHT BEHIND YOU!' : dist <= 5 ? 'FOOTSTEPS ARE GETTING CLOSER' : 'IT IS HUNTING FOR YOU';
  }
  drawView() {
    const c = this.lc;
    c.fillStyle = '#f2f2ea'; c.fillRect(0, 0, LW, LH);
    const [dx, dy] = DIRS[this.face], [lx, ly] = DIRS[(this.face + 3) % 4], [rx, ry] = DIRS[(this.face + 1) % 4];
    const L = (d) => FX[d], R = (d) => LW - FX[d], Tp = (d) => FY[d], B = (d) => LH - FY[d];
    const poly = (pts, col) => { c.fillStyle = col; c.beginPath(); pts.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y))); c.closePath(); c.fill(); };
    let monsterAt = -1;
    for (let d = 0; d < FX.length - 1; d++) {
      const cx = this.px + dx * d, cy = this.py + dy * d;
      if (cx === this.mx && cy === this.my && d > 0) monsterAt = d;
      // side walls or side openings
      if (!this.open(cx + lx, cy + ly)) poly([[L(d), Tp(d)], [L(d + 1), Tp(d + 1)], [L(d + 1), B(d + 1)], [L(d), B(d)]], d % 2 ? '#3a3a3a' : '#222');
      else c.fillStyle = '#8a8a82', c.fillRect(L(d), Tp(d + 1), L(d + 1) - L(d), B(d + 1) - Tp(d + 1));
      if (!this.open(cx + rx, cy + ry)) poly([[R(d), Tp(d)], [R(d + 1), Tp(d + 1)], [R(d + 1), B(d + 1)], [R(d), B(d)]], d % 2 ? '#3a3a3a' : '#222');
      else c.fillStyle = '#8a8a82', c.fillRect(R(d + 1), Tp(d + 1), R(d) - R(d + 1), B(d + 1) - Tp(d + 1));
      const nx = cx + dx, ny = cy + dy;
      if (nx === this.ex && ny === this.ey) {
        // the exit: a checked doorway
        for (let yy = Tp(d + 1); yy < B(d + 1); yy += 2) for (let xx = L(d + 1); xx < R(d + 1); xx += 2) { c.fillStyle = ((xx + yy) / 2) % 2 ? '#111' : '#f2f2ea'; c.fillRect(xx, yy, 2, 2); }
        break;
      }
      if (!this.open(nx, ny)) { c.fillStyle = '#6a6a62'; c.fillRect(L(d + 1), Tp(d + 1), R(d + 1) - L(d + 1), B(d + 1) - Tp(d + 1)); break; }
    }
    if (monsterAt > 0) {
      // a blocky original dinosaur, scaled to its distance
      const d = monsterAt, s = (R(d) - L(d)) / 64, cxm = LW / 2, base = B(d);
      c.fillStyle = '#000';
      const r = (x, y, w, h) => c.fillRect(cxm + x * s, base - y * s, w * s, h * s);
      r(-10, 34, 20, 18); r(-4, 46, 16, 12); r(6, 44, 10, 5); r(-14, 26, 6, 4); r(10, 26, 6, 4); r(-10, 16, 7, 16); r(4, 16, 7, 16); r(-24, 22, 14, 5);
      c.fillStyle = '#f2f2ea'; r(4, 43, 3, 3);
    }
  }
  draw(c) {
    this.drawView();
    c.fillStyle = '#f2f2ea'; c.fillRect(0, 0, W, H);
    c.imageSmoothingEnabled = false;
    c.drawImage(this.lo, 0, 16, W, LH * 4);
    c.fillStyle = '#111'; c.fillRect(0, 0, W, 14);
    this.text(`LEVEL ${this.level}   STEPS ${this.steps}   SCORE ${this.score}`, W / 2, 3, { size: 9, color: '#f2f2ea' });
    c.fillStyle = '#111'; c.fillRect(0, H - 16, W, 16);
    if (Math.floor(this.t * 3) % 2 || !this.msg.includes('!')) this.text(this.msg, W / 2, H - 13, { size: 9, color: '#f2f2ea' });
    // compass arrow showing which way you face
    this.text('NESW'[this.face], W - 12, 3, { size: 9, color: '#ffe14d' });
  }
}
