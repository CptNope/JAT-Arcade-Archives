// GEM RUNNER — a maze-chase game in the style of early-1980s cocktail cabinets.
// Original maze, characters and rules written for this project.
import { Game, aiInput } from './base.js';

export const MAZE = [
  '###################',
  '#........#........#',
  '#o##.###.#.###.##o#',
  '#.................#',
  '#.##.#.#####.#.##.#',
  '#....#...#...#....#',
  '####.###.#.###.####',
  '####.#.......#.####',
  '####.#.##-##.#.####',
  '#......#GGG#......#',
  '####.#.#####.#.####',
  '####.#.......#.####',
  '####.#.#####.#.####',
  '#........#........#',
  '#.##.###.#.###.##.#',
  '#o.#.....P.....#.o#',
  '##.#.#.#####.#.#.##',
  '#....#...#...#....#',
  '#.######.#.######.#',
  '#.................#',
  '###################',
];
const T = 12, COLS = 19, ROWS = 21, TOP = 12;
const W = COLS * T, H = ROWS * T + TOP + 10;
const DIRS = [[0, -1], [1, 0], [0, 1], [-1, 0]]; // up right down left
const DRONE_COLORS = ['#ff4d6d', '#ffb703', '#4cc9f0'];

export class GemRunner extends Game {
  constructor(sfx) { super({ id: 'gemrunner', w: W, h: H, sfx }); this.title = 'GEM RUNNER'; }

  reset() { this.lives = 3; this.level = 0; this.nextLevel(); }
  nextLevel() {
    this.level++;
    this.gems = new Set(); this.cores = new Set();
    MAZE.forEach((row, y) => [...row].forEach((ch, x) => {
      if (ch === '.') this.gems.add(y * COLS + x);
      if (ch === 'o') this.cores.add(y * COLS + x);
      if (ch === 'P') this.start0 = [x, y];
    }));
    this.spawn();
  }
  spawn() {
    const [sx, sy] = this.start0;
    this.p = { x: sx, y: sy, dir: 3, want: 3, speed: 5.2 };
    this.drones = DRONE_COLORS.map((color, i) => ({ x: 8 + i, y: 9, dir: 0, speed: 4.2 + this.level * 0.25, color, home: [8 + i, 9], delay: i * 1.6 }));
    this.fright = 0; this.combo = 0; this.dying = 0; this.ready = 1.2;
  }
  open(x, y, drone) {
    if (x < 0 || y < 0 || x >= COLS || y >= ROWS) return false;
    const ch = MAZE[y][x];
    return ch !== '#' && (drone || ch !== '-');
  }

  // step an entity toward tile centres; `choose` picks a direction at each centre
  move(e, dt, choose, drone) {
    let m = e.speed * dt;
    while (m > 1e-6) {
      const cx = Math.round(e.x), cy = Math.round(e.y);
      const atCenter = Math.abs(e.x - cx) < 1e-4 && Math.abs(e.y - cy) < 1e-4;
      if (atCenter) {
        e.x = cx; e.y = cy;
        const d = choose(cx, cy);
        if (d < 0) return;
        e.dir = d;
      }
      const [dx, dy] = DIRS[e.dir];
      // distance to next centre along current direction
      const tx = dx ? (dx > 0 ? Math.floor(e.x + 1e-4) + 1 : Math.ceil(e.x - 1e-4) - 1) : e.x;
      const ty = dy ? (dy > 0 ? Math.floor(e.y + 1e-4) + 1 : Math.ceil(e.y - 1e-4) - 1) : e.y;
      if (!this.open(Math.round(tx), Math.round(ty), drone) && atCenter) return;
      const rem = Math.abs(tx - e.x) + Math.abs(ty - e.y);
      const s = Math.min(m, rem);
      e.x += dx * s; e.y += dy * s; m -= s;
    }
  }

