// CAVERN QUEST — a small original text adventure in the tradition of 1976's Colossal Cave Adventure:
// explore, carry things, solve a few puzzles, bring the treasure home.
import { TermGame } from './terminal.js';

const ROOMS = {
  forest: { name: 'EDGE OF THE PINES', text: 'YOU STAND WHERE A PINE FOREST MEETS BARE ROCK. A RUSTED SHED LEANS AGAINST A BOULDER TO THE EAST. A STREAM BABBLES TO THE WEST. A ROCKY SLOPE RISES NORTH.', exits: { EAST: 'shed', WEST: 'stream', NORTH: 'slope' } },
  shed: { name: 'RUSTED SHED', text: 'COBWEBS, A BROKEN CHAIR, AND A WORKBENCH COVERED IN DUST.', exits: { WEST: 'forest' } },
  stream: { name: 'BY THE STREAM', text: 'COLD WATER RUSHES OVER SMOOTH STONES. SOMETHING GLINTS BELOW THE SURFACE.', exits: { EAST: 'forest' } },
  slope: { name: 'ROCKY SLOPE', text: 'A NARROW CRACK OPENS INTO THE HILLSIDE. AN IRON GRATE BARS THE WAY DOWN.', exits: { SOUTH: 'forest' } },
  entry: { name: 'BELOW THE GRATE', text: 'A DAMP PASSAGE SLOPES INTO THE DARK. DAYLIGHT FILTERS DOWN FROM ABOVE.', exits: { UP: 'slope', EAST: 'hall' }, dark: true },
  hall: { name: 'CRYSTAL HALL', text: 'A VAST HALL OF CRYSTAL. YOUR LAMP THROWS RAINBOWS ACROSS THE WALLS. PASSAGES LEAD NORTH AND EAST.', exits: { WEST: 'entry', NORTH: 'chasm', EAST: 'echo' }, dark: true },
  echo: { name: 'ECHO CHAMBER', text: 'EVERY FOOTSTEP RETURNS TO YOU... TO YOU... TO YOU.', exits: { WEST: 'hall' }, dark: true },
  chasm: { name: 'EDGE OF A CHASM', text: 'A BOTTOMLESS CHASM. THE ROPE BRIDGE ACROSS IT HANGS IN TATTERS.', exits: { SOUTH: 'hall' }, dark: true },
  vault: { name: 'THE STAR VAULT', text: 'A DOMED VAULT PAINTED WITH CONSTELLATIONS. A STONE PLINTH STANDS IN THE CENTRE.', exits: { SOUTH: 'chasm' }, dark: true },
};
const ITEMS = { lamp: 'BRASS LAMP', key: 'IRON KEY', rope: 'COIL OF ROPE', astrolabe: 'GOLDEN ASTROLABE' };
const SOLUTION = ['GO EAST', 'TAKE BRASS LAMP', 'GO WEST', 'GO WEST', 'TAKE IRON KEY', 'GO EAST', 'GO NORTH', 'USE IRON KEY', 'GO DOWN', 'USE BRASS LAMP', 'GO EAST', 'GO EAST',
  'TAKE COIL OF ROPE', 'GO WEST', 'GO NORTH', 'USE COIL OF ROPE', 'GO NORTH', 'TAKE GOLDEN ASTROLABE', 'GO SOUTH', 'GO SOUTH', 'GO WEST', 'GO UP', 'GO SOUTH', 'GO EAST', 'DROP GOLDEN ASTROLABE'];

