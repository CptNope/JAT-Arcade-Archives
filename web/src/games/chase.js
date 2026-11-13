// CHASE — reconstruction of the chase game from Ralph Baer's TV-game prototypes (1967–68): two spots on a
// television, one hunting the other, steered by separate horizontal and vertical controls. Roles swap each round.
import { Game, aiInput, clamp, rand } from './base.js';

const W = 240, H = 180, SZ = 8, ROUND = 15;

export class Chase extends Game {
  constructor(sfx) { super({ id: 'chase', w: W, h: H, sfx }); this.title = 'CHASE'; }
  reset() { this.round = 0; this.you = 0; this.cpu = 0; this.nextRound(); }
  nextRound() {
    this.round++;
    this.youHunt = this.round % 2 === 1;
    this.p = { x: 50, y: H / 2 }; this.c = { x: W - 50, y: H / 2 };
    this.timeLeft = ROUND; this.wait = 1.2; this.flash = 0;
    this.wander = { x: rand(30, W - 30), y: rand(30, H - 30) };
  }
  steerCPU(dt, me, other, hunting, speed) {
    let tx, ty;
    if (hunting) { tx = other.x + (other.vx || 0) * 0.3; ty = other.y + (other.vy || 0) * 0.3; }
    else {
      // flee: away from the hunter, but bias toward open space so it doesn't hug a wall
      tx = me.x + (me.x - other.x) * 2 + (W / 2 - me.x) * 0.6; ty = me.y + (me.y - other.y) * 2 + (H / 2 - me.y) * 0.6;
      if (Math.hypot(me.x - other.x, me.y - other.y) > 90) { tx = this.wander.x; ty = this.wander.y; if (Math.hypot(me.x - tx, me.y - ty) < 10) this.wander = { x: rand(30, W - 30), y: rand(30, H - 30) }; }
    }
    const dx = tx - me.x, dy = ty - me.y, d = Math.hypot(dx, dy) || 1;
    me.vx = (dx / d) * speed; me.vy = (dy / d) * speed;
    me.x = clamp(me.x + me.vx * dt, 14, W - 14); me.y = clamp(me.y + me.vy * dt, 26, H - 14);
  }
  ai() {
    const dx = this.c.x - this.p.x, dy = this.c.y - this.p.y;
    const s = this.youHunt ? 1 : -1;
    return aiInput({ left: dx * s < -4, right: dx * s > 4, up: dy * s < -4, down: dy * s > 4 });
  }
  update(dt, inp) {
    if (this.flash > 0) this.flash -= dt;
    if (this.wait > 0) { this.wait -= dt; return; }
    this.timeLeft -= dt;
    const sp = 72;
    // the player's two "knobs": horizontal and vertical move independently
    const vx = (inp.right ? 1 : 0) - (inp.left ? 1 : 0), vy = (inp.down ? 1 : 0) - (inp.up ? 1 : 0);
    this.p.vx = vx * sp; this.p.vy = vy * sp;
    this.p.x = clamp(this.p.x + this.p.vx * dt, 14, W - 14); this.p.y = clamp(this.p.y + this.p.vy * dt, 26, H - 14);
    this.steerCPU(dt, this.c, this.p, !this.youHunt, this.youHunt ? 66 : 60);
    const caught = Math.abs(this.p.x - this.c.x) < SZ && Math.abs(this.p.y - this.c.y) < SZ;
    if (caught || this.timeLeft <= 0) {
      const hunterWins = caught;
      const youWin = this.youHunt === hunterWins;
      if (youWin) { this.you++; this.addScore(caught ? 200 + Math.round(this.timeLeft * 10) : 150); this.sound('start'); }
      else { this.cpu++; this.sound('die'); }
      this.flash = 0.8;
      if (this.round >= 6) { if (this.mode === 'play') this.gameOver(); else this.reset(); return; }
      this.nextRound();
    }
  }
  draw(c) {
    c.fillStyle = this.flash > 0 && Math.floor(this.flash * 10) % 2 ? '#3a3a3a' : '#0a0a0a'; c.fillRect(0, 0, W, H);
    c.fillStyle = '#d8d8d8';
    c.fillRect(8, 20, W - 16, 2); c.fillRect(8, H - 8, W - 16, 2); c.fillRect(8, 20, 2, H - 28); c.fillRect(W - 10, 20, 2, H - 28);
    // two spots: yours is solid, the machine's is hollow
    c.fillRect(this.p.x - SZ / 2, this.p.y - SZ / 2, SZ, SZ);
    c.strokeStyle = '#d8d8d8'; c.lineWidth = 2; c.strokeRect(this.c.x - SZ / 2 + 1, this.c.y - SZ / 2 + 1, SZ - 2, SZ - 2);
    this.text(`YOU ${this.you}`, 16, 8, { size: 8, align: 'left', color: '#d8d8d8' });
    this.text(`CPU ${this.cpu}`, W - 16, 8, { size: 8, align: 'right', color: '#d8d8d8' });
    this.text(this.wait > 0 ? (this.youHunt ? 'YOU HUNT: CATCH IT!' : 'YOU RUN: ESCAPE!') : `${this.youHunt ? 'HUNT' : 'RUN'}  ${Math.max(0, Math.ceil(this.timeLeft))}`, W / 2, 8, { size: 8, color: '#d8d8d8' });
  }
}
