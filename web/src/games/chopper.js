// CHOPPER RESCUE — a side-scrolling rescue mission in the style of 1982's Choplifter: shoot open the
// barracks, land so the hostages can run aboard, and fly them home while tanks shoot at you.
import { Game, aiInput, clamp, rand } from './base.js';

const W = 256, H = 180, WORLD = 1100, GROUND = 158, BASE = 1020, CAP = 8;

export class Chopper extends Game {
  constructor(sfx) { super({ id: 'chopper', w: W, h: H, sfx }); this.title = 'CHOPPER RESCUE'; }
  reset() {
    this.lives = 3; this.rescued = 0; this.lost = 0;
    this.barracks = [140, 360, 600].map(x => ({ x, hp: 3, open: false, inside: 4 }));
    this.people = []; this.tanks = [{ x: 260, dir: 1, cool: 2 }, { x: 520, dir: -1, cool: 3 }];
    this.bullets = []; this.shells = []; this.spawn();
  }
  spawn() { this.x = BASE - 20; this.y = GROUND - 8; this.vx = 0; this.vy = 0; this.face = -1; this.aboard = 0; this.dead = 0; this.cool = 0; }
  get landed() { return this.y >= GROUND - 8.5 && Math.abs(this.vx) < 30; }
  remaining() { return this.barracks.reduce((s, b) => s + b.inside, 0) + this.people.length + this.aboard; }
  ai() {
    if (this.dead) return aiInput();
    let tx, wantLand = false;
    const waiting = this.people.filter(p => !p.boarding);
    if (this.aboard >= CAP || (this.aboard > 0 && !waiting.length && !this.barracks.some(b => b.inside && b.open))) { tx = BASE; wantLand = true; }
    else if (waiting.length) { tx = waiting.reduce((a, p) => a + p.x, 0) / waiting.length + 30; wantLand = true; }
    else { const b = this.barracks.find(o => o.inside > 0); if (!b) { tx = BASE; wantLand = true; } else tx = b.x + (this.x > b.x ? 70 : -70); }
    const dx = tx - this.x, near = Math.abs(dx) < 14;
    const target = this.barracks.find(o => !o.open && o.inside > 0 && Math.abs(o.x - this.x) < 90);
    const fire = target && Math.sign(target.x - this.x) === this.face && this.y < GROUND - 20;
    const alt = wantLand && near ? GROUND : GROUND - 50;
    return aiInput({ left: dx < -8, right: dx > 8, up: this.y > alt + 4, down: this.y < alt - 4 }, { a: fire || (this.tanks.some(t => Math.abs(t.x - this.x) < 70 && Math.sign(t.x - this.x) === this.face) && Math.random() < 0.2) });
  }
  update(dt, inp) {
    if (this.dead > 0) { this.dead -= dt; if (this.dead <= 0) { if (this.lives <= 0) { this.gameOver(); return; } this.spawn(); } this.stepWorld(dt); return; }
    const ax = (inp.right ? 1 : 0) - (inp.left ? 1 : 0), ay = (inp.down ? 1 : 0) - (inp.up ? 1 : 0);
    if (ax) this.face = ax;
    this.vx = clamp(this.vx + ax * 160 * dt, -110, 110); this.vx *= Math.pow(0.4, dt);
    this.vy = clamp(this.vy + ay * 180 * dt, -70, 80); this.vy *= Math.pow(0.2, dt);
    this.x = clamp(this.x + this.vx * dt, 20, WORLD - 20); this.y = clamp(this.y + this.vy * dt, 24, GROUND - 8);
    if (this.y >= GROUND - 8) this.vx *= Math.pow(0.02, dt);
    this.cool -= dt;
    if (inp.tap.a && this.cool <= 0 && !this.landed) { this.bullets.push({ x: this.x + this.face * 12, y: this.y + 4, vx: this.face * 260 + this.vx, vy: 30, life: 0.9 }); this.cool = 0.2; this.sound('shoot'); }
    // unload at base
    if (this.landed && Math.abs(this.x - BASE) < 40 && this.aboard) { this.rescued += this.aboard; this.addScore(this.aboard * 200); this.aboard = 0; this.sound('start'); }
    this.stepWorld(dt);
    if (this.remaining() === 0) { this.addScore(this.rescued * 50); this.gameOver(); }
  }
  stepWorld(dt) {
    for (const b of this.bullets) { b.x += b.vx * dt; b.y += b.vy * dt; b.life -= dt; }
    this.bullets = this.bullets.filter(b => {
      if (b.life <= 0 || b.y > GROUND) return false;
      const br = this.barracks.find(o => !o.open && o.inside && Math.abs(o.x - b.x) < 18 && b.y > GROUND - 22);
      if (br) { br.hp--; this.sound('hit'); if (br.hp <= 0) { br.open = true; this.addScore(100); } return false; }
      const t = this.tanks.find(o => Math.abs(o.x - b.x) < 12 && b.y > GROUND - 14);
      if (t) { this.addScore(150); this.sound('hit'); t.x = Math.random() < 0.5 ? 40 : 760; return false; }
      return true;
    });
    // hostages leave open barracks a few at a time and run toward a landed helicopter
    for (const b of this.barracks) if (b.open && b.inside > 0 && Math.random() < dt * 0.8) { b.inside--; this.people.push({ x: b.x + rand(-8, 8), dir: rand(-1, 1) }); }
    for (const p of this.people) {
      const toHeli = this.landed && !this.dead && Math.abs(this.x - p.x) < 90 && this.aboard < CAP;
      p.boarding = toHeli;
      if (toHeli) p.x += Math.sign(this.x - p.x) * 26 * dt; else { p.x += p.dir * 8 * dt; if (Math.random() < dt) p.dir = rand(-1, 1); }
    }
    this.people = this.people.filter(p => { if (p.boarding && Math.abs(p.x - this.x) < 6) { this.aboard++; this.sound('gem'); return false; } return true; });
    // tanks patrol and lob shells at the helicopter when it's in range
    for (const t of this.tanks) {
      t.x += t.dir * 18 * dt; if (t.x < 60 || t.x > 800) t.dir *= -1;
      t.cool -= dt;
      const dx = this.x - t.x;
      if (!this.dead && t.cool <= 0 && Math.abs(dx) < 150) { t.cool = rand(1.6, 3); const tt = 0.9; this.shells.push({ x: t.x, y: GROUND - 10, vx: dx / tt, vy: (this.y - GROUND) / tt - 90 * tt * 0.5 }); }
    }
    for (const s of this.shells) { s.x += s.vx * dt; s.vy += 90 * dt; s.y += s.vy * dt; }
    this.shells = this.shells.filter(s => {
      if (s.y > GROUND) return false;
      if (!this.dead && Math.abs(s.x - this.x) < 12 && Math.abs(s.y - this.y) < 7) { this.lives--; this.lost += this.aboard; this.aboard = 0; this.dead = 1.8; this.sound('die'); return false; }
      return true;
    });
  }
  draw(c) {
    const cam = clamp(this.x - W / 2, 0, WORLD - W);
    c.fillStyle = '#87b5e8'; c.fillRect(0, 0, W, H);
    c.fillStyle = '#c7ddf2'; for (let i = 0; i < 6; i++) { const x = ((i * 230 - cam * 0.3) % (W + 80) + W + 80) % (W + 80) - 40; c.beginPath(); c.arc(x, 40 + (i % 3) * 14, 16, 0, Math.PI * 2); c.arc(x + 16, 40 + (i % 3) * 14, 12, 0, Math.PI * 2); c.fill(); }
    c.fillStyle = '#c9a66b'; c.fillRect(0, GROUND, W, H - GROUND);
    const sx = (x) => x - cam;
    // base with a flag
    c.fillStyle = '#556b2f'; c.fillRect(sx(BASE) - 30, GROUND - 4, 60, 4); c.fillStyle = '#333'; c.fillRect(sx(BASE) + 34, GROUND - 30, 2, 30); c.fillStyle = '#ffffff'; c.fillRect(sx(BASE) + 36, GROUND - 30, 12, 7);
    for (const b of this.barracks) { c.fillStyle = b.open ? '#6b4a2a' : '#8a6a3a'; c.fillRect(sx(b.x) - 16, GROUND - 20, 32, 20); c.fillStyle = '#4a3210'; c.fillRect(sx(b.x) - 18, GROUND - 24, 36, 5); if (b.open) { c.fillStyle = '#000'; c.fillRect(sx(b.x) - 4, GROUND - 12, 8, 12); } }
    c.fillStyle = '#ffffff'; for (const p of this.people) { const x = sx(p.x), st = Math.floor(this.t * 8 + p.x) % 2; c.fillRect(x - 1, GROUND - 9, 3, 3); c.fillRect(x - 1, GROUND - 6, 3, 4); c.fillRect(x - 2 + st, GROUND - 2, 1, 2); c.fillRect(x + 1 - st, GROUND - 2, 1, 2); }
    for (const t of this.tanks) { const x = sx(t.x); c.fillStyle = '#3d4a2a'; c.fillRect(x - 10, GROUND - 7, 20, 7); c.fillRect(x - 5, GROUND - 11, 10, 4); c.fillRect(x, GROUND - 13, 9 * Math.sign(this.x - t.x || 1), 2); }
    c.fillStyle = '#222'; for (const s of this.shells) c.fillRect(sx(s.x) - 1.5, s.y - 1.5, 3, 3);
    c.fillStyle = '#ffe14d'; for (const b of this.bullets) c.fillRect(sx(b.x) - 1, b.y - 1, 3, 2);
    if (!this.dead || Math.floor(this.t * 10) % 2) {
      const x = sx(this.x), y = this.y, f = this.face;
      c.fillStyle = this.dead ? '#ff4d4d' : '#2f4f2f';
      c.beginPath(); c.ellipse(x, y, 11, 6, 0, 0, Math.PI * 2); c.fill();
      c.fillRect(x - f * 22, y - 2, 14, 3); c.fillRect(x - f * 24, y - 6, 3, 7);
      c.fillStyle = '#9fd8ff'; c.fillRect(x + f * 3 - (f < 0 ? 6 : 0), y - 4, 6, 4);
      c.fillStyle = '#222'; c.fillRect(x - 13, y - 9, 26 * Math.abs(Math.cos(this.t * 30)), 1); c.fillRect(x - 1, y - 8, 2, 3);
      c.fillRect(x - 8, y + 6, 16, 1);
    }
    this.text(`ABOARD ${this.aboard}/${CAP}  SAVED ${this.rescued}  LOST ${this.lost}`, 4, 4, { size: 8, align: 'left', color: '#102030' });
    this.text(`${this.score}  x${this.lives}`, W - 4, 4, { size: 8, align: 'right', color: '#102030' });
    // a minimap shows the whole valley
    c.fillStyle = 'rgba(0,0,0,0.25)'; c.fillRect(W - 84, 14, 80, 6);
    const mm = (x) => W - 84 + x / WORLD * 80;
    c.fillStyle = '#fff'; c.fillRect(mm(this.x) - 1, 14, 2, 6);
    c.fillStyle = '#8a6a3a'; for (const b of this.barracks) if (b.inside) c.fillRect(mm(b.x) - 1, 17, 3, 3);
    c.fillStyle = '#556b2f'; c.fillRect(mm(BASE) - 1, 17, 3, 3);
  }
}
