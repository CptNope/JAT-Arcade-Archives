// GARDEN PEST — a shooter in a mushroom patch, in the style of 1981's Centipede: a segmented crawler
// winds down through the mushrooms; hit a segment and it becomes a mushroom and the crawler splits.
import { Game, aiInput, clamp } from './base.js';

const C = 8, COLS = 30, ROWS = 30, TOP = 12, W = COLS * C, H = ROWS * C + TOP + 4;

export class GardenPest extends Game {
  constructor(sfx) { super({ id: 'gardenpest', w: W, h: H, sfx }); this.title = 'GARDEN PEST'; }
  reset() {
    this.lives = 3; this.level = 0;
    this.mush = new Map();
    for (let i = 0; i < 45; i++) { const x = (Math.random() * COLS) | 0, y = 1 + ((Math.random() * (ROWS - 6)) | 0); this.mush.set(y * COLS + x, 4); }
    this.newWave();
  }
  newWave() {
    this.level++;
    this.segs = Array.from({ length: 10 }, (_, i) => ({ x: 14 - i, y: 0, dir: 1, head: i === 0, prog: 0 }));
    this.px = W / 2; this.py = (ROWS - 2) * C + TOP; this.shot = null; this.spider = null; this.dead = 0; this.speed = 7 + this.level;
  }
  ai() {
    const t = this.segs.reduce((b, s) => (s.y > b.y ? s : b), this.segs[0]);
    const sp = this.spider && Math.hypot(this.spider.x - this.px, this.spider.y - this.py) < 40;
    const tx = (t ? t.x * C + C / 2 : W / 2) + (sp ? (this.spider.x > this.px ? -40 : 40) : 0);
    return aiInput({ left: tx < this.px - 3, right: tx > this.px + 3, a: true }, { a: !this.shot });
  }
  update(dt, inp) {
    if (this.dead > 0) { this.dead -= dt; if (this.dead <= 0) { if (this.lives <= 0) { this.gameOver(); return; } this.px = W / 2; this.py = (ROWS - 2) * C + TOP; this.spider = null; } return; }
    const sp = 110;
    if (inp.left) this.px -= sp * dt; if (inp.right) this.px += sp * dt; if (inp.up) this.py -= sp * dt; if (inp.down) this.py += sp * dt;
    this.px = clamp(this.px, 4, W - 4); this.py = clamp(this.py, TOP + (ROWS - 6) * C, TOP + ROWS * C - 6);
    if ((inp.a || inp.tap.a) && !this.shot) { this.shot = { x: this.px, y: this.py - 4 }; this.sound('shoot'); }
    if (this.shot) {
      this.shot.y -= 420 * dt;
      const cx = Math.floor(this.shot.x / C), cy = Math.floor((this.shot.y - TOP) / C), k = cy * COLS + cx;
      const seg = this.segs.find(s => s.x === cx && Math.abs(s.y - cy) < 1);
      if (seg) {
        this.segs = this.segs.filter(s => s !== seg); this.mush.set(seg.y * COLS + seg.x, 4);
        const i = this.segs.findIndex(s => s.x === seg.x - seg.dir && s.y === seg.y); if (i >= 0) this.segs[i].head = true;
        this.addScore(seg.head ? 100 : 10); this.sound('hit'); this.shot = null;
      } else if (this.mush.has(k)) {
        const hp = this.mush.get(k) - 1; if (hp <= 0) { this.mush.delete(k); this.addScore(1); } else this.mush.set(k, hp);
        this.shot = null; this.sound('wall');
      } else if (this.spider && Math.hypot(this.spider.x - this.shot.x, this.spider.y - this.shot.y) < 7) {
        this.addScore(300); this.spider = null; this.shot = null; this.sound('hit');
      } else if (this.shot.y < TOP) this.shot = null;
    }
    // crawler segments step cell to cell; each moves on its own, so a broken chain simply splits
    for (const s of this.segs) {
      s.prog += dt * this.speed;
      while (s.prog >= 1) {
        s.prog -= 1;
        const nx = s.x + s.dir;
        if (nx < 0 || nx >= COLS || this.mush.has(s.y * COLS + nx)) {
          s.y += s.goingUp ? -1 : 1; s.dir *= -1;
          if (s.y >= ROWS - 1) s.goingUp = true; if (s.y <= ROWS - 6) s.goingUp = false;
        } else s.x = nx;
      }
    }
    // a spider that zigzags through the player's area
    if (!this.spider && Math.random() < dt * 0.25) this.spider = { x: Math.random() < 0.5 ? 0 : W, y: TOP + (ROWS - 4) * C, vx: 0, vy: 0 };
    if (this.spider) {
      const s = this.spider; s.vx = s.vx || (s.x < W / 2 ? 50 : -50);
      s.vy = Math.sin(this.t * 6) * 60; s.x += s.vx * dt; s.y = clamp(s.y + s.vy * dt, TOP + (ROWS - 7) * C, TOP + ROWS * C - 4);
      if (s.x < -10 || s.x > W + 10) this.spider = null;
    }
    const hitP = this.segs.some(s => Math.abs(s.x * C + C / 2 - this.px) < 6 && Math.abs(TOP + s.y * C + C / 2 - this.py) < 6) || (this.spider && Math.hypot(this.spider.x - this.px, this.spider.y - this.py) < 8);
    if (hitP) { this.lives--; this.dead = 1.5; this.sound('die'); }
    if (!this.segs.length) { this.addScore(500); this.sound('start'); this.newWave(); }
  }
  draw(c) {
    c.fillStyle = '#05010a'; c.fillRect(0, 0, W, H);
    for (const [k, hp] of this.mush) {
      const x = (k % COLS) * C, y = TOP + ((k / COLS) | 0) * C;
      c.fillStyle = ['#000', '#7b3f00', '#c46a1a', '#ff9e3d', '#ff6ec7'][hp];
      c.fillRect(x + 1, y + 1, C - 2, (C - 2) * hp / 4 + 1);
      c.fillStyle = '#e8ffe0'; c.fillRect(x + 3, y + C - 3, 2, 2);
    }
    for (const s of this.segs) {
      const x = s.x * C + C / 2, y = TOP + s.y * C + C / 2;
      c.fillStyle = s.head ? '#ffeb3b' : '#7cff6b'; c.beginPath(); c.arc(x, y, C / 2 - 0.5, 0, Math.PI * 2); c.fill();
      if (s.head) { c.fillStyle = '#05010a'; c.fillRect(x + s.dir * 1.5 - 1, y - 2, 2, 2); }
    }
    if (this.spider) { const s = this.spider; c.strokeStyle = '#ff5ec4'; c.lineWidth = 1.5; c.beginPath(); for (const d of [-1, 1]) for (const k of [-3, 0, 3]) { c.moveTo(s.x, s.y); c.lineTo(s.x + d * 7, s.y + k); } c.stroke(); c.fillStyle = '#ff5ec4'; c.fillRect(s.x - 3, s.y - 3, 6, 6); }
    if (!this.dead || Math.floor(this.t * 10) % 2) { c.fillStyle = '#7ad8ff'; c.fillRect(this.px - 3, this.py - 3, 6, 6); c.fillRect(this.px - 1, this.py - 6, 2, 3); }
    if (this.shot) { c.fillStyle = '#fff'; c.fillRect(this.shot.x - 0.5, this.shot.y - 4, 1, 4); }
    c.fillStyle = 'rgba(122,216,255,0.12)'; c.fillRect(0, TOP + (ROWS - 6) * C, W, 1);
    this.text(`${this.score}`, 6, 2, { size: 8, align: 'left' });
    this.text(`LIVES ${this.lives}`, W - 6, 2, { size: 8, align: 'right' });
  }
}
