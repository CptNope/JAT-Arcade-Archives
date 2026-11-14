// "Inside the machine": an animated explainer for how each kind of display and hardware works.
// Shared by the 3D museum (which also pulls the model apart into an exploded view) and the 2D mode.
// Every drawing is a simplified, original diagram; nothing here depicts a real product.

const TECH = {
  analog: {
    title: 'An analog beam on a tube',
    text: [
      'There is no computer here at all. Knobs change voltages on two pairs of deflection plates inside a cathode-ray tube, and those voltages bend a beam of electrons left, right, up and down.',
      'Where the beam hits the phosphor coating, the screen glows. The targets were never on the screen: they were printed on a clear overlay laid over the glass.',
    ],
  },
  lamps: {
    title: 'Logic you can see: switches and lamps',
    text: [
      'Machines like these worked out their moves with switching circuits, built from vacuum tubes or relays, wired to follow fixed rules.',
      'Instead of a screen, every state of the game had its own lamp. When a circuit closed, its lamp lit, so players could watch the machine "think" one switch at a time.',
    ],
  },
  memory: {
    title: 'Dots on an early computer screen',
    text: [
      'Early computers stored their numbers as bits: ones and zeros held electrically, row after row.',
      'Engineers wired cathode-ray tubes to these machines to show memory as a grid of dots, or to plot a dot wherever a program asked, mostly to check the machine was working. Programmers realised that the right pattern of dots could draw a board, a ball or a game. That is how some of the very first computer games got a screen.',
    ],
  },
  scope: {
    title: 'Drawing with an oscilloscope',
    text: [
      'An oscilloscope moves a single glowing dot. One voltage sets how far left or right it is, another sets how high.',
      'An analog computer worked out the path of a ball by solving the physics with electrical circuits, and fed the answers straight to those two voltages. The dot moves fast enough, and the phosphor glows long enough, for your eye to see a smooth arc.',
    ],
  },
  vector: {
    title: 'Vector graphics: the beam draws lines',
    text: [
      'A vector display steers the electron beam from point to point, tracing each line directly, like a pen that never lifts off the paper. There are no pixels and no scanlines.',
      'Lines come out razor sharp and bright, but every shape has to be redrawn many times a second before the glow fades. Draw too much and the picture starts to flicker.',
    ],
  },
  raster: {
    title: 'Raster video: painting the screen line by line',
    text: [
      'A TV picture is built from horizontal lines. The beam sweeps across the screen, steps down, and sweeps again, around 60 times a second, turning on and off as it goes.',
      'Game hardware had to change the signal at exactly the right moment as the beam passed. Consoles and home computers kept small images called sprites and tiles in memory and mixed them into the picture on the fly, because there was not enough memory to store a whole screen of pixels.',
    ],
  },
  paper: {
    title: 'Playing on paper',
    text: [
      'Before screens were common, many people met computers through a teleprinter: a typewriter wired to a distant machine. You typed a line, and the computer typed its answer back onto a roll of paper.',
      'Printing was slow, about ten characters a second on popular models, so games were written to say a lot in a few words, and every turn left a paper record behind.',
    ],
  },
  byhand: {
    title: 'A program run by a person',
    text: [
      'A program is a list of exact steps. Before a computer was ready to run one, a person could follow the same steps with pencil and paper.',
      'For every possible move, you score the position with the program\'s rules, then pick the best. It works, but it is slow: each move could take a long time to calculate by hand.',
    ],
  },
  terminal: {
    title: 'Terminals: a screen of characters',
    text: [
      'A video terminal shows a grid of letters instead of free pixels. The computer sends character codes, and the terminal looks up each letter\'s shape in a small built-in font and draws it on the screen.',
      'Some terminals used plasma panels: tiny cells of gas that glow orange when switched on and stay lit by themselves, so the screen never needs repainting.',
    ],
  },
  lcd: {
    title: 'Liquid crystals: a screen that sips power',
    text: [
      'An LCD does not make light. Each dot holds a thin layer of liquid crystal between two polarizing filters. With no voltage, the crystal twists the light so it passes through and the dot looks pale.',
      'Apply a voltage and the crystal straightens, the light is blocked, and the dot turns dark. Because it only reflects room light, a handheld could run for hours on a few batteries.',
    ],
  },
};

