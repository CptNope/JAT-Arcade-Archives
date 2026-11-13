// CITY SHIELD — defend six cities from falling missiles, in the style of 1980's Missile Command:
// move the crosshair, fire interceptors from three bases, and catch missiles in the blasts.
import { Game, aiInput, rand, clamp } from './base.js';

const W = 240, H = 200, GROUND = 186;
const BASES = [20, 120, 220];
const CITIES = [44, 64, 88, 152, 176, 196];

export class CityShield extends Game {
  constructor(sfx) { super({ id: 'cityshield', w: W, h: H, sfx }); this.title = 'CITY SHIELD'; }
  reset() { this.cities = CITIES.map(x => ({ x, alive: true })); this.wave = 0; this.cx = W / 2; this.cy = 90; this.nextWave(); }
  nextWave() {
    this.wave++; this.ammo = [10, 10, 10]; this.missiles = []; this.shots = []; this.blasts = [];
    this.toLaunch = 8 + this.wave * 3; this.launchT = 1; this.between = 0;
  }
  targets() { return [...this.cities.filter(c => c.alive).map(c => c.x), ...BASES.filter((_, i) => this.ammo[i] > 0)]; }
  ai() {
    // aim at the lowest missile that isn't already about to be caught
    const m = this.missiles.filter(o => !this.blasts.some(b => Math.hypot(b.x - o.x, b.y - o.y) < 22)).sort((a, b) => b.y - a.y)[0];
    if (!m) return aiInput();
    const tx = m.x + m.vx * 0.6, ty = m.y + m.vy * 0.6;
    const close = Math.abs(tx - this.cx) < 6 && Math.abs(ty - this.cy) < 6;
    return aiInput({ left: tx < this.cx - 3, right: tx > this.cx + 3, up: ty < this.cy - 3, down: ty > this.cy + 3 }, { a: close && (this.aiT = (this.aiT || 0) + 1) % 4 === 0 });
  }
  update(dt, inp) {
    const sp = 150;
    if (inp.left) this.cx -= sp * dt; if (inp.right) this.cx += sp * dt; if (inp.up) this.cy -= sp * dt; if (inp.down) this.cy += sp * dt;
    this.cx = clamp(this.cx, 4, W - 4); this.cy = clamp(this.cy, 10, GROUND - 20);
    if (inp.tap.a) {
      // fire from the nearest base that still has interceptors
      const order = [0, 1, 2].filter(i => this.ammo[i] > 0).sort((a, b) => Math.abs(BASES[a] - this.cx) - Math.abs(BASES[b] - this.cx));
      if (order.length) {
        const i = order[0]; this.ammo[i]--;
        const x0 = BASES[i], y0 = GROUND - 8, d = Math.hypot(this.cx - x0, this.cy - y0);
        this.shots.push({ x0, y0, x: x0, y: y0, tx: this.cx, ty: this.cy, vx: (this.cx - x0) / d * 260, vy: (this.cy - y0) / d * 260 });
        this.sound('shoot');
      }
    }
    // launch enemy missiles
    if (this.toLaunch > 0) {
      this.launchT -= dt;
      if (this.launchT <= 0) {
        this.launchT = rand(0.4, 1.4) / (1 + this.wave * 0.12); this.toLaunch--;
        const tg = this.targets(); if (tg.length) {
          const x0 = rand(0, W), tx = tg[(Math.random() * tg.length) | 0], spd = 18 + this.wave * 4, d = Math.hypot(tx - x0, GROUND);
          this.missiles.push({ x0, y0: 0, x: x0, y: 0, vx: (tx - x0) / d * spd, vy: GROUND / d * spd });
        }
      }
    }
    for (const s of this.shots) { s.x += s.vx * dt; s.y += s.vy * dt; if ((s.vy < 0 && s.y <= s.ty) || (s.vy >= 0 && s.y >= s.ty)) { s.done = true; this.blasts.push({ x: s.tx, y: s.ty, r: 0, t: 0 }); this.sound('hit'); } }
    this.shots = this.shots.filter(s => !s.done);
    for (const b of this.blasts) { b.t += dt; b.r = b.t < 0.6 ? b.t * 38 : Math.max(0, 22.8 - (b.t - 0.6) * 30); }
    this.blasts = this.blasts.filter(b => b.t < 1.35);
    this.missiles = this.missiles.filter(m => {
      m.x += m.vx * dt; m.y += m.vy * dt;
      if (this.blasts.some(b => Math.hypot(b.x - m.x, b.y - m.y) < b.r)) { this.addScore(25); this.blasts.push({ x: m.x, y: m.y, r: 0, t: 0.25 }); return false; }
      if (m.y >= GROUND - 4) {
        const city = this.cities.find(c => c.alive && Math.abs(c.x - m.x) < 8);
        if (city) { city.alive = false; this.sound('die'); }
        const bi = BASES.findIndex(x => Math.abs(x - m.x) < 8); if (bi >= 0) this.ammo[bi] = 0;
        this.blasts.push({ x: m.x, y: GROUND - 4, r: 0, t: 0.3 });
        return false;
      }
      return true;
    });
    if (!this.cities.some(c => c.alive)) { this.gameOver(); return; }
    if (this.toLaunch <= 0 && !this.missiles.length && !this.blasts.length) {
      this.between += dt;
      if (this.between > 1.2) { this.addScore(this.cities.filter(c => c.alive).length * 100 + this.ammo.reduce((a, b) => a + b, 0) * 5); this.sound('start'); this.nextWave(); }
    }
  }
  draw(c) {
    c.fillStyle = '#05030c'; c.fillRect(0, 0, W, H);
    c.fillStyle = '#c9a227'; c.fillRect(0, GROUND, W, H - GROUND);
    for (const x of BASES) { c.beginPath(); c.moveTo(x - 12, GROUND); c.lineTo(x - 5, GROUND - 9); c.lineTo(x + 5, GROUND - 9); c.lineTo(x + 12, GROUND); c.fill(); }
    BASES.forEach((x, i) => this.text(String(this.ammo[i]), x, GROUND + 2, { size: 8, color: '#05030c' }));
    for (const ct of this.cities) {
      if (!ct.alive) { c.fillStyle = '#5a3a1a'; c.fillRect(ct.x - 6, GROUND - 2, 12, 2); continue; }
      c.fillStyle = '#4fc3f7'; c.fillRect(ct.x - 7, GROUND - 5, 14, 5); c.fillRect(ct.x - 4, GROUND - 9, 3, 4); c.fillRect(ct.x + 1, GROUND - 11, 3, 6);
    }
    c.lineWidth = 1;
    c.strokeStyle = '#ff5252'; for (const m of this.missiles) { c.beginPath(); c.moveTo(m.x0, m.y0); c.lineTo(m.x, m.y); c.stroke(); c.fillStyle = '#fff'; c.fillRect(m.x - 1, m.y - 1, 2, 2); }
    c.strokeStyle = '#69f0ae'; for (const s of this.shots) { c.beginPath(); c.moveTo(s.x0, s.y0); c.lineTo(s.x, s.y); c.stroke(); }
    for (const b of this.blasts) { c.fillStyle = ['#ffffff', '#ffeb3b', '#ff5252', '#e040fb'][Math.floor(this.t * 20) % 4]; c.beginPath(); c.arc(b.x, b.y, b.r, 0, Math.PI * 2); c.fill(); }
    c.strokeStyle = '#ffffff'; c.beginPath(); c.moveTo(this.cx - 5, this.cy); c.lineTo(this.cx + 5, this.cy); c.moveTo(this.cx, this.cy - 5); c.lineTo(this.cx, this.cy + 5); c.stroke();
    this.text(`SCORE ${this.score}`, 8, 4, { size: 8, align: 'left', color: '#ff5252' });
    this.text(`WAVE ${this.wave}`, W - 8, 4, { size: 8, align: 'right', color: '#ff5252' });
  }
}