export class Cavern extends TermGame {
  constructor(sfx) {
    super({ id: 'cavern', sfx, cols: 40, rows: 16, cw: 6, ch: 10, fg: '#ffb84d', bg: '#0d0702' });
    this.title = 'CAVERN QUEST';
  }
  reset() {
    this.clearScreen();
    this.room = 'forest'; this.inv = new Set(); this.lit = false; this.grate = false; this.bridge = false; this.done = false;
    this.where = { lamp: 'shed', key: 'stream', rope: 'echo', astrolabe: 'vault' };
    this.aiStep = 0;
    this.print('CAVERN QUEST'); this.print('SOMEWHERE BELOW THESE HILLS LIES A GOLDEN ASTROLABE. BRING IT BACK TO THE SHED.'); this.print('');
    this.look();
  }
  dark() { return ROOMS[this.room].dark && !this.lit; }
  look() {
    const r = ROOMS[this.room];
    if (this.dark()) this.print('IT IS PITCH DARK. YOU COULD FALL INTO A PIT.');
    else {
      this.print(`${r.name}.`); this.print(r.text);
      for (const [id, at] of Object.entries(this.where)) if (at === this.room) this.print(`THERE IS A ${ITEMS[id]} HERE.`);
      if (this.room === 'slope' && this.grate) this.print('THE GRATE STANDS OPEN.');
      if (this.room === 'chasm' && this.bridge) this.print('YOUR ROPE NOW SPANS THE CHASM.');
    }
    this.options();
  }
  exits() {
    const e = { ...ROOMS[this.room].exits };
    if (this.room === 'slope' && this.grate) e.DOWN = 'entry';
    if (this.room === 'chasm' && this.bridge) e.NORTH = 'vault';
    if (this.dark()) for (const k of Object.keys(e)) if (k !== 'UP' && k !== 'WEST') delete e[k];
    return e;
  }
  options() {
    const o = Object.keys(this.exits()).map(d => `GO ${d}`);
    if (!this.dark()) for (const [id, at] of Object.entries(this.where)) if (at === this.room) o.push(`TAKE ${ITEMS[id]}`);
    for (const id of this.inv) o.push(`USE ${ITEMS[id]}`);
    if (this.inv.has('astrolabe')) o.push(`DROP ${ITEMS.astrolabe}`);
    o.push('LOOK', 'INVENTORY');
    this.setMenu(o);
  }
  ai() {
    if (this.done) return this.aiPick('PLAY AGAIN');
    const want = SOLUTION[this.aiStep] || 'LOOK';
    const inp = this.aiPick(this.menu?.includes(want) ? want : this.menu?.[0]);
    if (inp.tap.a && this.menu?.[this.sel] === want) this.aiStep++;
    return inp;
  }
  update(dt, inp) {
    const choice = this.tickTerminal(dt, inp);
    if (!choice) return;
    if (this.done) { if (this.mode === 'play') this.gameOver(); else this.reset(); return; }
    this.print(''); this.print(`> ${choice}`);
    const [verb, ...rest] = choice.split(' '); const what = rest.join(' ');
    const id = Object.keys(ITEMS).find(k => ITEMS[k] === what);
    if (verb === 'GO') {
      const to = this.exits()[what];
      this.room = to; this.addScore(2); return this.look();
    }
    if (verb === 'TAKE') { this.inv.add(id); delete this.where[id]; this.print('TAKEN.'); this.sound('gem'); if (id === 'astrolabe') this.addScore(200); return this.options(); }
    if (verb === 'DROP') {
      this.inv.delete(id); this.where[id] = this.room; this.print('DROPPED.');
      if (id === 'astrolabe' && this.room === 'shed') {
        this.print(''); this.print('THE ASTROLABE CATCHES THE LIGHT AND THE SHED FILLS WITH STARS. YOU HAVE WON!');
        this.addScore(500); this.sound('start'); this.done = true; this.setMenu(['PLAY AGAIN']); this.sel = 0; return;
      }
      return this.options();
    }
    if (verb === 'USE') {
      if (id === 'lamp') { this.lit = !this.lit; this.print(this.lit ? 'YOUR LAMP IS NOW ON.' : 'YOUR LAMP IS NOW OFF.'); return this.look(); }
      if (id === 'key' && this.room === 'slope' && !this.grate) { this.grate = true; this.print('THE GRATE SWINGS OPEN WITH A GROAN.'); this.addScore(25); this.sound('power'); return this.options(); }
      if (id === 'rope' && this.room === 'chasm' && !this.bridge) { this.bridge = true; this.inv.delete('rope'); this.print('YOU LASH THE ROPE TO THE OLD POSTS. IT WILL HOLD.'); this.addScore(25); this.sound('power'); return this.options(); }
      this.print('NOTHING HAPPENS.'); return this.options();
    }
    if (verb === 'INVENTORY') { this.print(this.inv.size ? `YOU CARRY: ${[...this.inv].map(i => ITEMS[i]).join(', ')}.` : 'YOU ARE EMPTY-HANDED.'); return this.options(); }
    this.look();
  }
  draw(c) { this.drawTerm(c, { status: `SCORE ${this.score}` }); }
}
