// DRAUGHTS — reconstruction of Christopher Strachey's 1952 draughts (checkers) program, shown the way
// a storage-tube display drew it: a dot board with pieces and kings. English draughts rules, forced captures.
import { Game, aiInput } from './base.js';

const S = 26, OX = 10, OY = 10, W = S * 8 + 20, H = S * 8 + 40;
const own = (p, who) => p && p.toLowerCase() === who;
const king = (p) => p && p === p.toUpperCase();

function movesFor(bd, who) {
  const dirs = (p) => (king(p) ? [[1, 1], [-1, 1], [1, -1], [-1, -1]] : who === 'b' ? [[1, -1], [-1, -1]] : [[1, 1], [-1, 1]]);
  const jumps = [], steps = [];
  const jumpFrom = (b, i, p, path, caps) => {
    let extended = false;
    const x = i % 8, y = (i / 8) | 0;
    for (const [dx, dy] of dirs(p)) {
      const mx = x + dx, my = y + dy, tx = x + 2 * dx, ty = y + 2 * dy;
      if (tx < 0 || ty < 0 || tx > 7 || ty > 7) continue;
      const m = my * 8 + mx, t = ty * 8 + tx;
      if (b[m] && !own(b[m], who) && !b[t] && !caps.includes(m)) {
        extended = true;
        const nb = b.slice(); nb[t] = p; nb[i] = null; nb[m] = null;
        const crowned = !king(p) && (who === 'b' ? ty === 0 : ty === 7);
        if (crowned) jumps.push({ from: path[0], path: [...path, t], caps: [...caps, m] });
        else jumpFrom(nb, t, p, [...path, t], [...caps, m]);
      }
    }
    if (!extended && caps.length) jumps.push({ from: path[0], path, caps });
  };
  for (let i = 0; i < 64; i++) {
    const p = bd[i]; if (!own(p, who)) continue;
    jumpFrom(bd, i, p, [i], []);
    const x = i % 8, y = (i / 8) | 0;
    for (const [dx, dy] of dirs(p)) {
      const tx = x + dx, ty = y + dy; if (tx < 0 || ty < 0 || tx > 7 || ty > 7) continue;
      if (!bd[ty * 8 + tx]) steps.push({ from: i, path: [i, ty * 8 + tx], caps: [] });
    }
  }
  return jumps.length ? jumps : steps;
}
function apply(bd, m, who) {
  const b = bd.slice(), p = b[m.from];
  b[m.from] = null; m.caps.forEach(c => (b[c] = null));
  const to = m.path[m.path.length - 1], y = (to / 8) | 0;
  b[to] = (who === 'b' && y === 0) || (who === 'w' && y === 7) ? p.toUpperCase() : p;
  return b;
}
function score(bd, who) {
  let s = 0;
  for (let i = 0; i < 64; i++) { const p = bd[i]; if (!p) continue; const v = king(p) ? 1.6 : 1 + (own(p, 'w') ? ((i / 8) | 0) : 7 - ((i / 8) | 0)) * 0.03; s += own(p, who) ? v : -v; }
  return s;
}
function minimax(bd, who, me, depth, a, b) {
  const ms = movesFor(bd, who);
  if (!ms.length) return who === me ? -100 : 100;
  if (depth === 0) return score(bd, me);
  const nxt = who === 'w' ? 'b' : 'w';
  if (who === me) { let v = -Infinity; for (const m of ms) { v = Math.max(v, minimax(apply(bd, m, who), nxt, me, depth - 1, a, b)); a = Math.max(a, v); if (a >= b) break; } return v; }
  let v = Infinity; for (const m of ms) { v = Math.min(v, minimax(apply(bd, m, who), nxt, me, depth - 1, a, b)); b = Math.min(b, v); if (a >= b) break; } return v;
}
function bestMove(bd, who, depth, noise) {
  let best = null, bs = -Infinity;
  for (const m of movesFor(bd, who)) { const s = minimax(apply(bd, m, who), who === 'w' ? 'b' : 'w', who, depth, -Infinity, Infinity) + Math.random() * noise; if (s > bs) { bs = s; best = m; } }
  return best;
}

