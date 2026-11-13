// SUMERIAN STEWARD — reconstruction inspired by Mabel Addis's 1964 Sumerian Game: rule a city of
// ancient Sumer for ten seasons, deciding how much grain to feed your people and how much to plant.
import { TermGame } from './terminal.js';

const SEASONS = 10;

export class Sumer extends TermGame {
  constructor(sfx) {
    super({ id: 'sumer', sfx, cols: 38, rows: 16, cw: 6, ch: 10, fg: '#1f2b46', bg: '#eef0f2', paper: true, font: 'Courier New, monospace' });
    this.title = 'SUMERIAN STEWARD';
    this.typeRate = 160;
  }
  reset() {
    this.clearScreen();
    Object.assign(this, { season: 1, people: 500, grain: 3000, land: 1000, bonus: 0, done: false, phase: 'feed' });
    this.print('SUMERIAN STEWARD');
    this.print('YOU RULE A CITY OF ANCIENT SUMER. I AM YOUR STEWARD. FEED THE PEOPLE, PLANT THE FIELDS, AND KEEP THE GRANARY FULL FOR TEN SEASONS.');
    this.print('');
    this.report();
    this.askFeed();
  }
  report() { this.print(`SEASON ${this.season}: ${this.people} PEOPLE, ${this.grain} BUSHELS IN THE GRANARY, ${this.land} ACRES.`); }
  need() { return this.people * 4; }
  askFeed() {
    this.phase = 'feed';
    this.print(`THE PEOPLE NEED ABOUT ${this.need()} BUSHELS. HOW MUCH SHALL THEY EAT?`);
    const opts = [0.5, 0.75, 1, 1.25].map(f => Math.min(this.grain, Math.round(this.need() * f / 10) * 10));
    this.setMenu([...new Set(opts)].map(v => `FEED ${v}`)); this.sel = Math.min(2, this.menu.length - 1);
  }
  askPlant() {
    this.phase = 'plant';
    const max = Math.min(this.grain, Math.min(this.land, this.people * 2) * 2);
    this.print(`EACH ACRE NEEDS 2 BUSHELS OF SEED AND YOUR PEOPLE CAN WORK ${Math.min(this.land, this.people * 2)} ACRES. HOW MUCH SHALL WE PLANT?`);
    const opts = [0, 0.25, 0.5, 0.75, 1].map(f => Math.round(max * f / 10) * 10);
    this.setMenu([...new Set(opts)].map(v => `PLANT ${v}`)); this.sel = this.menu.length - 2;
  }
  ai() {
    if (this.done) return this.aiPick('PLAY AGAIN');
    if (!this.menu) return this.aiPick(null);
    if (this.aiWant === undefined || !this.menu.includes(this.aiWant)) this.aiWant = this.phase === 'feed' ? this.menu[Math.min(2, this.menu.length - 1)] : this.menu[Math.max(0, this.menu.length - 2)];
    const inp = this.aiPick(this.aiWant);
    if (inp.tap.a) this.aiWant = undefined;
    return inp;
  }
  update(dt, inp) {
    const choice = this.tickTerminal(dt, inp);
    if (!choice) return;
    if (this.done) { if (this.mode === 'play') this.gameOver(); else this.reset(); return; }
    const n = Number(choice.split(' ')[1]);
    this.print(`> ${choice}`);
    if (this.phase === 'feed') { this.fed = n; this.grain -= n; return this.askPlant(); }
    this.grain -= n;
    this.endSeason(n);
  }
  endSeason(planted) {
    this.print('');
    // harvest
    let yieldPer = 2.5 + Math.random() * 2 + this.bonus;
    const event = Math.random();
    if (event < 0.12) { yieldPer *= 0.4; this.print('SIR, THE RIVER FLOODED THE FIELDS. MUCH OF THE CROP WAS LOST.'); }
    else if (event < 0.22 && this.bonus < 1) { this.bonus += 0.5; this.print('GOOD NEWS: OUR ARTISANS HAVE IMPROVED THE IRRIGATION CANALS. YIELDS WILL RISE.'); }
    const harvest = Math.round(planted * yieldPer);
    this.print(`THE HARVEST BROUGHT IN ${harvest} BUSHELS.`);
    // spoilage
    const rot = Math.round(this.grain * (0.05 + Math.random() * 0.1));
    if (rot > 0) this.print(`I AM SORRY TO REPORT THAT ${rot} BUSHELS ROTTED OR WERE EATEN BY RATS.`);
    this.grain = this.grain - rot + harvest;
    // people
    const ratio = this.fed / this.need();
    const starved = ratio < 1 ? Math.round(this.people * (1 - ratio) * 0.5) : 0;
    const born = Math.round(this.people * (0.04 + Math.min(ratio, 1.25) * 0.04));
    const arrived = ratio > 1.1 ? Math.round(this.people * 0.05) : 0;
    this.people = Math.max(0, this.people - starved + born + arrived);
    if (starved) this.print(`${starved} PEOPLE STARVED. THE CITY IS UNHAPPY.`); else this.print('THE PEOPLE ARE WELL FED.');
    if (arrived) this.print(`${arrived} NEWCOMERS SETTLED IN THE CITY, DRAWN BY ITS PLENTY.`);
    this.addScore(Math.max(0, Math.round(harvest / 50) - Math.round(starved / 5)));
    this.season++;
    if (this.people < 100 || this.season > SEASONS) return this.finish();
    this.print(''); this.report(); this.askFeed();
  }
  finish() {
    this.print('');
    if (this.people < 100) this.print('THE CITY HAS FALLEN INTO RUIN. THE PRIESTS HAVE CHOSEN A NEW RULER.');
    else {
      const verdict = this.people >= 650 ? 'THE GODS SMILE ON YOUR CITY. A GLORIOUS REIGN!' : this.people >= 500 ? 'A STEADY, PRUDENT REIGN.' : 'YOU SURVIVED, BUT THE CITY HAS SHRUNK.';
      this.print(`YOUR REIGN IS OVER: ${this.people} PEOPLE AND ${this.grain} BUSHELS REMAIN. ${verdict}`);
      this.addScore(this.people + Math.round(this.grain / 10));
    }
    this.print(`FINAL SCORE ${this.score}`);
    this.done = true; this.setMenu(['PLAY AGAIN']); this.sel = 0;
  }
  draw(c) { this.drawTerm(c, { status: `SEASON ${Math.min(this.season, SEASONS)}/${SEASONS}  POP ${this.people}  GRAIN ${this.grain}` }); }
}