  ai() {
    // BFS to the nearest gem, avoiding tiles close to drones unless they are frightened
    const p = this.p;
    const sx = Math.round(p.x), sy = Math.round(p.y);
    const danger = new Set();
    if (this.fright <= 0) this.drones.forEach(d => {
      for (let oy = -1; oy <= 1; oy++) for (let ox = -1; ox <= 1; ox++) danger.add((Math.round(d.y) + oy) * COLS + Math.round(d.x) + ox);
    });
    const prev = new Map([[sy * COLS + sx, -1]]);
    const q = [[sx, sy]];
    let found = null;
    while (q.length) {
      const [x, y] = q.shift();
      const k = y * COLS + x;
      if ((this.gems.has(k) || this.cores.has(k)) && k !== sy * COLS + sx) { found = k; break; }
      DIRS.forEach(([dx, dy], i) => {
        const nx = x + dx, ny = y + dy, nk = ny * COLS + nx;
        if (this.open(nx, ny) && !prev.has(nk) && !danger.has(nk)) { prev.set(nk, i === undefined ? -1 : k); q.push([nx, ny]); }
      });
    }
    let want = p.want;
    if (found !== null) {
      let k = found;
      while (prev.get(k) !== sy * COLS + sx && prev.get(k) !== -1) k = prev.get(k);
      const kx = k % COLS, ky = (k / COLS) | 0;
      want = DIRS.findIndex(([dx, dy]) => dx === kx - sx && dy === ky - sy);
    } else {
      // no safe path: run away from the nearest drone
      const d = this.drones[0];
      want = Math.abs(d.x - p.x) > Math.abs(d.y - p.y) ? (d.x > p.x ? 3 : 1) : (d.y > p.y ? 0 : 2);
    }
    return aiInput({ up: want === 0, right: want === 1, down: want === 2, left: want === 3 });
  }

  update(dt, inp) {
    if (this.ready > 0) { this.ready -= dt; return; }
    if (this.dying > 0) {
      this.dying -= dt;
      if (this.dying <= 0) { if (this.lives <= 0) this.gameOver(); else this.spawn(); }
      return;
    }
    const p = this.p;
    if (inp.up) p.want = 0; else if (inp.right) p.want = 1; else if (inp.down) p.want = 2; else if (inp.left) p.want = 3;
    // allow instant reversal between tiles
    if ((p.want + 2) % 4 === p.dir) p.dir = p.want;
    this.move(p, dt, (x, y) => {
      if (this.open(x + DIRS[p.want][0], y + DIRS[p.want][1])) return p.want;
      if (this.open(x + DIRS[p.dir][0], y + DIRS[p.dir][1])) return p.dir;
      return -1;
    });
    const k = Math.round(p.y) * COLS + Math.round(p.x);
    if (this.gems.delete(k)) { this.addScore(10); this.sound('gem'); }
    if (this.cores.delete(k)) { this.addScore(50); this.fright = Math.max(3, 7 - this.level * 0.5); this.combo = 0; this.sound('power'); }
    if (this.fright > 0) this.fright -= dt;

    this.drones.forEach((d, i) => {
      if (d.delay > 0) { d.delay -= dt; return; }
      const fr = this.fright > 0;
      d.speed = fr ? 2.8 : 4.2 + this.level * 0.25;
      this.move(d, dt, (x, y) => {
        const back = (d.dir + 2) % 4;
        const opts = [0, 1, 2, 3].filter(o => o !== back && this.open(x + DIRS[o][0], y + DIRS[o][1], true));
        if (!opts.length) return back;
        const inHouse = MAZE[y][x] === 'G' || MAZE[y][x] === '-';
        let tx = p.x, ty = p.y;
        if (inHouse) { tx = 9; ty = 6; }
        else if (fr || (i === 2 && Math.random() < 0.5)) return opts[(Math.random() * opts.length) | 0];
        else if (i === 1) { tx += DIRS[p.dir][0] * 4; ty += DIRS[p.dir][1] * 4; }
        return opts.reduce((best, o) => {
          const dd = (x + DIRS[o][0] - tx) ** 2 + (y + DIRS[o][1] - ty) ** 2;
          return dd < best.d ? { o, d: dd } : best;
        }, { o: opts[0], d: Infinity }).o;
      }, true);
      if (Math.hypot(d.x - p.x, d.y - p.y) < 0.6) {
        if (fr) {
          this.combo++; this.addScore(200 * this.combo); this.sound('hit');
          d.x = d.home[0]; d.y = d.home[1]; d.dir = 0; d.delay = 1.5;
        } else { this.lives--; this.dying = 1.4; this.sound('die'); }
      }
    });
    if (!this.gems.size && !this.cores.size) { this.addScore(1000); this.nextLevel(); }
  }

