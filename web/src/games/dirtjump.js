// DIRT JUMP — a side-view motocross race in the spirit of 1984's console racers: hold A for throttle,
// hold RIGHT for turbo (but watch the engine heat), change lanes with UP and DOWN, and lean with LEFT and
// RIGHT in the air so you land level on the far side of each ramp. Two laps against the clock.
import { Game, aiInput, clamp } from './base.js';

const W = 256, H = 192, LANES = [128, 140, 152, 164], BIKE_X = 72, LAP = 2600;
// track features by distance along a lap: ramps span every lane, mud and cooling arrows sit in one lane
function makeTrack() {
  const f = [];
  let d = 260;
  while (d < LAP - 200) {
    const k = Math.random();
    if (k < 0.45) { const big = Math.random() < 0.4; f.push({ d, kind: 'ramp', len: big ? 46 : 30, h: big ? 26 : 16 }); d += big ? 130 : 100; }
    else if (k < 0.7) { f.push({ d, kind: 'mud', lane: (Math.random() * 4) | 0, len: 50 }); d += 70; }
    else if (k < 0.88) { f.push({ d, kind: 'cool', lane: (Math.random() * 4) | 0, len: 14 }); d += 60; }
    else { f.push({ d, kind: 'bumps', len: 60 }); d += 110; }
  }
  return f;
}

