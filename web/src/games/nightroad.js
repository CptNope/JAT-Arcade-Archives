// NIGHT ROAD — a first-person night drive in the style of 1976's Night Driver: the road is invisible,
// only roadside posts rushing toward you show where it bends. Steer, keep your speed, beat the clock.
import { Game, aiInput, clamp } from './base.js';

const W = 240, H = 180, HORIZON = 62, POSTS = 26, GAP = 4;

export class NightRoad extends Game {
  constructor(sfx) { super({ id: 'nightroad', w: W, h: H, sfx }); this.title = 'NIGHT ROAD'; }
  reset() { this.dist = 0; this.speed = 0; this.x = 0; this.time = 60; this.crash = 0; this.next = 300; this.seed = Math.random() * 1000; }
  // road centre (sideways offset) at a given distance: overlapping sine waves make bends
  bend(d) { const s = this.seed; return Math.sin((d + s) * 0.012) * 9 + Math.sin((d + s) * 0.031) * 4 + Math.sin((d + s) * 0.004) * 6; }
  half() { return Math.max(2.4, 4 - this.dist / 4000); } // the road narrows as you go
  ai() {
    const ahead = this.bend(this.dist + 18) - this.x;
    return aiInput({ left: ahead < -0.4, right: ahead > 0.4, a: Math.abs(ahead) < 3, up: Math.abs(ahead) < 3 });
  }
  update(dt, inp) {
    this.time -= dt;
    if (this.time <= 0) { this.time = 0; this.gameOver(); return; }
    if (this.crash > 0) { this.crash -= dt; this.speed *= 0.9; return; }
    const gas = inp.a || inp.up;
    this.speed = clamp(this.speed + (gas ? 30 : -18) * dt - (inp.down ? 50 * dt : 0), 0, 70);
    const steer = (inp.right ? 1 : 0) - (inp.left ? 1 : 0);
    this.x += steer * dt * (6 + this.speed * 0.12);
    // the road's bend pushes you outward at speed, like centrifugal drift
    const bendRate = (this.bend(this.dist + 4) - this.bend(this.dist)) / 4;
    this.x += bendRate * this.speed * dt * 0.35;
    this.dist += this.speed * dt;
    this.addScore(Math.round(this.speed * dt * 0.5));
    if (Math.abs(this.x - this.bend(this.dist)) > this.half() + 0.6) { this.crash = 1.2; this.x = this.bend(this.dist); this.sound('die'); }
    if (this.score >= this.next) { this.time += 25; this.next += 400; this.sound('start'); }
    if (this.mode === 'play' && gas && Math.random() < dt * 8) this.sfx?.play('step2');
  }
  draw(c) {
    c.fillStyle = this.crash > 0 && Math.floor(this.crash * 12) % 2 ? '#2a2a2a' : '#000'; c.fillRect(0, 0, W, H);
    const first = Math.ceil(this.dist / GAP) * GAP;
    c.fillStyle = '#f2f2f2';
    for (let k = POSTS - 1; k >= 0; k--) {
      const d = first + k * GAP, z = d - this.dist + 2;
      const off = this.bend(d) - this.x;
      const scale = 90 / z;
      const y = HORIZON + scale * 1.6;
      if (y > H) continue;
      const w = Math.max(1, scale * 0.35), h = Math.max(1, scale * 0.9);
      for (const sgn of [-1, 1]) {
        const x = W / 2 + (off + sgn * this.half()) * scale;
        c.fillRect(x - w / 2, y - h, w, h);
      }
    }
    // the car's bonnet, drawn as a simple outline (originally a printed overlay on the glass)
    c.strokeStyle = '#6a6a6a'; c.lineWidth = 2;
    c.beginPath(); c.moveTo(30, H); c.quadraticCurveTo(W / 2, H - 34, W - 30, H); c.stroke();
    this.text(`SCORE ${this.score}`, 8, 6, { size: 9, align: 'left' });
    this.text(`TIME ${Math.ceil(this.time)}`, W - 8, 6, { size: 9, align: 'right' });
    this.text(`${Math.round(this.speed * 2)} MPH`, W / 2, H - 14, { size: 8, color: '#bbbbbb' });
  }
}