const MACHINE_TECH = {
  crtdevice: 'analog', bertie: 'lamps', nimrod: 'lamps', edsac: 'memory', whirlwind: 'memory', ferranti: 'memory', midsac: 'memory',
  scope: 'scope', pdp1: 'vector', arcadeRocks: 'vector', arcadeMoon: 'vector', teletype: 'paper', ibmterm: 'paper', paperdesk: 'byhand',
  terminal: 'terminal', terminal2: 'terminal', terminal3: 'terminal', plato: 'terminal', handheld: 'lcd', pocketBrick: 'lcd',
};
export const techFor = (ex) => TECH[MACHINE_TECH[ex.machine] || 'raster'];
const keyFor = (ex) => MACHINE_TECH[ex.machine] || 'raster';

// ---------------------------------------------------------------------------------------------
// animated diagrams: each draws one frame at time t (seconds) into a 320x200 canvas
// ---------------------------------------------------------------------------------------------
const W = 320, H = 200;
const glowDot = (c, x, y, r, col) => { const g = c.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, '#ffffff'); g.addColorStop(0.3, col); g.addColorStop(1, 'rgba(0,0,0,0)'); c.fillStyle = g; c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.fill(); };
const label = (c, s, x, y, col = '#a9a3c9', align = 'left') => { c.fillStyle = col; c.font = '600 11px "Space Grotesk", system-ui, sans-serif'; c.textAlign = align; c.textBaseline = 'middle'; c.fillText(s, x, y); };
const tube = (c, x, y, w, h) => { c.fillStyle = '#05070a'; c.beginPath(); c.roundRect(x, y, w, h, 14); c.fill(); c.strokeStyle = '#3a3f4a'; c.lineWidth = 3; c.stroke(); };

