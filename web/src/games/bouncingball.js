// BOUNCING BALL — reconstruction of the 1952 Whirlwind demonstration that became a game: a ball bounces
// along a floor that has a hole in it. Tune the bounce, then drop the ball and try to make it fall through.
import { Game, aiInput, clamp, rand } from './base.js';

const W = 220, H = 220, FLOOR = 170, G = 260;

export class BouncingBall extends Game {
  constructor(sfx) { super({ id: 'bouncingball', w: W, h: H, sfx, fg: '#b8f0ff' }); this.title = 'BOUNCING BALL'; }
  reset() { this.balls = 10; this.bounce = 0.7; this.speed = 50; this.newHole(); this.ball = null; this.msg = 'SET THE BOUNCE, THEN PRESS A'; }
  newHole() { this.hole = rand(110, 190); this.holeW = Math.max(10, 18 - this.score / 200); }
  // simulate a drop to find where the ball crosses the floor line through the hole (used by the demo player)
  predict(b, s) {
    let x = 20, y = 30, vx = s, vy = 0;
    for (let i = 0; i < 2000; i++) {
      vy += G / 120; x += vx / 120; y += vy / 120;
      if (y >= FLOOR) { if (Math.abs(x - this.hole) < this.holeW / 2 - 2) return 0; y = FLOOR; vy = -vy * b; if (Math.abs(vy) < 25) return x - this.hole; }
      if (x > W) return x - this.hole;
    }
    return 999;
  }
  ai() {
    if (this.ball) return aiInput();
    if (!this.aiPlan) {
      let best = { b: 0.7, d: 1e9 };
      for (let b = 0.4; b <= 0.92; b += 0.02) { const d = Math.abs(this.predict(b, this.speed)); if (d < best.d) best = { b, d }; }
      this.aiPlan = Math.random() < 0.3 ? best.b + rand(-0.06, 0.06) : best.b;
    }
    const d = this.aiPlan - this.bounce;
    if (Math.abs(d) > 0.015) return aiInput({ up: d > 0, down: d < 0 });
    this.aiPlan = null;
    return aiInput({}, { a: true });
  }
  update(dt, inp) {
    if (!this.ball) {
      if (inp.up) this.bounce += dt * 0.25; if (inp.down) this.bounce -= dt * 0.25;
      if (inp.left) this.speed -= dt * 20; if (inp.right) this.speed += dt * 20;
      this.bounce = clamp(this.bounce, 0.4, 0.92); this.speed = clamp(this.speed, 30, 80);
      if (inp.tap.a && this.balls > 0) { this.balls--; this.ball = { x: 20, y: 30, vx: this.speed, vy: 0, trail: [] }; this.sound('shoot'); }
      if (this.balls <= 0) this.gameOver();
      return;
    }
    const b = this.ball;
    for (let s = 0; s < 4; s++) {
      const h = dt / 4;
      b.vy += G * h; b.x += b.vx * h; b.y += b.vy * h;
      if (b.y >= FLOOR) {
        if (Math.abs(b.x - this.hole) < this.holeW / 2 - 2) {
          if (b.y > FLOOR + 30) { this.addScore(100 + this.balls * 10); this.msg = 'THROUGH THE HOLE!'; this.sound('start'); this.ball = null; this.newHole(); return; }
        } else if (b.y < FLOOR + 6) {
          b.y = FLOOR; b.vy = -b.vy * this.bounce; this.sound('wall');
          if (Math.abs(b.vy) < 25) { this.msg = 'THE BALL CAME TO REST.'; this.ball = null; return; }
        }
      }
      if (b.x > W + 6 || b.y > H + 10) { this.msg = 'MISSED. TRY AGAIN.'; this.ball = null; this.sound('point'); return; }
    }
    b.trail.push([b.x, b.y]); if (b.trail.length > 40) b.trail.shift();
  }
  draw(c) {
    c.fillStyle = 'rgba(2,6,10,0.35)'; c.fillRect(0, 0, W, H);
    c.save(); c.beginPath(); c.arc(W / 2, H / 2, 104, 0, Math.PI * 2); c.clip();
    c.fillStyle = '#9fe8ff';
    // floor drawn as a dotted line with a gap, like a point-plotted display
    for (let x = 4; x < W - 4; x += 4) if (Math.abs(x - this.hole) > this.holeW / 2) c.fillRect(x, FLOOR + 3, 2, 2);
    if (this.ball) {
      c.fillStyle = '#e8fbff'; c.beginPath(); c.arc(this.ball.x, this.ball.y, 3, 0, Math.PI * 2); c.fill();
    } else {
      // preview arc from the launch point
      c.fillStyle = 'rgba(160,230,255,0.35)';
      let x = 20, y = 30, vx = this.speed, vy = 0;
      for (let i = 0; i < 90; i++) { vy += G / 30; x += vx / 30; y += vy / 30; if (y > FLOOR) { y = FLOOR; vy = -vy * this.bounce; } if (i % 3 === 0) c.fillRect(x, y, 1.5, 1.5); }
    }
    c.restore();
    c.lineWidth = 8; c.strokeStyle = '#000'; c.beginPath(); c.arc(W / 2, H / 2, 108, 0, Math.PI * 2); c.stroke();
    this.text(`BALLS ${this.balls}  SCORE ${this.score}`, W / 2, 182, { size: 8 });
    this.text(this.msg, W / 2, 194, { size: 7, color: '#6fbcd6' });
    this.text(`BOUNCE ${this.bounce.toFixed(2)}  ▲▼   SPEED ${Math.round(this.speed)}  ◀▶`, W / 2, 30, { size: 7, color: '#6fbcd6' });
  }
}
