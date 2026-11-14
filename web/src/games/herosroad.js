// HERO'S ROAD — a turn-based role-playing game in the spirit of 1986's first console RPGs: walk the
// overworld, fight monsters in menu battles, level up, rest at the town, then take the road to the
// castle and face the wyrm. Monsters get tougher the farther you wander from home.
import { Game, aiInput } from './base.js';

const S = 16, VW = 16, VH = 10, W = VW * S, H = VH * S + 32;
// . grass  f forest  ^ hills  ~ water  T town  C castle  = bridge  # rock
const MAP = [
  '~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~',
  '~~..ff....^^^....ff.....~~~~~~~~',
  '~..fff...^^#^^..ffff.....~~~C~~~',
  '~..f.....^^^^....ff......~~...~~',
  '~....T......................=.~~',
  '~...........ff.....^^......~~.~~',
  '~~...ff....ffff...^^^^.....~~~~~',
  '~~..ffff....ff.....^^.......~~~~',
  '~...ff...........~~~~........~~~',
  '~.........^^....~~~~~~.......~~~',
  '~...^^...^^^^....~~~~....ff..~~~',
  '~..^^#^...^^.............fff..~~',
  '~...^^.........ff.........f...~~',
  '~.............ffff............~~',
  '~~...ff........ff.....^^......~~',
  '~~~..fff.............^^^^....~~~',
  '~~~~..........................~~',
  '~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~',
];
const MW = MAP[0].length, MH = MAP.length;
const PASS = new Set(['.', 'f', '^', 'T', 'C', '=']);
const FOES = [
  { name: 'SLIME', hp: 6, atk: 3, def: 1, xp: 2, gold: 2, col: '#3cb8f8' },
  { name: 'BAT', hp: 9, atk: 5, def: 2, xp: 4, gold: 4, col: '#a050d8' },
  { name: 'WOLF', hp: 15, atk: 8, def: 3, xp: 8, gold: 7, col: '#a0a0a0' },
  { name: 'KNIGHT', hp: 24, atk: 11, def: 6, xp: 15, gold: 14, col: '#d8d8f0' },
  { name: 'GOLEM', hp: 36, atk: 14, def: 9, xp: 26, gold: 22, col: '#b08050' },
];
const BOSS = { name: 'WYRM', hp: 140, atk: 20, def: 10, xp: 200, gold: 500, col: '#d83028', boss: true };
const LEVELS = [0, 7, 20, 42, 75, 120, 180, 260, 360, 500];