const DRAW = {
  analog(c, t) {
    // electron gun on the left, deflection plates, beam to the screen
    c.fillStyle = '#2a2f3a'; c.fillRect(20, 92, 46, 16); label(c, 'electron gun', 20, 122);
    const vx = Math.sin(t * 1.3) * 0.8, vy = Math.cos(t * 0.9) * 0.7;
    c.fillStyle = '#c8a050'; c.fillRect(90, 80 + vy * 6, 30, 4); c.fillRect(90, 116 + vy * 6, 30, 4); label(c, 'plates', 90, 70);
    c.fillStyle = '#c8a050'; c.fillRect(132, 88, 4, 24); c.fillRect(156, 88, 4, 24);
    const sx = 250 + vx * 50, sy = 100 + vy * 60;
    c.strokeStyle = 'rgba(120,200,255,0.6)'; c.lineWidth = 2; c.beginPath(); c.moveTo(66, 100); c.lineTo(146, 100); c.quadraticCurveTo(190, 100, sx, sy); c.stroke();
    c.strokeStyle = '#7fd0ff'; c.lineWidth = 4; c.beginPath(); c.moveTo(250, 20); c.quadraticCurveTo(300, 100, 250, 180); c.stroke();
    glowDot(c, sx, sy, 12, '#7fffb0');
    // knobs
    for (const [x, v, n] of [[30, vx, 'left / right'], [110, vy, 'up / down']]) { c.fillStyle = '#222'; c.beginPath(); c.arc(x + 14, 168, 13, 0, 7); c.fill(); c.strokeStyle = '#ffe14d'; c.lineWidth = 3; c.beginPath(); c.moveTo(x + 14, 168); c.lineTo(x + 14 + Math.cos(v * 2 - 1.57) * 11, 168 + Math.sin(v * 2 - 1.57) * 11); c.stroke(); label(c, n, x + 32, 168); }
  },
  lamps(c, t) {
    const step = Math.floor(t * 2) % 12;
    // a relay chain feeding a 3x3 lamp board
    label(c, 'switching circuits', 20, 20);
    for (let i = 0; i < 6; i++) {
      const on = i <= step % 7;
      c.strokeStyle = on ? '#ffe14d' : '#4a4a5a'; c.lineWidth = 3;
      c.beginPath(); c.moveTo(24 + i * 22, 50); c.lineTo(40 + i * 22, on ? 50 : 40); c.stroke();
      c.fillStyle = '#6a6a7a'; c.beginPath(); c.arc(24 + i * 22, 50, 3, 0, 7); c.fill();
    }
    c.strokeStyle = '#4a4a5a'; c.lineWidth = 2; c.beginPath(); c.moveTo(160, 50); c.lineTo(190, 50); c.lineTo(190, 100); c.lineTo(205, 100); c.stroke();
    const lit = [4, 0, 8, 2, 6][Math.floor(t * 0.8) % 5];
    for (let r = 0; r < 3; r++) for (let q = 0; q < 3; q++) {
      const k = r * 3 + q, x = 220 + q * 30, y = 55 + r * 30, on = k === lit || (k * 7 + Math.floor(t)) % 5 === 0;
      c.fillStyle = '#1a1a22'; c.fillRect(x - 12, y - 12, 24, 24);
      if (on) glowDot(c, x, y, 16, k === lit ? '#ffb347' : '#a05a20'); else { c.fillStyle = '#3a2a1a'; c.beginPath(); c.arc(x, y, 7, 0, 7); c.fill(); }
    }
    label(c, 'one lamp for every square', 205, 160);
  },
  memory(c, t) {
    label(c, 'memory: rows of bits', 18, 18);
    const rows = 8, cols = 16, frame = Math.floor(t * 1.5);
    const pic = ['................', '.##..###..#...#.', '#..#.#....##..#.', '#..#.###..#.#.#.', '#..#...#..#..##.', '.##..###..#...#.', '................', '................'];
    for (let r = 0; r < rows; r++) for (let q = 0; q < cols; q++) {
      const bit = r < 6 && frame % 2 === 0 ? pic[r][q] === '#' : ((r * 31 + q * 17 + frame * 7) % 5) === 0;
      c.fillStyle = '#0c1a2a'; c.fillRect(18 + q * 9, 30 + r * 9, 8, 8);
      c.fillStyle = bit ? '#5ce1ff' : '#1a2a3a'; c.font = '7px monospace'; c.textAlign = 'center'; c.fillText(bit ? '1' : '0', 22 + q * 9, 35 + r * 9);
      if (bit) glowDot(c, 214 + q * 6, 50 + r * 9, 4, '#7fffb0');
    }
    tube(c, 196, 30, 108, 90);
    for (let r = 0; r < rows; r++) for (let q = 0; q < cols; q++) {
      const bit = r < 6 && frame % 2 === 0 ? pic[r][q] === '#' : ((r * 31 + q * 17 + frame * 7) % 5) === 0;
      if (bit) glowDot(c, 206 + q * 6, 46 + r * 9, 4, '#7fffb0');
    }
    c.strokeStyle = '#ffe14d'; c.setLineDash([4, 4]); c.beginPath(); c.moveTo(164, 70); c.lineTo(194, 70); c.stroke(); c.setLineDash([]);
    label(c, frame % 2 === 0 ? 'bits set on purpose draw a picture' : 'ordinary data looks like noise', 18, 120);
    label(c, 'each 1 lights a dot on the tube', 18, 140, '#7fffb0');
  },
  scope(c, t) {
    tube(c, 120, 18, 180, 140);
    // the ball's arc as a fading trail
    for (let k = 0; k < 40; k++) {
      const tt = t - k * 0.02, ph = (tt * 0.6) % 1, x = 140 + ph * 140, y = 140 - Math.abs(Math.sin(ph * Math.PI * 3)) * 100 * (1 - ph * 0.5);
      c.globalAlpha = 1 - k / 40; glowDot(c, x, y, 6, '#7fffb0');
    }
    c.globalAlpha = 1;
    c.strokeStyle = '#7fffb0'; c.lineWidth = 2; c.beginPath(); c.moveTo(130, 140); c.lineTo(290, 140); c.moveTo(210, 140); c.lineTo(210, 115); c.stroke();
    const ph = (t * 0.6) % 1;
    label(c, 'X voltage', 18, 50); c.fillStyle = '#ff2bd6'; c.fillRect(18, 60, 90 * ph, 8);
    label(c, 'Y voltage', 18, 90); c.fillStyle = '#00e5ff'; c.fillRect(18, 100, 90 * Math.abs(Math.sin(ph * Math.PI * 3)) * (1 - ph * 0.5), 8);
    label(c, 'analog computer solves the physics', 18, 180);
  },
  vector(c, t) {
    tube(c, 20, 18, 280, 150);
    const ship = [[0, -16], [10, 12], [0, 6], [-10, 12], [0, -16]], rock = [[-14, -6], [-4, -14], [10, -10], [14, 4], [2, 14], [-12, 8], [-14, -6]];
    const shapes = [ship.map(([x, y]) => [x + 110, y + 95]), rock.map(([x, y]) => [x * 1.4 + 220, y * 1.4 + 70]), rock.map(([x, y]) => [-y + 200, x + 130])];
    const segs = shapes.flatMap(s => s.slice(1).map((p, i) => [s[i], p]));
    const total = segs.length, prog = (t * 14) % (total + 6);
    c.strokeStyle = '#d0f0ff'; c.lineWidth = 2; c.shadowColor = '#7ad8ff'; c.shadowBlur = 8;
    segs.forEach(([a, b], i) => {
      if (i > prog) return;
      const f = Math.min(1, prog - i), fade = Math.max(0.25, 1 - (prog - i) / (total + 6));
      c.globalAlpha = fade; c.beginPath(); c.moveTo(a[0], a[1]); c.lineTo(a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f); c.stroke();
    });
    c.globalAlpha = 1; c.shadowBlur = 0;
    const cur = segs[Math.min(total - 1, Math.floor(prog))], f = Math.min(1, prog - Math.floor(prog));
    if (prog < total) glowDot(c, cur[0][0] + (cur[1][0] - cur[0][0]) * f, cur[0][1] + (cur[1][1] - cur[0][1]) * f, 9, '#ffffff');
    label(c, 'the beam traces each line, then starts again', 20, 186);
  },
  raster(c, t) {
    const sw = 160, sh = 120, x0 = 20, y0 = 30, lines = 30, speed = 1.2;
    tube(c, x0 - 8, y0 - 8, sw + 16, sh + 16);
    const prog = (t * speed) % 1, cur = Math.floor(prog * lines), fx = (prog * lines) % 1;
    const sprite = ['..####..', '.######.', '##.##.##', '########', '.#.##.#.', '#......#'];
    for (let l = 0; l < lines; l++) {
      if (l > cur) break;
      const y = y0 + l * (sh / lines);
      for (let px = 0; px < 40; px++) {
        if (l === cur && px / 40 > fx) break;
        const sy = Math.floor((l - 10) / 2), sx = Math.floor((px - 16) / 2);
        const inSprite = sy >= 0 && sy < 6 && sx >= 0 && sx < 8 && sprite[sy][sx] === '#';
        c.fillStyle = inSprite ? '#ff8c1a' : l > 24 ? '#3a8a3a' : '#2a3a7a';
        c.fillRect(x0 + px * 4, y, 4, sh / lines - 1);
      }
    }
    glowDot(c, x0 + fx * sw, y0 + cur * (sh / lines) + 2, 8, '#ffffff');
    // the sprite in memory, mixed in as the beam passes
    label(c, 'sprite in memory', 200, 34);
    for (let r = 0; r < 6; r++) for (let q = 0; q < 8; q++) { c.fillStyle = sprite[r][q] === '#' ? '#ff8c1a' : '#1a1630'; c.fillRect(200 + q * 10, 46 + r * 10, 9, 9); }
    c.strokeStyle = '#ffe14d'; c.setLineDash([4, 4]); c.beginPath(); c.moveTo(196, 70); c.lineTo(110, 78); c.stroke(); c.setLineDash([]);
    label(c, `line ${cur + 1} of ${lines}`, 200, 130, '#ffffff');
    label(c, 'real TVs draw', 200, 150); label(c, 'hundreds of lines,', 200, 164); label(c, '60 times a second', 200, 178);
  },
  paper(c, t) {
    const text = ['> GO NORTH', 'YOU ARE IN A DARK ROOM.', 'A LAMP GLOWS NEAR', 'THE FAR WALL.', '> TAKE LAMP', 'TAKEN.'];
    const chars = Math.floor(t * 10) % (text.join('').length + 30);
    c.fillStyle = '#f2ecd8'; c.fillRect(60, 10, 200, 160);
    c.fillStyle = '#d8d0b8'; for (let y = 20; y < 170; y += 16) c.fillRect(60, y, 200, 1);
    let n = chars, last = [70, 26];
    c.font = '12px "Courier New", monospace'; c.textAlign = 'left'; c.textBaseline = 'middle';
    text.forEach((line, i) => {
      if (n <= 0) return; const part = line.slice(0, n); n -= line.length;
      c.fillStyle = line.startsWith('>') ? '#1a3a8a' : '#1a1a1a'; c.fillText(part, 70, 26 + i * 16);
      last = [70 + c.measureText(part).width, 26 + i * 16];
    });
    c.fillStyle = '#3a3a44'; c.fillRect(last[0], last[1] - 9, 8, 14); // the print head
    label(c, 'about 10 characters a second', 60, 188);
  },
  byhand(c, t) {
    c.fillStyle = '#f2ecd8'; c.fillRect(20, 20, 160, 160);
    const moves = [['e4', 3], ['d4', 4], ['Nf3', 2], ['c4', 3]];
    const k = Math.floor(t * 0.7) % (moves.length + 2);
    c.font = '13px "Courier New", monospace'; c.textAlign = 'left'; c.textBaseline = 'middle';
    moves.forEach(([m, s], i) => { if (i < k) { c.fillStyle = '#1a1a1a'; c.fillText(`${m.padEnd(4)} score ${s}`, 32, 40 + i * 22); } });
    if (k > moves.length) { c.fillStyle = '#c02828'; c.fillText('best: d4', 32, 40 + moves.length * 22 + 8); c.strokeStyle = '#c02828'; c.strokeRect(28, 40 + 22 - 10, 120, 20); }
    // pencil
    const py = 40 + Math.min(k, moves.length - 1) * 22;
    c.save(); c.translate(150 + Math.sin(t * 8) * 4, py); c.rotate(-0.6); c.fillStyle = '#ffd040'; c.fillRect(0, -3, 34, 6); c.fillStyle = '#2a2a2a'; c.fillRect(-6, -2, 6, 4); c.restore();
    label(c, 'try every move,', 200, 70); label(c, 'score each one', 200, 88); label(c, 'with the rules,', 200, 106); label(c, 'pick the best', 200, 124);
  },
  terminal(c, t) {
    tube(c, 20, 20, 200, 130);
    const lines = ['ENTER COMMAND', '> SCAN', 'SECTOR 4,7', 'KLINGONS: 2'];
    const n = Math.floor(t * 8) % 70;
    c.font = '12px "Courier New", monospace'; c.textAlign = 'left'; c.textBaseline = 'middle';
    let left = n;
    lines.forEach((l, i) => { if (left <= 0) return; c.fillStyle = '#ff9a3a'; c.shadowColor = '#ff7a1a'; c.shadowBlur = 6; c.fillText(l.slice(0, left), 32, 40 + i * 18); left -= l.length; });
    c.shadowBlur = 0;
    // the character code turning into a shape from the font
    const code = 65 + (Math.floor(t * 1.5) % 6), glyph = { 65: ['.##.', '#..#', '####', '#..#', '#..#'], 66: ['###.', '#..#', '###.', '#..#', '###.'], 67: ['.###', '#...', '#...', '#...', '.###'], 68: ['###.', '#..#', '#..#', '#..#', '###.'], 69: ['####', '#...', '###.', '#...', '####'], 70: ['####', '#...', '###.', '#...', '#...'] }[code];
    label(c, `code ${code}`, 236, 40, '#ffffff'); label(c, '→ font →', 236, 60);
    glyph.forEach((row, r) => [...row].forEach((ch, q) => { c.fillStyle = ch === '#' ? '#ff9a3a' : '#2a1a10'; c.fillRect(244 + q * 12, 74 + r * 12, 11, 11); }));
    label(c, 'the computer sends codes; the terminal draws the letters', 20, 180);
  },
  lcd(c, t) {
    const on = Math.floor(t * 0.8) % 2 === 1;
    const layers = [['polarizer', '#8a8aa8'], ['liquid crystal', on ? '#5a7a5a' : '#7aa07a'], ['polarizer', '#8a8aa8'], ['mirror', '#c8c8d0']];
    layers.forEach(([n, col], i) => { const y = 40 + i * 32; c.fillStyle = col; c.fillRect(150, y, 140, 10); label(c, n, 300, y + 5, '#a9a3c9', 'right'); });
    // twisting molecules
    for (let i = 0; i < 7; i++) { const x = 160 + i * 18, a = on ? 0 : (i / 6) * Math.PI / 2; c.strokeStyle = '#ffffff'; c.lineWidth = 2; c.beginPath(); c.moveTo(x - Math.cos(a) * 6, 77 - Math.sin(a) * 2); c.lineTo(x + Math.cos(a) * 6, 77 + Math.sin(a) * 2); c.stroke(); }
    // light ray
    c.strokeStyle = '#ffe14d'; c.lineWidth = 3; c.beginPath(); c.moveTo(120, 20); c.lineTo(120, on ? 112 : 150); c.stroke();
    if (!on) { c.beginPath(); c.moveTo(126, 150); c.lineTo(126, 20); c.stroke(); }
    label(c, on ? 'voltage on: light blocked' : 'no voltage: light passes', 20, 170, '#ffffff');
    // the resulting dot
    c.fillStyle = on ? '#0f380f' : '#9bbc0f'; c.fillRect(40, 60, 50, 50); label(c, 'the dot', 40, 125);
  },
};

