// OXO — noughts and crosses on a 35 x 16 dot CRT, as on the 1952 EDSAC (reconstruction).
import { TicTacToe } from './ttt.js';

const DW = 35, DH = 16, P = 6;
const W = DW * P, H = DH * P + 22;
const GX = ['X...X', '.X.X.', '..X..', '.X.X.', 'X...X'];
const GO = ['.XXX.', 'X...X', 'X...X', 'X...X', '.XXX.'];
const CX = [0, 12, 24], CY = [0, 6, 11], CH = [5, 4, 5];

export class Oxo extends TicTacToe {
  constructor(sfx) { super({ id: 'oxo', w: W, h: H, sfx, fg: '#9dffb0' }); this.title = 'OXO'; this.blunder = 0; }
  draw(c) {
    const on = new Uint8Array(DW * DH);
    const set = (x, y) => { if (x >= 0 && y >= 0 && x < DW && y < DH) on[y * DW + x] = 1; };
    for (let y = 0; y < DH; y++) { set(11, y); set(23, y); }
    for (let x = 0; x < DW; x++) { set(x, 5); set(x, 10); }
    const blink = Math.floor(this.t * 3) % 2;
    for (let i = 0; i < 9; i++) {
      const v = this.board[i];
      const cur = !this.result && this.turn === 'X' && i === this.cursor && !v;
      const flash = this.result?.line?.includes(i) && blink;
      if (!(v || cur) || flash) continue;
      const g = v === 'O' ? GO : GX;
      const bx = CX[i % 3] + 3, by = CY[(i / 3) | 0], h = CH[(i / 3) | 0];
      for (let r = 0; r < h; r++) {
        const row = g[Math.round(r * 4 / Math.max(h - 1, 1))];
        for (let k = 0; k < 5; k++) if (row[k] === 'X' && (!cur || blink)) set(bx + k, by + r);
      }
    }
    c.fillStyle = '#020604'; c.fillRect(0, 0, W, H);
    for (let y = 0; y < DH; y++) for (let x = 0; x < DW; x++) {
      c.fillStyle = on[y * DW + x] ? '#c9ffd4' : '#0b1a10';
      c.beginPath(); c.arc(x * P + P / 2, y * P + P / 2, on[y * DW + x] ? 2.3 : 1.2, 0, Math.PI * 2); c.fill();
    }
    const msg = this.result ? (this.result.who === 'X' ? 'YOU WIN (RARE!)' : this.result.who === 'O' ? 'EDSAC WINS' : 'DRAW')
      : this.turn === 'O' ? 'EDSAC COMPUTING...' : 'DIAL YOUR MOVE';
    this.text(msg, W / 2, DH * P + 7, { size: 9, color: '#6fdc84' });
  }
}
