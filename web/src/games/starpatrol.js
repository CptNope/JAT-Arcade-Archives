// STAR PATROL — a turn-based space-patrol game on a character terminal, in the spirit of the
// 1971 mainframe game Star Trek: an 8x8 sector map, energy to manage, raiders to clear, bases to dock at.
import { Game, aiInput } from './base.js';

const N = 8, CW = 7, CH = 11, W = 300, H = 200;

export class StarPatrol extends Game {
  constructor(sfx) { super({ id: 'starpatrol', w: W, h: H, sfx, fg: '#8dffa0', bg: '#020a04' }); this.title = 'STAR PATROL'; }
  reset() { this.energy = 3000; this.shields = 400; this.sectorNo = 0; this.log = []; this.over = 0; this.newSector(); }
  newSector() {
    this.sectorNo++;
    const cells = [...Array(N * N).keys()].sort(() => Math.random() - 0.5);
    this.ship = cells.pop();
    this.stars = new Set(cells.splice(0, 4 + (Math.random() * 4) | 0));
    this.raiders = cells.splice(0, Math.min(1 + this.sectorNo, 4)).map(k => ({ k, hp: 180 + this.sectorNo * 40 }));
    this.base = Math.random() < 0.6 ? cells.pop() : -1;
    this.say(`SECTOR ${this.sectorNo}: ${this.raiders.length} RAIDER${this.raiders.length > 1 ? 'S' : ''} DETECTED.`);
  }
  say(s) { this.log.push(s.toUpperCase()); while (this.log.length > 5) this.log.shift(); }
  xy(k) { return [k % N, (k / N) | 0]; }
  occupied(k) { return this.stars.has(k) || this.base === k || this.raiders.some(r => r.k === k); }
  ai() {
    if ((this.aiT = (this.aiT || 0) + 1) % 14) return aiInput();
    const [sx, sy] = this.xy(this.ship);
    if (this.energy < 900 && this.base >= 0) {
      const [bx, by] = this.xy(this.base);
      return aiInput({}, { left: bx < sx - 1, right: bx > sx + 1, up: by < sy - 1 && Math.abs(bx - sx) <= 1, down: by > sy + 1 && Math.abs(bx - sx) <= 1 });
    }
    const near = this.raiders.reduce((b, r) => { const [x, y] = this.xy(r.k); const d = Math.hypot(x - sx, y - sy); return d < b.d ? { r, d, x, y } : b; }, { d: 99 });
    if (near.d <= 3) return aiInput({}, { a: true });
    if (!near.r) return aiInput({}, { a: true });
    return aiInput({}, { left: near.x < sx, right: near.x > sx, up: near.y < sy && near.x === sx, down: near.y > sy && near.x === sx });
  }
  update(dt, inp) {
    if (this.over) { this.over -= dt; if (this.over <= 0) { this.over = 0; this.gameOver(); } return; }
    let acted = false;
    const [sx, sy] = this.xy(this.ship);
    const mv = inp.tap.left ? [-1, 0] : inp.tap.right ? [1, 0] : inp.tap.up ? [0, -1] : inp.tap.down ? [0, 1] : null;
    if (mv) {
      const nx = sx + mv[0], ny = sy + mv[1], k = ny * N + nx;
      if (nx < 0 || ny < 0 || nx >= N || ny >= N) {
        if (this.raiders.length) this.say('RAIDERS STILL IN SECTOR.');
        else { this.energy -= 100; this.addScore(100); this.sound('power'); this.newSector(); }
      } else if (this.occupied(k)) this.say(this.stars.has(k) ? 'STAR IN THE WAY.' : 'COURSE BLOCKED.');
      else { this.ship = k; this.energy -= 15; acted = true; this.sound('wall'); }
    }
    if (inp.tap.a) {
      if (!this.raiders.length) this.say('NO TARGETS. FLY OFF THE MAP EDGE TO WARP.');
      else {
        const spend = Math.min(400, this.energy - 50); this.energy -= spend; acted = true; this.sound('shoot');
        for (const r of this.raiders) {
          const [x, y] = this.xy(r.k); const d = Math.hypot(x - sx, y - sy);
          const hit = Math.round(spend / this.raiders.length * (2 / (d + 1)) * (0.8 + Math.random() * 0.4));
          r.hp -= hit; this.say(`PHASERS HIT RAIDER AT ${x + 1},${y + 1} FOR ${hit}.`);
        }
        const before = this.raiders.length;
        this.raiders = this.raiders.filter(r => r.hp > 0);
        if (this.raiders.length < before) { this.addScore(250 * (before - this.raiders.length)); this.say('RAIDER DESTROYED!'); this.sound('hit'); }
        if (!this.raiders.length) this.say('SECTOR CLEAR. FLY OFF ANY EDGE TO WARP.');
      }
    }
    if (acted) this.enemyTurn();
    // docking refuels
    if (this.base >= 0) {
      const [bx, by] = this.xy(this.base); const [x, y] = this.xy(this.ship);
      if (Math.abs(bx - x) <= 1 && Math.abs(by - y) <= 1 && this.energy < 3000) { this.energy = 3000; this.shields = 400; this.say('DOCKED. ENERGY RESTORED.'); this.sound('start'); }
    }
    if (this.energy <= 0 || this.shields < 0) { this.say('THE SHIP IS LOST.'); this.sound('die'); this.over = 2; if (this.mode !== 'play') { this.reset(); this.over = 0; } }
  }
  enemyTurn() {
    const [sx, sy] = this.xy(this.ship);
    for (const r of this.raiders) {
      const [x, y] = this.xy(r.k); const d = Math.hypot(x - sx, y - sy);
      if (d < 4.5 && Math.random() < 0.7) {
        const dmg = Math.round((140 / (d + 0.5)) * (0.6 + Math.random() * 0.6));
        this.shields -= dmg; this.say(`RAIDER FIRES: ${dmg} UNITS ON SHIELDS.`);
      } else {
        const nx = x + Math.sign(sx - x), ny = y + Math.sign(sy - y), k = ny * N + nx;
        if (!this.occupied(k) && k !== this.ship) r.k = k;
      }
    }
  }
  draw(c) {
    c.fillStyle = this.bg; c.fillRect(0, 0, W, H);
    c.font = `bold ${CH - 1}px ${this.font}`; c.textBaseline = 'top'; c.textAlign = 'left';
    const ox = 10, oy = 18;
    c.fillStyle = '#4fbf62'; c.fillText(' 1 2 3 4 5 6 7 8', ox + 2, oy - 12);
    for (let y = 0; y < N; y++) {
      c.fillStyle = '#4fbf62'; c.fillText(String(y + 1), ox - 8, oy + y * CH + 2);
      for (let x = 0; x < N; x++) {
        const k = y * N + x;
        let ch = '.', col = '#2f6b3a';
        if (k === this.ship) { ch = '@'; col = '#e8ffe8'; }
        else if (this.raiders.some(r => r.k === k)) { ch = 'R'; col = '#ffb3b3'; }
        else if (k === this.base) { ch = 'B'; col = '#9fd8ff'; }
        else if (this.stars.has(k)) { ch = '*'; col = '#fff3a0'; }
        c.fillStyle = col; c.fillText(ch, ox + 4 + x * CW * 2, oy + y * CH + 2);
      }
    }
    c.strokeStyle = '#2f6b3a'; c.strokeRect(ox, oy, N * CW * 2 + 4, N * CH + 4);
    const sx = ox + N * CW * 2 + 18;
    c.fillStyle = this.fg;
    [['SECTOR', this.sectorNo], ['ENERGY', Math.max(0, this.energy)], ['SHIELDS', Math.max(0, this.shields)], ['RAIDERS', this.raiders.length], ['SCORE', this.score]]
      .forEach(([k, v], i) => { c.fillText(k, sx, oy + i * 14); c.fillText(String(v), sx + 64, oy + i * 14); });
    c.fillStyle = '#4fbf62'; c.fillText('ARROWS MOVE', sx, oy + 78); c.fillText('A = PHASERS', sx, oy + 90);
    c.fillStyle = this.fg;
    this.log.forEach((l, i) => c.fillText(l.slice(0, 42), 8, 118 + i * CH));
  }
}
