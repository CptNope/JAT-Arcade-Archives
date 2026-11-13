// TENNIS FOR TWO — reconstruction of the 1958 oscilloscope tennis game: side view, gravity, a net,
// and a knob to choose your angle before you press the button to hit.
import { Game, aiInput, clamp, rand } from './base.js';

const W = 220, H = 170, GROUND = 128, NET = W / 2, NETH = 18, G = 160;

export class Tennis extends Game {
  constructor(sfx) { super({ id: 'tennis', w: W, h: H, sfx, fg: '#9effa8' }); this.title = 'TENNIS FOR TWO'; }
  reset() { this.pl = 0; this.pr = 0; this.angle = 0.75; this.serve(1); }
  serve(dir) {
    this.side = dir; // 1 = ball starts left and travels right
    this.x = dir > 0 ? 30 : W - 30; this.y = 70; this.vx = 0; this.vy = 0;
    this.bounces = 0; this.canHit = true; this.wait = 0.9; this.trailOn = true;
    this.cpuAngle = rand(0.55, 0.95);
  }
  hit(dir, ang, power) {
    this.vx = Math.cos(ang) * power * dir; this.vy = -Math.sin(ang) * power;
    this.bounces = 0; this.canHit = false; this.sound('paddle');
  }
  ai() {
    // attract: left player swings when the ball is reachable
    const t = this.x < NET && this.canHit && (this.vy > 0 || this.wait <= 0 && this.vx === 0);
    return aiInput({ up: this.angle < 0.8, down: this.angle > 0.9 }, { a: t && this.y > 60 });
  }
  update(dt, inp) {
    if (inp.up) this.angle += dt * 0.9; if (inp.down) this.angle -= dt * 0.9;
    this.angle = clamp(this.angle, 0.25, 1.35);
    if (this.wait > 0) { this.wait -= dt; return; }
    // player hit (left side)
    if (inp.tap.a && this.x < NET && this.canHit) this.hit(1, this.angle, 150 + Math.min(80, Math.abs(this.vy) * 0.2));
    // CPU hit (right side): waits for a good moment
    if (this.x > NET && this.canHit && (this.vx === 0 || (this.vy > 0 && this.y > 80 + Math.sin(this.t) * 20))) this.hit(-1, this.cpuAngle, 155);

    this.vy += G * dt;
    const px = this.x;
    this.x += this.vx * dt; this.y += this.vy * dt;
    // ball crosses the net: the receiver may hit again
    const sideNow = this.x < NET ? -1 : 1;
    if (sideNow !== this.lastSide) { this.canHit = true; this.bounces = 0; this.cpuAngle = rand(0.5, 1.0); }
    this.lastSide = sideNow;
    // net
    if ((px - NET) * (this.x - NET) <= 0 && px !== this.x && this.y > GROUND - NETH) { this.point(this.vx > 0 ? 1 : -1); return; }
    // ground
    if (this.y > GROUND) {
      this.y = GROUND; this.vy *= -0.62; this.vx *= 0.9; this.bounces++; this.sound('wall');
      if (this.bounces >= 2 || Math.abs(this.vy) < 20) { this.point(this.x < NET ? 1 : -1); return; }
    }
    if (this.x < -4) this.point(1); else if (this.x > W + 4) this.point(-1);
  }
  point(to) {
    if (to < 0) { this.pl++; this.addScore(100); } else this.pr++;
    this.sound('point');
    if (this.pl >= 5 || this.pr >= 5) { if (this.pl >= 5) this.addScore(500); this.gameOver(); return; }
    this.serve(to < 0 ? -1 : 1);
  }
  draw(c) {
    c.fillStyle = 'rgba(1,6,3,0.3)'; c.fillRect(0, 0, W, H);
    c.strokeStyle = '#7dff95'; c.lineWidth = 1.5;
    c.beginPath(); c.moveTo(6, GROUND + 2); c.lineTo(W - 6, GROUND + 2); c.moveTo(NET, GROUND + 2); c.lineTo(NET, GROUND - NETH); c.stroke();
    c.fillStyle = '#eaffee'; c.beginPath(); c.arc(this.x, this.y, 2, 0, Math.PI * 2); c.fill();
    // faint angle tick for the player's knob (a reading aid; the 1958 original showed none)
    c.strokeStyle = 'rgba(125,255,149,0.25)'; c.beginPath();
    c.moveTo(14, GROUND - 4); c.lineTo(14 + Math.cos(this.angle) * 14, GROUND - 4 - Math.sin(this.angle) * 14); c.stroke();
    c.fillStyle = '#000'; c.fillRect(0, H - 22, W, 22);
    this.text(`${this.pl}`, 40, H - 18, { size: 12, color: '#7dff95' });
    this.text(`${this.pr}`, W - 40, H - 18, { size: 12, color: '#7dff95' });
    this.text('YOU    ·    CPU', W / 2, H - 16, { size: 8, color: '#3e8f4b' });
  }
}