export class HerosRoad extends Game {
  constructor(sfx) { super({ id: 'herosroad', w: W, h: H, sfx }); this.title = "HERO'S ROAD"; }
  reset() {
    this.hero = { lv: 1, hp: 18, max: 18, mp: 6, maxMp: 6, atk: 6, def: 3, xp: 0, gold: 0 };
    this.x = 5; this.y = 5; this.mx = 5; this.my = 5; this.moving = 0; this.battle = null; this.msg = ''; this.msgT = 0; this.won = false;
    this.town = [5, 4]; this.castle = [28, 2];
  }
  tile(x, y) { return x < 0 || y < 0 || x >= MW || y >= MH ? '~' : MAP[y][x]; }
  say(m, t = 1.4) { this.msg = m; this.msgT = t; }
  // ---------------- attract-mode player ----------------
  ai() {
    const b = this.battle, h = this.hero;
    if (b) {
      if (b.phase !== 'menu' || this.msgT > 0) return aiInput();
      const want = h.hp < h.max * 0.4 && h.mp >= 3 ? 1 : (h.hp < h.max * 0.25 && !b.foe.boss ? 2 : 0);
      if (b.sel !== want) return aiInput({}, { down: true });
      return aiInput({}, { a: true });
    }
    if (this.moving > 0) return aiInput();
    // grind near town until level 6, rest when hurt, then march on the castle
    let goal;
    if (h.hp < h.max * 0.45) goal = this.town;
    else if (h.lv >= 6) goal = this.castle;
    else { if (!this.wander || (this.x === this.wander[0] && this.y === this.wander[1])) { for (let k = 0; k < 50; k++) { const wx = 2 + ((Math.random() * 20) | 0), wy = 2 + ((Math.random() * 14) | 0); if (PASS.has(this.tile(wx, wy))) { this.wander = [wx, wy]; break; } } } goal = this.wander; }
    const step = this.path(goal);
    if (!step) return aiInput({ [['up', 'down', 'left', 'right'][(Math.random() * 4) | 0]]: true });
    const [dx, dy] = step;
    return aiInput({ left: dx < 0, right: dx > 0, up: dy < 0, down: dy > 0 });
  }
  path(goal) {
    if (!goal) return null;
    const start = this.y * MW + this.x, prev = new Map([[start, -1]]), q = [start];
    while (q.length) {
      const k = q.shift(), x = k % MW, y = (k / MW) | 0;
      if (x === goal[0] && y === goal[1]) {
        let c = k; while (prev.get(c) !== start && prev.get(c) !== -1) c = prev.get(c);
        if (c === start) return null;
        return [(c % MW) - this.x, ((c / MW) | 0) - this.y];
      }
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const n = (y + dy) * MW + x + dx; if (!prev.has(n) && PASS.has(this.tile(x + dx, y + dy))) { prev.set(n, k); q.push(n); } }
    }
    return null;
  }
  // ---------------- play ----------------
  update(dt, inp) {
    this.msgT = Math.max(0, this.msgT - dt);
    if (this.won) { this.wonT -= dt; if (this.wonT <= 0) this.gameOver(); return; }
    if (this.battle) { this.fight(dt, inp); return; }
    if (this.moving > 0) {
      this.moving -= dt * 7;
      const k = Math.max(0, this.moving); this.mx = this.x - this.dx * k; this.my = this.y - this.dy * k;
      if (this.moving <= 0) this.arrive();
      return;
    }
    const d = inp.left ? [-1, 0] : inp.right ? [1, 0] : inp.up ? [0, -1] : inp.down ? [0, 1] : null;
    if (d && PASS.has(this.tile(this.x + d[0], this.y + d[1]))) { this.dx = d[0]; this.dy = d[1]; this.x += d[0]; this.y += d[1]; this.moving = 1; this.sound('step2'); }
  }
  arrive() {
    const t = this.tile(this.x, this.y), h = this.hero;
    this.mx = this.x; this.my = this.y;
    if (t === 'T') { h.hp = h.max; h.mp = h.maxMp; this.say('THE INN RESTORES YOU.'); this.sound('gem'); return; }
    if (t === 'C') { this.startBattle({ ...BOSS }); return; }
    const chance = t === 'f' ? 0.16 : t === '^' ? 0.12 : 0.08;
    if (Math.random() < chance) {
      const dist = Math.hypot(this.x - this.town[0], this.y - this.town[1]);
      const tier = Math.min(FOES.length - 1, Math.floor(dist / 5 + Math.random() * 1.5));
      this.startBattle({ ...FOES[tier] });
    }
  }
  startBattle(foe) { this.battle = { foe, sel: 0, phase: 'menu', t: 0, shake: 0 }; this.say(`A ${foe.name} APPEARS!`, 1.0); this.sound('point'); }
  fight(dt, inp) {
    const b = this.battle, h = this.hero, f = b.foe;
    b.shake = Math.max(0, b.shake - dt);
    if (b.phase === 'end') { b.t -= dt; if (b.t <= 0) { this.battle = null; if (h.hp <= 0) this.gameOver(); } return; }
    if (b.phase === 'foe') { b.t -= dt; if (b.t <= 0) this.foeTurn(); return; }
    if (this.msgT > 0.4) return;
    if (inp.tap.down) b.sel = (b.sel + 1) % 3;
    if (inp.tap.up) b.sel = (b.sel + 2) % 3;
    if (!inp.tap.a) return;
    if (b.sel === 0) {
      const dmg = Math.max(1, Math.round(h.atk - f.def / 2 + Math.random() * 3 - 1) * (Math.random() < 0.08 ? 2 : 1));
      f.hp -= dmg; b.shake = 0.3; this.sound('hit'); this.say(`YOU HIT FOR ${dmg}.`, 0.9);
    } else if (b.sel === 1) {
      if (h.mp < 3) { this.say('NOT ENOUGH MAGIC.', 0.8); return; }
      h.mp -= 3; const n = 10 + h.lv * 3; h.hp = Math.min(h.max, h.hp + n); this.sound('gem'); this.say(`HEALED ${n}.`, 0.9);
    } else {
      if (!f.boss && Math.random() < 0.6) { this.say('YOU GOT AWAY.', 0.8); b.phase = 'end'; b.t = 0.8; return; }
      this.say("CAN'T ESCAPE!", 0.8);
    }
    if (f.hp <= 0) { this.victory(); return; }
    b.phase = 'foe'; b.t = 0.9;
  }
  foeTurn() {
    const b = this.battle, h = this.hero, f = b.foe;
    const dmg = Math.max(1, Math.round(f.atk - h.def / 2 + Math.random() * 3 - 1));
    h.hp = Math.max(0, h.hp - dmg); this.sound('die'); this.say(`${f.name} HITS FOR ${dmg}.`, 0.9);
    if (h.hp <= 0) { this.say('YOU HAVE FALLEN...', 2); b.phase = 'end'; b.t = 2; return; }
    b.phase = 'menu';
  }
  victory() {
    const b = this.battle, h = this.hero, f = b.foe;
    h.xp += f.xp; h.gold += f.gold; this.addScore(f.xp * 10 + f.gold);
    let msg = `${f.name} DEFEATED! +${f.xp} XP`;
    while (h.lv < LEVELS.length && h.xp >= LEVELS[h.lv]) {
      h.lv++; h.max += 6; h.maxMp += 3; h.atk += 3; h.def += 2; h.hp = h.max; h.mp = h.maxMp; msg = `LEVEL UP! NOW LEVEL ${h.lv}.`; this.sound('power');
    }
    this.say(msg, 1.4); b.phase = 'end'; b.t = 1.4;
    if (f.boss) { this.addScore(5000); this.say('THE WYRM IS DEFEATED! PEACE RETURNS.', 3); this.won = true; this.wonT = 3; this.sound('start'); }
  }
  // ---------------- drawing ----------------
  draw(c) {
    const h = this.hero;
    c.fillStyle = '#000'; c.fillRect(0, 0, W, H);
    if (this.battle) this.drawBattle(c); else this.drawMap(c);
    // status window
    c.strokeStyle = '#fff'; c.lineWidth = 1; c.strokeRect(2.5, H - 29.5, W - 5, 27);
    this.text(`LV ${h.lv}  HP ${h.hp}/${h.max}  MP ${h.mp}  G ${h.gold}`, 8, H - 25, { size: 8, align: 'left' });
    if (this.msgT > 0) this.text(this.msg, 8, H - 13, { size: 8, align: 'left', color: '#ffe14d' });
    else if (!this.battle) this.text(h.lv >= 6 ? 'THE CASTLE LIES NORTH-EAST.' : 'GROW STRONGER, THEN SEEK THE WYRM.', 8, H - 13, { size: 8, align: 'left', color: '#a0a0a0' });
  }
  drawMap(c) {
    const cx = this.mx - VW / 2 + 0.5, cy = this.my - VH / 2 + 0.5;
    for (let y = -1; y <= VH; y++) for (let x = -1; x <= VW; x++) {
      const tx = Math.floor(cx) + x, ty = Math.floor(cy) + y, t = this.tile(tx, ty);
      const px = Math.round((tx - cx) * S), py = Math.round((ty - cy) * S);
      c.fillStyle = { '.': '#48a830', f: '#307818', '^': '#8a7a50', '~': '#2040c0', T: '#48a830', C: '#48a830', '=': '#a07040', '#': '#606060' }[t];
      c.fillRect(px, py, S, S);
      if (t === 'f') { c.fillStyle = '#185808'; c.beginPath(); c.moveTo(px + 8, py + 2); c.lineTo(px + 14, py + 13); c.lineTo(px + 2, py + 13); c.fill(); }
      else if (t === '^') { c.fillStyle = '#c0b080'; c.beginPath(); c.moveTo(px + 8, py + 3); c.lineTo(px + 15, py + 14); c.lineTo(px + 1, py + 14); c.fill(); }
      else if (t === '~') { c.fillStyle = '#6080f0'; c.fillRect(px + ((tx + ty + Math.floor(this.t * 2)) % 3) * 4, py + 7, 6, 1); }
      else if (t === 'T') { c.fillStyle = '#c03020'; c.fillRect(px + 2, py + 4, 5, 3); c.fillRect(px + 9, py + 4, 5, 3); c.fillStyle = '#f0e0c0'; c.fillRect(px + 2, py + 7, 5, 6); c.fillRect(px + 9, py + 7, 5, 6); }
      else if (t === 'C') { c.fillStyle = '#d0d0d0'; c.fillRect(px + 1, py + 4, 14, 11); c.fillRect(px + 1, py + 1, 3, 3); c.fillRect(px + 12, py + 1, 3, 3); c.fillStyle = '#222'; c.fillRect(px + 6, py + 9, 4, 6); }
      else if (t === '=') { c.fillStyle = '#704010'; for (let i = 0; i < 4; i++) c.fillRect(px, py + 2 + i * 4, S, 1); }
    }
    // the hero, always centred
    const px = (VW / 2 - 0.5) * S, py = (VH / 2 - 0.5) * S, step = Math.floor(this.t * 4) % 2;
    c.fillStyle = '#e8b048'; c.fillRect(px + 4, py + 1, 8, 4);
    c.fillStyle = '#f8c898'; c.fillRect(px + 5, py + 4, 6, 4);
    c.fillStyle = '#c02828'; c.fillRect(px + 3, py + 8, 10, 5);
    c.fillStyle = '#583010'; c.fillRect(px + 4 + step, py + 13, 3, 3); c.fillRect(px + 9 - step, py + 13, 3, 3);
  }
  drawBattle(c) {
    const b = this.battle, f = b.foe, sx = b.shake > 0 ? Math.round(Math.sin(this.t * 80) * 3) : 0;
    c.fillStyle = '#101028'; c.fillRect(0, 0, W, VH * S);
    c.fillStyle = '#304060'; c.fillRect(0, VH * S - 40, W, 40);
    // monster portrait (simple original shapes)
    const mx = W / 2 + sx, my = 70, col = f.col;
    c.fillStyle = col;
    if (f.boss) { c.fillRect(mx - 40, my - 20, 80, 40); c.fillRect(mx + 30, my - 40, 26, 22); c.fillRect(mx - 56, my - 6, 20, 8); c.fillStyle = '#ffe14d'; c.fillRect(mx + 46, my - 34, 5, 5); c.fillStyle = '#801810'; for (let i = 0; i < 4; i++) c.fillRect(mx - 30 + i * 18, my - 30, 10, 12); }
    else if (f.name === 'SLIME') { c.beginPath(); c.arc(mx, my + 10, 22, Math.PI, 0); c.fill(); c.fillRect(mx - 22, my + 10, 44, 8); c.fillStyle = '#fff'; c.fillRect(mx - 9, my, 6, 6); c.fillRect(mx + 3, my, 6, 6); }
    else if (f.name === 'BAT') { c.fillRect(mx - 8, my - 8, 16, 16); const w = Math.floor(this.t * 6) % 2 ? 10 : 0; c.beginPath(); c.moveTo(mx - 8, my - 4); c.lineTo(mx - 36, my - 14 + w); c.lineTo(mx - 8, my + 6); c.moveTo(mx + 8, my - 4); c.lineTo(mx + 36, my - 14 + w); c.lineTo(mx + 8, my + 6); c.fill(); c.fillStyle = '#ff3030'; c.fillRect(mx - 5, my - 3, 3, 3); c.fillRect(mx + 2, my - 3, 3, 3); }
    else if (f.name === 'WOLF') { c.fillRect(mx - 26, my - 4, 44, 18); c.fillRect(mx + 14, my - 16, 18, 16); c.fillRect(mx + 16, my - 22, 4, 6); c.fillRect(mx + 26, my - 22, 4, 6); c.fillRect(mx - 24, my + 14, 6, 10); c.fillRect(mx + 8, my + 14, 6, 10); c.fillStyle = '#ffe14d'; c.fillRect(mx + 24, my - 10, 3, 3); }
    else if (f.name === 'KNIGHT') { c.fillRect(mx - 14, my - 24, 28, 50); c.fillStyle = '#202040'; c.fillRect(mx - 8, my - 16, 16, 4); c.fillStyle = '#c0c0c0'; c.fillRect(mx + 18, my - 30, 4, 50); }
    else { c.fillRect(mx - 26, my - 26, 52, 52); c.fillStyle = '#704020'; c.fillRect(mx - 18, my - 16, 12, 8); c.fillRect(mx + 6, my - 16, 12, 8); c.fillRect(mx - 34, my - 10, 8, 30); c.fillRect(mx + 26, my - 10, 8, 30); }
    this.text(`${f.name}`, W / 2, 112, { size: 8 });
    // HP bar for the monster
    c.fillStyle = '#400'; c.fillRect(W / 2 - 40, 124, 80, 4); c.fillStyle = '#e04040'; c.fillRect(W / 2 - 40, 124, Math.max(0, 80 * f.hp / (f.boss ? BOSS.hp : FOES.find(x => x.name === f.name).hp)), 4);
    // command menu
    c.strokeStyle = '#fff'; c.strokeRect(8.5, 132.5, 70, 26);
    ['FIGHT', 'HEAL 3MP', 'RUN'].forEach((t, i) => { if (i === b.sel && b.phase === 'menu') this.text('▶', 13, 135 + i * 8, { size: 7, align: 'left' }); this.text(t, 22, 135 + i * 8, { size: 7, align: 'left', color: i === b.sel ? '#ffe14d' : '#fff' }); });
  }
}
