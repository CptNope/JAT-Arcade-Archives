// VOLLEY — a two-paddle ball game in the spirit of the first home TV games (1972).
import { Game, aiInput, clamp, rand } from './base.js';

const W = 256, H = 192, PH = 28, PW = 4, WIN = 7;

export class Volley extends Game {
  constructor(sfx) { super({ id: 'volley', w: W, h: H, sfx }); this.title = 'VOLLEY'; }

  reset() {
    this.p1 = H / 2; this.p2 = H / 2;
    this.s1 = 0; this.s2 = 0;
    this.serve(1);
  }
  serve(dir) {
    this.bx = W / 2; this.by = rand(40, H - 40);
    this.vx = 90 * dir; this.vy = rand(-60, 60);
    this.wait = 0.8;
  }
  ai() {
    // attract: left paddle is a lazy robot too
    const target = this.vx < 0 ? this.by : H / 2;
    const d = target - this.p1;
    return aiInput({ up: d < -6, down: d > 6 });
  }
  update(dt, inp) {
    const sp = 150;
    if (inp.up) this.p1 -= sp * dt;
    if (inp.down) this.p1 += sp * dt;
    // CPU on the right: tracks the ball with a speed cap, so it can be beaten
    const target = this.vx > 0 ? this.by : H / 2;
    this.p2 += clamp(target - this.p2, -105 * dt, 105 * dt);
    this.p1 = clamp(this.p1, PH / 2 + 8, H - PH / 2 - 8);
    this.p2 = clamp(this.p2, PH / 2 + 8, H - PH / 2 - 8);

    if (this.wait > 0) { this.wait -= dt; return; }
    this.bx += this.vx * dt; this.by += this.vy * dt;
    if (this.by < 10 || this.by > H - 10) { this.vy *= -1; this.by = clamp(this.by, 10, H - 10); this.sound('wall'); }

    const hit = (px, py) => Math.abs(this.bx - px) < PW + 2 && Math.abs(this.by - py) < PH / 2 + 2;
    if (this.vx < 0 && hit(16, this.p1)) this.bounce(this.p1, 1);
    if (this.vx > 0 && hit(W - 16, this.p2)) this.bounce(this.p2, -1);

    if (this.bx < -4) { this.s2++; this.point(1); }
    if (this.bx > W + 4) { this.s1++; this.addScore(100); this.point(-1); }
  }
  bounce(py, dir) {
    const off = (this.by - py) / (PH / 2);
    const speed = Math.min(Math.hypot(this.vx, this.vy) * 1.06, 260);
    const ang = off * 1.0;
    this.vx = Math.cos(ang) * speed * dir; this.vy = Math.sin(ang) * speed;
    this.sound('paddle');
    if (dir === 1) this.addScore(10);
  }
  point(dir) {
    this.sound('point');
    if (this.s1 >= WIN || this.s2 >= WIN) { if (this.s1 >= WIN) this.addScore(1000); this.gameOver(); return; }
    this.serve(dir);
  }
  draw(c) {
    c.fillStyle = '#000'; c.fillRect(0, 0, W, H);
    c.fillStyle = '#eee';
    c.fillRect(0, 4, W, 3); c.fillRect(0, H - 7, W, 3);
    for (let y = 10; y < H - 10; y += 12) c.fillRect(W / 2 - 1, y, 2, 6);
    c.fillRect(16 - PW / 2, this.p1 - PH / 2, PW, PH);
    c.fillRect(W - 16 - PW / 2, this.p2 - PH / 2, PW, PH);
    if (this.wait <= 0 || Math.floor(this.t * 8) % 2) c.fillRect(this.bx - 2, this.by - 2, 4, 4);
    this.text(String(this.s1), W / 2 - 30, 14, { size: 20 });
    this.text(String(this.s2), W / 2 + 30, 14, { size: 20 });
  }
}
