// SWORD & KEY — a top-down action-adventure in the spirit of 1986's console adventures: explore a world
// of screens, fight what lives there with your sword, find the three key shards, then open the cave in
// the middle of the map. Nothing tells you where to go; the world is there to be explored.
import { Game, aiInput } from './base.js';

const S = 16, COLS = 16, ROWS = 11, HUD = 16, W = COLS * S, H = ROWS * S + HUD, WORLD = 3;
const GRASS = 0, TREE = 1, WATER = 2, ROCK = 3, SAND = 4, CAVE = 5;
const BLOCK = new Set([TREE, WATER, ROCK]);
const DIRS = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };

function rng(seed) { let s = (seed * 2654435761) >>> 0 || 7; return () => { s ^= s << 13; s ^= s >>> 17; s ^= s << 5; return ((s >>> 0) % 10000) / 10000; }; }

export class SwordKey extends Game {
  constructor(sfx) { super({ id: 'swordkey', w: W, h: H, sfx }); this.title = 'SWORD & KEY'; }
  reset() {
    this.hp = 6; this.maxHp = 6; this.loop = 0; this.shards = new Set(); this.newWorld();
  }
  newWorld() {
    this.loop++;
    this.screens = [];
    for (let sy = 0; sy < WORLD; sy++) for (let sx = 0; sx < WORLD; sx++) this.screens.push(this.makeScreen(sx, sy));
    // three shards in three different outer screens
    const outer = [0, 1, 2, 3, 5, 6, 7, 8].sort(() => Math.random() - 0.5).slice(0, 3);
    this.shardAt = new Map(outer.map(i => [i, this.freeSpot(this.screens[i])]));
    this.shards = new Set();
    this.sx = 1; this.sy = 1; this.px = 7.5 * S; this.py = 8.5 * S; this.face = 'up';
    this.enter();
  }
  makeScreen(sx, sy) {
    const r = rng(sx * 31 + sy * 97 + this.loop * 13 + 5);
    const g = Array.from({ length: ROWS }, () => Array(COLS).fill(GRASS));
    for (let x = 0; x < COLS; x++) { g[0][x] = TREE; g[ROWS - 1][x] = TREE; }
    for (let y = 0; y < ROWS; y++) { g[y][0] = TREE; g[y][COLS - 1] = TREE; }
    // openings toward neighbouring screens
    if (sy > 0) for (let x = 7; x <= 8; x++) g[0][x] = SAND;
    if (sy < WORLD - 1) for (let x = 7; x <= 8; x++) g[ROWS - 1][x] = SAND;
    if (sx > 0) for (let y = 5; y <= 5; y++) g[y][0] = SAND;
    if (sx < WORLD - 1) for (let y = 5; y <= 5; y++) g[y][COLS - 1] = SAND;
    // features
    const kind = r();
    for (let k = 0; k < 6; k++) {
      const x = 2 + ((r() * (COLS - 4)) | 0), y = 2 + ((r() * (ROWS - 4)) | 0), t = kind < 0.3 ? WATER : kind < 0.6 ? ROCK : TREE;
      g[y][x] = t; if (r() < 0.6) g[y][x + 1 < COLS - 1 ? x + 1 : x] = t;
    }
    // keep the cross paths clear so every exit is reachable
    for (let x = 1; x < COLS - 1; x++) g[5][x] = g[5][x] === GRASS || g[5][x] === SAND ? g[5][x] : SAND;
    for (let y = 1; y < ROWS - 1; y++) { if (BLOCK.has(g[y][7])) g[y][7] = SAND; if (BLOCK.has(g[y][8])) g[y][8] = SAND; }
    if (sx === 1 && sy === 1) { // the cave, up and to the left of the crossroads, with a clear way in
      for (const [x, y] of [[3, 1], [4, 1], [2, 2], [5, 2]]) g[y][x] = ROCK;
      g[2][3] = CAVE; g[2][4] = CAVE;
      for (let y = 3; y <= 5; y++) { g[y][3] = GRASS; g[y][4] = GRASS; }
    }
    return { g, sx, sy };
  }
  // a random grass tile the hero can reach from the screen's paths (flood fill from the centre)
  freeSpot(scr) {
    if (!scr.reach) {
      scr.reach = new Set(); const q = [[7, 5]];
      while (q.length) {
        const [x, y] = q.pop(), k = y * COLS + x;
        if (x < 1 || y < 1 || x >= COLS - 1 || y >= ROWS - 1 || scr.reach.has(k) || BLOCK.has(scr.g[y][x])) continue;
        scr.reach.add(k); q.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
      }
    }
    const spots = [...scr.reach].filter(k => scr.g[(k / COLS) | 0][k % COLS] === GRASS && (k % COLS) > 1 && (k % COLS) < COLS - 2 && ((k / COLS) | 0) > 1 && ((k / COLS) | 0) < ROWS - 2);
    const k = spots.length ? spots[(Math.random() * spots.length) | 0] : 3 * COLS + 4;
    return [k % COLS, (k / COLS) | 0];
  }
  get scr() { return this.screens[this.sy * WORLD + this.sx]; }
  enter() {
    this.swing = 0; this.hurt = 0;
    const n = this.sx === 1 && this.sy === 1 ? 1 : 2 + Math.min(3, this.loop) + ((Math.random() * 2) | 0);
    this.foes = [];
    for (let i = 0; i < n; i++) { const [x, y] = this.freeSpot(this.scr); if (Math.hypot(x * S - this.px, y * S - this.py) < 48) continue; this.foes.push({ x: x * S + 8, y: y * S + 8, hp: this.loop > 1 && Math.random() < 0.4 ? 2 : 1, dir: 'left', t: Math.random(), hit: 0, kind: Math.random() < 0.5 ? 0 : 1 }); }
    this.drops = [];
  }
  tile(px, py) { const x = Math.floor(px / S), y = Math.floor(py / S); if (x < 0 || y < 0 || x >= COLS || y >= ROWS) return SAND; return this.scr.g[y][x]; }
  free(px, py, r = 5) { return [[-r, -r], [r, -r], [-r, r], [r, r]].every(([dx, dy]) => !BLOCK.has(this.tile(px + dx, py + dy))); }
  ai() {
    if (this.hp <= 0) return aiInput();
    // pick a goal tile: the nearest foe, this screen's shard, the exit toward the next shard, or the cave
    const foe = this.foes.slice().sort((a, b) => Math.hypot(a.x - this.px, a.y - this.py) - Math.hypot(b.x - this.px, b.y - this.py))[0];
    const key = this.sy * WORLD + this.sx, shard = this.shardAt.get(key);
    const goals = [];
    if (foe && Math.hypot(foe.x - this.px, foe.y - this.py) < 64) goals.push([Math.floor(foe.x / S), Math.floor(foe.y / S)]);
    if (shard && !this.shards.has(key)) goals.push(shard);
    else {
      const want = this.shards.size >= 3 ? 4 : [...this.shardAt.keys()].find(k => !this.shards.has(k));
      const wx = want % WORLD, wy = (want / WORLD) | 0;
      if (wx === this.sx && wy === this.sy) goals.push([3, 2]);
      else if (wx > this.sx) goals.push([COLS - 1, 5]); else if (wx < this.sx) goals.push([0, 5]);
      else if (wy > this.sy) goals.push([7, ROWS - 1]); else goals.push([7, 0]);
    }
    // breadth-first search over walkable tiles (falling back to the next goal if one can't be reached)
    const cx = Math.floor(this.px / S), cy = Math.floor(this.py / S), start = cy * COLS + cx;
    let hit = null, prev = null, goal = goals[goals.length - 1];
    for (const gl of goals) {
      prev = new Map([[start, -1]]); const q = [start];
      while (q.length) {
        const k = q.shift(), x = k % COLS, y = (k / COLS) | 0;
        if (x === gl[0] && y === gl[1]) { hit = k; break; }
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const nx = x + dx, ny = y + dy, n = ny * COLS + nx;
          if (nx < 0 || ny < 0 || nx >= COLS || ny >= ROWS || prev.has(n) || BLOCK.has(this.scr.g[ny][nx])) continue;
          prev.set(n, k); q.push(n);
        }
      }
      if (hit != null) { goal = gl; break; }
    }
    let nx = cx, ny = cy;
    if (hit != null) { let k = hit; while (prev.get(k) !== start && prev.get(k) !== -1) k = prev.get(k); nx = k % COLS; ny = (k / COLS) | 0; }
    const tx = nx * S + 8, ty = ny * S + 8, h = {};
    if (nx === cx && ny === cy && hit === start) { // at the goal tile: walk off the screen edge or into the cave
      if (goal[0] === COLS - 1) h.right = true; else if (goal[0] === 0) h.left = true; else if (goal[1] === ROWS - 1) h.down = true; else if (goal[1] === 0) h.up = true; else h.up = true;
    } else if (nx !== cx) { if (Math.abs(this.py - ty) > 2) h[this.py < ty ? 'down' : 'up'] = true; else h[tx > this.px ? 'right' : 'left'] = true; }
    else if (ny !== cy) { if (Math.abs(this.px - tx) > 2) h[this.px < tx ? 'right' : 'left'] = true; else h[ty > this.py ? 'down' : 'up'] = true; }
    else if (Math.abs(this.px - tx) > 2) h[this.px < tx ? 'right' : 'left'] = true; else if (Math.abs(this.py - ty) > 2) h[this.py < ty ? 'down' : 'up'] = true;
    // face a nearby foe and swing
    let tap = {};
    if (foe && Math.hypot(foe.x - this.px, foe.y - this.py) < 24) {
      const dx = foe.x - this.px, dy = foe.y - this.py, dir = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up');
      if (this.face !== dir) { for (const k in h) delete h[k]; h[dir] = true; } else tap.a = this.swing <= 0;
    }
    return aiInput(h, tap);
  }
  update(dt, inp) {
    if (this.hp <= 0) { this.dying -= dt; if (this.dying <= 0) this.gameOver(); return; }
    this.hurt = Math.max(0, this.hurt - dt);
    // move
    let mx = 0, my = 0;
    if (inp.left) { mx = -1; this.face = 'left'; } else if (inp.right) { mx = 1; this.face = 'right'; }
    else if (inp.up) { my = -1; this.face = 'up'; } else if (inp.down) { my = 1; this.face = 'down'; }
    const sp = this.swing > 0 ? 0 : 62;
    if (this.free(this.px + mx * sp * dt, this.py)) this.px += mx * sp * dt;
    if (this.free(this.px, this.py + my * sp * dt)) this.py += my * sp * dt;
    // change screens at the edges
    if (this.px < 2 && this.sx > 0) { this.sx--; this.px = W - 10; this.enter(); }
    else if (this.px > W - 2 && this.sx < WORLD - 1) { this.sx++; this.px = 10; this.enter(); }
    else if (this.py < 2 && this.sy > 0) { this.sy--; this.py = ROWS * S - 10; this.enter(); }
    else if (this.py > ROWS * S - 2 && this.sy < WORLD - 1) { this.sy++; this.py = 10; this.enter(); }
    // sword
    if (inp.tap.a && this.swing <= 0) { this.swing = 0.25; this.sound('shoot'); }
    this.swing -= dt;
    if (this.swing > 0) {
      const [fx, fy] = DIRS[this.face], hx = this.px + fx * 13, hy = this.py + fy * 13;
      for (const f of this.foes) if (f.hit <= 0 && Math.abs(f.x - hx) < 11 && Math.abs(f.y - hy) < 11) {
        f.hp--; f.hit = 0.3; if (this.free(f.x + fx * 14, f.y + fy * 14, 6)) { f.x += fx * 14; f.y += fy * 14; } this.sound('hit');
        if (f.hp <= 0) { this.addScore(50 * this.loop); if (Math.random() < 0.3) this.drops.push({ x: f.x, y: f.y, t: 6 }); }
      }
      this.foes = this.foes.filter(f => f.hp > 0);
    }
    // foes wander and hurt on touch
    for (const f of this.foes) {
      f.hit -= dt; f.t -= dt;
      if (f.t <= 0) { f.dir = Math.random() < 0.4 ? (Math.abs(this.px - f.x) > Math.abs(this.py - f.y) ? (this.px > f.x ? 'right' : 'left') : (this.py > f.y ? 'down' : 'up')) : ['up', 'down', 'left', 'right'][(Math.random() * 4) | 0]; f.t = 0.6 + Math.random(); }
      const [fx, fy] = DIRS[f.dir], s = (f.kind ? 34 : 24) + this.loop * 4;
      const nx = f.x + fx * s * dt, ny = f.y + fy * s * dt;
      if (this.free(nx, ny, 6) && nx > 12 && nx < W - 12 && ny > 12 && ny < ROWS * S - 12) { f.x = nx; f.y = ny; } else f.t = 0;
      if (this.hurt <= 0 && Math.abs(f.x - this.px) < 11 && Math.abs(f.y - this.py) < 11) {
        this.hp--; this.hurt = 1; this.sound('die');
        const [kx, ky] = DIRS[this.face]; if (this.free(this.px - kx * 12, this.py - ky * 12)) { this.px -= kx * 12; this.py -= ky * 12; }
        if (this.hp <= 0) { this.dying = 1.2; return; }
      }
    }
    // hearts
    for (const d of this.drops) { d.t -= dt; if (Math.hypot(d.x - this.px, d.y - this.py) < 10) { this.hp = Math.min(this.maxHp, this.hp + 2); d.t = 0; this.sound('gem'); } }
    this.drops = this.drops.filter(d => d.t > 0);
    // shard
    const key = this.sy * WORLD + this.sx, sh = this.shardAt.get(key);
    if (sh && !this.shards.has(key) && Math.hypot(sh[0] * S + 8 - this.px, sh[1] * S + 8 - this.py) < 11) { this.shards.add(key); this.addScore(1000); this.sound('power'); }
    // the cave
    if (this.tile(this.px, this.py - 6) === CAVE && this.shards.size >= 3) {
      this.addScore(3000 * this.loop); this.maxHp = Math.min(12, this.maxHp + 2); this.hp = this.maxHp; this.sound('start'); this.newWorld();
    }
  }
  draw(c) {
    const COLORS = { [GRASS]: '#5aa048', [SAND]: '#c8b078', [TREE]: '#1a5a2a', [WATER]: '#2a6ab0', [ROCK]: '#7a7a88', [CAVE]: '#000' };
    c.fillStyle = '#000'; c.fillRect(0, 0, W, HUD);
    const g = this.scr.g;
    for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) {
      const t = g[y][x], px = x * S, py = y * S + HUD;
      c.fillStyle = t === GRASS || t === SAND ? COLORS[t] : COLORS[GRASS]; c.fillRect(px, py, S, S);
      if (t === GRASS && (x * 7 + y * 3) % 5 === 0) { c.fillStyle = '#7ac060'; c.fillRect(px + 4, py + 6, 1, 3); c.fillRect(px + 7, py + 5, 1, 3); }
      if (t === TREE) { c.fillStyle = '#5a3a1a'; c.fillRect(px + 7, py + 9, 2, 7); c.fillStyle = '#1a5a2a'; c.beginPath(); c.moveTo(px + 8, py); c.lineTo(px + 15, py + 11); c.lineTo(px + 1, py + 11); c.fill(); c.fillStyle = '#2a7a3a'; c.fillRect(px + 6, py + 4, 2, 4); }
      else if (t === WATER) { c.fillStyle = '#2a6ab0'; c.fillRect(px, py, S, S); c.fillStyle = '#8ac0f0'; c.fillRect(px + ((x + Math.floor(this.t * 2)) % 3) * 4, py + 6, 5, 1); }
      else if (t === ROCK) { c.fillStyle = '#7a7a88'; c.beginPath(); c.arc(px + 8, py + 9, 7, 0, Math.PI * 2); c.fill(); c.fillStyle = '#a8a8b8'; c.fillRect(px + 4, py + 5, 4, 2); }
      else if (t === CAVE) { c.fillStyle = '#4a4a58'; c.fillRect(px, py, S, S); c.fillStyle = this.shards.size >= 3 ? '#000' : '#2a2a34'; c.beginPath(); c.arc(px + 8, py + 16, 7, Math.PI, 0); c.fill(); }
    }
    // shard
    const key = this.sy * WORLD + this.sx, sh = this.shardAt.get(key);
    if (sh && !this.shards.has(key)) { const px = sh[0] * S + 8, py = sh[1] * S + 8 + HUD; c.fillStyle = Math.floor(this.t * 6) % 2 ? '#ffe14d' : '#fff7b0'; c.beginPath(); c.moveTo(px, py - 6); c.lineTo(px + 5, py); c.lineTo(px, py + 6); c.lineTo(px - 5, py); c.fill(); }
    for (const d of this.drops) { if (d.t < 2 && Math.floor(this.t * 8) % 2) continue; c.fillStyle = '#e02040'; c.fillRect(d.x - 3, d.y + HUD - 2, 2, 2); c.fillRect(d.x + 1, d.y + HUD - 2, 2, 2); c.fillRect(d.x - 3, d.y + HUD, 6, 2); c.fillRect(d.x - 1, d.y + HUD + 2, 2, 2); }
    for (const f of this.foes) {
      if (f.hit > 0 && Math.floor(this.t * 20) % 2) continue;
      const x = Math.round(f.x), y = Math.round(f.y) + HUD;
      if (f.kind === 0) { c.fillStyle = f.hp > 1 ? '#3048f8' : '#d82800'; c.fillRect(x - 6, y - 4, 12, 9); c.fillRect(x - 4, y - 6, 8, 2); c.fillStyle = '#fff'; c.fillRect(x - 3, y - 2, 2, 2); c.fillRect(x + 1, y - 2, 2, 2); }
      else { c.fillStyle = f.hp > 1 ? '#a020c0' : '#e86010'; const s = Math.floor(this.t * 10) % 2; c.fillRect(x - 6, y - 1, 12, 3); c.fillRect(x - 1, y - 6, 3, 12); if (s) { c.fillRect(x - 5, y - 5, 2, 2); c.fillRect(x + 3, y + 3, 2, 2); } else { c.fillRect(x + 3, y - 5, 2, 2); c.fillRect(x - 5, y + 3, 2, 2); } }
    }
    // the hero: a small adventurer with a blue tunic and a round shield (original)
    if (this.hp > 0 && !(this.hurt > 0 && Math.floor(this.t * 16) % 2)) {
      const x = Math.round(this.px), y = Math.round(this.py) + HUD, [fx, fy] = DIRS[this.face];
      c.fillStyle = '#2860d8'; c.fillRect(x - 5, y - 3, 10, 9);
      c.fillStyle = '#f8b878'; c.fillRect(x - 4, y - 8, 8, 6);
      c.fillStyle = '#8a4a10'; c.fillRect(x - 5, y - 9, 10, 3);
      c.fillStyle = '#f8d830'; c.fillRect(x - fx * 6 - 2 + (fy ? 5 : 0), y + 1, 4, 4);
      if (this.swing > 0) { c.fillStyle = '#e8e8e8'; if (fx) c.fillRect(x + (fx > 0 ? 5 : -15), y, 10, 2); else c.fillRect(x - 1, y + (fy > 0 ? 6 : -18), 2, 12); }
    }
    // HUD: hearts, shards, map dot
    for (let i = 0; i < this.maxHp / 2; i++) { const full = this.hp >= (i + 1) * 2, half = this.hp === i * 2 + 1; c.fillStyle = full ? '#e02040' : half ? '#f08080' : '#402028'; c.fillRect(6 + i * 9, 5, 7, 6); }
    this.text(`SHARDS ${this.shards.size}/3`, W / 2, 4, { size: 8 });
    for (let y = 0; y < WORLD; y++) for (let x = 0; x < WORLD; x++) { c.fillStyle = x === this.sx && y === this.sy ? '#7cff6b' : '#444'; c.fillRect(W - 24 + x * 6, 2 + y * 4, 5, 3); }
    this.text(`${this.score}`, W - 30, 4, { size: 8, align: 'right' });
    if (this.shards.size >= 3 && Math.floor(this.t * 2) % 2) this.text('THE CAVE IS OPEN', W / 2, H - 12, { size: 8, color: '#fff' });
  }
}
