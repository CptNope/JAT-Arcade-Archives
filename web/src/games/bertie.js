// BERTIE — noughts and crosses on a panel of lamps (1950 reconstruction).
import { TicTacToe } from './ttt.js';

const W = 192, H = 224;

export class Bertie extends TicTacToe {
  constructor(sfx) {
    super({ id: 'bertie', w: W, h: H, sfx, fg: '#ffd27a', font: 'Georgia, serif' });
    this.title = 'BERTIE';
    this.blunder = 0.15; // the real machine had adjustable difficulty
  }
  draw(c) {
    c.fillStyle = '#1a120b'; c.fillRect(0, 0, W, H);
    c.fillStyle = '#2b1d12'; c.fillRect(6, 6, W - 12, H - 12);
    this.text('PLAY  BERTIE', W / 2, 12, { size: 13, color: '#ffcf6b' });
    const ox = 21, oy = 36, s = 50;
    const lit = this.result?.line || [];
    for (let i = 0; i < 9; i++) {
      const x = ox + (i % 3) * s, y = oy + ((i / 3) | 0) * s;
      c.fillStyle = '#120c07'; c.fillRect(x + 2, y + 2, s - 4, s - 4);
      const v = this.board[i];
      const glow = lit.includes(i) && Math.floor(this.t * 6) % 2 ? '#fff6d8' : '#ffb347';
      c.lineWidth = 6; c.lineCap = 'round';
      if (v === 'X') {
        c.strokeStyle = glow; c.shadowColor = '#ffb347'; c.shadowBlur = 10;
        c.beginPath(); c.moveTo(x + 12, y + 12); c.lineTo(x + s - 12, y + s - 12); c.moveTo(x + s - 12, y + 12); c.lineTo(x + 12, y + s - 12); c.stroke();
      } else if (v === 'O') {
        c.strokeStyle = lit.includes(i) && Math.floor(this.t * 6) % 2 ? '#fff6d8' : '#ffe08a'; c.shadowColor = '#ffe08a'; c.shadowBlur = 10;
        c.beginPath(); c.arc(x + s / 2, y + s / 2, s / 2 - 12, 0, Math.PI * 2); c.stroke();
      } else {
        c.shadowBlur = 0; c.fillStyle = '#3a2a1a';
        c.beginPath(); c.arc(x + s / 2, y + s / 2, 4, 0, Math.PI * 2); c.fill();
      }
      c.shadowBlur = 0;
    }
    if (!this.result && this.turn === 'X') {
      const x = ox + (this.cursor % 3) * s, y = oy + ((this.cursor / 3) | 0) * s;
      c.strokeStyle = Math.floor(this.t * 3) % 2 ? '#7ad8ff' : '#3a8fb0'; c.lineWidth = 2; c.strokeRect(x + 3, y + 3, s - 6, s - 6);
    }
    const msg = this.result ? (this.result.who === 'X' ? 'YOU WIN' : this.result.who === 'O' ? 'BERTIE WINS' : 'A DRAW')
      : this.turn === 'O' ? 'BERTIE IS THINKING' : 'YOUR MOVE';
    this.text(msg, W / 2, 196, { size: 10, color: '#ffcf6b' });
  }
}
