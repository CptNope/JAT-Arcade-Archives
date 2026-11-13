// STAR SIEGE — a fixed-shooter in the style of late-1970s arcade games.
// All sprites are original 8x8 bitmaps drawn for this project.
import { Game, aiInput, clamp } from './base.js';

const W = 224, H = 256;

// original invader-ish sprites (two animation frames each), 1 = pixel on
const SPR = {
  squid: ['00011000', '00111100', '01111110', '11011011', '11111111', '00100100', '01011010', '10100101',
          '00011000', '00111100', '01111110', '11011011', '11111111', '01011010', '10000001', '01000010'],
  crab:  ['00100100', '10011001', '10111101', '11100111', '11111111', '01111110', '00100100', '01000010',
          '00100100', '00011000', '00111100', '01100110', '11111111', '11111111', '10100101', '00100100'],
  disc:  ['00111100', '01111110', '11111111', '10011001', '11111111', '00100100', '01011010', '00100100',
          '00111100', '01111110', '11111111', '11100111', '11111111', '01000010', '00100100', '01000010'],
};
const ROWS = [['squid', '#ff5c8a', 30], ['crab', '#ffd23f', 20], ['crab', '#ffd23f', 20], ['disc', '#5ce1ff', 10], ['disc', '#5ce1ff', 10]];

function sprite(c, rows, frame, x, y, color, scale = 1) {
  c.fillStyle = color;
  for (let r = 0; r < 8; r++) {
    const line = rows[r + frame * 8];
    for (let k = 0; k < 8; k++) if (line[k] === '1') c.fillRect(x + k * scale, y + r * scale, scale, scale);
  }
}

export class StarSiege extends Game {
  constructor(sfx) { super({ id: 'starsiege', w: W, h: H, sfx }); this.title = 'STAR SIEGE'; }