// ---------------------------------------------------------------------------------------------
// panel
// ---------------------------------------------------------------------------------------------
const CSS = `
#v-inside { position:fixed; right:calc(12px + var(--sar,0px)); top:calc(64px + var(--sat,0px)); width:min(380px, calc(100% - 24px)); max-height:calc(100dvh - 90px); overflow:auto; overscroll-behavior:contain; background:var(--panel, rgba(14,10,36,.9)); border:1px solid rgba(0,229,255,.35); border-radius:16px; padding:14px 16px; z-index:14; backdrop-filter:blur(8px); }
#v-inside[hidden] { display:none; }
#v-inside .yr { font-family:'Press Start 2P', monospace; font-size:10px; color:var(--cyan,#00e5ff); }
#v-inside h2 { margin:.35em 0 .5em; font-size:17px; }
#v-inside canvas { width:100%; aspect-ratio:320/200; border-radius:10px; background:#0b0820; display:block; }
#v-inside p { color:#d9d4f5; line-height:1.55; font-size:14px; }
#v-inside .row { display:flex; gap:8px; }
body.playing #v-inside { display:none; }
@media (max-width: 700px) { #v-inside { top:auto; bottom:calc(12px + var(--sab,0px)); right:12px; max-height:55dvh; } }
body.flat-mode #v-inside { top:auto; bottom:calc(12px + var(--sab,0px)); }
`;

