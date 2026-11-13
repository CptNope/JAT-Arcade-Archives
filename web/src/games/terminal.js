// Text-terminal games (teletypes and CRT terminals). Players never need a keyboard:
// a one-line menu at the bottom is driven with Left/Right and A, so touch and gamepads work too.
import { Game, aiInput } from './base.js';

export class TermGame extends Game {
  constructor({ id, sfx, cols = 40, rows = 18, cw = 6, ch = 10, fg = '#7dff95', bg = '#020a04', paper = false, font = 'Courier New, monospace' }) {
    const pad = 8;
    super({ id, w: cols * cw + pad * 2, h: (rows + 2) * ch + pad * 2, sfx, fg, bg, font });
    Object.assign(this, { cols, rows, cw, ch, pad, paper });
    this.lines = []; this.queue = []; this.typeAcc = 0;
    this.typeRate = paper ? 90 : 400; // characters per second (teletypes are slow)
  }
  // print wraps text to the terminal width; text appears "typed" from a queue
  print(text = '') {
    for (const para of String(text).toUpperCase().split('\n')) {
      let line = '';
      for (const word of para.split(' ')) {
        if ((line + (line ? ' ' : '') + word).length > this.cols) { this.queue.push(line); line = word; }
        else line += (line ? ' ' : '') + word;
      }
      this.queue.push(line);
    }
  }
  clearScreen() { this.lines = []; this.queue = []; this.partial = null; this.typeAcc = 0; }
  get typing() { return this.queue.length > 0; }
  setMenu(options) { this.menu = options; this.sel = Math.min(this.sel || 0, options.length - 1); }

  tickTerminal(dt, inp) {
    // type queued lines
    this.typeAcc += dt * this.typeRate;
    while (this.queue.length && this.typeAcc >= 1) {
      const next = this.queue[0];
      if (!this.partial) this.partial = { text: next, n: 0 };
      const take = Math.min(Math.floor(this.typeAcc), this.partial.text.length - this.partial.n + 1);
      this.partial.n += take; this.typeAcc -= take;
      if (this.partial.n > this.partial.text.length) {
        this.lines.push(this.partial.text); this.partial = null; this.queue.shift();
        if (this.paper && this.mode === 'play') this.sfx?.play('step2');
      }
    }
    if (this.queue.length === 0) this.typeAcc = 0;
    while (this.lines.length > this.rows) this.lines.shift();
    if (this.typing || !this.menu?.length) return null;
    if (inp.tap.left) { this.sel = (this.sel + this.menu.length - 1) % this.menu.length; this.sound('wall'); }
    if (inp.tap.right) { this.sel = (this.sel + 1) % this.menu.length; this.sound('wall'); }
    if (inp.tap.up) { this.sel = (this.sel + this.menu.length - 1) % this.menu.length; }
    if (inp.tap.down) { this.sel = (this.sel + 1) % this.menu.length; }
    if (inp.tap.a) { this.sound('paddle'); return this.menu[this.sel]; }
    return null;
  }

  // attract helper: pick an option (by label) after a short "thinking" delay
  aiPick(label) {
    if (this.typing || !this.menu?.length) return aiInput();
    this.aiT = (this.aiT || 0) + 1;
    const i = this.menu.indexOf(label);
    if (i < 0) return aiInput();
    if (this.aiT % 10) return aiInput();
    if (i !== this.sel) return aiInput({}, { right: true });
    return aiInput({}, { a: true });
  }

  drawTerm(c, { status = '' } = {}) {
    const { pad, cw, ch } = this;
    c.fillStyle = this.bg; c.fillRect(0, 0, this.w, this.h);
    if (this.paper) {
      // paper: faint tractor-feed lines
      c.fillStyle = 'rgba(0,0,0,0.04)';
      for (let y = 0; y < this.h; y += ch * 2) c.fillRect(0, y, this.w, ch);
    }
    c.font = `bold ${ch}px ${this.font}`; c.textBaseline = 'top'; c.textAlign = 'left';
    c.fillStyle = this.fg;
    const shown = [...this.lines];
    if (this.partial) shown.push(this.partial.text.slice(0, this.partial.n));
    const start = Math.max(0, shown.length - this.rows);
    shown.slice(start).forEach((l, i) => c.fillText(l, pad, pad + i * ch));
    // menu line
    const my = pad + this.rows * ch + 4;
    if (!this.typing && this.menu?.length) {
      const label = this.menu[this.sel];
      const left = this.sel > 0 ? '◀ ' : '  ', right = this.sel < this.menu.length - 1 ? ' ▶' : '  ';
      const txt = `${left}${label}${right}`;
      c.fillStyle = this.fg; c.fillRect(pad, my - 1, this.w - pad * 2, ch + 3);
      c.fillStyle = this.bg; c.fillText(`? ${txt}`.slice(0, this.cols), pad + 2, my);
      c.fillStyle = this.fg;
      this.text(`${this.sel + 1}/${this.menu.length}  A=OK`, this.w - pad, my + ch + 3, { size: Math.round(ch * 0.8), align: 'right' });
    } else if (Math.floor(this.t * 3) % 2 && !this.paper) {
      c.fillRect(pad, my, cw, ch);
    }
    if (status) this.text(status, pad, my + ch + 3, { size: Math.round(ch * 0.8), align: 'left' });
  }
}
