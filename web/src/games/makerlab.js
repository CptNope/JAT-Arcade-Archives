// MAKER LAB — build a one-screen platform level, then play it. Pick a tile from the palette at the top
// (move the cursor up into it and press A), place tiles with A, and choose PLAY to try your level.
// Hold DOWN for a moment while playing to go back to editing. Levels are saved in this browser and
// can be shared as a link (see levelCode / loadCode).
import { Game, aiInput, clamp } from './base.js';

const T = 16, COLS = 16, ROWS = 10, PAL = 20, W = COLS * T, H = ROWS * T + PAL;
const EMPTY = 0, GROUND = 1, BRICK = 2, GEM = 3, SPIKE = 4, BUG = 5, SPRING = 6, START = 7, FLAG = 8;
const SOLID = new Set([GROUND, BRICK, SPRING]);
const PALETTE = [GROUND, BRICK, GEM, SPIKE, BUG, SPRING, START, FLAG, 'ERASE', 'PLAY'];
const KEY = 'jat-maker-level';
const SAMPLE =
  '0000000000000000' +
  '0000000000000080' +
  '0000000000000222' +
  '0000000000030000' +
  '0000000000222000' +
  '0000000300000000' +
  '0000002220000000' +
  '0700000000005000' +
  '1110411111111116' +
  '1111111111111111';

export function encodeLevel(grid) {
  // run-length: digit + count (base 36), for short links
  let s = '', prev = grid[0], n = 0;
  for (const v of grid) { if (v === prev && n < 35) n++; else { s += prev + n.toString(36); prev = v; n = 1; } }
  return s + prev + n.toString(36);
}
export function decodeLevel(code) {
  const out = [];
  if (!/^([0-8][0-9a-z])+$/.test(code || '')) return null;
  for (let i = 0; i < code.length; i += 2) { const v = +code[i], n = parseInt(code[i + 1], 36); for (let k = 0; k < n; k++) out.push(v); }
  return out.length === COLS * ROWS ? out : null;
}