export class DirtJump extends Game {
  constructor(sfx) { super({ id: 'dirtjump', w: W, h: H, sfx }); this.title = 'DIRT JUMP'; }
  reset() {
    this.track = makeTrack(); this.dist = 0; this.speed = 0; this.lane = 1; this.laneY = LANES[1];
    this.alt = 0; this.vz = 0; this.angle = 0; this.heat = 0; this.over = 0; this.crash = 0; this.time = 0; this.lap = 1; this.done = 0;
    this.rivals = [0, 2, 3].map((lane, i) => ({ lane, d: 120 + i * 140, v: 105 + i * 6 }));
    this.jumps = 0;
  }
  feature(d) { const ld = ((d % LAP) + LAP) % LAP; return this.track.filter(f => ld >= f.d && ld < f.d + f.len); }
  rampHeight(d) { for (const f of this.feature(d)) if (f.kind === 'ramp') return Math.sin((((d % LAP) - f.d) / f.len) * Math.PI) * f.h; return 0; }
  ai() {
    if (this.crash > 0 || this.done > 0) return aiInput();
    const h = { a: true };
    if (this.alt > 0) { if (this.angle > 0.1) h.left = true; else if (this.angle < -0.1) h.right = true; return aiInput(h); }
    if (this.heat < 55) h.right = true;
    // dodge mud and riders in this lane, head for cool arrows
    const ahead = (lane, span) => this.track.some(f => f.kind === 'mud' && f.lane === lane && ((f.d - this.dist % LAP + LAP) % LAP) < span) || this.rivals.some(r => r.lane === lane && r.d - this.dist > 0 && r.d - this.dist < span);
    const coolLane = this.track.find(f => f.kind === 'cool' && ((f.d - this.dist % LAP + LAP) % LAP) < 140)?.lane;
    let tap = {};
    if (ahead(this.lane, 90)) { if (this.lane < 3 && !ahead(this.lane + 1, 90)) tap.down = true; else if (this.lane > 0) tap.up = true; }
    else if (this.heat > 40 && coolLane != null && coolLane !== this.lane) tap[coolLane > this.lane ? 'down' : 'up'] = true;
    return aiInput(h, tap);
  }
  update(dt, inp) {
    if (this.done > 0) { this.done -= dt; if (this.done <= 0) { this.done = 0; this.gameOver(); } return; }
    this.time += dt;
    if (this.time > 120) { this.gameOver(); return; }
    // rivals ride at their own pace
    for (const r of this.rivals) { r.d += r.v * dt * (this.feature(r.d).some(f => f.kind === 'mud' && f.lane === r.lane) ? 0.6 : 1); }
    if (this.crash > 0) { this.crash -= dt; this.speed = 0; if (this.crash <= 0) { this.crash = 0; this.alt = 0; this.vz = 0; this.angle = 0; } return; }
    if (this.over > 0) { this.over = Math.max(0, this.over - dt); this.speed = Math.max(0, this.speed - 160 * dt); this.heat = Math.max(0, this.heat - 30 * dt); this.dist += this.speed * dt; return; }
    const here = this.feature(this.dist);
    const onGround = this.alt <= 0;
    const mud = onGround && here.some(f => f.kind === 'mud' && f.lane === this.lane);
    const turbo = inp.a && inp.right && onGround;
    const top = (turbo ? 175 : 130) * (mud ? 0.45 : 1);
    if (inp.a) this.speed += (top - this.speed) * Math.min(1, dt * (turbo ? 1.6 : 1.1));
    else this.speed = Math.max(0, this.speed - 70 * dt);
    this.heat += (turbo ? 26 : inp.a ? 6 : -16) * dt;
    if (here.some(f => f.kind === 'cool' && f.lane === this.lane) && onGround) this.heat = Math.max(0, this.heat - 80 * dt);
    this.heat = clamp(this.heat, 0, 100);
    if (this.heat >= 100) { this.over = 2.5; this.sound('die'); return; }
    // lanes
    if (onGround && (inp.tap.up || inp.tap.down)) this.lane = clamp(this.lane + (inp.tap.down ? 1 : -1), 0, 3);
    this.laneY += (LANES[this.lane] - this.laneY) * Math.min(1, dt * 10);
    // ramps, air and landings
    const before = this.rampHeight(this.dist);
    this.dist += this.speed * dt;
    const ground = this.rampHeight(this.dist);
    if (onGround) {
      const slope = (ground - before) / Math.max(0.001, this.speed * dt);
      this.angle = -Math.atan(slope) * 0.8;
      if (ground < before && this.speed > 60 && before > 4) { this.alt = before; this.vz = (before - ground) / dt * 0.55 + this.speed * 0.25; this.angle = -0.25; this.sound('paddle'); }
      else this.alt = 0;
      if (here.some(f => f.kind === 'bumps')) this.angle = Math.sin(this.dist * 0.3) * 0.15;
    }
    if (this.alt > 0) {
      this.vz -= 260 * dt; this.alt += this.vz * dt;
      this.angle += ((inp.left ? -1.8 : 0) + (inp.right ? 1.8 : 0)) * dt + 0.35 * dt; // the nose slowly drops
      this.angle = clamp(this.angle, -1.2, 1.2);
      if (this.alt <= ground) {
        const ok = Math.abs(this.angle) < 0.5;
        this.alt = 0;
        if (ok) { this.jumps++; this.addScore(Math.abs(this.angle) < 0.2 ? 300 : 150); this.sound('wall'); this.angle = 0; }
        else { this.crash = 2.2; this.sound('hit'); return; }
      }
    }
    // riders in the same lane: clip their back wheel and you go down
    for (const r of this.rivals) if (r.lane === this.lane && this.alt <= 2 && r.d - this.dist > 0 && r.d - this.dist < 14) { this.crash = 1.8; this.sound('hit'); this.dist -= 10; return; }
    if (this.dist >= LAP * this.lap) {
      this.lap++;
      if (this.lap > 2) { this.addScore(Math.max(0, Math.round((90 - this.time) * 100)) + 2000); this.done = 2.5; this.sound('start'); }
      else this.sound('power');
    }
  }
  draw(c) {
    // sky, stands and crowd
    c.fillStyle = '#5c94fc'; c.fillRect(0, 0, W, H);
    c.fillStyle = '#d8d8d8'; c.fillRect(0, 60, W, 52);
    const off = this.dist % 16;
    for (let x = -16; x < W + 16; x += 16) for (let y = 0; y < 4; y++) { c.fillStyle = ['#e04040', '#f8d838', '#40a0f0', '#f8f8f8'][((x + Math.floor(this.dist / 16) * 16) / 16 + y) & 3]; c.fillRect(x - off + (y % 2) * 8, 66 + y * 11, 6, 6); }
    c.fillStyle = '#20a020'; c.fillRect(0, 112, W, 8);
    // track
    c.fillStyle = '#b87838'; c.fillRect(0, 120, W, 52);
    for (let i = 0; i < 4; i++) { c.fillStyle = '#a06830'; c.fillRect(0, LANES[i] + 4, W, 1); }
    c.fillStyle = '#20a020'; c.fillRect(0, 172, W, H - 172);
    // features in view
    for (let sx = -40; sx < W + 60; sx += 2) {
      const d = this.dist + sx - BIKE_X, fs = this.feature(d);
      for (const f of fs) {
        if (f.kind === 'ramp') { const h = this.rampHeight(d); c.fillStyle = '#8a5a28'; c.fillRect(sx, 172 - h * 1.6, 2, h * 1.6); c.fillStyle = '#c89048'; c.fillRect(sx, 172 - h * 1.6, 2, 2); }
        else if (f.kind === 'mud') { c.fillStyle = '#5a3a18'; c.fillRect(sx, LANES[f.lane] - 3, 2, 9); }
        else if (f.kind === 'cool') { c.fillStyle = Math.floor(sx / 6) % 2 ? '#f8f8f8' : '#40c0f0'; c.fillRect(sx, LANES[f.lane] - 2, 2, 7); }
        else if (f.kind === 'bumps') { c.fillStyle = '#9a6a30'; c.fillRect(sx, 168 - Math.abs(Math.sin(d * 0.3)) * 4, 2, 4); }
      }
    }
    // finish line
    const fd = LAP * this.lap - this.dist + BIKE_X; if (fd > -10 && fd < W + 10) { for (let y = 120; y < 172; y += 4) { c.fillStyle = ((y / 4) & 1) ? '#000' : '#fff'; c.fillRect(fd, y, 4, 4); c.fillStyle = ((y / 4) & 1) ? '#fff' : '#000'; c.fillRect(fd + 4, y, 4, 4); } }
    const rider = (x, y, ang, col, wheelie) => {
      c.save(); c.translate(x, y); c.rotate(ang);
      c.fillStyle = '#222'; c.beginPath(); c.arc(-8, 0, 4, 0, Math.PI * 2); c.arc(8, 0, 4, 0, Math.PI * 2); c.fill();
      c.fillStyle = col; c.fillRect(-7, -6, 14, 4); c.fillRect(-2, -14, 6, 8);
      c.fillStyle = '#f8f8f8'; c.fillRect(-1, -19, 6, 5);
      c.restore();
    };
    for (const r of this.rivals) { const x = r.d - this.dist + BIKE_X; if (x > -20 && x < W + 20) rider(x, LANES[r.lane] - 4 - this.rampHeight(r.d) * 1.6, 0, '#3060e0'); }
    // you
    const yy = this.laneY - 4 - Math.max(this.alt, this.rampHeight(this.dist)) * 1.6;
    if (this.crash > 0) { c.fillStyle = '#e02828'; c.fillRect(BIKE_X - 8, this.laneY - 6, 16, 5); c.fillStyle = '#222'; c.beginPath(); c.arc(BIKE_X - 14, this.laneY - 2, 4, 0, 7); c.fill(); }
    else rider(BIKE_X, yy, this.angle, '#e02828');
    if (this.alt > 0) { c.fillStyle = 'rgba(0,0,0,0.25)'; c.fillRect(BIKE_X - 10, this.laneY + 2, 20, 3); }
    // HUD: time, lap, heat
    c.fillStyle = '#000'; c.fillRect(0, 0, W, 18);
    this.text(`LAP ${Math.min(2, this.lap)}/2`, 6, 5, { size: 8, align: 'left' });
    this.text(`${this.time.toFixed(1)}s`, 70, 5, { size: 8, align: 'left' });
    this.text(`${this.score}`, 128, 5, { size: 8, align: 'left' });
    c.fillStyle = '#333'; c.fillRect(176, 5, 72, 8);
    c.fillStyle = this.heat > 75 ? '#ff3030' : this.heat > 50 ? '#f8c838' : '#40c040'; c.fillRect(176, 5, 72 * this.heat / 100, 8);
    this.text('TEMP', 172, 5, { size: 8, align: 'right' });
    if (this.over > 0 && Math.floor(this.t * 4) % 2) this.text('OVERHEAT!', W / 2, 30, { size: 10, color: '#ff3030' });
    if (this.done > 0) this.text('FINISH!', W / 2, 30, { size: 12, color: '#ffe14d' });
  }
}
