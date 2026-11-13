// SPACEWAR — reconstruction of the 1962 PDP-1 duel: two ships, a central star that pulls,
// torpedoes, and an emergency hyperspace jump. Ship outlines are drawn fresh for this project.
import { Game, aiInput, rand } from './base.js';

const W = 240, H = 240, CX = W / 2, CY = H / 2, R = 116, GM = 2600;

function wrap(v) { return (v + W) % W; }

export class Spacewar extends Game {
  constructor(sfx) {
    super({ id: 'spacewar', w: W, h: H, sfx, fg: '#cfe9ff' });
    this.title = 'SPACEWAR';
    this.stars = Array.from({ length: 70 }, () => [Math.random() * W, Math.random() * H, Math.random()]);
  }
  reset() { this.kills = [0, 0]; this.newRound(); }
  newRound() {
    const mk = (x, y, a, kind) => ({ x, y, vx: 0, vy: 18 * (kind ? -1 : 1), a, kind, alive: true, cool: 0, hyper: 3, fuel: 1, gone: 0 });
    this.ships = [mk(40, 120, 0, 0), mk(200, 120, Math.PI, 1)];
    this.torps = []; this.booms = []; this.roundT = 0; this.endT = 0;
  }
  // shared pilot used by the CPU (and by the player's ship in attract mode)
  pilot(me, foe) {
    const dx = foe.x - me.x, dy = foe.y - me.y;
    const want = Math.atan2(dy + foe.vy * 0.4, dx + foe.vx * 0.4);
    let diff = ((want - me.a + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
    const ds = Math.hypot(me.x - CX, me.y - CY);
    const towardStar = Math.atan2(CY - me.y, CX - me.x);
    const away = ((towardStar + Math.PI - me.a + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
    if (ds < 46) diff = away;
    return aiInput({ left: diff < -0.08, right: diff > 0.08, up: ds < 46 ? Math.abs(away) < 0.6 : Math.hypot(me.vx, me.vy) < 20 && Math.random() < 0.3 },
      { a: Math.abs(diff) < 0.12 && ds >= 46 && Math.random() < 0.15, down: ds < 16 });
  }
  ai() { return this.pilot(this.ships[0], this.ships[1]); }
  update(dt, inp) {
    this.roundT += dt;
    const [p, e] = this.ships;
    if (p.alive) this.fly(p, inp, dt);
    if (e.alive) this.fly(e, this.pilot(e, p), dt);
    for (const s of this.ships) if (!s.alive && s.gone > 0) { s.gone -= dt; if (s.gone <= 0) Object.assign(s, { alive: true, x: rand(20, 220), y: rand(20, 60) }); }
    // torpedoes: no gravity on torpedoes, finite life
    this.torps.forEach(t => { t.x = wrap(t.x + t.vx * dt); t.y = wrap(t.y + t.vy * dt); t.life -= dt; });
    this.torps = this.torps.filter(t => {
      if (t.life <= 0) return false;
      for (const s of this.ships) if (s.alive && s !== t.owner && Math.hypot(s.x - t.x, s.y - t.y) < 6) { this.kill(s); return false; }
      return true;
    });
    if (p.alive && e.alive && Math.hypot(p.x - e.x, p.y - e.y) < 7) { this.kill(p); this.kill(e); }
    this.booms.forEach(b => (b.t += dt)); this.booms = this.booms.filter(b => b.t < 1);
    if (this.endT > 0) { this.endT -= dt; if (this.endT <= 0) { if (this.mode === 'play' && Math.max(...this.kills) >= 3) this.gameOver(); else this.newRound(); } }
  }
  fly(s, inp, dt) {
    const rot = 2.6;
    if (inp.left) s.a -= rot * dt; if (inp.right) s.a += rot * dt;
    if (inp.up && s.fuel > 0) { s.vx += Math.cos(s.a) * 42 * dt; s.vy += Math.sin(s.a) * 42 * dt; s.fuel -= dt * 0.04; s.thrust = true; } else s.thrust = false;
    const dx = CX - s.x, dy = CY - s.y, d2 = Math.max(dx * dx + dy * dy, 60), d = Math.sqrt(d2);
    s.vx += (dx / d) * (GM / d2) * dt; s.vy += (dy / d) * (GM / d2) * dt;
    s.x = wrap(s.x + s.vx * dt); s.y = wrap(s.y + s.vy * dt);
    s.cool -= dt;
    if (inp.tap.a && s.cool <= 0 && this.torps.filter(t => t.owner === s).length < 4) {
      s.cool = 0.35;
      this.torps.push({ x: s.x + Math.cos(s.a) * 7, y: s.y + Math.sin(s.a) * 7, vx: s.vx + Math.cos(s.a) * 110, vy: s.vy + Math.sin(s.a) * 110, life: 1.6, owner: s });
      if (s === this.ships[0]) this.sound('shoot');
    }
    if (inp.tap.down && s.hyper > 0) {
      s.hyper--; s.alive = false; s.gone = 0.8; s.vx = s.vy = 0;
      this.booms.push({ x: s.x, y: s.y, t: 0.6, small: true });
      if (Math.random() < 0.15 * (3 - s.hyper)) { s.gone = 0; this.kill(s); } // the original jump could fail
    }
    if (d < 7) this.kill(s);
  }
  kill(s) {
    if (s.dead) return;
    s.alive = false; s.gone = 0; s.dead = true;
    this.booms.push({ x: s.x, y: s.y, t: 0 });
    const other = this.ships[1 - s.kind];
    if (!other.dead) { this.kills[other.kind]++; if (other.kind === 0) this.addScore(500); }
    this.sound(s.kind === 0 ? 'die' : 'hit');
    this.endT = 2;
  }
  draw(c) {
    c.fillStyle = 'rgba(0,3,8,0.35)'; c.fillRect(0, 0, W, H);
    c.save(); c.beginPath(); c.arc(CX, CY, R, 0, Math.PI * 2); c.clip();
    for (const [x, y, b] of this.stars) { c.fillStyle = `rgba(200,225,255,${0.25 + b * 0.5})`; c.fillRect((x - this.t * 1.5 + W) % W, y, 1, 1); }
    // the star flickers between two shapes
    c.strokeStyle = '#ffffff'; c.lineWidth = 1.2; c.beginPath();
    for (let i = 0; i < 4; i++) { const a = i * Math.PI / 4 + this.t * 7; const r = 4 + Math.random() * 2; c.moveTo(CX - Math.cos(a) * r, CY - Math.sin(a) * r); c.lineTo(CX + Math.cos(a) * r, CY + Math.sin(a) * r); }
    c.stroke();
    for (const s of this.ships) if (s.alive) this.ship(c, s);
    c.fillStyle = '#ffffff'; this.torps.forEach(t => c.fillRect(t.x - 1, t.y - 1, 2, 2));
    for (const b of this.booms) {
      c.fillStyle = `rgba(220,240,255,${1 - b.t})`;
      for (let i = 0; i < (b.small ? 6 : 16); i++) { const a = i * 2.4, r = b.t * (b.small ? 10 : 24) * (0.5 + (i % 3) / 3); c.fillRect(b.x + Math.cos(a) * r, b.y + Math.sin(a) * r, 1.5, 1.5); }
    }
    c.restore();
    c.lineWidth = 8; c.strokeStyle = '#000'; c.beginPath(); c.arc(CX, CY, R + 4, 0, Math.PI * 2); c.stroke();
    this.text(`${this.kills[0]}`, 14, 6, { size: 10, align: 'left' });
    this.text(`${this.kills[1]}`, W - 14, 6, { size: 10, align: 'right' });
    this.text(`HYPER ${this.ships[0].hyper}`, 8, H - 14, { size: 7, align: 'left', color: '#7f9fbf' });
  }
  ship(c, s) {
    c.save(); c.translate(s.x, s.y); c.rotate(s.a);
    c.strokeStyle = s.kind ? '#ffd9a8' : '#cfe9ff'; c.lineWidth = 1.2; c.beginPath();
    if (s.kind === 0) { c.moveTo(9, 0); c.lineTo(-6, -2); c.lineTo(-8, -4); c.lineTo(-6, 0); c.lineTo(-8, 4); c.lineTo(-6, 2); c.closePath(); }
    else { c.moveTo(8, 0); c.lineTo(-6, -5); c.lineTo(-3, 0); c.lineTo(-6, 5); c.closePath(); }
    c.stroke();
    if (s.thrust && Math.random() < 0.8) { c.beginPath(); c.moveTo(-7, 0); c.lineTo(-12 - Math.random() * 4, 0); c.stroke(); }
    c.restore();
  }
}
