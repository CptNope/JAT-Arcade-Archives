// CASTLE QUEST — a flip-screen action-adventure in the style of 1980's Adventure for the Atari 2600:
// you are a small square. Find the key, the sword and the golden cup, dodge the dragons, and bring the cup home.
import { Game, aiInput } from './base.js';

const T = 12, RW = 20, RH = 14, RX = 3, RY = 3, GW = RW * RX, GH = RH * RY, TOP = 12;
const W = RW * T, H = RH * T + TOP;
const HOME = [1, 2];                  // room with the castle
const VAULT = [1, 0];                 // locked room with the cup
const ROOM_WALLS = {
  '0,0': [[4, 4, 6, 1], [10, 9, 6, 1]], '2,0': [[5, 3, 1, 3], [14, 8, 1, 3]], '1,0': [[3, 4, 4, 1], [13, 4, 4, 1]],
  '0,1': [[3, 3, 4, 1], [13, 10, 4, 1]], '2,1': [[3, 3, 3, 2], [14, 9, 3, 2]], '1,1': [[3, 10, 3, 1], [14, 3, 3, 1]],
  '0,2': [[4, 3, 1, 3], [15, 8, 1, 3]], '2,2': [[3, 3, 4, 1], [13, 10, 4, 1]],
};
const ROOM_COLORS = { '0,0': '#7a5cff', '1,0': '#d4af37', '2,0': '#2fa36b', '0,1': '#3a86ff', '1,1': '#8a8a8a', '2,1': '#ff7b54', '0,2': '#ff4d6d', '1,2': '#ffd23f', '2,2': '#4cc9f0' };

export class CastleQuest extends Game {
  constructor(sfx) { super({ id: 'castlequest', w: W, h: H, sfx }); this.title = 'CASTLE QUEST'; }
  buildWorld() {
    const g = this.grid = Array.from({ length: GH }, () => Array(GW).fill(0));
    for (let ry = 0; ry < RY; ry++) for (let rx = 0; rx < RX; rx++) {
      const x0 = rx * RW, y0 = ry * RH;
      for (let x = 0; x < RW; x++) { g[y0][x0 + x] = 1; g[y0 + RH - 1][x0 + x] = 1; }
      for (let y = 0; y < RH; y++) { g[y0 + y][x0] = 1; g[y0 + y][x0 + RW - 1] = 1; }
      // openings to neighbours
      if (ry > 0) for (let x = 8; x < 12; x++) g[y0][x0 + x] = 0;
      if (ry < RY - 1) for (let x = 8; x < 12; x++) g[y0 + RH - 1][x0 + x] = 0;
      if (rx > 0) for (let y = 5; y < 9; y++) g[y0 + y][x0] = 0;
      if (rx < RX - 1) for (let y = 5; y < 9; y++) g[y0 + y][x0 + RW - 1] = 0;
      for (const [x, y, w, h] of ROOM_WALLS[`${rx},${ry}`] || []) for (let yy = 0; yy < h; yy++) for (let xx = 0; xx < w; xx++) g[y0 + y + yy][x0 + x + xx] = 1;
    }
    // the castle in the home room: a walled keep with an open gate at the bottom
    const cx = HOME[0] * RW + 6, cy = HOME[1] * RH + 2;
    for (let x = 0; x < 8; x++) { g[cy][cx + x] = 1; if (x < 3 || x > 4) g[cy + 5][cx + x] = 1; }
    for (let y = 0; y < 6; y++) { g[cy + y][cx] = 1; g[cy + y][cx + 7] = 1; }
    for (const x of [0, 2, 5, 7]) g[cy - 1][cx + x] = 1; // battlements
    this.inside = { x0: (cx + 1) * T, x1: (cx + 7) * T, y0: (cy + 1) * T, y1: (cy + 5) * T };
    // the vault gate: the opening between the grey room and the gold vault, locked until the key touches it
    this.gate = []; for (let x = 8; x < 12; x++) { const gx = VAULT[0] * RW + x, gy = VAULT[1] * RH + RH - 1; g[gy][gx] = 2; this.gate.push([gx, gy]); }
  }
  reset() {
    if (!this.grid) this.buildWorld(); // the base constructor calls reset() before ours finishes
    this.lives = 3; this.round = 0;
    for (const [x, y] of this.gate) this.grid[y][x] = 2;
    this.nextRound();
  }
  nextRound() {
    this.round++;
    const spot = (rx, ry, dx = 10, dy = 7) => ({ x: (rx * RW + dx) * T, y: (ry * RH + dy) * T });
    const rooms = [[0, 0], [2, 0], [0, 1], [2, 1], [0, 2], [2, 2]].sort(() => Math.random() - 0.5);
    this.items = {
      key: { ...spot(...rooms[0]), color: '#ffe14d' },
      sword: { ...spot(...rooms[1]), color: '#e8e8e8' },
      cup: { ...spot(...VAULT, 10, 9), color: '#ffd23f' },
    };
    this.dragons = [
      { ...spot(...VAULT, 10, 3), color: '#2fa36b', speed: 34 + this.round * 4, alive: true, home: VAULT },
      { ...spot(...rooms[2], 4, 3), color: '#ff4d6d', speed: 40 + this.round * 4, alive: true, home: rooms[2] },
    ];
    this.spawn();
  }
  spawn() { this.px = (HOME[0] * RW + 9.5) * T; this.py = (HOME[1] * RH + 10) * T; this.carry = null; this.dead = 0; }
  room(x, y) { return [Math.floor(x / (RW * T)), Math.floor(y / (RH * T))]; }
  solid(x, y) { const tx = Math.floor(x / T), ty = Math.floor(y / T); return tx < 0 || ty < 0 || tx >= GW || ty >= GH || this.grid[ty][tx] !== 0; }
  boxFree(x, y, r = 3.5) { return !this.solid(x - r, y - r) && !this.solid(x + r, y - r) && !this.solid(x - r, y + r) && !this.solid(x + r, y + r); }

