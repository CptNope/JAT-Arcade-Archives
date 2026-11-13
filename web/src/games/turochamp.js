// PAPER MACHINE — reconstruction of Turing & Champernowne's 1948 chess "paper machine" (Turochamp).
// Uses Turing's piece values (P1 N3 B3.5 R5 Q10) and a mobility term (square root of moves), searching
// two half-moves ahead. Simplified rules: no castling or en passant; pawns promote to queens.
import { Game, aiInput } from './base.js';

const S = 28, OX = 8, OY = 8, W = S * 8 + 16, H = S * 8 + 44;
const VAL = { p: 1, n: 3, b: 3.5, r: 5, q: 10, k: 0 };
const START = 'rnbqkbnrpppppppp................................PPPPPPPPRNBQKBNR';
const isW = (c) => c >= 'A' && c <= 'Z';
const side = (c) => (c === '.' ? null : isW(c) ? 'w' : 'b');

function moves(bd, who, pseudo = false) {
  const out = [];
  for (let i = 0; i < 64; i++) {
    const c = bd[i]; if (side(c) !== who) continue;
    const x = i % 8, y = (i / 8) | 0, t = c.toLowerCase();
    const add = (nx, ny) => {
      if (nx < 0 || ny < 0 || nx > 7 || ny > 7) return false;
      const j = ny * 8 + nx, o = bd[j];
      if (side(o) === who) return false;
      out.push([i, j]); return o === '.';
    };
    const ray = (dx, dy) => { let nx = x + dx, ny = y + dy; while (add(nx, ny)) { nx += dx; ny += dy; } };
    if (t === 'p') {
      const d = who === 'w' ? -1 : 1, j = (y + d) * 8 + x;
      if (y + d >= 0 && y + d <= 7 && bd[j] === '.') {
        out.push([i, j]);
        const home = who === 'w' ? 6 : 1, j2 = (y + 2 * d) * 8 + x;
        if (y === home && bd[j2] === '.') out.push([i, j2]);
      }
      for (const dx of [-1, 1]) {
        const nx = x + dx, ny = y + d; if (nx < 0 || nx > 7 || ny < 0 || ny > 7) continue;
        const o = bd[ny * 8 + nx]; if (o !== '.' && side(o) !== who) out.push([i, ny * 8 + nx]);
      }
    } else if (t === 'n') { for (const [dx, dy] of [[1, 2], [2, 1], [-1, 2], [-2, 1], [1, -2], [2, -1], [-1, -2], [-2, -1]]) add(x + dx, y + dy); }
    else if (t === 'k') { for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) if (dx || dy) add(x + dx, y + dy); }
    else {
      if (t !== 'b') for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) ray(dx, dy);
      if (t !== 'r') for (const [dx, dy] of [[1, 1], [-1, 1], [1, -1], [-1, -1]]) ray(dx, dy);
    }
  }
  if (pseudo) return out;
  return out.filter(m => !inCheck(play(bd, m), who));
}
function play(bd, [a, b]) {
  const n = bd.slice(); n[b] = n[a]; n[a] = '.';
  if (n[b] === 'P' && b < 8) n[b] = 'Q';
  if (n[b] === 'p' && b >= 56) n[b] = 'q';
  return n;
}
function inCheck(bd, who) {
  const k = bd.indexOf(who === 'w' ? 'K' : 'k');
  return moves(bd, who === 'w' ? 'b' : 'w', true).some(m => m[1] === k);
}
// Turing-style evaluation: material ratio plus mobility (square root of each piece's moves)
function evaluate(bd, who) {
  let mat = 0, opp = 0;
  for (const c of bd) if (c !== '.') { if (side(c) === who) mat += VAL[c.toLowerCase()]; else opp += VAL[c.toLowerCase()]; }
  const mob = (w) => { const cnt = {}; for (const [a] of moves(bd, w, true)) cnt[a] = (cnt[a] || 0) + 1; return Object.values(cnt).reduce((s, n) => s + Math.sqrt(n), 0); };
  return (mat - opp) * 10 + (mob(who) - mob(who === 'w' ? 'b' : 'w')) * 0.5;
}
function search(bd, who, noise = 0) {
  const other = who === 'w' ? 'b' : 'w';
  let best = null, bs = -Infinity;
  for (const m of moves(bd, who)) {
    const b1 = play(bd, m);
    const replies = moves(b1, other);
    let worst = Infinity;
    if (!replies.length) worst = inCheck(b1, other) ? 1000 : 0;
    for (const r of replies) { worst = Math.min(worst, evaluate(play(b1, r), who)); if (worst < bs) break; }
    const s = worst + Math.random() * noise;
    if (s > bs) { bs = s; best = m; }
  }
  return best;
}

