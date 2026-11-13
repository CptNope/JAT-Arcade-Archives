// TARGET BEAM — reconstruction of the 1947 Cathode-Ray Tube Amusement Device idea:
// steer a beam with knobs toward targets printed on a clear overlay; the spot "explodes" by defocusing.
import { Game, aiInput, clamp, rand } from './base.js';

const W = 200, H = 200, R = 94;

export class TargetBeam extends Game {
  constructor(sfx) { super({ id: 'targetbeam', w: W, h: H, sfx, fg: '#b6ffbf' }); this.title = 'TARGET BEAM'; }
  reset() {
    this.shots = 12; this.aimX = W / 2; this.aimY = 80; this.shot = null; this.fx = null;
    this.newTargets(); this.clearT = 0;
  }
  newTargets() {
    this.targets = [];
    while (this.targets.length < 3) {
      const t = { x: rand(40, 160), y: rand(36, 120), hit: false, dir: Math.random() < 0.5 ? -1 : 1 };
      if (Math.hypot(t.x - W / 2, t.y - H / 2) < R - 22 && this.targets.every(o => Math.hypot(o.x - t.x, o.y - t.y) > 40)) this.targets.push(t);
    }
  }
  ai() {
    if (this.shot) return aiInput();
    const t = this.targets.find(t => !t.hit); if (!t) return aiInput();
    const dx = t.x - this.aimX, dy = t.y - this.aimY;
    const close = Math.abs(dx) < 3 && Math.abs(dy) < 3;
    return aiInput({ left: dx < -2, right: dx > 2, up: dy < -2, down: dy > 2 }, { a: close });
  }
  update(dt, inp) {
    const sp = 55;
    if (inp.left) this.aimX -= sp * dt; if (inp.right) this.aimX += sp * dt;
    if (inp.up) this.aimY -= sp * dt; if (inp.down) this.aimY += sp * dt;
    this.aimX = clamp(this.aimX, 20, W - 20); this.aimY = clamp(this.aimY, 20, 150);
    if (inp.tap.a && !this.shot && this.shots > 0) {
      this.shots--; this.shot = { t: 0, x0: W / 2, y0: 178, x1: this.aimX, y1: this.aimY }; this.sound('shoot');
    }
    if (this.shot) {
      this.shot.t += dt / 1.1;
      if (this.shot.t >= 1) {
        const { x1, y1 } = this.shot; this.shot = null;
        this.fx = { x: x1, y: y1, t: 0 };
        const hit = this.targets.find(t => !t.hit && Math.hypot(t.x - x1, t.y - y1) < 11);
        if (hit) { hit.hit = true; this.addScore(100); this.sound('hit'); } else this.sound('wall');
      }
    }
    if (this.fx) { this.fx.t += dt; if (this.fx.t > 0.8) this.fx = null; }
    if (this.targets.every(t => t.hit)) { this.addScore(200); this.shots += 4; this.newTargets(); }
    if (!this.shot && !this.fx && this.shots <= 0) this.gameOver();
  }
  draw(c) {
    // phosphor persistence: fade instead of clearing
    c.fillStyle = 'rgba(2,8,4,0.28)'; c.fillRect(0, 0, W, H);
    c.save(); c.beginPath(); c.arc(W / 2, H / 2, R, 0, Math.PI * 2); c.clip();
    // the beam
    if (this.shot) {
      const { t, x0, y0, x1, y1 } = this.shot;
      const x = x0 + (x1 - x0) * t, y = y0 + (y1 - y0) * t - Math.sin(t * Math.PI) * 40;
      c.fillStyle = '#e8ffe8'; c.beginPath(); c.arc(x, y, 1.8, 0, Math.PI * 2); c.fill();
    } else if (!this.fx) {
      c.fillStyle = 'rgba(180,255,190,0.5)'; c.fillRect(this.aimX - 1, this.aimY - 1, 2, 2);
    }
    if (this.fx) {
      const r = 2 + this.fx.t * 26;
      const g = c.createRadialGradient(this.fx.x, this.fx.y, 0, this.fx.x, this.fx.y, r);
      g.addColorStop(0, `rgba(220,255,220,${0.6 * (1 - this.fx.t)})`); g.addColorStop(1, 'rgba(0,0,0,0)');
      c.fillStyle = g; c.beginPath(); c.arc(this.fx.x, this.fx.y, r, 0, Math.PI * 2); c.fill();
    }
    c.restore();
    // the printed overlay sits on top of the glass (not part of the phosphor), so draw it crisp each frame
    this.overlayLayer(c);
  }
  overlayLayer(c) {
    c.save();
    c.strokeStyle = 'rgba(230,230,210,0.85)'; c.fillStyle = 'rgba(230,230,210,0.12)'; c.lineWidth = 1.2;
    for (const t of this.targets) {
      if (t.hit) { c.strokeStyle = 'rgba(230,230,210,0.25)'; }
      else c.strokeStyle = 'rgba(230,230,210,0.85)';
      // an original little biplane silhouette
      c.beginPath();
      c.moveTo(t.x - 10, t.y); c.lineTo(t.x + 9, t.y); c.lineTo(t.x + 12, t.y - 2);
      c.moveTo(t.x - 3, t.y - 5); c.lineTo(t.x + 3, t.y - 5); c.moveTo(t.x - 3, t.y + 4); c.lineTo(t.x + 3, t.y + 4);
      c.moveTo(t.x - 10, t.y); c.lineTo(t.x - 12, t.y - 4);
      c.stroke();
    }
    c.lineWidth = 6; c.strokeStyle = '#000'; c.beginPath(); c.arc(W / 2, H / 2, R + 3, 0, Math.PI * 2); c.stroke();
    c.restore();
    c.fillStyle = '#000'; c.fillRect(0, 184, W, 16);
    this.text(`SHOTS ${this.shots}   SCORE ${this.score}`, W / 2, 188, { size: 8, color: '#b6ffbf' });
  }
}