export class MakerLab extends Game {
  constructor(sfx) { super({ id: 'makerlab', w: W, h: H, sfx }); this.title = 'MAKER LAB'; }
  reset() {
    let saved = null;
    try { const h = location.hash.match(/maker=([0-9a-z]+)/); if (h) { saved = decodeLevel(h[1]); if (saved) localStorage.setItem(KEY, h[1]); } } catch { /* no DOM */ }
    try { saved ||= decodeLevel(localStorage.getItem(KEY)); } catch { /* storage blocked */ }
    this.grid = saved || [...SAMPLE].map(Number);
    this.editing = this.mode !== 'attract';
    this.cx = 4; this.cy = 4; this.sel = 0; this.repeat = 0; this.msg = ''; this.msgT = 0; this.downT = 0;
    this.best = null;
    if (!this.editing) this.play();
  }
  attract() { super.attract(); this.grid = [...SAMPLE].map(Number); this.play(); }
  save() { try { localStorage.setItem(KEY, this.levelCode()); } catch { /* ignore */ } }
  levelCode() { return encodeLevel(this.grid); }
  loadCode(code) { const g = decodeLevel(code); if (g) { this.grid = g; this.save(); this.editing = true; return true; } return false; }
  at(x, y) { return x < 0 || x >= COLS || y >= ROWS ? GROUND : y < 0 ? EMPTY : this.grid[y * COLS + x]; }
  say(m) { this.msg = m; this.msgT = 2; }
  // ---------------- play mode ----------------
  play() {
    const s = this.grid.indexOf(START), f = this.grid.indexOf(FLAG);
    if (s < 0 || f < 0) { this.say(s < 0 ? 'PLACE A START FIRST' : 'PLACE A FLAG FIRST'); this.editing = true; return; }
    this.editing = false; this.deaths = 0; this.time = 0; this.gems = 0; this.won = 0;
    this.taken = new Set();
    this.bugs = []; this.grid.forEach((v, i) => { if (v === BUG) this.bugs.push({ x: (i % COLS) * T + 2, y: ((i / COLS) | 0) * T + T, vx: -24 }); });
    this.spawn();
  }
  spawn() { const s = this.grid.indexOf(START); this.px = (s % COLS) * T + 3; this.py = ((s / COLS) | 0) * T + T; this.vx = 0; this.vy = 0; this.ground = false; this.dead = 0; }
  solid(x, y) { return SOLID.has(this.at(Math.floor(x / T), Math.floor(y / T))); }
  ai() {
    if (this.editing || this.dead || this.won) return aiInput();
    const cx = Math.floor((this.px + 5) / T), cy = Math.floor((this.py - 1) / T), f = this.grid.indexOf(FLAG), dir = (f % COLS) * T > this.px ? 1 : -1;
    let jump = false;
    for (const d of [1]) {
      const ax = cx + d * dir;
      if (SOLID.has(this.at(ax, cy)) || this.at(ax, cy + 1) === EMPTY || this.at(ax, cy + 1) === SPIKE || this.at(ax, cy) === SPIKE) jump = true;
    }
    if (this.bugs.some(b => Math.abs(b.x - this.px) < 26 && Math.abs(b.y - this.py) < 8)) jump = true;
    // climb: when the flag is higher, jump at a platform just ahead and above
    if (((f / COLS) | 0) * T + T < this.py - 8) for (const d of [1, 2]) if (SOLID.has(this.at(cx + d * dir, cy - 1)) || SOLID.has(this.at(cx + d * dir, cy - 2))) jump = true;
    if (Math.abs((f % COLS) * T - this.px) < 20 && ((f / COLS) | 0) * T + T < this.py) jump = true;
    return aiInput({ right: dir > 0, left: dir < 0, a: jump || this.vy < 0 }, { a: jump && this.ground });
  }
  update(dt, inp) {
    this.msgT = Math.max(0, this.msgT - dt);
    if (this.editing) { this.edit(dt, inp); return; }
    this.time += dt;
    if (inp.down && this.ground) { this.downT += dt; if (this.downT > 0.7) { this.downT = 0; this.editing = true; this.say('EDITING'); return; } } else this.downT = 0;
    if (this.won) { this.won -= dt; if (this.won <= 0) { if (this.mode === 'attract') this.play(); else { this.editing = true; } } return; }
    if (this.dead) { this.dead -= dt; if (this.dead <= 0) this.spawn(); return; }
    const want = (inp.right ? 1 : 0) - (inp.left ? 1 : 0);
    this.vx += (want * 80 - this.vx) * Math.min(1, dt * (this.ground ? 12 : 5));
    if ((inp.tap.a || inp.tap.up) && this.ground) { this.vy = -250; this.ground = false; this.sound('paddle'); }
    if (!(inp.a || inp.up) && this.vy < -100) this.vy = -100;
    this.vy = Math.min(this.vy + 720 * dt, 400);
    this.px += this.vx * dt;
    for (const yy of [this.py - 11, this.py - 1]) {
      if (this.solid(this.px + 10, yy)) { this.px = Math.floor((this.px + 10) / T) * T - 10.01; this.vx = 0; }
      if (this.solid(this.px, yy)) { this.px = Math.floor(this.px / T + 1) * T + 0.01; this.vx = 0; }
    }
    this.px = clamp(this.px, 0, W - 10);
    this.py += this.vy * dt; this.ground = false;
    if (this.vy >= 0) for (const xx of [this.px + 1, this.px + 9]) if (this.solid(xx, this.py)) {
      const tile = this.at(Math.floor(xx / T), Math.floor(this.py / T));
      this.py = Math.floor(this.py / T) * T; this.vy = 0; this.ground = true;
      if (tile === SPRING) { this.vy = -380; this.ground = false; this.sound('power'); }
      break;
    }
    if (this.vy < 0 && (this.solid(this.px + 2, this.py - 12) || this.solid(this.px + 8, this.py - 12))) { this.py = Math.floor((this.py - 12) / T + 1) * T + 12; this.vy = 0; }
    // what the hero touches
    for (const [xx, yy] of [[this.px + 5, this.py - 4], [this.px + 5, this.py - 10]]) {
      const tx = Math.floor(xx / T), ty = Math.floor(yy / T), k = ty * COLS + tx, t = this.at(tx, ty);
      if (t === GEM && !this.taken.has(k)) { this.taken.add(k); this.gems++; this.addScore(100); this.sound('gem'); }
      if (t === SPIKE) { this.die(); return; }
      if (t === FLAG) { this.won = 2.5; const bonus = 1000 + Math.max(0, Math.round((30 - this.time) * 20)); this.addScore(bonus); this.best = this.time; this.say(`CLEAR! ${this.time.toFixed(1)}s`); this.sound('start'); return; }
    }
    if (this.py > ROWS * T + 20) { this.die(); return; }
    for (const b of this.bugs) {
      b.x += b.vx * dt;
      const ahead = b.vx < 0 ? b.x : b.x + 12;
      if (this.solid(ahead, b.y - 4) || !this.solid(ahead, b.y + 2) || b.x < 0 || b.x > W - 12) b.vx = -b.vx;
      if (Math.abs(b.x - this.px) < 10 && Math.abs(b.y - this.py) < 10) {
        if (this.vy > 30 && this.py < b.y - 3) { b.y = 9999; this.vy = -180; this.addScore(50); this.sound('hit'); }
        else { this.die(); return; }
      }
    }
    this.bugs = this.bugs.filter(b => b.y < 9000);
  }
  die() { this.dead = 1; this.deaths++; this.sound('die'); this.bugs = []; this.grid.forEach((v, i) => { if (v === BUG) this.bugs.push({ x: (i % COLS) * T + 2, y: ((i / COLS) | 0) * T + T, vx: -24 }); }); }
  // ---------------- edit mode ----------------
  edit(dt, inp) {
    const mv = (k, dx, dy) => { if (inp.tap[k]) { this.move(dx, dy); this.repeat = 0.35; } };
    mv('left', -1, 0); mv('right', 1, 0); mv('up', 0, -1); mv('down', 0, 1);
    if (inp.left || inp.right || inp.up || inp.down) {
      this.repeat -= dt;
      if (this.repeat <= 0) { this.repeat = 0.08; this.move(inp.left ? -1 : inp.right ? 1 : 0, inp.up ? -1 : inp.down ? 1 : 0); if (inp.a && this.cy >= 0) this.place(); }
    }
    if (inp.tap.a) {
      if (this.cy < 0) {
        const item = PALETTE[this.cx]; if (item === undefined) return;
        if (item === 'PLAY') { this.save(); this.play(); this.sound('start'); return; }
        this.sel = this.cx; this.sound('wall'); this.cy = 0;
      } else this.place();
    }
  }
  move(dx, dy) { this.cx = clamp(this.cx + dx, 0, this.cy < 0 && dy === 0 ? PALETTE.length - 1 : COLS - 1); this.cy = clamp(this.cy + dy, -1, ROWS - 1); if (this.cy < 0) this.cx = Math.min(this.cx, PALETTE.length - 1); }
  place() {
    const item = PALETTE[this.sel], k = this.cy * COLS + this.cx;
    const v = item === 'ERASE' ? EMPTY : item;
    if (v === START || v === FLAG) { const old = this.grid.indexOf(v); if (old >= 0) this.grid[old] = EMPTY; }
    if (this.grid[k] !== v) { this.grid[k] = v; this.sound('step2'); this.save(); }
  }
  // ---------------- drawing ----------------
  tile(c, v, x, y, i) {
    switch (v) {
      case GROUND: c.fillStyle = '#6a4a2a'; c.fillRect(x, y, T, T); c.fillStyle = '#7cc04a'; if (this.at(i % COLS, ((i / COLS) | 0) - 1) !== GROUND) c.fillRect(x, y, T, 4); break;
      case BRICK: c.fillStyle = '#b05a3a'; c.fillRect(x, y, T, T); c.fillStyle = '#6a2a1a'; c.fillRect(x, y + 7, T, 1); c.fillRect(x + 7, y, 1, 7); c.fillRect(x + 3, y + 8, 1, 8); break;
      case GEM: if (this.taken?.has(i) && !this.editing) break; c.fillStyle = '#5ce1ff'; c.beginPath(); c.moveTo(x + 8, y + 2); c.lineTo(x + 14, y + 8); c.lineTo(x + 8, y + 14); c.lineTo(x + 2, y + 8); c.fill(); break;
      case SPIKE: c.fillStyle = '#d0d0e0'; for (let k = 0; k < 3; k++) { c.beginPath(); c.moveTo(x + k * 5.3, y + T); c.lineTo(x + k * 5.3 + 2.6, y + 6); c.lineTo(x + k * 5.3 + 5.3, y + T); c.fill(); } break;
      case BUG: if (!this.editing) break; c.fillStyle = '#b05ad8'; c.fillRect(x + 2, y + 8, 12, 7); break;
      case SPRING: c.fillStyle = '#ffd040'; c.fillRect(x + 1, y + 2, 14, 3); c.fillStyle = '#9a9aa8'; for (let k = 0; k < 3; k++) c.fillRect(x + 3, y + 6 + k * 3, 10, 1); c.fillStyle = '#6a6a78'; c.fillRect(x, y + 14, T, 2); break;
      case START: if (!this.editing) break; c.strokeStyle = '#7cff6b'; c.strokeRect(x + 1.5, y + 1.5, T - 3, T - 3); c.fillStyle = '#7cff6b'; c.font = 'bold 9px monospace'; c.textAlign = 'center'; c.fillText('S', x + 8, y + 11); break;
      case FLAG: c.fillStyle = '#e0e0e0'; c.fillRect(x + 3, y, 2, T); c.fillStyle = '#ff2bd6'; c.beginPath(); c.moveTo(x + 5, y + 1); c.lineTo(x + 15, y + 4); c.lineTo(x + 5, y + 8); c.fill(); break;
    }
  }
  draw(c) {
    const g = c.createLinearGradient(0, PAL, 0, H); g.addColorStop(0, '#1a1650'); g.addColorStop(1, '#4a2a7a');
    c.fillStyle = g; c.fillRect(0, 0, W, H);
    // the level
    c.save(); c.translate(0, PAL);
    if (this.editing) { c.strokeStyle = 'rgba(255,255,255,0.06)'; for (let x = 0; x <= COLS; x++) { c.beginPath(); c.moveTo(x * T + 0.5, 0); c.lineTo(x * T + 0.5, ROWS * T); c.stroke(); } for (let y = 0; y <= ROWS; y++) { c.beginPath(); c.moveTo(0, y * T + 0.5); c.lineTo(W, y * T + 0.5); c.stroke(); } }
    this.grid.forEach((v, i) => this.tile(c, v, (i % COLS) * T, ((i / COLS) | 0) * T, i));
    if (!this.editing) {
      for (const b of this.bugs) { c.fillStyle = '#b05ad8'; c.fillRect(b.x, b.y - 8, 12, 7); c.fillStyle = '#fff'; c.fillRect(b.x + (b.vx < 0 ? 2 : 8), b.y - 7, 2, 2); }
      if (!this.dead || Math.floor(this.t * 12) % 2) {
        const x = Math.round(this.px), y = Math.round(this.py);
        c.fillStyle = '#ffe14d'; c.fillRect(x, y - 12, 10, 10); c.fillStyle = '#1a1650'; c.fillRect(x + (this.vx >= 0 ? 6 : 2), y - 9, 2, 2);
        c.fillStyle = '#ff7a1a'; c.fillRect(x + 1, y - 2, 3, 2); c.fillRect(x + 6, y - 2, 3, 2);
      }
    } else if (this.cy >= 0 && Math.floor(this.t * 4) % 2 === 0) { c.strokeStyle = '#ffffff'; c.lineWidth = 2; c.strokeRect(this.cx * T + 1, this.cy * T + 1, T - 2, T - 2); }
    c.restore();
    // palette / status bar
    c.fillStyle = '#0b0820'; c.fillRect(0, 0, W, PAL);
    if (this.editing) {
      PALETTE.forEach((item, i) => {
        const x = i * 25 + 3;
        if (i === this.sel) { c.fillStyle = '#2b2370'; c.fillRect(x - 2, 1, 24, 18); }
        if (typeof item === 'number') { c.save(); c.translate(x + 2, 2); this.tile(c, item, 0, 0, -1); c.restore(); }
        else this.text(item === 'PLAY' ? '▶GO' : 'DEL', x + 10, 6, { size: 7, color: item === 'PLAY' ? '#7cff6b' : '#ff6b6b' });
        if (this.cy < 0 && this.cx === i && Math.floor(this.t * 4) % 2 === 0) { c.strokeStyle = '#ffffff'; c.strokeRect(x - 2.5, 0.5, 25, 19); }
      });
    } else {
      this.text(`GEMS ${this.gems}  TIME ${this.time.toFixed(1)}  FALLS ${this.deaths}`, 6, 6, { size: 8, align: 'left' });
      this.text('HOLD ▼ TO EDIT', W - 6, 6, { size: 7, align: 'right', color: '#a9a3c9' });
    }
    if (this.msgT > 0) { c.fillStyle = 'rgba(0,0,0,0.6)'; c.fillRect(0, H / 2 - 10, W, 20); this.text(this.msg, W / 2, H / 2 - 5, { size: 9, color: '#ffe14d' }); }
  }
}
