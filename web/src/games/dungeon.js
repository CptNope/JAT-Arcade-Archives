// PLASMA DUNGEON — a top-down dungeon crawl on an orange plasma panel, in the spirit of the mid-1970s
// PLATO dungeon games: explore, fight, grab gold, find the stairs down. Original code and layout generator.
import { Game, aiInput, rand } from './base.js';

const MW = 30, MH = 22, T = 8, TOP = 14;
const W = MW * T, H = MH * T + TOP + 14;
const OR = '#ff9d2e', DIM = '#6b3a0c';
const KINDS = { g: { name: 'GOBLIN', hp: 3, atk: 1 }, o: { name: 'ORC', hp: 6, atk: 2 }, s: { name: 'SPIDER', hp: 2, atk: 1 }, w: { name: 'WIGHT', hp: 8, atk: 3 } };
const DIRS = [[0, -1], [1, 0], [0, 1], [-1, 0]];

export class Dungeon extends Game {
  constructor(sfx) { super({ id: 'dungeon', w: W, h: H, sfx, fg: OR, bg: '#000' }); this.title = 'PLASMA DUNGEON'; }
  reset() { this.hp = 12; this.maxHp = 12; this.gold = 0; this.depth = 0; this.msg = ''; this.dead = 0; this.nextLevel(); }
  nextLevel() {
    this.depth++;
    this.map = Array.from({ length: MH }, () => Array(MW).fill(1));
    const rooms = [];
    for (let tries = 0; rooms.length < 7 && tries < 200; tries++) {
      const w = 4 + ((Math.random() * 5) | 0), h = 3 + ((Math.random() * 3) | 0);
      const x = 1 + ((Math.random() * (MW - w - 2)) | 0), y = 1 + ((Math.random() * (MH - h - 2)) | 0);
      if (rooms.some(r => x <= r.x + r.w + 1 && x + w + 1 >= r.x && y <= r.y + r.h + 1 && y + h + 1 >= r.y)) continue;
      rooms.push({ x, y, w, h, cx: x + (w >> 1), cy: y + (h >> 1) });
    }
    rooms.sort((a, b) => a.cx - b.cx);
    for (const r of rooms) for (let y = r.y; y < r.y + r.h; y++) for (let x = r.x; x < r.x + r.w; x++) this.map[y][x] = 0;
    for (let i = 1; i < rooms.length; i++) {
      const a = rooms[i - 1], b = rooms[i];
      for (let x = Math.min(a.cx, b.cx); x <= Math.max(a.cx, b.cx); x++) this.map[a.cy][x] = 0;
      for (let y = Math.min(a.cy, b.cy); y <= Math.max(a.cy, b.cy); y++) this.map[y][b.cx] = 0;
    }
    const spot = (r) => { for (let i = 0; i < 50; i++) { const x = r.x + ((Math.random() * r.w) | 0), y = r.y + ((Math.random() * r.h) | 0); if (!this.at(x, y)) return [x, y]; } return [r.cx, r.cy]; };
    this.items = []; this.mons = [];
    [this.px, this.py] = [rooms[0].cx, rooms[0].cy];
    this.stairs = [rooms[rooms.length - 1].cx, rooms[rooms.length - 1].cy];
    for (let i = 0; i < 4; i++) { const [x, y] = spot(rooms[1 + (i % (rooms.length - 1))]); this.items.push({ x, y, k: '$' }); }
    for (let i = 0; i < 2; i++) { const [x, y] = spot(rooms[1 + ((Math.random() * (rooms.length - 1)) | 0)]); this.items.push({ x, y, k: '!' }); }
    const kinds = this.depth < 2 ? 'gs' : this.depth < 4 ? 'gso' : 'gsow';
    for (let i = 0; i < 3 + this.depth; i++) {
      const [x, y] = spot(rooms[1 + ((Math.random() * (rooms.length - 1)) | 0)]);
      const k = kinds[(Math.random() * kinds.length) | 0];
      this.mons.push({ x, y, k, hp: KINDS[k].hp + (this.depth >> 1) });
    }
    this.seen = new Set(); this.reveal();
    this.say(`DEPTH ${this.depth}. FIND THE STAIRS (>).`);
  }
  at(x, y) { return this.mons.find(m => m.x === x && m.y === y) || this.items.find(i => i.x === x && i.y === y); }
  open(x, y) { return x >= 0 && y >= 0 && x < MW && y < MH && this.map[y][x] === 0; }
  reveal() { for (let y = -4; y <= 4; y++) for (let x = -5; x <= 5; x++) if (x * x + y * y <= 22) this.seen.add((this.py + y) * MW + this.px + x); }
  say(s) { this.msg = s; }

