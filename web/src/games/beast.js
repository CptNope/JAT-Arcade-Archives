// HUNT THE BEAST — a cave-hunting game on a teleprinter, after the 1972 BASIC game Hunt the Wumpus.
// Same famous map: twenty caves on the corners of a dodecahedron, three tunnels each.
import { TermGame } from './terminal.js';

const MAP = [null,
  [2, 5, 8], [1, 3, 10], [2, 4, 12], [3, 5, 14], [1, 4, 6], [5, 7, 15], [6, 8, 17], [1, 7, 9], [8, 10, 18], [2, 9, 11],
  [10, 12, 19], [3, 11, 13], [12, 14, 20], [4, 13, 15], [6, 14, 16], [15, 17, 20], [7, 16, 18], [9, 17, 19], [11, 18, 20], [13, 16, 19]];
const pick = (a) => a[(Math.random() * a.length) | 0];

export class Beast extends TermGame {
  constructor(sfx) {
    super({ id: 'beast', sfx, cols: 34, rows: 15, cw: 6, ch: 10, fg: '#1d1a16', bg: '#efe7cf', paper: true });
    this.title = 'HUNT THE BEAST';
  }
  reset() {
    this.clearScreen();
    const rooms = [...Array(20)].map((_, i) => i + 1).sort(() => Math.random() - 0.5);
    [this.me, this.beast, this.pit1, this.pit2, this.bat1, this.bat2] = rooms;
    this.arrows = 5; this.done = false; this.moves = 0;
    this.print('HUNT THE BEAST');
    this.print('THE BEAST SLEEPS IN ONE OF 20 CAVES. SHOOT IT WITH ONE OF YOUR 5 ARROWS.');
    this.print('');
    this.describe();
  }
  near(r) { return MAP[this.me].includes(r); }
  describe() {
    if (this.near(this.beast)) this.print('I SMELL SOMETHING TERRIBLE!');
    if (this.near(this.pit1) || this.near(this.pit2)) this.print('I FEEL A DRAFT.');
    if (this.near(this.bat1) || this.near(this.bat2)) this.print('BATS NEARBY!');
    this.print(`YOU ARE IN CAVE ${this.me}. TUNNELS LEAD TO ${MAP[this.me].join(' ')}. ARROWS: ${this.arrows}`);
    const t = MAP[this.me];
    this.setMenu([...t.map(r => `MOVE ${r}`), ...t.map(r => `SHOOT ${r}`)]);
  }
  ai() {
    if (this.done) return this.aiPick(this.menu?.[0]);
    // attract: shoot when it smells, avoid drafts when possible
    const t = MAP[this.me];
    if (!this.aiPlan) {
      if (this.near(this.beast) && Math.random() < 0.6) this.aiPlan = `SHOOT ${pick(t)}`;
      else this.aiPlan = `MOVE ${pick(t.filter(r => r !== this.pit1 && r !== this.pit2).concat(t).slice(0, 3))}`;
    }
    const inp = this.aiPick(this.aiPlan);
    if (inp.tap.a) this.aiPlan = null;
    return inp;
  }
  update(dt, inp) {
    const choice = this.tickTerminal(dt, inp);
    if (!choice) return;
    if (this.done) { if (this.mode === 'play') this.gameOver(); else this.reset(); return; }
    this.print(''); this.print(`> ${choice}`);
    const [verb, n] = choice.split(' '); const r = Number(n);
    this.moves++;
    if (verb === 'SHOOT') {
      this.arrows--;
      if (r === this.beast) { this.print('AHA! YOU GOT THE BEAST!'); this.addScore(1000 + this.arrows * 100); this.sound('start'); return this.end(); }
      this.print('MISSED...'); this.sound('wall');
      if (Math.random() < 0.75) { this.beast = pick(MAP[this.beast]); this.print('YOU HEAR SOMETHING MOVE IN THE DARK.'); }
      if (this.beast === this.me) { this.print('THE BEAST FOUND YOU. GAME OVER.'); this.sound('die'); return this.end(); }
      if (this.arrows <= 0) { this.print('OUT OF ARROWS. THE BEAST WINS.'); this.sound('die'); return this.end(); }
      return this.describe();
    }
    this.me = r; this.addScore(5);
    this.enter();
  }
  enter() {
    if (this.me === this.beast) {
      this.print('...OOPS! YOU BUMPED THE BEAST!');
      if (Math.random() < 0.75) { this.beast = pick(MAP[this.beast]); this.print('IT LUMBERS AWAY.'); }
      if (this.me === this.beast) { this.print('IT ATE YOU. GAME OVER.'); this.sound('die'); return this.end(); }
    }
    if (this.me === this.pit1 || this.me === this.pit2) { this.print('YYYIIIEEEE... YOU FELL INTO A PIT!'); this.sound('die'); return this.end(); }
    if (this.me === this.bat1 || this.me === this.bat2) {
      this.print('ZAP! SUPER BATS CARRY YOU AWAY!'); this.sound('power');
      this.me = 1 + ((Math.random() * 20) | 0); return this.enter();
    }
    this.describe();
  }
  end() { this.done = true; this.print(''); this.print(`SCORE ${this.score}`); this.setMenu(['PLAY AGAIN']); this.sel = 0; }
  draw(c) { this.drawTerm(c); }
}
