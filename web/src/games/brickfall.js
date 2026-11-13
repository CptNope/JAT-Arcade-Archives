// BRICKFALL — a ball-and-paddle brick game on a four-shade monochrome LCD, late-1980s handheld style.
import { Game, aiInput, clamp, rand } from './base.js';

const W = 160, H = 144;
const P = ['#0f380f', '#306230', '#8bac0f', '#9bbc0f']; // darkest .. lightest

export class Brickfall extends Game {
  constructor(sfx) { super({ id: 'brickfall', w: W, h: H, sfx, fg: P[0], bg: P[3] }); this.title = 'BRICKFALL'; }

  reset() { this.lives = 3; this.stage = 0; this.nextStage(); }
  nextStage() {
    this.stage++;
    this.bricks = [];
    for (let r = 0; r < 6; r++) for (let i = 0; i < 10; i++) {
      if (this.stage % 2 === 0 && (i + r) % 3 === 0) continue;
      this.bricks.push({ x: 6 + i * 15, y: 22 + r * 7, hp: r < 2 ? 2 : 1 });
    }
    this.serve();
  }
  serve() { this.px = W / 2; this.held = true; this.bx = this.px; this.by = 124; this.vx = 0; this.vy = 0; this.pw = 24; }
  launch() { this.held = false; const s = 95 + this.stage * 8; this.vx = rand(-0.6, 0.6) * s; this.vy = -s; this.sound('paddle'); }
  ai() {
    const lead = this.bx + (this.vy > 0 ? this.vx * ((128 - this.by) / Math.max(this.vy, 1)) * 0.6 : 0);
    const tx = clamp(lead, 12, W - 12);
    return aiInput({ left: tx < this.px - 3, right: tx > this.px + 3 }, { a: this.held && this.t % 1 < 0.05 });
  }
  update(dt, inp) {
    if (inp.left) this.px -= 120 * dt;
    if (inp.right) this.px += 120 * dt;
    this.px = clamp(this.px, this.pw / 2 + 2, W - this.pw / 2 - 2);
    if (this.held) { this.bx = this.px; this.by = 124; if (inp.tap.a) this.launch(); return; }

    const steps = 3;
    for (let s = 0; s < steps; s++) {
      this.bx += this.vx * dt / steps; this.by += this.vy * dt / steps;
      if (this.bx < 3) { this.bx = 3; this.vx = Math.abs(this.vx); this.sound('wall'); }
      if (this.bx > W - 3) { this.bx = W - 3; this.vx = -Math.abs(this.vx); this.sound('wall'); }
      if (this.by < 14) { this.by = 14; this.vy = Math.abs(this.vy); this.sound('wall'); }
      if (this.vy > 0 && this.by > 126 && this.by < 132 && Math.abs(this.bx - this.px) < this.pw / 2 + 2) {
        const off = (this.bx - this.px) / (this.pw / 2);
        const sp = Math.min(Math.hypot(this.vx, this.vy) * 1.01, 190);
        this.vx = off * sp * 0.8; this.vy = -Math.sqrt(Math.max(sp * sp - this.vx * this.vx, 40 * 40));
        this.sound('paddle');
      }
      for (const b of this.bricks) {
        if (b.hp > 0 && this.bx > b.x - 1 && this.bx < b.x + 14 && this.by > b.y - 1 && this.by < b.y + 6) {
          b.hp--; this.addScore(b.hp ? 5 : 20); this.sound('hit');
          const fromSide = Math.min(Math.abs(this.bx - b.x), Math.abs(this.bx - b.x - 13)) < 1.5;
          if (fromSide) this.vx *= -1; else this.vy *= -1;
          break;
        }
      }
    }
    this.bricks = this.bricks.filter(b => b.hp > 0);
    if (!this.bricks.length) { this.addScore(300); this.nextStage(); }
    if (this.by > H) { this.lives--; this.sound('die'); if (this.lives <= 0) this.gameOver(); else this.serve(); }
  }
  draw(c) {
    c.fillStyle = P[3]; c.fillRect(0, 0, W, H);
    c.fillStyle = P[2]; c.fillRect(0, 0, W, 11);
    this.text(`${String(this.score).padStart(5, '0')}`, 4, 2, { size: 8, align: 'left', color: P[0] });
    this.text(`ST${this.stage}`, W / 2, 2, { size: 8, color: P[0] });
    for (let i = 0; i < this.lives; i++) { c.fillStyle = P[0]; c.fillRect(W - 10 - i * 8, 3, 5, 5); }
    for (const b of this.bricks) {
      c.fillStyle = b.hp > 1 ? P[0] : P[1]; c.fillRect(b.x, b.y, 14, 6);
      c.fillStyle = P[2]; c.fillRect(b.x + 1, b.y + 1, 3, 1);
    }
    c.fillStyle = P[0]; c.fillRect(this.px - this.pw / 2, 128, this.pw, 4);
    c.fillStyle = P[1]; c.fillRect(this.px - this.pw / 2 + 2, 129, this.pw - 4, 1);
    c.fillStyle = P[0]; c.fillRect(this.bx - 2, this.by - 2, 4, 4);
  }
  overlay(c) {
    // LCD-tinted overlays instead of black boxes
    const blink = Math.floor(this.t * 2) % 2 === 0;
    if (this.mode === 'play') return;
    c.fillStyle = P[2]; c.fillRect(0, H / 2 - 20, W, 38);
    c.fillStyle = P[0]; c.fillRect(0, H / 2 - 20, W, 1); c.fillRect(0, H / 2 + 17, W, 1);
    if (this.mode === 'attract') {
      this.text(this.title, W / 2, H / 2 - 16, { size: 12, color: P[0] });
      if (blink) this.text('PRESS A', W / 2, H / 2 + 3, { size: 8, color: P[0] });
    } else {
      this.text('GAME OVER', W / 2, H / 2 - 16, { size: 11, color: P[0] });
      this.text(`${this.score}  HI ${this.hi}`, W / 2, H / 2 + 1, { size: 8, color: P[0] });
    }
  }
}