export class Draughts extends Game {
  constructor(sfx) { super({ id: 'draughts', w: W, h: H, sfx, fg: '#c8ffd0' }); this.title = 'DRAUGHTS'; }
  reset() {
    this.bd = Array(64).fill(null);
    for (let i = 0; i < 64; i++) { const x = i % 8, y = (i / 8) | 0; if ((x + y) % 2) { if (y < 3) this.bd[i] = 'w'; if (y > 4) this.bd[i] = 'b'; } }
    this.turn = 'b'; this.cx = 1; this.cy = 5; this.sel = -1; this.think = 0; this.result = null; this.endT = 0; this.plies = 0;
  }
  options(i) { return movesFor(this.bd, 'b').filter(m => m.from === i); }
  ai() {
    if (this.turn !== 'b' || this.result) return aiInput();
    if ((this.aiT = (this.aiT || 0) + 1) % 4) return aiInput();
    if (!this.aiMove) this.aiMove = bestMove(this.bd, 'b', 2, 0.6);
    if (!this.aiMove) return aiInput();
    const t = this.sel < 0 ? this.aiMove.from : this.aiMove.path[this.aiMove.path.length - 1];
    const tx = t % 8, ty = (t / 8) | 0;
    if (tx !== this.cx || ty !== this.cy) return aiInput({}, { left: tx < this.cx, right: tx > this.cx, up: tx === this.cx && ty < this.cy, down: tx === this.cx && ty > this.cy });
    if (this.sel >= 0) this.aiMove = null;
    return aiInput({}, { a: true });
  }
  update(dt, inp) {
    if (this.result) { this.endT -= dt; if (this.endT <= 0) { if (this.mode === 'play') this.gameOver(); else this.reset(); } return; }
    if (this.turn === 'b') {
      if (inp.tap.left) this.cx = Math.max(0, this.cx - 1); if (inp.tap.right) this.cx = Math.min(7, this.cx + 1);
      if (inp.tap.up) this.cy = Math.max(0, this.cy - 1); if (inp.tap.down) this.cy = Math.min(7, this.cy + 1);
      if (inp.tap.a) {
        const i = this.cy * 8 + this.cx;
        const m = this.sel >= 0 && this.options(this.sel).find(o => o.path[o.path.length - 1] === i);
        if (m) { this.make(m, 'b'); this.sel = -1; this.think = 0.7; }
        else if (this.options(i).length) { this.sel = i; this.sound('wall'); }
        else this.sel = -1;
      }
    } else {
      this.think -= dt;
      if (this.think <= 0) { const m = bestMove(this.bd, 'w', this.mode === 'play' ? 4 : 2, 0.3); if (m) this.make(m, 'w'); }
    }
  }
  make(m, who) {
    this.bd = apply(this.bd, m, who); this.plies++;
    if (m.caps.length) { this.sound('hit'); if (who === 'b') this.addScore(50 * m.caps.length); } else this.sound('paddle');
    this.turn = who === 'b' ? 'w' : 'b';
    if (!movesFor(this.bd, this.turn).length) {
      this.result = this.turn === 'w' ? 'YOU WIN!' : 'THE MACHINE WINS';
      if (this.turn === 'w') { this.addScore(1000); this.sound('start'); } else this.sound('die');
      this.endT = 3;
    } else if (this.plies > 160) { this.result = 'DRAWN GAME'; this.addScore(200); this.endT = 3; }
  }
  draw(c) {
    c.fillStyle = '#020803'; c.fillRect(0, 0, W, H);
    const opts = this.sel >= 0 ? this.options(this.sel).map(o => o.path[o.path.length - 1]) : [];
    for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) {
      const i = y * 8 + x, px = OX + x * S, py = OY + y * S;
      // storage-tube style: squares outlined in dots
      c.fillStyle = (x + y) % 2 ? 'rgba(120,255,150,0.35)' : 'rgba(120,255,150,0.12)';
      for (let k = 0; k < S; k += 4) { c.fillRect(px + k, py, 1.5, 1.5); c.fillRect(px, py + k, 1.5, 1.5); }
      if (opts.includes(i)) { c.fillStyle = 'rgba(200,255,210,0.5)'; c.fillRect(px + S / 2 - 3, py + S / 2 - 3, 6, 6); }
      const p = this.bd[i];
      if (p) {
        c.strokeStyle = own(p, 'b') ? '#e6ffe9' : '#5fd47a'; c.lineWidth = own(p, 'b') ? 3 : 2;
        c.beginPath(); c.arc(px + S / 2, py + S / 2, S / 2 - 5, 0, Math.PI * 2); c.stroke();
        if (own(p, 'w')) { c.fillStyle = 'rgba(95,212,122,0.35)'; c.fill(); }
        if (king(p)) { c.fillStyle = '#e6ffe9'; c.fillRect(px + S / 2 - 3, py + S / 2 - 3, 6, 6); }
      }
    }
    if (this.turn === 'b' && !this.result) {
      c.strokeStyle = '#ffffff'; c.lineWidth = 1.5; c.strokeRect(OX + this.cx * S + 1, OY + this.cy * S + 1, S - 2, S - 2);
      if (this.sel >= 0) { c.strokeStyle = '#ffe14d'; c.strokeRect(OX + (this.sel % 8) * S + 3, OY + ((this.sel / 8) | 0) * S + 3, S - 6, S - 6); }
    }
    const msg = this.result || (this.turn === 'w' ? 'MACHINE THINKING' : 'YOUR MOVE · CAPTURES FORCED');
    this.text(msg, W / 2, S * 8 + 16, { size: 9 });
  }
}
