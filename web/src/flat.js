// 2D mode: every game, no 3D. Used when WebGL or the three.js download isn't available, when a
// device is too slow, or when a visitor simply prefers it. Depends only on the games, not on three.js.
import { EXHIBITS, WINGS, NOTE, RECON_NOTE } from './exhibits.js';
import { GAMES } from './registry.js';
import { Sfx } from './sfx.js';

const KEYMAP = {
  ArrowUp: 'up', KeyW: 'up', ArrowDown: 'down', KeyS: 'down', ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right',
  Space: 'a', Enter: 'a', KeyZ: 'a', KeyX: 'a', KeyJ: 'a',
};
const REASONS = {
  'no-webgl': 'This device or browser can\'t show the 3D museum, so here is every machine in 2D.',
  'load-failed': 'The 3D engine couldn\'t be downloaded, so here is every machine in 2D.',
  'context-lost': 'The 3D view stopped responding, so we switched to 2D. Every game still works.',
  user: '',
};

let started = false;

export function startFlat({ reason = 'user', sfx = new Sfx() } = {}) {
  if (started) return; started = true;
  document.body.classList.add('flat-mode');
  if (matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window) document.body.classList.add('is-touch');
  document.getElementById('intro')?.classList.add('hide');

  const root = document.createElement('div');
  root.id = 'flat';
  root.innerHTML = `
    <header class="flat-head">
      <div class="pixel brand">JAT ARCADE ARCHIVES</div>
      <div class="spacer"></div>
      <button class="btn" data-act="sound" aria-pressed="true">🔊</button>
      <button class="btn" data-act="three" hidden>Try 3D</button>
    </header>
    <p class="flat-reason" hidden></p>
    <main class="flat-list"></main>
    <section class="flat-play" hidden aria-label="Game">
      <div class="flat-bar">
        <button class="btn" data-act="back">← All machines</button>
        <strong class="flat-title"></strong>
        <button class="btn" data-act="about" aria-expanded="false">About</button>
      </div>
      <div class="flat-stage"><canvas class="flat-screen" aria-label="Game screen"></canvas></div>
      <div class="flat-about" hidden></div>
      <div class="flat-pad">
        <div class="dpad">
          <span></span><button data-k="up" aria-label="Up">▲</button><span></span>
          <button data-k="left" aria-label="Left">◀</button><span></span><button data-k="right" aria-label="Right">▶</button>
          <span></span><button data-k="down" aria-label="Down">▼</button><span></span>
        </div>
        <button class="abtn" data-k="a" aria-label="A button">A</button>
      </div>
    </section>`;
  document.body.appendChild(root);
  const $ = (s) => root.querySelector(s);

  if (REASONS[reason]) { $('.flat-reason').textContent = REASONS[reason]; $('.flat-reason').hidden = false; }
  if (reason === 'user') {
    const b = $('[data-act="three"]'); b.hidden = false;
    b.addEventListener('click', () => { try { sessionStorage.removeItem('jat-flat'); } catch { /* ignore */ } location.reload(); });
  }
  $('[data-act="sound"]').addEventListener('click', (e) => {
    sfx.muted = !sfx.muted; e.currentTarget.textContent = sfx.muted ? '🔇' : '🔊'; e.currentTarget.setAttribute('aria-pressed', String(!sfx.muted));
  });

  // ---- the list, grouped by wing ----
  const games = new Map();
  const list = $('.flat-list');
  for (const w of WINGS) {
    const items = EXHIBITS.filter(e => e.wing === w.id).sort((a, b) => a.year - b.year);
    if (!items.length) continue;
    const sec = document.createElement('section');
    const h = document.createElement('h2'); h.textContent = `${w.title} · ${w.years}`; sec.appendChild(h);
    const grid = document.createElement('div'); grid.className = 'flat-grid';
    for (const ex of items) {
      const b = document.createElement('button'); b.className = 'flat-card';
      b.innerHTML = '<span class="yr pixel"></span><strong></strong><small></small>';
      b.querySelector('.yr').textContent = ex.year;
      b.querySelector('strong').textContent = ex.title;
      b.querySelector('small').textContent = ex.short;
      b.addEventListener('click', () => open(ex));
      grid.appendChild(b);
    }
    sec.appendChild(grid); list.appendChild(sec);
  }

  // ---- playing ----
  const screen = $('.flat-screen'), ctx = screen.getContext('2d');
  let current = null, game = null;
  function open(ex) {
    sfx.unlock();
    current = ex;
    game = games.get(ex.id) || new GAMES[ex.game](sfx);
    games.set(ex.id, game);
    game.attract();
    $('.flat-title').textContent = `${ex.year} · ${ex.title}`;
    const about = $('.flat-about'); about.textContent = '';
    for (const t of [...ex.plaque, ex.play, ex.recon ? RECON_NOTE : NOTE]) { const p = document.createElement('p'); p.textContent = t; about.appendChild(p); }
    about.hidden = true; $('[data-act="about"]').setAttribute('aria-expanded', 'false');
    list.hidden = true; $('.flat-play').hidden = false; root.classList.add('playing');
    try { history.replaceState(null, '', '#' + ex.id); } catch { /* sandboxed */ }
    fit(); scrollTo(0, 0);
  }
  function close() {
    game?.attract(); current = null; game = null;
    $('.flat-play').hidden = true; list.hidden = false; root.classList.remove('playing');
    held.clear(); taps.clear(); padHeld.clear();
  }
  $('[data-act="back"]').addEventListener('click', close);
  $('[data-act="about"]').addEventListener('click', (e) => {
    const about = $('.flat-about'); about.hidden = !about.hidden;
    e.currentTarget.setAttribute('aria-expanded', String(!about.hidden)); fit();
  });

  // scale the game canvas to the space available, crisp pixels, whole-number scale when it fits
  function fit() {
    if (!game) return;
    const stage = $('.flat-stage');
    const r = stage.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 3);
    let s = Math.min(r.width / game.w, r.height / game.h);
    if (s >= 2) s = Math.floor(s);
    const cw = Math.max(1, Math.floor(game.w * s)), ch = Math.max(1, Math.floor(game.h * s));
    screen.style.width = cw + 'px'; screen.style.height = ch + 'px';
    screen.width = Math.floor(cw * dpr); screen.height = Math.floor(ch * dpr);
    ctx.imageSmoothingEnabled = false;
  }
  new ResizeObserver(fit).observe($('.flat-stage'));
  addEventListener('orientationchange', () => setTimeout(fit, 250));

  // ---- input ----
  const held = new Set(), taps = new Set(), padHeld = new Set();
  addEventListener('keydown', (e) => {
    if (!game) return;
    if (e.code === 'Escape' || e.code === 'Backspace') { e.preventDefault(); close(); return; }
    const k = KEYMAP[e.code]; if (!k) return;
    e.preventDefault(); if (!e.repeat) taps.add(k); held.add(k);
  });
  addEventListener('keyup', (e) => { const k = KEYMAP[e.code]; if (k) held.delete(k); });
  addEventListener('blur', () => { held.clear(); padHeld.clear(); });
  root.querySelectorAll('.flat-pad [data-k]').forEach(b => {
    const k = b.dataset.k;
    const on = (e) => { e.preventDefault(); sfx.unlock(); b.setPointerCapture?.(e.pointerId); padHeld.add(k); taps.add(k); b.classList.add('on'); };
    const off = () => { padHeld.delete(k); b.classList.remove('on'); };
    b.addEventListener('pointerdown', on); b.addEventListener('pointerup', off); b.addEventListener('pointercancel', off); b.addEventListener('lostpointercapture', off);
    b.addEventListener('contextmenu', (e) => e.preventDefault());
  });
  screen.addEventListener('pointerdown', () => { sfx.unlock(); taps.add('a'); });
  let padPrev = {};
  function gamepad() {
    const gp = navigator.getGamepads ? [...navigator.getGamepads()].find(Boolean) : null;
    if (!gp) return {};
    const b = (i) => !!gp.buttons[i]?.pressed, ax = gp.axes[0] || 0, ay = gp.axes[1] || 0;
    const s = { up: b(12) || ay < -0.5, down: b(13) || ay > 0.5, left: b(14) || ax < -0.5, right: b(15) || ax > 0.5, a: b(0), back: b(1) };
    for (const k of ['up', 'down', 'left', 'right', 'a']) if (s[k] && !padPrev[k]) taps.add(k);
    if (s.back && !padPrev.back && game) close();
    padPrev = s; return s;
  }

  // ---- loop ----
  let last = performance.now();
  function frame(now) {
    const dt = Math.min((now - last) / 1000, 0.1); last = now;
    const gp = gamepad();
    if (game && !document.hidden) {
      const h = (k) => held.has(k) || padHeld.has(k) || !!gp[k];
      game.step(dt, { up: h('up'), down: h('down'), left: h('left'), right: h('right'), a: h('a'),
        tap: { a: taps.has('a'), up: taps.has('up'), down: taps.has('down'), left: taps.has('left'), right: taps.has('right') } });
      ctx.fillStyle = '#000'; ctx.fillRect(0, 0, screen.width, screen.height);
      ctx.drawImage(game.canvas, 0, 0, screen.width, screen.height);
    }
    taps.clear();
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  // open the exhibit named in the address, if any
  const id = location.hash.slice(1);
  const ex = EXHIBITS.find(e => e.id === id);
  if (ex) open(ex);
  window.JATArcade = { mode: '2d', open: (id2) => { const e = EXHIBITS.find(x => x.id === id2); if (e) open(e); }, close, games };
}