  draw(c) {
    c.fillStyle = '#020611'; c.fillRect(0, 0, W, H);
    // maze walls: outline tiles that border a path, for a neon-tube look
    c.strokeStyle = '#6a4cff'; c.lineWidth = 2;
    for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) {
      const ch = MAZE[y][x];
      if (ch === '-') { c.fillStyle = '#ff9fd1'; c.fillRect(x * T, TOP + y * T + 5, T, 2); continue; }
      if (ch !== '#') continue;
      c.fillStyle = '#140b3a'; c.fillRect(x * T + 1, TOP + y * T + 1, T - 2, T - 2);
      const edge = (ox, oy) => !(y + oy < 0 || y + oy >= ROWS || x + ox < 0 || x + ox >= COLS) && MAZE[y + oy][x + ox] !== '#';
      c.beginPath();
      if (edge(0, -1)) { c.moveTo(x * T, TOP + y * T + 1); c.lineTo(x * T + T, TOP + y * T + 1); }
      if (edge(0, 1)) { c.moveTo(x * T, TOP + y * T + T - 1); c.lineTo(x * T + T, TOP + y * T + T - 1); }
      if (edge(-1, 0)) { c.moveTo(x * T + 1, TOP + y * T); c.lineTo(x * T + 1, TOP + y * T + T); }
      if (edge(1, 0)) { c.moveTo(x * T + T - 1, TOP + y * T); c.lineTo(x * T + T - 1, TOP + y * T + T); }
      c.stroke();
    }
    // gems (little diamonds) and power cores
    c.fillStyle = '#7dffd4';
    this.gems.forEach(k => {
      const x = (k % COLS) * T + T / 2, y = TOP + ((k / COLS) | 0) * T + T / 2;
      c.fillRect(x - 1, y - 2, 2, 4); c.fillRect(x - 2, y - 1, 4, 2);
    });
    if (Math.floor(this.t * 4) % 2) {
      c.fillStyle = '#fff36b';
      this.cores.forEach(k => { const x = (k % COLS) * T + T / 2, y = TOP + ((k / COLS) | 0) * T + T / 2; c.fillRect(x - 4, y - 4, 8, 8); });
    }
    // drones: square bodies with an antenna and a scanning eye
    this.drones.forEach(d => {
      const x = d.x * T + T / 2, y = TOP + d.y * T + T / 2;
      const fr = this.fright > 0;
      c.fillStyle = fr ? (this.fright < 1.5 && Math.floor(this.t * 8) % 2 ? '#fff' : '#3a5cff') : d.color;
      c.fillRect(x - 5, y - 4, 10, 9);
      c.fillRect(x - 1, y - 7, 2, 3);
      c.fillStyle = '#020611'; c.fillRect(x - 3, y - 2, 6, 3);
      c.fillStyle = fr ? '#fff' : '#fff36b';
      c.fillRect(x - 3 + ((Math.floor(this.t * 6) % 3) * 2), y - 2, 2, 3);
    });
    // runner: a rotating gem-ship
    if (this.dying <= 0 || Math.floor(this.t * 10) % 2) {
      const x = this.p.x * T + T / 2, y = TOP + this.p.y * T + T / 2;
      c.save(); c.translate(x, y); c.rotate([0, Math.PI / 2, Math.PI, -Math.PI / 2][this.p.dir]);
      c.fillStyle = '#ffe14d';
      c.beginPath(); c.moveTo(0, -6); c.lineTo(5, 4); c.lineTo(0, 2); c.lineTo(-5, 4); c.closePath(); c.fill();
      c.restore();
    }
    this.text(`${String(this.score).padStart(5, '0')}`, 4, 2, { size: 8, align: 'left' });
    this.text(`HI ${Math.max(this.hi, this.score)}`, W - 4, 2, { size: 8, align: 'right' });
    this.text(`LV ${this.level}`, W / 2, 2, { size: 8 });
    c.fillStyle = '#ffe14d';
    for (let i = 0; i < this.lives - 1; i++) { c.fillRect(6 + i * 12, H - 8, 6, 5); }
    if (this.ready > 0 && this.mode === 'play') this.text('READY!', W / 2, TOP + 11 * T + 2, { size: 9, color: '#fff36b' });
  }
}
