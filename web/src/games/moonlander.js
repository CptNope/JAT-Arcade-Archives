// MOON LANDER — vector lunar landing in the style of 1979's Lunar Lander: rotate, burn fuel, and touch
// down gently and upright on a flat pad. Narrow pads score more.
import { Game, aiInput, rand, clamp } from './base.js';
import { vline, rot } from './vector.js';

const W = 256, H = 200, G = 16;
const LANDER = [[-4, -5], [4, -5], [6, 0], [-6, 0]];

export class MoonLander extends Game {
  constructor(sfx) { super({ id: 'moonlander', w: W, h: H, sfx, fg: '#e8f6ff' }); this.title = 'MOON LANDER'; }
  reset() { this.fuel = 900; this.round = 0; this.newGround(); }
  newGround() {
    this.round++;
    const pts = []; let y = rand(140, 175);
    this.pads = [];
    for (let x = 0; x <= W; ) {
      if (Math.random() < 0.22 && x > 10 && x < W - 40 && this.pads.length < 3) {
        const mult = [5, 3, 2][this.pads.length], w = [14, 22, 32][this.pads.length];
        pts.push([x, y]); pts.push([x + w, y]); this.pads.push({ x0: x, x1: x + w, y, mult }); x += w;
      } else { const dx = rand(6, 16); y = clamp(y + rand(-18, 18), 95, 190); x += dx; pts.push([Math.min(x, W), y]); }
    }
    if (!this.pads.length) { const p = pts[Math.floor(pts.length / 2)]; this.pads.push({ x0: p[0], x1: p[0] + 24, y: p[1], mult: 2 }); pts.splice(Math.floor(pts.length / 2) + 1, 0, [p[0] + 24, p[1]]); }
    this.ground = pts;
    this.l = { x: rand(30, W - 30), y: 20, vx: rand(-15, 15), vy: 0, a: 0, burn: false };
    this.msg = ''; this.landed = 0;
  }
  groundY(x) {
    for (let i = 1; i < this.ground.length; i++) {
      const [x0, y0] = this.ground[i - 1], [x1, y1] = this.ground[i];
      if (x >= x0 && x <= x1) return x1 === x0 ? y0 : y0 + (y1 - y0) * (x - x0) / (x1 - x0);
    }
    return H;
  }
  ai() {
    const l = this.l; if (this.landed) return aiInput();
    const pad = this.pads.reduce((b, p) => (Math.abs((p.x0 + p.x1) / 2 - l.x) < Math.abs((b.x0 + b.x1) / 2 - l.x) ? p : b), this.pads[0]);
    const dx = (pad.x0 + pad.x1) / 2 - l.x, alt = pad.y - l.y;
    const wantVx = clamp(dx * 0.4, -20, 20), wantA = clamp((wantVx - l.vx) * 0.05, -0.6, 0.6) * (alt > 25 ? 1 : 0.3);
    const da = wantA - l.a, wantVy = alt > 40 ? 20 : 6;
    return aiInput({ left: da < -0.05, right: da > 0.05, up: l.vy > wantVy && this.fuel > 0 });
  }
  update(dt, inp) {
    const l = this.l;
    if (this.landed) { this.landed -= dt; if (this.landed <= 0) { if (this.fuel <= 0) this.gameOver(); else this.newGround(); } return; }
    if (inp.left) l.a -= 1.8 * dt; if (inp.right) l.a += 1.8 * dt;
    l.a = clamp(l.a, -1.5, 1.5);
    l.burn = (inp.up || inp.a) && this.fuel > 0;
    if (l.burn) { l.vx += Math.sin(l.a) * 34 * dt; l.vy -= Math.cos(l.a) * 34 * dt; this.fuel = Math.max(0, this.fuel - 60 * dt); }
    l.vy += G * dt; l.x += l.vx * dt; l.y += l.vy * dt;
    if (l.x < 0) l.x += W; if (l.x > W) l.x -= W;
    if (l.y > this.groundY(l.x) - 0.5) {
      const pad = this.pads.find(p => l.x - 5 >= p.x0 && l.x + 5 <= p.x1);
      const gentle = l.vy < 14 && Math.abs(l.vx) < 8 && Math.abs(l.a) < 0.25;
      if (pad && gentle) { const pts = 50 * pad.mult * (l.vy < 6 ? 2 : 1); this.addScore(pts); this.fuel += 120; this.msg = `LANDED! ${pts} POINTS`; this.sound('start'); }
      else { this.msg = pad ? 'TOO HARD. THE LANDER IS DAMAGED.' : 'CRASHED ON ROUGH GROUND'; this.fuel = Math.max(0, this.fuel - 250); this.sound('die'); }
      l.y = this.groundY(l.x) - 0.5; this.landed = 2.4;
    }
  }
  draw(c) {
    c.fillStyle = 'rgba(0,0,0,0.6)'; c.fillRect(0, 0, W, H);
    vline(c, [...this.ground, [W, H], [0, H]], { close: false, glow: 4 });
    for (const p of this.pads) { vline(c, [[p.x0, p.y], [p.x1, p.y]], { close: false, width: 2.5 }); this.text(`${p.mult}X`, (p.x0 + p.x1) / 2, p.y + 4, { size: 7, color: '#9fd8ff' }); }
    const l = this.l;
    const crashed = this.landed > 0 && (this.msg.startsWith('CR') || this.msg.startsWith('TOO'));
    if (!crashed || Math.floor(this.t * 8) % 2) {
      vline(c, rot(LANDER, l.a, l.x, l.y - 6));
      vline(c, rot([[-6, 0], [-8, 5], [6, 0], [8, 5]], l.a, l.x, l.y - 6), { close: false });
      if (l.burn && Math.random() < 0.8) vline(c, rot([[-2, 0], [0, 6 + Math.random() * 6], [2, 0]], l.a, l.x, l.y - 6), { close: false });
    }
    this.text(`SCORE ${this.score}`, 8, 4, { size: 8, align: 'left' });
    this.text(`FUEL ${Math.round(this.fuel)}`, 8, 14, { size: 8, align: 'left' });
    this.text(`H.SPEED ${Math.round(l.vx)}`, W - 8, 4, { size: 8, align: 'right' });
    this.text(`V.SPEED ${Math.round(l.vy)}`, W - 8, 14, { size: 8, align: 'right' });
    if (this.msg && this.landed) this.text(this.msg, W / 2, 60, { size: 9 });
  }
}
