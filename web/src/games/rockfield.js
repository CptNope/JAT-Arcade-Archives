// ROCK FIELD — a vector-display space shooter in the style of 1979's Asteroids: rotate, thrust, fire,
// and break drifting rocks into smaller and smaller pieces. The screen wraps at every edge.
import { Game, aiInput, rand } from './base.js';
import { vline, rot } from './vector.js';

const W = 256, H = 200;
const SHIP = [[9, 0], [-6, -5], [-3, 0], [-6, 5]];
const wrap = (o) => { o.x = (o.x + W) % W; o.y = (o.y + H) % H; };

function rockShape(r) {
  const n = 9 + ((Math.random() * 3) | 0);
  return Array.from({ length: n }, (_, i) => { const a = (i / n) * Math.PI * 2, d = r * rand(0.7, 1.15); return [Math.cos(a) * d, Math.sin(a) * d]; });
}

export class RockField extends Game {
  constructor(sfx) { super({ id: 'rockfield', w: W, h: H, sfx, fg: '#e8f6ff' }); this.title = 'ROCK FIELD'; }
  reset() { this.lives = 3; this.wave = 0; this.shots = []; this.bits = []; this.spawnShip(); this.newWave(); }
  spawnShip() { this.ship = { x: W / 2, y: H / 2, vx: 0, vy: 0, a: -Math.PI / 2, safe: 2 }; this.dead = 0; }
  newWave() {
    this.wave++;
    this.rocks = [];
    for (let i = 0; i < 3 + this.wave; i++) {
      const edge = Math.random() < 0.5;
      this.rocks.push(this.rock(edge ? 0 : rand(0, W), edge ? rand(0, H) : 0, 3));
    }
  }
  rock(x, y, size) { const r = [0, 6, 11, 18][size], a = rand(0, Math.PI * 2), sp = rand(14, 30) * (4 - size) * 0.6; return { x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, size, r, shape: rockShape(r), spin: rand(-1, 1), a: 0 }; }
  ai() {
    const s = this.ship; if (this.dead) return aiInput();
    const t = this.rocks.reduce((b, r) => { const d = Math.hypot(r.x - s.x, r.y - s.y); return d < b.d ? { r, d } : b; }, { d: 1e9 }).r;
    if (!t) return aiInput();
    const want = Math.atan2(t.y + t.vy * 0.3 - s.y, t.x + t.vx * 0.3 - s.x);
    const diff = ((want - s.a + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
    const close = Math.hypot(t.x - s.x, t.y - s.y) < 30;
    return aiInput({ left: diff < -0.1, right: diff > 0.1, up: !close && Math.abs(diff) < 0.4 && Math.hypot(s.vx, s.vy) < 25 }, { a: Math.abs(diff) < 0.2 && Math.random() < 0.3 });
  }
  update(dt, inp) {
    const s = this.ship;
    if (this.dead > 0) { this.dead -= dt; if (this.dead <= 0) { if (this.lives <= 0) { this.gameOver(); return; } this.spawnShip(); } }
    else {
      if (inp.left) s.a -= 4 * dt; if (inp.right) s.a += 4 * dt;
      s.thrust = inp.up;
      if (inp.up) { s.vx += Math.cos(s.a) * 120 * dt; s.vy += Math.sin(s.a) * 120 * dt; }
      const f = Math.pow(0.6, dt); s.vx *= f; s.vy *= f;
      s.x += s.vx * dt; s.y += s.vy * dt; wrap(s);
      if (s.safe > 0) s.safe -= dt;
      if (inp.tap.a && this.shots.length < 5) { this.shots.push({ x: s.x + Math.cos(s.a) * 9, y: s.y + Math.sin(s.a) * 9, vx: s.vx + Math.cos(s.a) * 220, vy: s.vy + Math.sin(s.a) * 220, life: 0.9 }); this.sound('shoot'); }
      if (inp.tap.down) { s.x = rand(20, W - 20); s.y = rand(20, H - 20); s.vx = s.vy = 0; s.safe = 0.5; this.sound('power'); } // hyperspace
    }
    this.shots.forEach(b => { b.x += b.vx * dt; b.y += b.vy * dt; wrap(b); b.life -= dt; });
    this.rocks.forEach(r => { r.x += r.vx * dt; r.y += r.vy * dt; r.a += r.spin * dt; wrap(r); });
    this.bits.forEach(b => { b.x += b.vx * dt; b.y += b.vy * dt; b.life -= dt; });
    this.bits = this.bits.filter(b => b.life > 0);
    const hits = [];
    this.shots = this.shots.filter(b => {
      if (b.life <= 0) return false;
      const r = this.rocks.find(o => Math.hypot(o.x - b.x, o.y - b.y) < o.r);
      if (r) { hits.push(r); return false; }
      return true;
    });
    for (const r of new Set(hits)) this.breakRock(r, true);
    if (!this.dead && s.safe <= 0) {
      const r = this.rocks.find(o => Math.hypot(o.x - s.x, o.y - s.y) < o.r + 4);
      if (r) { this.breakRock(r, false); this.lives--; this.dead = 2; this.boom(s.x, s.y, 14); this.sound('die'); }
    }
    if (!this.rocks.length) this.newWave();
  }
  breakRock(r, byShot) {
    this.rocks = this.rocks.filter(o => o !== r);
    if (byShot) { this.addScore([0, 100, 50, 20][r.size]); this.sound('hit'); }
    this.boom(r.x, r.y, 6);
    if (r.size > 1) for (let i = 0; i < 2; i++) this.rocks.push(this.rock(r.x, r.y, r.size - 1));
  }
  boom(x, y, n) { for (let i = 0; i < n; i++) { const a = rand(0, 7), sp = rand(20, 70); this.bits.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: rand(0.3, 0.8) }); } }
  draw(c) {
    c.fillStyle = 'rgba(0,0,0,0.55)'; c.fillRect(0, 0, W, H);
    for (const r of this.rocks) vline(c, rot(r.shape, r.a, r.x, r.y));
    const s = this.ship;
    if (!this.dead && (s.safe <= 0 || Math.floor(this.t * 10) % 2)) {
      vline(c, rot(SHIP, s.a, s.x, s.y));
      if (s.thrust && Math.random() < 0.7) vline(c, rot([[-4, -2], [-10, 0], [-4, 2]], s.a, s.x, s.y), { close: false });
    }
    c.fillStyle = '#ffffff'; this.shots.forEach(b => c.fillRect(b.x - 1, b.y - 1, 2, 2));
    c.fillStyle = '#cfe9ff'; this.bits.forEach(b => c.fillRect(b.x, b.y, 1.5, 1.5));
    this.text(String(this.score).padStart(5, '0'), 10, 6, { size: 10, align: 'left' });
    for (let i = 0; i < this.lives; i++) vline(c, rot(SHIP, -Math.PI / 2, 70 + i * 10, 14, 0.7), { glow: 3 });
    this.text(`HI ${Math.max(this.hi, this.score)}`, W - 10, 6, { size: 8, align: 'right' });
  }
}