  // breadth-first path over the whole world; returns the next tile centre toward the goal
  pathStep(fx, fy, tx, ty) {
    const sx = Math.floor(fx / T), sy = Math.floor(fy / T), gx = Math.floor(tx / T), gy = Math.floor(ty / T);
    const key = (x, y) => y * GW + x, prev = new Map([[key(sx, sy), -1]]), q = [[sx, sy]];
    while (q.length) {
      const [x, y] = q.shift();
      if (x === gx && y === gy) {
        let k = key(x, y); while (prev.get(k) !== key(sx, sy) && prev.get(k) !== -1) k = prev.get(k);
        return [((k % GW) + 0.5) * T, (Math.floor(k / GW) + 0.5) * T];
      }
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = x + dx, ny = y + dy, nk = key(nx, ny);
        if (nx < 0 || ny < 0 || nx >= GW || ny >= GH || prev.has(nk)) continue;
        const v = this.grid[ny][nx]; if (v === 1 || (v === 2 && this.carry !== 'key' && !(gx === nx && gy === ny))) continue;
        prev.set(nk, key(x, y)); q.push([nx, ny]);
      }
    }
    return null;
  }
  ai() {
    if (this.dead) return aiInput();
    const it = this.items;
    let goal;
    const gateOpen = this.grid[this.gate[0][1]][this.gate[0][0]] === 0;
    if (this.carry === 'cup') goal = { x: (this.inside.x0 + this.inside.x1) / 2, y: (this.inside.y0 + this.inside.y1) / 2 };
    else if (!gateOpen && this.carry !== 'key') goal = it.key;
    else if (!gateOpen) goal = { x: (this.gate[1][0] + 0.5) * T, y: (this.gate[1][1] + 1.5) * T };
    else if (this.dragons.some(d => d.alive) && this.carry !== 'sword') goal = it.sword;
    else goal = it.cup;
    const nxt = goal && this.pathStep(this.px, this.py, goal.x, goal.y);
    if (!nxt) return aiInput();
    const dx = nxt[0] - this.px, dy = nxt[1] - this.py;
    return aiInput({ left: dx < -1, right: dx > 1, up: dy < -1, down: dy > 1 });
  }
  update(dt, inp) {
    if (this.dead > 0) { this.dead -= dt; if (this.dead <= 0) { if (this.lives <= 0) { this.gameOver(); return; } this.spawn(); } return; }
    const sp = 62 * dt;
    const mx = (inp.right ? 1 : 0) - (inp.left ? 1 : 0), my = (inp.down ? 1 : 0) - (inp.up ? 1 : 0);
    // the key opens the vault gate when carried into it
    if (this.carry === 'key') for (const [gx, gy] of this.gate) if (Math.abs((gx + 0.5) * T - this.px) < 30 && Math.abs((gy + 0.5) * T - this.py) < 16 && this.grid[gy][gx] === 2) { for (const [x, y] of this.gate) this.grid[y][x] = 0; this.sound('power'); this.addScore(100); }
    if (mx && this.boxFree(this.px + mx * sp, this.py)) this.px += mx * sp;
    if (my && this.boxFree(this.px, this.py + my * sp)) this.py += my * sp;
    // carried item rides beside the player
    if (this.carry) { const it = this.items[this.carry]; it.x = this.px + 8; it.y = this.py; }
    if (inp.tap.a && this.carry) { this.items[this.carry].x = this.px; this.items[this.carry].y = this.py + 10; this.carry = null; this.sound('wall'); }
    for (const [name, it] of Object.entries(this.items)) {
      if (name !== this.carry && Math.abs(it.x - this.px) < 9 && Math.abs(it.y - this.py) < 9 && !inp.tap.a) {
        if (this.carry) { const old = this.items[this.carry]; old.x = this.px - 12; old.y = this.py; }
        this.carry = name; this.sound('gem');
      }
    }
    // dragons hunt you when they share your room
    const [prx, pry] = this.room(this.px, this.py);
    for (const d of this.dragons) {
      if (!d.alive) continue;
      const [drx, dry] = this.room(d.x, d.y);
      if (drx === prx && dry === pry) {
        const nxt = this.pathStep(d.x, d.y, this.px, this.py);
        if (nxt) { const dx = nxt[0] - d.x, dy = nxt[1] - d.y, l = Math.hypot(dx, dy) || 1; d.x += dx / l * d.speed * dt; d.y += dy / l * d.speed * dt; }
      }
      if (Math.abs(d.x - this.px) < 10 && Math.abs(d.y - this.py) < 12) {
        if (this.carry === 'sword') { d.alive = false; this.addScore(500); this.sound('hit'); }
        else { this.lives--; this.dead = 1.5; this.sound('die'); if (this.carry) { this.items[this.carry].x = this.px; this.items[this.carry].y = this.py; } this.carry = null; }
      }
    }
    // bring the cup inside the castle to win the round
    const cup = this.items.cup, inn = this.inside;
    if (cup.x > inn.x0 && cup.x < inn.x1 && cup.y > inn.y0 && cup.y < inn.y1) {
      this.addScore(2000 + this.lives * 200); this.sound('start');
      for (const [x, y] of this.gate) this.grid[y][x] = 2;
      this.nextRound();
    }
  }
  draw(c) {
    const [rx, ry] = this.room(this.px, this.py);
    const col = ROOM_COLORS[`${rx},${ry}`] || '#888';
    c.fillStyle = '#b8b8b8'; c.fillRect(0, 0, W, H);
    c.fillStyle = '#d8d0bc'; c.fillRect(0, TOP, W, H - TOP);
    const ox = rx * RW, oy = ry * RH;
    for (let y = 0; y < RH; y++) for (let x = 0; x < RW; x++) {
      const v = this.grid[oy + y][ox + x];
      if (v === 1) { c.fillStyle = col; c.fillRect(x * T, TOP + y * T, T, T); }
      if (v === 2) { c.fillStyle = '#333'; for (let k = 1; k < T; k += 3) c.fillRect(x * T + k, TOP + y * T, 1, T); }
    }
    const toScreen = (o) => [o.x - ox * T, o.y - oy * T + TOP];
    const inRoom = (o) => { const [a, b] = this.room(o.x, o.y); return a === rx && b === ry; };
    for (const [name, it] of Object.entries(this.items)) {
      if (!inRoom(it)) continue;
      const [x, y] = toScreen(it); c.fillStyle = it.color;
      if (name === 'key') { c.fillRect(x - 5, y - 1, 8, 2); c.fillRect(x + 2, y - 3, 4, 6); c.fillRect(x - 5, y + 1, 2, 2); }
      else if (name === 'sword') { c.fillRect(x - 6, y - 1, 12, 2); c.fillRect(x - 4, y - 3, 2, 6); }
      else { c.fillRect(x - 4, y - 4, 8, 3); c.fillRect(x - 1, y - 1, 2, 4); c.fillRect(x - 3, y + 3, 6, 2); }
    }
    for (const d of this.dragons) {
      if (!inRoom(d)) continue;
      const [x, y] = toScreen(d); c.fillStyle = d.alive ? d.color : '#666';
      // blocky original dragon: long neck, head, body
      c.fillRect(x - 4, y - 10, 6, 5); c.fillRect(x - 2, y - 5, 3, 6); c.fillRect(x - 5, y + 1, 11, 7); c.fillRect(x - 5, y + 8, 3, 3); c.fillRect(x + 3, y + 8, 3, 3);
      if (d.alive && Math.floor(this.t * 4) % 2) { c.fillStyle = '#fff'; c.fillRect(x - 3, y - 9, 2, 2); }
    }
    if (!this.dead || Math.floor(this.t * 10) % 2) { const [x, y] = toScreen({ x: this.px, y: this.py }); c.fillStyle = col === '#ffd23f' ? '#333' : '#222'; c.fillRect(x - 4, y - 4, 8, 8); c.fillStyle = col; c.fillRect(x - 2, y - 2, 4, 4); }
    this.text(`SCORE ${this.score}`, 4, 2, { size: 8, align: 'left', color: '#222' });
    this.text(`LIVES ${this.lives}  ROUND ${this.round}`, W - 4, 2, { size: 8, align: 'right', color: '#222' });
  }
}
