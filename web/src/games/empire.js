// CONQUEST — a small turn-based war game in the spirit of Walter Bright's 1977 Empire: cities build armies,
// armies explore a hidden map and try to capture cities (each attempt succeeds half the time).
import { Game, aiInput } from './base.js';

const MW = 22, MH = 14, T = 11, TOP = 18;
const W = MW * T, H = MH * T + TOP + 22;
const DIRS = [[0, -1], [1, 0], [0, 1], [-1, 0]];
const BUILD = 4; // turns to build an army

export class Conquest extends Game {
  constructor(sfx) { super({ id: 'empire', w: W, h: H, sfx, fg: '#d6e2ff' }); this.title = 'CONQUEST'; }
  reset() {
    for (let tries = 0; tries < 50; tries++) { this.generate(); if (this.connected()) break; }
    this.turnNo = 1; this.msg = 'MOVE YOUR ARMY (A). CAPTURE CITIES.'; this.result = null; this.endT = 0;
    this.seen = new Set(); this.reveal(); this.startTurn();
  }
  generate() {
    const land = Array.from({ length: MH }, () => Array(MW).fill(false));
    // grow a few blobs of land
    for (let b = 0; b < 7; b++) {
      let x = 2 + ((Math.random() * (MW - 4)) | 0), y = 2 + ((Math.random() * (MH - 4)) | 0);
      for (let k = 0; k < 45; k++) {
        land[y][x] = true;
        const [dx, dy] = DIRS[(Math.random() * 4) | 0];
        x = Math.max(1, Math.min(MW - 2, x + dx)); y = Math.max(1, Math.min(MH - 2, y + dy));
      }
    }
    // a guaranteed land bridge from the west to the east so both sides can meet
    let y = (MH / 2) | 0;
    for (let x = 2; x < MW - 2; x++) { land[y][x] = true; if (Math.random() < 0.3) y = Math.max(2, Math.min(MH - 3, y + (Math.random() < 0.5 ? -1 : 1))); land[y][x] = true; }
    this.land = land;
    const tiles = []; for (let yy = 0; yy < MH; yy++) for (let xx = 0; xx < MW; xx++) if (land[yy][xx]) tiles.push([xx, yy]);
    const west = tiles.filter(([x]) => x < 5), east = tiles.filter(([x]) => x > MW - 6);
    const pick = (a) => a[(Math.random() * a.length) | 0];
    this.cities = [];
    const addCity = (x, y, owner) => { if (!this.cities.some(c => Math.abs(c.x - x) + Math.abs(c.y - y) < 3)) this.cities.push({ x, y, owner, build: BUILD }); };
    const [px, py] = pick(west), [ex, ey] = pick(east);
    addCity(px, py, 'you'); addCity(ex, ey, 'cpu');
    for (let i = 0; i < 40 && this.cities.length < 11; i++) { const [x, y] = pick(tiles); addCity(x, y, null); }
    this.units = [{ x: px, y: py, owner: 'you', moved: false }, { x: ex, y: ey, owner: 'cpu', moved: false }];
  }
  connected() {
    const a = this.cities.find(c => c.owner === 'you'), b = this.cities.find(c => c.owner === 'cpu');
    return this.path(a.x, a.y, (x, y) => x === b.x && y === b.y) !== null;
  }
  path(sx, sy, goal) {
    const prev = new Map([[sy * MW + sx, -1]]), q = [[sx, sy]];
    while (q.length) {
      const [x, y] = q.shift();
      if (goal(x, y) && !(x === sx && y === sy)) {
        let k = y * MW + x; const steps = [];
        while (prev.get(k) !== -1) { steps.unshift(k); k = prev.get(k); }
        return steps;
      }
      for (const [dx, dy] of DIRS) { const nx = x + dx, ny = y + dy, k = ny * MW + nx; if (nx >= 0 && ny >= 0 && nx < MW && ny < MH && this.land[ny][nx] && !prev.has(k)) { prev.set(k, y * MW + x); q.push([nx, ny]); } }
    }
    return null;
  }
  reveal() {
    for (const o of [...this.units.filter(u => u.owner === 'you'), ...this.cities.filter(c => c.owner === 'you')])
      for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) this.seen.add((o.y + dy) * MW + o.x + dx);
  }
  mine() { return this.units.filter(u => u.owner === 'you'); }
  startTurn() { this.units.forEach(u => (u.moved = false)); this.active = this.mine().find(u => !u.moved) || null; }
  ai() {
    if ((this.aiT = (this.aiT || 0) + 1) % 6 || !this.active || this.result) return aiInput();
    const u = this.active;
    const steps = this.path(u.x, u.y, (x, y) => this.cities.some(c => c.x === x && c.y === y && c.owner !== 'you') || this.units.some(o => o.owner === 'cpu' && o.x === x && o.y === y));
    if (!steps) return aiInput({}, { a: true });
    const k = steps[0], dx = (k % MW) - u.x, dy = ((k / MW) | 0) - u.y;
    if (this.units.some(o => o !== u && o.owner === 'you' && o.x === u.x + dx && o.y === u.y + dy)) return aiInput({}, { a: true });
    return aiInput({}, { left: dx < 0, right: dx > 0, up: dy < 0, down: dy > 0 });
  }
  update(dt, inp) {
    if (this.result) { this.endT -= dt; if (this.endT <= 0) { if (this.mode === 'play') this.gameOver(); else this.reset(); } return; }
    const u = this.active;
    if (!u) { if (inp.tap.a) this.endTurn(); return; }
    const d = inp.tap.up ? 0 : inp.tap.right ? 1 : inp.tap.down ? 2 : inp.tap.left ? 3 : -1;
    if (inp.tap.a) { u.moved = true; this.next(); return; } // wait
    if (d < 0) return;
    const nx = u.x + DIRS[d][0], ny = u.y + DIRS[d][1];
    if (nx < 0 || ny < 0 || nx >= MW || ny >= MH || !this.land[ny][nx]) { this.msg = 'ARMIES CANNOT CROSS WATER.'; return; }
    if (this.units.some(o => o !== u && o.owner === 'you' && o.x === nx && o.y === ny)) { this.msg = 'SQUARE OCCUPIED.'; return; }
    this.advance(u, nx, ny);
    u.moved = true; this.reveal(); this.checkEnd(); this.next();
  }
  // move or attack; shared by both sides
  advance(u, nx, ny) {
    const foe = this.units.find(o => o.owner !== u.owner && o.x === nx && o.y === ny);
    const city = this.cities.find(c => c.x === nx && c.y === ny);
    const me = u.owner === 'you';
    if (foe) {
      if (Math.random() < 0.5) { this.units = this.units.filter(o => o !== foe); this.msg = me ? 'YOUR ARMY WON THE BATTLE.' : 'AN ENEMY ARMY DESTROYED ONE OF YOURS.'; if (me) this.addScore(100); this.sound(me ? 'hit' : 'die'); }
      else { this.units = this.units.filter(o => o !== u); this.msg = me ? 'YOUR ARMY WAS DESTROYED.' : 'YOU HELD OFF AN ATTACK.'; this.sound(me ? 'die' : 'hit'); }
      return;
    }
    if (city && city.owner !== u.owner) {
      if (Math.random() < 0.5) { city.owner = u.owner; city.build = BUILD; this.units = this.units.filter(o => o !== u); this.msg = me ? 'CITY CAPTURED! IT WILL BUILD ARMIES FOR YOU.' : 'THE ENEMY TOOK A CITY.'; if (me) { this.addScore(300); this.sound('start'); } else this.sound('die'); }
      else { this.units = this.units.filter(o => o !== u); this.msg = me ? 'THE ATTACK FAILED. YOUR ARMY IS LOST.' : 'A CITY REPELLED THE ENEMY.'; this.sound('point'); }
      return;
    }
    u.x = nx; u.y = ny;
  }
  next() { this.active = this.mine().find(o => !o.moved) || null; if (!this.active && !this.result) this.endTurn(); }
  endTurn() {
    // enemy armies head for the nearest city they don't own, or your armies
    for (const u of this.units.filter(o => o.owner === 'cpu')) {
      if (!this.units.includes(u)) continue;
      const steps = this.path(u.x, u.y, (x, y) => this.cities.some(c => c.x === x && c.y === y && c.owner !== 'cpu') || this.units.some(o => o.owner === 'you' && o.x === x && o.y === y));
      if (steps) { const k = steps[0]; const nx = k % MW, ny = (k / MW) | 0; if (!this.units.some(o => o.owner === 'cpu' && o.x === nx && o.y === ny)) this.advance(u, nx, ny); }
    }
    // production
    for (const c of this.cities) if (c.owner) {
      c.build--;
      if (c.build <= 0 && !this.units.some(u => u.x === c.x && u.y === c.y)) { this.units.push({ x: c.x, y: c.y, owner: c.owner, moved: false }); c.build = BUILD; }
    }
    this.turnNo++; this.reveal(); this.checkEnd();
    if (!this.result) this.startTurn();
  }
  checkEnd() {
    const has = (o) => this.cities.some(c => c.owner === o) || this.units.some(u => u.owner === o);
    if (!has('cpu')) { this.result = 'VICTORY! THE WORLD IS YOURS.'; this.addScore(2000 - this.turnNo * 10); this.sound('start'); this.endT = 3; }
    else if (!has('you')) { this.result = 'DEFEAT. YOUR EMPIRE HAS FALLEN.'; this.sound('die'); this.endT = 3; }
    else if (this.turnNo > 80) { this.result = 'TIME UP.'; this.addScore(this.cities.filter(c => c.owner === 'you').length * 100); this.endT = 3; }
  }
  draw(c) {
    c.fillStyle = '#05070f'; c.fillRect(0, 0, W, H);
    c.font = `bold ${T}px ${this.font}`; c.textAlign = 'center'; c.textBaseline = 'middle';
    for (let y = 0; y < MH; y++) for (let x = 0; x < MW; x++) {
      if (!this.seen.has(y * MW + x)) continue;
      const px = x * T + T / 2, py = TOP + y * T + T / 2;
      if (this.land[y][x]) { c.fillStyle = '#2c3b28'; c.fillRect(x * T, TOP + y * T, T, T); c.fillStyle = '#5c7a52'; c.fillText('+', px, py + 1); }
      else { c.fillStyle = '#1b2d52'; c.fillText('.', px, py); }
    }
    for (const ct of this.cities) {
      if (!this.seen.has(ct.y * MW + ct.x)) continue;
      c.fillStyle = ct.owner === 'you' ? '#7ad8ff' : ct.owner === 'cpu' ? '#ff6b6b' : '#e8e8e8';
      c.fillText(ct.owner === 'you' ? 'O' : ct.owner === 'cpu' ? 'X' : '*', ct.x * T + T / 2, TOP + ct.y * T + T / 2 + 1);
    }
    for (const u of this.units) {
      if (!this.seen.has(u.y * MW + u.x)) continue;
      const blink = u === this.active && Math.floor(this.t * 4) % 2;
      c.fillStyle = u.owner === 'you' ? (blink ? '#ffffff' : '#7ad8ff') : '#ff6b6b';
      c.fillText(u.owner === 'you' ? 'A' : 'a', u.x * T + T / 2, TOP + u.y * T + T / 2 + 1);
    }
    const yc = this.cities.filter(x => x.owner === 'you').length, ec = this.cities.filter(x => x.owner === 'cpu').length;
    this.text(`TURN ${this.turnNo}   CITIES ${yc} VS ${ec}   SCORE ${this.score}`, W / 2, 5, { size: 8 });
    this.text(this.result || (this.active ? this.msg : 'NO ARMIES TO MOVE. A = END TURN'), W / 2, H - 18, { size: 8 });
    this.text('ARROWS MOVE THE BLINKING ARMY · A = WAIT', W / 2, H - 9, { size: 7, color: '#7d8bb0' });
  }
}
