// Shared noughts-and-crosses logic for BERTIE (1950) and OXO (1952).
import { Game, aiInput } from './base.js';

const LINES = [[0, 1, 2], [3, 4, 5], [6, 7, 8], [0, 3, 6], [1, 4, 7], [2, 5, 8], [0, 4, 8], [2, 4, 6]];
export function winner(b) {
  for (const [a, c, d] of LINES) if (b[a] && b[a] === b[c] && b[a] === b[d]) return { who: b[a], line: [a, c, d] };
  return b.every(Boolean) ? { who: 'draw' } : null;
}
function minimax(b, me, turn) {
  const w = winner(b);
  if (w) return w.who === 'draw' ? 0 : (w.who === me ? 10 : -10);
  const scores = [];
  for (let i = 0; i < 9; i++) if (!b[i]) {
    b[i] = turn; scores.push(minimax(b, me, turn === 'X' ? 'O' : 'X')); b[i] = null;
  }
  return turn === me ? Math.max(...scores) * 0.9 : Math.min(...scores) * 0.9;
}
export function bestMove(b, me, blunder = 0) {
  const free = b.map((v, i) => (v ? -1 : i)).filter(i => i >= 0);
  if (Math.random() < blunder) return free[(Math.random() * free.length) | 0];
  let best = free[0], bs = -Infinity;
  for (const i of free) {
    b[i] = me; const s = minimax(b, me, me === 'X' ? 'O' : 'X'); b[i] = null;
    if (s > bs + 1e-9 || (Math.abs(s - bs) < 1e-9 && Math.random() < 0.3)) { bs = s; best = i; }
  }
  return best;
}

// Base game: human is X and moves first, machine is O. Subclasses only draw.
export class TicTacToe extends Game {
  reset() {
    this.board = Array(9).fill(null);
    this.cursor = 4; this.turn = 'X'; this.think = 0; this.result = null; this.endT = 0;
    this.round = (this.round || 0);
    this.wins = this.wins || 0;
  }
  start() { this.round = 0; this.wins = 0; this.games = 0; super.start(); }
  ai() {
    // attract: the machine plays itself; "X" picks moves with some randomness
    if (this.turn !== 'X' || this.result) return aiInput();
    if (!this.aiTarget && this.aiTarget !== 0) this.aiTarget = bestMove(this.board, 'X', 0.4);
    const t = this.aiTarget, cx = this.cursor % 3, cy = (this.cursor / 3) | 0, tx = t % 3, ty = (t / 3) | 0;
    if ((this.aiWait = (this.aiWait || 0) + 1) % 8) return aiInput();
    if (tx !== cx || ty !== cy) return aiInput({}, { left: tx < cx, right: tx > cx, up: ty < cy && tx === cx, down: ty > cy && tx === cx });
    this.aiTarget = null;
    return aiInput({}, { a: true });
  }
  update(dt, inp) {
    if (this.result) {
      this.endT -= dt;
      if (this.endT <= 0) {
        this.games = (this.games || 0) + 1;
        if (this.mode === 'play' && this.games >= 3) { this.gameOver(); return; }
        const r = this.round; this.reset(); this.round = r + 1;
        if (this.round % 2) { this.turn = 'O'; this.think = 0.6; } // machine opens every other game
      }
      return;
    }
    if (this.turn === 'X') {
      let cx = this.cursor % 3, cy = (this.cursor / 3) | 0;
      if (inp.tap.left) cx = (cx + 2) % 3; if (inp.tap.right) cx = (cx + 1) % 3;
      if (inp.tap.up) cy = (cy + 2) % 3; if (inp.tap.down) cy = (cy + 1) % 3;
      this.cursor = cy * 3 + cx;
      if (inp.tap.a && !this.board[this.cursor]) { this.place(this.cursor, 'X'); this.think = 0.7; }
    } else {
      this.think -= dt;
      if (this.think <= 0) this.place(bestMove(this.board, 'O', this.blunder ?? 0), 'O');
    }
  }
  place(i, who) {
    this.board[i] = who; this.sound(who === 'X' ? 'paddle' : 'wall');
    this.turn = who === 'X' ? 'O' : 'X';
    const w = winner(this.board);
    if (w) {
      this.result = w; this.endT = 2.2;
      if (w.who === 'X') { this.addScore(100); this.sound('start'); }
      else if (w.who === 'draw') { this.addScore(25); this.sound('point'); }
      else this.sound('die');
    }
  }
}
