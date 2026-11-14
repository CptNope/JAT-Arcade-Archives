// Shared shell for every playable cabinet game.
// A game draws into its own small canvas; the museum shows that canvas on a 3D screen.
//
// Contract (the museum relies only on this):
//   game.canvas            HTMLCanvasElement (native resolution)
//   game.step(dt, input)   input is null while the machine is in attract mode
//   game.start()           player sits down / presses A
//   game.attract()         player walks away
//
// input = { left, right, up, down, a }   (held)
//         + tap: { a, left, right, up, down } (pressed this frame)

const HI_KEY = 'jat-arcade-hi:';

export function loadHi(id) {
  try { return Number(localStorage.getItem(HI_KEY + id)) || 0; } catch { return 0; }
}
export function saveHi(id, v) {
  try { localStorage.setItem(HI_KEY + id, String(v)); } catch { /* storage may be blocked */ }
}

// The museum's visitor features (high scores, passport, daily challenge) listen for these.
function emit(name, detail) {
  try { globalThis.dispatchEvent?.(new CustomEvent(name, { detail })); } catch { /* no DOM events (tests) */ }
}

export class Game {
  constructor({ id, w, h, sfx, fg = '#fff', bg = '#000', font = 'Courier New, monospace' }) {
    this.id = id;
    this.w = w; this.h = h;
    this.sfx = sfx;
    this.fg = fg; this.bg = bg; this.font = font;
    this.canvas = document.createElement('canvas');
    this.canvas.width = w; this.canvas.height = h;
    this.ctx = this.canvas.getContext('2d');
    this.ctx.imageSmoothingEnabled = false;
    this.mode = 'attract';   // attract | play | over
    this.score = 0;
    this.hi = loadHi(id);
    this.t = 0;
    this.overT = 0;
    this.attractT = 0;
    this.reset();
  }

  // --- lifecycle -------------------------------------------------------
  start() { this.mode = 'play'; this.score = 0; this.wipe(); this.reset(); this.sound('start'); emit('jat:start', { id: this.id }); }
  attract() { this.mode = 'attract'; this.score = 0; this.wipe(); this.reset(); }
  wipe() { this.ctx.fillStyle = '#000'; this.ctx.fillRect(0, 0, this.w, this.h); } // clears phosphor trails
  gameOver() {
    if (this.mode === 'attract') { this.reset(); return; }
    if (this.score > this.hi) { this.hi = this.score; saveHi(this.id, this.hi); }
    this.mode = 'over'; this.overT = 1.2; this.sound('over');
    emit('jat:gameover', { id: this.id, score: this.score });
  }
  addScore(n) { this.score += n; }
  sound(name) { if (this.mode === 'play' && this.sfx) this.sfx.play(name); }

  step(dt, input) {
    dt = Math.min(dt, 1 / 20);
    this.t += dt;
    if (this.mode === 'over') {
      this.overT -= dt;
      if (this.overT <= 0 && input && input.tap.a) this.start();
    } else if (this.mode === 'attract') {
      this.attractT += dt;
      if (input && input.tap.a) this.start();
      else this.update(dt, this.ai(dt));
    } else {
      this.update(dt, input || NO_INPUT);
    }
    this.draw(this.ctx);
    this.overlay(this.ctx);
  }

  // --- overridables ----------------------------------------------------
  reset() {}
  update() {}
  ai() { return NO_INPUT; }
  draw() {}

  // --- helpers -----------------------------------------------------------
  text(str, x, y, { size = 8, color = this.fg, align = 'center' } = {}) {
    const c = this.ctx;
    c.font = `bold ${size}px ${this.font}`;
    c.textAlign = align; c.textBaseline = 'top';
    c.fillStyle = color;
    c.fillText(str, Math.round(x), Math.round(y));
  }
  overlay(c) {
    const blink = Math.floor(this.t * 2) % 2 === 0;
    if (this.mode === 'attract') {
      c.fillStyle = 'rgba(0,0,0,0.55)';
      c.fillRect(0, this.h / 2 - 22, this.w, 40);
      this.text(this.title, this.w / 2, this.h / 2 - 18, { size: 12 });
      if (blink) this.text('PRESS A TO PLAY', this.w / 2, this.h / 2 + 2, { size: 8 });
    } else if (this.mode === 'over') {
      c.fillStyle = 'rgba(0,0,0,0.6)';
      c.fillRect(0, this.h / 2 - 22, this.w, 44);
      this.text('GAME OVER', this.w / 2, this.h / 2 - 18, { size: 12 });
      this.text(`SCORE ${this.score}  HI ${this.hi}`, this.w / 2, this.h / 2, { size: 8 });
      if (this.overT <= 0 && blink) this.text('PRESS A', this.w / 2, this.h / 2 + 11, { size: 8 });
    }
  }
}

export const NO_INPUT = Object.freeze({
  left: false, right: false, up: false, down: false, a: false,
  tap: Object.freeze({ a: false, left: false, right: false, up: false, down: false }),
});

export function aiInput(h = {}, tap = {}) {
  return { left: false, right: false, up: false, down: false, a: false, ...h,
    tap: { a: false, left: false, right: false, up: false, down: false, ...tap } };
}

export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const rand = (a, b) => a + Math.random() * (b - a);
