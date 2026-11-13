// SERPENT — the kind of snake game people typed in from magazine listings on early-1980s home computers.
import { Game, aiInput } from './base.js';

const W = 320, H = 200, C = 8, OX = 16, OY = 24, GW = 36, GH = 20;
const DIRS = [[0, -1], [1, 0], [0, 1], [-1, 0]];

export class Serpent extends Game {
  constructor(sfx) {
    super({ id: 'serpent', w: W, h: H, sfx, fg: '#a5a5ff', font: 'Courier New, monospace' });
    this.title = 'SERPENT';
  }
  reset() {
    this.body = [[10, 10], [9, 10], [8, 10], [7, 10]];
    this.dir = 1; this.queue = [];
    this.tick = 0; this.rate = 0.11; this.grow = 0; this.dead = 0;
    this.placeFood();
  }
  placeFood() {
    const occ = new Set(this.body.map(([x, y]) => y * GW + x));
    let k;
    do { k = (Math.random() * GW * GH) | 0; } while (occ.has(k));
    this.food = [k % GW, (k / GW) | 0];
  }
  safe(x, y, upto = this.body.length - 1) {
    if (x < 0 || y < 0 || x >= GW || y >= GH) return false;
    for (let i = 0; i < upto; i++) if (this.body[i][0] === x && this.body[i][1] === y) return false;
    return true;
  }
  space(x, y) {
    // flood-fill size from a cell: keeps the demo snake out of dead ends
    const seen = new Set(); const q = [[x, y]]; let n = 0;
    while (q.length && n < 120) {
      const [cx, cy] = q.pop(); const k = cy * GW + cx;
      if (seen.has(k) || !this.safe(cx, cy)) continue;
      seen.add(k); n++;
      DIRS.forEach(([dx, dy]) => q.push([cx + dx, cy + dy]));
    }
    return n;
  }
  ai() {
    const [hx, hy] = this.body[0];
    const opts = [0, 1, 2, 3].filter(d => d !== (this.dir + 2) % 4 && this.safe(hx + DIRS[d][0], hy + DIRS[d][1]));
    if (!opts.length) return aiInput();
    const best = opts.map(d => {
      const nx = hx + DIRS[d][0], ny = hy + DIRS[d][1];
      const room = this.space(nx, ny);
      const dist = Math.abs(nx - this.food[0]) + Math.abs(ny - this.food[1]);
      return { d, s: (room < this.body.length + 4 ? -1000 + room : 0) - dist };
    }).sort((a, b) => b.s - a.s)[0].d;
    return aiInput({}, { up: best === 0, right: best === 1, down: best === 2, left: best === 3 });
  }
  update(dt, inp) {
    if (this.dead > 0) { this.dead -= dt; if (this.dead <= 0) this.gameOver(); return; }
    const want = inp.tap.up || inp.up ? 0 : inp.tap.right || inp.right ? 1 : inp.tap.down || inp.down ? 2 : inp.tap.left || inp.left ? 3 : -1;
    const last = this.queue.length ? this.queue[this.queue.length - 1] : this.dir;
    if (want >= 0 && want !== last && want !== (last + 2) % 4 && this.queue.length < 3) this.queue.push(want);
    this.tick += dt;
    if (this.tick < this.rate) return;
    this.tick = 0;
    if (this.queue.length) this.dir = this.queue.shift();
    const [hx, hy] = this.body[0];
    const nx = hx + DIRS[this.dir][0], ny = hy + DIRS[this.dir][1];
    if (!this.safe(nx, ny, this.grow ? this.body.length : this.body.length - 1)) { this.dead = 1; this.sound('die'); return; }
    this.body.unshift([nx, ny]);
    if (this.grow) this.grow--; else this.body.pop();
    if (nx === this.food[0] && ny === this.food[1]) {
      this.addScore(10 + (this.body.length >> 2)); this.grow += 3; this.rate = Math.max(0.05, this.rate * 0.97);
      this.placeFood(); this.sound('gem');
    }
  }
  draw(c) {
    c.fillStyle = '#6c5eb5'; c.fillRect(0, 0, W, H);          // border
    c.fillStyle = '#352879'; c.fillRect(OX, OY, GW * C, GH * C); // screen
    this.text(`SCORE ${this.score}`, OX, 8, { size: 9, align: 'left', color: '#fff' });
    this.text(`HI ${Math.max(this.hi, this.score)}`, OX + GW * C, 8, { size: 9, align: 'right', color: '#fff' });
    c.fillStyle = '#ff7777';
    const [fx, fy] = this.food;
    c.fillRect(OX + fx * C + 2, OY + fy * C + 1, 4, 6); c.fillRect(OX + fx * C + 1, OY + fy * C + 2, 6, 4);
    this.body.forEach(([x, y], i) => {
      c.fillStyle = i === 0 ? '#c9ff8a' : (i % 2 ? '#7fd65a' : '#5fb84a');
      c.fillRect(OX + x * C, OY + y * C, C - 1, C - 1);
    });
    if (this.dead > 0) { c.fillStyle = 'rgba(255,255,255,0.25)'; c.fillRect(OX, OY, GW * C, GH * C); }
    this.text('READY.', OX, OY + GH * C + 2, { size: 8, align: 'left', color: '#a5a5ff' });
    if (Math.floor(this.t * 2) % 2) { c.fillStyle = '#a5a5ff'; c.fillRect(OX + 38, OY + GH * C + 2, 6, 8); }
  }
}