  reset() { this.lives = 3; this.wave = 0; this.newWave(); }
  newWave() {
    this.wave++;
    this.aliens = [];
    ROWS.forEach(([kind, color, pts], r) => {
      for (let i = 0; i < 9; i++) this.aliens.push({ x: 20 + i * 18, y: 40 + r * 16 + Math.min(this.wave - 1, 4) * 6, kind, color, pts, alive: true });
    });
    this.dir = 1; this.stepT = 0; this.frame = 0;
    this.px = W / 2; this.shot = null; this.bombs = []; this.boom = [];
    this.dead = 0;
    this.bunkers = [];
    for (let b = 0; b < 4; b++) for (let y = 0; y < 3; y++) for (let x = 0; x < 6; x++) {
      if (y === 2 && (x === 2 || x === 3)) continue;
      this.bunkers.push({ x: 26 + b * 50 + x * 4, y: 200 + y * 4, hp: 3 });
    }
  }
  ai() {
    const live = this.aliens.filter(a => a.alive);
    if (!live.length) return aiInput();
    // dodge the closest bomb, otherwise slide under the lowest alien
    const danger = this.bombs.find(b => b.y > 170 && Math.abs(b.x - this.px) < 10);
    let tx = live.reduce((best, a) => (a.y > best.y ? a : best), live[0]).x + 4;
    if (danger) tx = this.px + (danger.x > this.px ? -30 : 30);
    return aiInput({ left: tx < this.px - 3, right: tx > this.px + 3 }, { a: !this.shot });
  }
  update(dt, inp) {
    if (this.dead > 0) { this.dead -= dt; if (this.dead <= 0 && this.lives <= 0) this.gameOver(); return; }
    if (inp.left) this.px -= 90 * dt;
    if (inp.right) this.px += 90 * dt;
    this.px = clamp(this.px, 10, W - 10);
    if ((inp.tap.a || inp.a) && !this.shot) { this.shot = { x: this.px, y: 226 }; this.sound('shoot'); }

    if (this.shot) {
      this.shot.y -= 240 * dt;
      if (this.shot.y < 20) this.shot = null;
    }
    const live = this.aliens.filter(a => a.alive);
    // march: speeds up as the swarm thins
    this.stepT -= dt;
    const interval = 0.05 + 0.55 * (live.length / 45) / (1 + (this.wave - 1) * 0.15);
    if (this.stepT <= 0) {
      this.stepT = interval; this.frame ^= 1;
      const edge = live.some(a => (this.dir > 0 ? a.x > W - 18 : a.x < 6));
      if (edge) { this.dir *= -1; live.forEach(a => (a.y += 6)); } else live.forEach(a => (a.x += 4 * this.dir));
      if (this.mode === 'play') this.sfx?.play(this.frame ? 'step1' : 'step2');
    }
    // alien bombs
    if (live.length && Math.random() < dt * (0.9 + this.wave * 0.25) && this.bombs.length < 4) {
      const a = live[(Math.random() * live.length) | 0];
      this.bombs.push({ x: a.x + 4, y: a.y + 8 });
    }
    this.bombs.forEach(b => (b.y += 80 * dt));
    this.bombs = this.bombs.filter(b => {
      if (b.y > 240) return false;
      if (this.hitBunker(b.x, b.y)) return false;
      if (Math.abs(b.x - this.px) < 7 && b.y > 222 && b.y < 234) { this.die(); return false; }
      return true;
    });
    // player shot vs aliens / bunkers
    if (this.shot) {
      if (this.hitBunker(this.shot.x, this.shot.y)) this.shot = null;
      else for (const a of live) {
        if (this.shot.x > a.x - 1 && this.shot.x < a.x + 9 && this.shot.y > a.y && this.shot.y < a.y + 8) {
          a.alive = false; this.addScore(a.pts); this.boom.push({ x: a.x, y: a.y, t: 0.25 });
          this.shot = null; this.sound('hit'); break;
        }
      }
    }
    this.boom.forEach(b => (b.t -= dt)); this.boom = this.boom.filter(b => b.t > 0);
    if (live.some(a => a.alive && a.y > 214)) { this.lives = 0; this.die(); }
    if (!this.aliens.some(a => a.alive)) { this.addScore(500); this.newWave(); }
  }
  hitBunker(x, y) {
    for (const b of this.bunkers) {
      if (b.hp > 0 && x >= b.x && x < b.x + 4 && y >= b.y && y < b.y + 4) { b.hp--; return true; }
    }
    return false;
  }
  die() {
    this.lives--; this.dead = 1.2; this.bombs = []; this.shot = null;
    this.boom.push({ x: this.px - 4, y: 224, t: 1 }); this.sound('die');
  }
  draw(c) {
    c.fillStyle = '#05010f'; c.fillRect(0, 0, W, H);
    // starfield
    c.fillStyle = '#334';
    for (let i = 0; i < 40; i++) c.fillRect((i * 53) % W, (i * 97 + this.t * 6) % H, 1, 1);
    this.text(`SCORE ${String(this.score).padStart(5, '0')}`, 8, 6, { size: 8, align: 'left' });
    this.text(`HI ${String(Math.max(this.hi, this.score)).padStart(5, '0')}`, W - 8, 6, { size: 8, align: 'right' });
    for (const a of this.aliens) if (a.alive) sprite(c, SPR[a.kind], this.frame, a.x, a.y, a.color);
    c.fillStyle = '#ff8c42';
    this.boom.forEach(b => { for (let i = 0; i < 6; i++) c.fillRect(b.x + ((i * 37) % 9), b.y + ((i * 23) % 8), 2, 2); });
    c.fillStyle = '#3dff6e';
    for (const b of this.bunkers) if (b.hp > 0) { c.globalAlpha = b.hp / 3; c.fillRect(b.x, b.y, 4, 4); }
    c.globalAlpha = 1;
    if (this.dead <= 0) {
      c.fillStyle = '#3dff6e';
      c.fillRect(this.px - 7, 228, 14, 4); c.fillRect(this.px - 4, 225, 8, 3); c.fillRect(this.px - 1, 221, 2, 4);
    }
    c.fillStyle = '#fff'; if (this.shot) c.fillRect(this.shot.x - 0.5, this.shot.y, 1, 5);
    c.fillStyle = '#ff5c8a'; this.bombs.forEach(b => { c.fillRect(b.x - 1, b.y, 2, 2); c.fillRect(b.x, b.y + 2, 2, 2); c.fillRect(b.x - 1, b.y + 4, 2, 2); });
    c.fillStyle = '#3dff6e'; c.fillRect(0, 240, W, 1);
    for (let i = 0; i < Math.max(0, this.lives - 1); i++) { c.fillRect(10 + i * 18, 246, 12, 3); c.fillRect(15 + i * 18, 243, 2, 3); }
    this.text(`WAVE ${this.wave}`, W - 8, 244, { size: 8, align: 'right', color: '#3dff6e' });
  }
}
