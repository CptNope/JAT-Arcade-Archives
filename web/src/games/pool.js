// POCKET POOL — reconstruction of the 1954 pool game for the University of Michigan's MIDSAC computer:
// a top-down table drawn on a CRT, updated continuously as the balls roll.
import { Game, aiInput, clamp, rand } from './base.js';

const W = 260, H = 170, TX = 14, TY = 22, TW = 232, TH = 124, R = 4.2, PR = 8;
const POCKETS = [[TX, TY], [TX + TW / 2, TY - 2], [TX + TW, TY], [TX, TY + TH], [TX + TW / 2, TY + TH + 2], [TX + TW, TY + TH]];

export class Pool extends Game {
  constructor(sfx) { super({ id: 'pool', w: W, h: H, sfx, fg: '#bff5ff' }); this.title = 'POCKET POOL'; }
  reset() { this.shots = 15; this.rack(); }
  rack() {
    this.balls = [{ x: TX + TW * 0.25, y: TY + TH / 2, vx: 0, vy: 0, cue: true }];
    let n = 0;
    for (let row = 0; row < 3; row++) for (let k = 0; k <= row; k++) {
      this.balls.push({ x: TX + TW * 0.7 + row * R * 1.8, y: TY + TH / 2 + (k - row / 2) * R * 2.1, vx: 0, vy: 0, n: ++n });
    }
    this.angle = 0; this.power = 0.6; this.moving = false; this.msg = 'AIM ◀▶  POWER ▲▼  A TO SHOOT';
  }
  get cue() { return this.balls.find(b => b.cue); }
  ai() {
    if (this.moving) return aiInput();
    if (!this.aiPlan) {
      // ghost-ball aiming at the easiest ball/pocket pair
      const c = this.cue; let best = null;
      for (const b of this.balls) if (!b.cue) for (const [px, py] of POCKETS) {
        const dx = px - b.x, dy = py - b.y, d = Math.hypot(dx, dy);
        const gx = b.x - (dx / d) * R * 2, gy = b.y - (dy / d) * R * 2;
        const a = Math.atan2(gy - c.y, gx - c.x);
        const cut = Math.abs(((Math.atan2(dy, dx) - a + Math.PI * 3) % (Math.PI * 2)) - Math.PI);
        const cost = cut * 60 + d * 0.2 + Math.hypot(gx - c.x, gy - c.y) * 0.1;
        if (cut < 1.2 && (!best || cost < best.cost)) best = { a, cost };
      }
      this.aiPlan = { a: (best ? best.a : rand(-Math.PI, Math.PI)) + rand(-0.03, 0.03), p: rand(0.5, 0.85) };
    }
    const da = ((this.aiPlan.a - this.angle + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
    if (Math.abs(da) > 0.03) return aiInput({ left: da < 0, right: da > 0, a: Math.abs(da) < 0.25 }); // hold A = fine aim
    if (Math.abs(this.aiPlan.p - this.power) > 0.04) return aiInput({ up: this.aiPlan.p > this.power, down: this.aiPlan.p < this.power });
    this.aiPlan = null;
    return aiInput({}, { a: true });
  }
  update(dt, inp) {
    if (!this.moving) {
      const fine = inp.a ? 0.3 : 1;
      if (inp.left) this.angle -= dt * 1.6 * fine; if (inp.right) this.angle += dt * 1.6 * fine;
      if (inp.up) this.power += dt * 0.6; if (inp.down) this.power -= dt * 0.6;
      this.power = clamp(this.power, 0.15, 1);
      if (inp.tap.a && this.shots > 0) {
        const c = this.cue, sp = 60 + this.power * 260;
        c.vx = Math.cos(this.angle) * sp; c.vy = Math.sin(this.angle) * sp;
        this.shots--; this.moving = true; this.potted = 0; this.scratch = false; this.sound('paddle');
      }
      return;
    }
    const steps = 6, h = dt / steps;
    for (let s = 0; s < steps; s++) {
      for (const b of this.balls) {
        b.x += b.vx * h; b.y += b.vy * h;
        const f = Math.pow(0.55, h); b.vx *= f; b.vy *= f;
        if (Math.hypot(b.vx, b.vy) < 4) { b.vx = b.vy = 0; }
        if (b.x < TX + R) { b.x = TX + R; b.vx = Math.abs(b.vx) * 0.8; }
        if (b.x > TX + TW - R) { b.x = TX + TW - R; b.vx = -Math.abs(b.vx) * 0.8; }
        if (b.y < TY + R) { b.y = TY + R; b.vy = Math.abs(b.vy) * 0.8; }
        if (b.y > TY + TH - R) { b.y = TY + TH - R; b.vy = -Math.abs(b.vy) * 0.8; }
      }
      for (let i = 0; i < this.balls.length; i++) for (let j = i + 1; j < this.balls.length; j++) {
        const a = this.balls[i], b = this.balls[j];
        const dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy);
        if (d > 0 && d < R * 2) {
          const nx = dx / d, ny = dy / d, ov = R * 2 - d;
          a.x -= nx * ov / 2; a.y -= ny * ov / 2; b.x += nx * ov / 2; b.y += ny * ov / 2;
          const rel = (a.vx - b.vx) * nx + (a.vy - b.vy) * ny;
          if (rel > 0) { a.vx -= rel * nx; a.vy -= rel * ny; b.vx += rel * nx; b.vy += rel * ny; if (rel > 30) this.sound('wall'); }
        }
      }
      this.balls = this.balls.filter(b => {
        if (!POCKETS.some(([px, py]) => Math.hypot(b.x - px, b.y - py) < PR)) return true;
        if (b.cue) { this.scratch = true; return false; }
        this.potted++; this.addScore(100); this.sound('gem'); return false;
      });
    }
    if (this.balls.every(b => b.vx === 0 && b.vy === 0)) {
      this.moving = false;
      if (this.scratch) { this.addScore(-50); this.msg = 'SCRATCH! -50'; this.sound('point'); this.balls.unshift({ x: TX + TW * 0.25, y: TY + TH / 2, vx: 0, vy: 0, cue: true }); }
      else this.msg = this.potted ? `POTTED ${this.potted}!` : 'NO BALL POTTED';
      if (this.balls.length === 1) { this.addScore(500 + this.shots * 50); this.shots += 6; this.rack(); this.msg = 'TABLE CLEARED! NEW RACK'; }
      else if (this.shots <= 0) this.gameOver();
    }
  }
  draw(c) {
    c.fillStyle = 'rgba(2,6,10,0.5)'; c.fillRect(0, 0, W, H);
    c.strokeStyle = '#7fd8f0'; c.lineWidth = 1.5; c.strokeRect(TX - 3, TY - 3, TW + 6, TH + 6);
    for (const [px, py] of POCKETS) { c.beginPath(); c.arc(px, py, PR - 2, 0, Math.PI * 2); c.stroke(); }
    for (const b of this.balls) {
      c.fillStyle = b.cue ? '#ffffff' : '#9fe8ff';
      c.beginPath(); c.arc(b.x, b.y, R, 0, Math.PI * 2);
      if (b.cue) c.fill(); else { c.lineWidth = 1.5; c.stroke(); }
    }
    if (!this.moving && this.cue) {
      const c0 = this.cue;
      c.fillStyle = 'rgba(200,245,255,0.6)';
      for (let k = 1; k < 18; k++) c.fillRect(c0.x + Math.cos(this.angle) * k * 7, c0.y + Math.sin(this.angle) * k * 7, 1.5, 1.5);
      c.strokeStyle = '#ffd27a'; c.lineWidth = 2; c.beginPath();
      const back = 8 + this.power * 26;
      c.moveTo(c0.x - Math.cos(this.angle) * 7, c0.y - Math.sin(this.angle) * 7); c.lineTo(c0.x - Math.cos(this.angle) * (7 + back), c0.y - Math.sin(this.angle) * (7 + back)); c.stroke();
    }
    this.text(`SHOTS ${this.shots}   SCORE ${this.score}`, W / 2, 6, { size: 9 });
    this.text(this.msg, W / 2, H - 16, { size: 8, color: '#7fd8f0' });
  }
}