  ai() {
    if ((this.aiT = (this.aiT || 0) + 1) % 5) return aiInput();
    const targets = new Set([...this.mons, ...this.items].map(o => o.y * MW + o.x));
    targets.add(this.stairs[1] * MW + this.stairs[0]);
    const prev = new Map([[this.py * MW + this.px, -1]]), q = [[this.px, this.py]];
    let goal = null;
    while (q.length) {
      const [x, y] = q.shift(), k = y * MW + x;
      if (targets.has(k) && k !== this.py * MW + this.px) { goal = k; break; }
      for (const [dx, dy] of DIRS) { const nk = (y + dy) * MW + x + dx; if (this.open(x + dx, y + dy) && !prev.has(nk)) { prev.set(nk, k); q.push([x + dx, y + dy]); } }
    }
    if (goal === null) return aiInput();
    let k = goal; while (prev.get(k) !== this.py * MW + this.px) k = prev.get(k);
    const dx = (k % MW) - this.px, dy = ((k / MW) | 0) - this.py;
    return aiInput({}, { left: dx < 0, right: dx > 0, up: dy < 0, down: dy > 0 });
  }
  update(dt, inp) {
    if (this.dead) { this.dead -= dt; if (this.dead <= 0) { this.dead = 0; if (this.mode === 'play') this.gameOver(); else this.reset(); } return; }
    // held direction repeats so long corridors aren't tedious
    this.rep = (this.rep || 0) - dt;
    let d = inp.tap.up ? 0 : inp.tap.right ? 1 : inp.tap.down ? 2 : inp.tap.left ? 3 : -1;
    if (d < 0 && this.rep <= 0) d = inp.up ? 0 : inp.right ? 1 : inp.down ? 2 : inp.left ? 3 : -1;
    if (d < 0) return;
    this.rep = 0.14;
    const nx = this.px + DIRS[d][0], ny = this.py + DIRS[d][1];
    const m = this.mons.find(o => o.x === nx && o.y === ny);
    if (m) {
      const dmg = 2 + ((Math.random() * 3) | 0); m.hp -= dmg; this.sound('hit');
      if (m.hp <= 0) { this.mons = this.mons.filter(o => o !== m); this.addScore(KINDS[m.k].hp * 20); this.say(`YOU SLAY THE ${KINDS[m.k].name}.`); }
      else this.say(`YOU HIT THE ${KINDS[m.k].name} FOR ${dmg}.`);
    } else if (this.open(nx, ny)) {
      this.px = nx; this.py = ny; this.reveal();
      const it = this.items.find(o => o.x === nx && o.y === ny);
      if (it) {
        this.items = this.items.filter(o => o !== it);
        if (it.k === '$') { const g = 10 + ((Math.random() * 20) | 0) * this.depth; this.gold += g; this.addScore(g); this.say(`YOU FIND ${g} GOLD.`); this.sound('gem'); }
        else { this.hp = Math.min(this.maxHp, this.hp + 6); this.say('A HEALING DRAUGHT. YOU FEEL BETTER.'); this.sound('power'); }
      }
      if (nx === this.stairs[0] && ny === this.stairs[1]) { this.addScore(100 * this.depth); this.maxHp += 2; this.hp = Math.min(this.maxHp, this.hp + 3); this.sound('start'); this.nextLevel(); return; }
    } else return;
    this.monsterTurn();
  }
  monsterTurn() {
    for (const m of this.mons) {
      const dx = this.px - m.x, dy = this.py - m.y, dist = Math.abs(dx) + Math.abs(dy);
      if (dist === 1) {
        const dmg = KINDS[m.k].atk + (Math.random() < 0.3 ? 1 : 0);
        this.hp -= dmg; this.say(`THE ${KINDS[m.k].name} HITS YOU FOR ${dmg}.`); this.sound('wall');
        if (this.hp <= 0) { this.say('YOU HAVE DIED IN THE DUNGEON.'); this.sound('die'); this.dead = 1.8; return; }
      } else if (dist < 8) {
        const opts = [[Math.sign(dx), 0], [0, Math.sign(dy)]].filter(([a, b]) => (a || b) && this.open(m.x + a, m.y + b) && !this.mons.some(o => o.x === m.x + a && o.y === m.y + b) && !(m.x + a === this.px && m.y + b === this.py));
        if (opts.length) { const [a, b] = opts[(Math.random() * opts.length) | 0]; m.x += a; m.y += b; }
      }
    }
  }
  draw(c) {
    c.fillStyle = '#000'; c.fillRect(0, 0, W, H);
    c.font = `bold ${T + 1}px ${this.font}`; c.textAlign = 'center'; c.textBaseline = 'middle';
    for (let y = 0; y < MH; y++) for (let x = 0; x < MW; x++) {
      const k = y * MW + x; if (!this.seen.has(k)) continue;
      if (this.map[y][x]) {
        // draw only walls that border floor, as outlines
        const edge = DIRS.some(([dx, dy]) => this.open(x + dx, y + dy));
        if (edge) { c.fillStyle = DIM; c.fillRect(x * T, TOP + y * T, T, T); c.fillStyle = '#000'; c.fillRect(x * T + 1, TOP + y * T + 1, T - 2, T - 2); }
      } else { c.fillStyle = '#2a1404'; c.fillRect(x * T + 3, TOP + y * T + 3, 1, 1); }
    }
    const glyph = (ch, x, y, col = OR) => { if (!this.seen.has(y * MW + x)) return; c.fillStyle = col; c.fillText(ch, x * T + T / 2, TOP + y * T + T / 2 + 1); };
    glyph('>', this.stairs[0], this.stairs[1], '#ffd28a');
    this.items.forEach(i => glyph(i.k, i.x, i.y, i.k === '$' ? '#ffd28a' : '#ff6a3d'));
    this.mons.forEach(m => glyph(m.k, m.x, m.y, '#ff6a3d'));
    if (!this.dead || Math.floor(this.t * 8) % 2) { c.fillStyle = '#fff1d6'; c.fillText('@', this.px * T + T / 2, TOP + this.py * T + T / 2 + 1); }
    this.text(`DEPTH ${this.depth}  HP ${Math.max(0, this.hp)}/${this.maxHp}  GOLD ${this.gold}`, 4, 2, { size: 9, align: 'left' });
    this.text(this.msg, W / 2, H - 12, { size: 8 });
  }
}
