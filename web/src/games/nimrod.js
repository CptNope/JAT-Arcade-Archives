// NIMROD — reconstruction of the 1951 Nim-playing computer: rows of lamps, take any number from one row.
// This version uses the "take the last lamp to win" rule. The machine plays the perfect strategy (nim-sum).
import { Game, aiInput } from './base.js';

const W = 240, H = 180, ROWS = 4, MAX = 7;

function nimMove(piles) {
  const x = piles.reduce((a, b) => a ^ b, 0);
  if (x === 0) { const i = piles.findIndex(p => p > 0); return [i, 1]; } // losing position: stall
  const i = piles.findIndex(p => (p ^ x) < p);
  return [i, piles[i] - (piles[i] ^ x)];
}

export class Nimrod extends Game {
  constructor(sfx) { super({ id: 'nimrod', w: W, h: H, sfx, fg: '#ffcf70' }); this.title = 'NIMROD'; }
  reset() { this.games = 0; this.newGame(); }
  newGame() {
    // random rows, guaranteed winnable for the player who moves first (non-zero nim-sum)
    do { this.piles = [...Array(ROWS)].map(() => 1 + ((Math.random() * MAX) | 0)); } while (this.piles.reduce((a, b) => a ^ b, 0) === 0);
    this.row = this.piles.findIndex(p => p > 0); this.take = 1; this.turn = 'you'; this.think = 0; this.result = null; this.endT = 0; this.flash = null;
  }
  ai() {
    if (this.turn !== 'you' || this.result) return aiInput();
    if ((this.aiT = (this.aiT || 0) + 1) % 9) return aiInput();
    const [r, n] = Math.random() < 0.5 ? nimMove(this.piles) : [this.piles.findIndex(p => p > 0), 1];
    if (this.row !== r) return aiInput({}, { down: true });
    if (this.take !== n) return aiInput({}, { right: this.take < n, left: this.take > n });
    return aiInput({}, { a: true });
  }
  update(dt, inp) {
    if (this.flash) { this.flash.t -= dt; if (this.flash.t <= 0) this.flash = null; }
    if (this.result) {
      this.endT -= dt;
      if (this.endT <= 0) { this.games++; if (this.mode === 'play' && this.games >= 3) this.gameOver(); else this.newGame(); }
      return;
    }
    if (this.turn === 'you') {
      const step = (d) => { let r = this.row; for (let i = 0; i < ROWS; i++) { r = (r + d + ROWS) % ROWS; if (this.piles[r]) break; } this.row = r; };
      if (inp.tap.up) step(-1); if (inp.tap.down) step(1);
      if (inp.tap.left) this.take = Math.max(1, this.take - 1);
      if (inp.tap.right) this.take = Math.min(this.piles[this.row], this.take + 1);
      this.take = Math.min(this.take, this.piles[this.row]);
      if (inp.tap.a && this.piles[this.row] > 0) { this.remove(this.row, this.take, 'you'); this.think = 1.1; }
    } else {
      this.think -= dt;
      if (this.think <= 0) { const [r, n] = nimMove(this.piles); this.remove(r, n, 'nimrod'); }
    }
  }
  remove(r, n, who) {
    this.flash = { r, from: this.piles[r] - n, to: this.piles[r], t: 0.6 };
    this.piles[r] -= n; this.sound(who === 'you' ? 'paddle' : 'wall');
    if (this.piles.every(p => p === 0)) {
      this.result = who; this.endT = 2.4;
      if (who === 'you') { this.addScore(500); this.sound('start'); } else this.sound('die');
      return;
    }
    this.turn = who === 'you' ? 'nimrod' : 'you';
    if (this.turn === 'you') { this.row = this.piles.findIndex(p => p > 0); this.take = 1; }
  }
  draw(c) {
    c.fillStyle = '#16120c'; c.fillRect(0, 0, W, H);
    this.text('N I M R O D', W / 2, 6, { size: 11, color: '#ffcf70' });
    const ox = 48, oy = 30, dx = 24, dy = 28;
    for (let r = 0; r < ROWS; r++) {
      const sel = this.turn === 'you' && !this.result && r === this.row;
      if (sel) { c.fillStyle = 'rgba(255,207,112,0.12)'; c.fillRect(ox - 14, oy + r * dy - 11, MAX * dx + 4, 22); }
      for (let i = 0; i < MAX; i++) {
        const on = i < this.piles[r];
        const fl = this.flash && this.flash.r === r && i >= this.flash.from && i < this.flash.to && Math.floor(this.flash.t * 10) % 2;
        const marked = sel && on && i >= this.piles[r] - this.take;
        c.fillStyle = fl ? '#fff' : on ? (marked ? '#ff7a3d' : '#ffcf70') : '#3a2f20';
        if (on || fl) { c.shadowColor = c.fillStyle; c.shadowBlur = 8; }
        c.beginPath(); c.arc(ox + i * dx, oy + r * dy, 7, 0, Math.PI * 2); c.fill(); c.shadowBlur = 0;
      }
      if (sel) this.text('▶', ox - 26, oy + r * dy - 6, { size: 10, color: '#ffcf70' });
    }
    const msg = this.result ? (this.result === 'you' ? 'YOU TOOK THE LAST LAMP. YOU WIN!' : 'NIMROD TOOK THE LAST LAMP.')
      : this.turn === 'you' ? `TAKE ${this.take} FROM ROW ${this.row + 1}  (◀ ▶ COUNT, ▲ ▼ ROW)` : 'NIMROD IS CALCULATING...';
    this.text(msg, W / 2, 148, { size: 8, color: '#ffcf70' });
    this.text(`GAME ${Math.min(this.games + 1, 3)} OF 3   SCORE ${this.score}`, W / 2, 162, { size: 8, color: '#a8874a' });
  }
}