export class PaperMachine extends Game {
  constructor(sfx) { super({ id: 'turochamp', w: W, h: H, sfx, fg: '#2b2620', bg: '#efe6cf', font: 'Georgia, serif' }); this.title = 'PAPER MACHINE'; }
  reset() { this.bd = START.split(''); this.turn = 'w'; this.cx = 4; this.cy = 6; this.sel = -1; this.think = 0; this.result = null; this.ply = 0; this.last = null; this.endT = 0; }
  legalFrom(i) { return moves(this.bd, 'w').filter(m => m[0] === i).map(m => m[1]); }
  ai() {
    if (this.turn !== 'w' || this.result) return aiInput();
    if ((this.aiT = (this.aiT || 0) + 1) % 4) return aiInput();
    if (!this.aiMove) this.aiMove = search(this.bd, 'w', 6);
    if (!this.aiMove) return aiInput();
    const target = this.sel < 0 ? this.aiMove[0] : this.aiMove[1];
    const tx = target % 8, ty = (target / 8) | 0;
    if (tx !== this.cx || ty !== this.cy) return aiInput({}, { left: tx < this.cx, right: tx > this.cx, up: tx === this.cx && ty < this.cy, down: tx === this.cx && ty > this.cy });
    if (this.sel >= 0) this.aiMove = null;
    return aiInput({}, { a: true });
  }
  update(dt, inp) {
    if (this.result) { this.endT -= dt; if (this.endT <= 0) { if (this.mode === 'play') this.gameOver(); else this.reset(); } return; }
    if (this.turn === 'w') {
      if (inp.tap.left) this.cx = Math.max(0, this.cx - 1); if (inp.tap.right) this.cx = Math.min(7, this.cx + 1);
      if (inp.tap.up) this.cy = Math.max(0, this.cy - 1); if (inp.tap.down) this.cy = Math.min(7, this.cy + 1);
      if (inp.tap.a) {
        const i = this.cy * 8 + this.cx;
        if (this.sel >= 0 && this.legalFrom(this.sel).includes(i)) { this.make([this.sel, i]); this.sel = -1; this.think = 0.8; }
        else if (side(this.bd[i]) === 'w') { this.sel = i; this.sound('wall'); }
        else this.sel = -1;
      }
    } else {
      this.think -= dt;
      if (this.think <= 0) { const m = search(this.bd, 'b', this.mode === 'play' ? 0.5 : 4); if (m) this.make(m); }
    }
  }
  make(m) {
    const cap = this.bd[m[1]];
    if (cap !== '.' && this.turn === 'w') this.addScore(Math.round(VAL[cap.toLowerCase()] * 10));
    this.bd = play(this.bd, m); this.last = m; this.ply++;
    this.sound(cap !== '.' ? 'hit' : 'paddle');
    this.turn = this.turn === 'w' ? 'b' : 'w';
    const replies = moves(this.bd, this.turn);
    if (!replies.length) {
      const mate = inCheck(this.bd, this.turn);
      this.result = mate ? (this.turn === 'b' ? 'YOU WIN BY CHECKMATE' : 'CHECKMATE. THE MACHINE WINS') : 'STALEMATE';
      if (mate && this.turn === 'b') { this.addScore(1000); this.sound('start'); } else this.sound(mate ? 'die' : 'point');
      this.endT = 3;
    } else if (this.ply >= 120) { this.result = 'DRAWN AFTER 60 MOVES'; this.addScore(200); this.endT = 3; }
  }
  draw(c) {
    c.fillStyle = '#efe6cf'; c.fillRect(0, 0, W, H);
    const hint = this.sel >= 0 ? this.legalFrom(this.sel) : [];
    for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) {
      const i = y * 8 + x, px = OX + x * S, py = OY + y * S;
      if ((x + y) % 2) { // pencil-hatched dark squares
        c.strokeStyle = 'rgba(60,50,40,0.35)'; c.lineWidth = 1; c.beginPath();
        for (let k = -S; k < S; k += 4) { c.moveTo(px + Math.max(0, k), py + Math.max(0, -k)); c.lineTo(px + Math.min(S, k + S), py + Math.min(S, S - k)); }
        c.stroke();
      }
      if (this.last && (i === this.last[0] || i === this.last[1])) { c.fillStyle = 'rgba(200,140,40,0.25)'; c.fillRect(px, py, S, S); }
      if (hint.includes(i)) { c.fillStyle = 'rgba(40,120,200,0.3)'; c.beginPath(); c.arc(px + S / 2, py + S / 2, 4, 0, Math.PI * 2); c.fill(); }
      const p = this.bd[i];
      if (p !== '.') {
        c.fillStyle = isW(p) ? '#fffaf0' : '#2b2620'; c.strokeStyle = '#2b2620'; c.lineWidth = 1.5;
        c.beginPath(); c.arc(px + S / 2, py + S / 2, S / 2 - 3, 0, Math.PI * 2); c.fill(); c.stroke();
        c.fillStyle = isW(p) ? '#2b2620' : '#fffaf0'; c.font = `bold ${S - 12}px Georgia, serif`; c.textAlign = 'center'; c.textBaseline = 'middle';
        c.fillText(p.toUpperCase(), px + S / 2, py + S / 2 + 1);
      }
    }
    c.strokeStyle = '#2b2620'; c.lineWidth = 2; c.strokeRect(OX, OY, S * 8, S * 8);
    if (this.turn === 'w' && !this.result) {
      c.strokeStyle = '#1a5fb4'; c.lineWidth = 2.5; c.strokeRect(OX + this.cx * S + 1, OY + this.cy * S + 1, S - 2, S - 2);
      if (this.sel >= 0) { c.strokeStyle = '#c0392b'; c.strokeRect(OX + (this.sel % 8) * S + 3, OY + ((this.sel / 8) | 0) * S + 3, S - 6, S - 6); }
    }
    const msg = this.result || (this.turn === 'b' ? 'THE MACHINE IS CALCULATING (BY HAND)...' : inCheck(this.bd, 'w') ? 'CHECK! YOUR MOVE' : 'YOUR MOVE: PICK A PIECE, THEN A SQUARE');
    this.text(msg, W / 2, S * 8 + 16, { size: 10, color: '#2b2620' });
    this.text(`MOVE ${(this.ply >> 1) + 1}   SCORE ${this.score}`, W / 2, S * 8 + 30, { size: 9, color: '#6b5d4a' });
  }
}