export function initInside({ onClose } = {}) {
  const style = document.createElement('style'); style.textContent = CSS; document.head.appendChild(style);
  const el = document.createElement('section'); el.id = 'v-inside'; el.hidden = true; el.setAttribute('aria-label', 'How this machine works');
  el.innerHTML = `<div class="yr"></div><h2></h2><canvas width="640" height="400" role="img"></canvas><div class="txt"></div>
    <div class="row"><button class="btn" data-a="close">Close</button></div>`;
  document.body.appendChild(el);
  const cv = el.querySelector('canvas'), ctx = cv.getContext('2d');
  let cur = null, raf = 0, start = 0;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  function loop(now) {
    if (!cur || el.hidden) return;
    const t = reduced ? 1.5 : Math.max(0, (now - start) / 1000);
    ctx.setTransform(2, 0, 0, 2, 0, 0); ctx.clearRect(0, 0, W, H); ctx.fillStyle = '#0b0820'; ctx.fillRect(0, 0, W, H);
    try { DRAW[keyFor(cur)](ctx, t); } catch (e) { console.error(e); }
    if (!reduced) raf = requestAnimationFrame(loop);
  }
  function open(ex) {
    cur = ex; const tech = techFor(ex);
    el.querySelector('.yr').textContent = `${ex.year} · ${ex.title}`;
    el.querySelector('h2').textContent = 'Inside: ' + tech.title;
    cv.setAttribute('aria-label', tech.title + ' (animated diagram)');
    const txt = el.querySelector('.txt'); txt.textContent = '';
    for (const p of tech.text) { const n = document.createElement('p'); n.textContent = p; txt.appendChild(n); }
    el.hidden = false; cancelAnimationFrame(raf); start = performance.now(); raf = requestAnimationFrame(loop);
    el.querySelector('[data-a="close"]').focus({ preventScroll: true });
  }
  function close() { if (el.hidden) return; el.hidden = true; cur = null; cancelAnimationFrame(raf); onClose?.(); }
  el.querySelector('[data-a="close"]').addEventListener('click', close);
  addEventListener('keydown', (e) => { if (e.code === 'Escape' && !el.hidden) { close(); e.stopImmediatePropagation(); } }, true);
  return { open, close, get isOpen() { return !el.hidden; }, get current() { return cur; } };
}
