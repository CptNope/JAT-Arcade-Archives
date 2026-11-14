// Visitor features shared by the 3D museum and the 2D mode:
//   high-score boards with initials, a passport of stamps and achievements, wing certificates,
//   a daily featured machine, and a narrated guided tour.
// No three.js here: the host (museum.js or flat.js) passes in how to walk to and play a machine.
//
// Scores are kept in this browser. When the page sets window.JAT_ARCADE_CONFIG = { scoresUrl, nonce }
// (the WordPress plugin does), boards are read from and sent to that REST endpoint instead, with the
// local copy as a fallback when the network fails.
import { EXHIBITS, WINGS } from './exhibits.js';

const BOARD_SIZE = 10;
const LS = {
  get(k, d) { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* storage blocked or full */ } },
};
const today = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const fmt = (n) => Number(n).toLocaleString('en-US');
const exById = new Map(EXHIBITS.map(e => [e.id, e]));
const exForGame = (gameId) => EXHIBITS.find(e => e.game === gameId) || exById.get(gameId);
const el = (tag, cls, text) => { const n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; };

// ---------------------------------------------------------------------------------------------
// Score boards
// ---------------------------------------------------------------------------------------------
export class Scores {
  constructor(cfg = globalThis.JAT_ARCADE_CONFIG || {}) {
    this.url = cfg.scoresUrl || null;
    this.nonce = cfg.nonce || null;
    this.canSubmit = cfg.canSubmit !== false;
    this.cache = new Map();
  }
  key(id, period) { return period === 'daily' ? `jat-board:${today()}:${id}` : `jat-board:${id}`; }
  local(id, period) { return LS.get(this.key(id, period), []); }
  insertLocal(id, period, entry) {
    const b = this.local(id, period);
    b.push(entry); b.sort((a, c) => c.score - a.score || a.date.localeCompare(c.date));
    b.length = Math.min(b.length, BOARD_SIZE);
    LS.set(this.key(id, period), b);
    return b;
  }
  async get(id, period = 'all') {
    const ck = id + '|' + period;
    if (this.url) {
      try {
        const u = new URL(this.url, location.href);
        u.searchParams.set('game', id); u.searchParams.set('period', period);
        const r = await fetch(u, { credentials: 'same-origin', headers: this.nonce ? { 'X-WP-Nonce': this.nonce } : {} });
        if (r.ok) { const b = await r.json(); if (Array.isArray(b)) { this.cache.set(ck, b); return b; } }
      } catch { /* offline: fall through to the local board */ }
    }
    const b = this.local(id, period); this.cache.set(ck, b); return b;
  }
  qualifies(board, score) { return score > 0 && (board.length < BOARD_SIZE || score > board[board.length - 1].score); }
  // returns null when saved, or a message to show the visitor
  async submit(id, score, initials) {
    const entry = { initials, score, date: new Date().toISOString() };
    this.insertLocal(id, 'all', entry); this.insertLocal(id, 'daily', entry);
    this.cache.clear();
    if (!this.url || !this.canSubmit) return null;
    try {
      const r = await fetch(new URL(this.url, location.href), {
        method: 'POST', credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json', ...(this.nonce ? { 'X-WP-Nonce': this.nonce } : {}) },
        body: JSON.stringify({ game: id, score, initials }),
      });
      if (r.ok) return null;
      const j = await r.json().catch(() => ({}));
      return j.message || 'The site could not save this score.';
    } catch { return 'Offline: the score was kept in this browser.'; }
  }
}

// ---------------------------------------------------------------------------------------------
// Passport: stamps, achievements, daily challenge state
// ---------------------------------------------------------------------------------------------
const ACHIEVEMENTS = [
  { id: 'first', icon: '🪙', title: 'Insert Coin', text: 'Play your first machine.' },
  { id: 'plaques', icon: '📜', title: 'Bookworm', text: 'Read 10 plaques.' },
  ...WINGS.map(w => ({ id: 'wing:' + w.id, icon: '🏛️', title: w.title, text: `Play every machine in ${w.title}. Earns a certificate.` })),
  { id: 'all', icon: '👑', title: 'Curator', text: 'Play every machine in the museum.' },
  { id: 'top', icon: '🏆', title: 'Top of the Board', text: 'Hold the number one score on any machine.' },
  { id: 'daily', icon: '📅', title: 'Machine of the Day', text: 'Finish a game on the day\'s featured machine.' },
  { id: 'streak', icon: '🔥', title: 'Regular', text: 'Play the machine of the day three days in a row.' },
  { id: 'tour', icon: '🎧', title: 'Guided', text: 'Finish the guided tour.' },
  { id: 'marathon', icon: '⏱️', title: 'Marathon', text: 'Spend 30 minutes playing.' },
  { id: 'maker', icon: '🛠️', title: 'Level Designer', text: 'Publish a level from the Maker Lab.' },
];

export class Passport {
  constructor() {
    this.d = LS.get('jat-passport', null) || { stamps: {}, ach: {}, plaques: {}, daily: {}, playSec: 0, name: '' };
    for (const k of ['stamps', 'ach', 'plaques', 'daily']) this.d[k] ||= {};
    this.listeners = [];
  }
  save() { LS.set('jat-passport', this.d); }
  on(fn) { this.listeners.push(fn); }
  award(id) {
    if (this.d.ach[id]) return;
    this.d.ach[id] = Date.now(); this.save();
    const a = ACHIEVEMENTS.find(x => x.id === id);
    if (a) this.listeners.forEach(fn => fn(a));
  }
  stamp(exId) {
    if (!exById.has(exId)) return false;
    const fresh = !this.d.stamps[exId];
    if (fresh) { this.d.stamps[exId] = Date.now(); this.save(); }
    this.award('first');
    for (const w of WINGS) if (this.wingDone(w.id)) this.award('wing:' + w.id);
    if (EXHIBITS.every(e => this.d.stamps[e.id])) this.award('all');
    return fresh;
  }
  wingDone(wid) { const items = EXHIBITS.filter(e => e.wing === wid); return items.length > 0 && items.every(e => this.d.stamps[e.id]); }
  readPlaque(exId) {
    this.d.plaques[exId] = 1; this.save();
    if (Object.keys(this.d.plaques).length >= 10) this.award('plaques');
  }
  dailyDone(score) {
    const t = today();
    this.d.daily[t] = Math.max(this.d.daily[t] || 0, score); this.save();
    this.award('daily');
    const day = (n) => today(new Date(Date.now() - n * 864e5));
    if (this.d.daily[day(1)] != null && this.d.daily[day(2)] != null) this.award('streak');
  }
  addPlayTime(sec) {
    this.d.playSec += sec;
    if (this.d.playSec >= 1800) this.award('marathon');
    this.save();
  }
  get count() { return Object.keys(this.d.stamps).length; }
}

// the same machine for everyone on a given day
export function featuredFor(date = today()) {
  let h = 2166136261;
  for (const c of date) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619) >>> 0; }
  const sorted = EXHIBITS.filter(e => e.id !== 'makerlab').sort((a, b) => a.id.localeCompare(b.id)); // the Maker Lab has no fixed score to beat
  return sorted[h % sorted.length];
}

// ---------------------------------------------------------------------------------------------
// UI
// ---------------------------------------------------------------------------------------------
const CSS = `
.v-btn-row { display:flex; gap:8px; }
#v-toasts { position:fixed; top:calc(70px + var(--sat,0px)); left:50%; transform:translateX(-50%); display:grid; gap:8px; z-index:40; pointer-events:none; width:min(380px, calc(100% - 24px)); }
.v-toast { display:flex; gap:12px; align-items:center; background:linear-gradient(180deg,#2a1f63,#140f33); border:1px solid rgba(255,225,77,.55); border-radius:14px; padding:10px 14px; box-shadow:0 10px 30px rgba(0,0,0,.5); animation:v-in .35s ease-out; }
.v-toast b { display:block; color:#ffe14d; font-size:13px; } .v-toast small { color:#cfc8f0; }
.v-toast .ic { font-size:26px; }
@keyframes v-in { from { opacity:0; transform:translateY(-10px); } }
@media (prefers-reduced-motion: reduce) { .v-toast { animation:none; } }
.v-modal { position:fixed; inset:0; display:grid; place-items:center; background:rgba(3,2,10,.72); z-index:35; padding:16px; }
.v-modal[hidden] { display:none; }
.v-card { background:linear-gradient(180deg,#1b1442,#0e0a24); border:1px solid rgba(0,229,255,.35); border-radius:16px; padding:18px 20px; width:min(620px, 100%); max-height:calc(100dvh - 32px); overflow:auto; overscroll-behavior:contain; box-shadow:0 20px 60px rgba(0,0,0,.6); }
.v-card h2 { margin:0 0 4px; font-size:18px; } .v-card .sub { color:var(--muted); margin:0 0 14px; font-size:14px; }
.v-initials { display:flex; gap:10px; justify-content:center; margin:16px 0; }
.v-slot { display:grid; gap:4px; justify-items:center; }
.v-slot button { width:56px; padding:.3em; }
.v-slot output { font-family:'Press Start 2P', monospace; font-size:30px; width:56px; text-align:center; padding:10px 0; border-radius:10px; background:#05030f; border:2px solid rgba(255,255,255,.15); color:#ffe14d; }
.v-slot.on output { border-color:var(--cyan); box-shadow:0 0 14px rgba(0,229,255,.5); }
.v-new { text-align:center; font-family:'Press Start 2P', monospace; color:#ffe14d; font-size:14px; margin:4px 0; }
.v-tabs { display:flex; gap:6px; margin:0 0 14px; flex-wrap:wrap; }
.v-tabs [aria-selected="true"], .v-card [aria-pressed="true"] { border-color:var(--cyan); background:#2b2370; }
.v-wing { margin:0 0 16px; }
.v-wing h3 { font-size:13px; color:var(--cyan); margin:0 0 8px; display:flex; gap:8px; align-items:center; }
.v-wing h3 .btn { margin-left:auto; padding:.35em .7em; font-size:12px; }
.v-stamps { display:grid; grid-template-columns:repeat(auto-fill, minmax(92px, 1fr)); gap:8px; }
.v-stamp { border:2px dashed rgba(255,255,255,.18); border-radius:12px; padding:8px 6px; text-align:center; font-size:11px; color:var(--muted); background:none; display:grid; gap:2px; }
.v-stamp .yr { font-family:'Press Start 2P', monospace; font-size:9px; }
.v-stamp.on { border-style:solid; border-color:#ff2bd6; color:var(--ink); background:radial-gradient(circle at 50% 40%, rgba(255,43,214,.22), transparent 70%); transform:rotate(-2deg); }
.v-stamp.on .yr { color:#ffe14d; }
.v-stamp.today { box-shadow:0 0 0 2px #ffe14d inset; }
.v-ach { display:grid; grid-template-columns:auto 1fr; gap:4px 12px; align-items:center; padding:8px 0; border-bottom:1px solid var(--line); opacity:.45; }
.v-ach.on { opacity:1; } .v-ach .ic { font-size:24px; grid-row:span 2; } .v-ach b { font-size:14px; } .v-ach small { color:var(--muted); }
.v-board { width:100%; border-collapse:collapse; font-family:'Press Start 2P', monospace; font-size:11px; }
.v-board td { padding:8px 6px; border-bottom:1px solid var(--line); } .v-board td:last-child { text-align:right; color:#ffe14d; }
.v-board tr.me td { color:var(--cyan); }
.v-row { display:flex; gap:8px; flex-wrap:wrap; align-items:center; margin-bottom:12px; }
.v-row select, .v-row input { font:inherit; color:var(--ink); background:#0b0820; border:1px solid var(--line); border-radius:10px; padding:.55em .7em; min-width:0; flex:1; }
.v-daily { display:flex; gap:12px; align-items:center; background:rgba(255,225,77,.08); border:1px solid rgba(255,225,77,.35); border-radius:12px; padding:10px 12px; margin-bottom:14px; }
.v-daily .txt { flex:1; font-size:14px; } .v-daily b { color:#ffe14d; }
.v-progress { height:8px; background:#05030f; border-radius:99px; overflow:hidden; margin:0 0 14px; }
.v-progress i { display:block; height:100%; background:linear-gradient(90deg,#ff2bd6,#00e5ff); }
#v-tour { position:fixed; top:calc(68px + var(--sat,0px)); left:50%; transform:translateX(-50%); width:min(600px, calc(100% - 24px)); background:var(--panel); border:1px solid rgba(255,225,77,.4); border-radius:14px; padding:10px 12px; z-index:13; backdrop-filter:blur(8px); }
#v-tour[hidden] { display:none; }
#v-tour .cap { font-size:14px; line-height:1.5; max-height:6.2em; overflow:auto; margin:0 0 8px; }
#v-tour .cap b { color:#ffe14d; }
#v-tour .ctl { display:flex; gap:6px; flex-wrap:wrap; align-items:center; }
#v-tour .ctl .n { margin-left:auto; color:var(--muted); font-size:12px; }
#v-tour .ctl .btn { padding:.45em .75em; }
body.playing #v-tour { display:none; }
body.flat-mode #v-tour { top:auto; bottom:calc(12px + var(--sab,0px)); }
#top .btn { white-space:nowrap; }
@media (max-width: 760px) { #brand { display:none; } }
@media (max-width: 600px) { .lbl { display:none; } }
@media (max-height: 460px) { #v-tour { top:calc(8px + var(--sat,0px)); } #v-tour .cap { max-height:3em; font-size:12px; } }
.v-board-line { font-size:12px; color:#ffe14d; margin:-4px 0 8px; min-height:1em; font-family:'Press Start 2P', monospace; }
.v-mark { color:#ff2bd6; margin-left:6px; } .v-star { color:#ffe14d; margin-left:6px; }
@media print { body > :not(.v-print) { display:none !important; } }
.v-levels { display:grid; grid-template-columns:repeat(auto-fill, minmax(150px, 1fr)); gap:10px; }
.v-level { background:#0b0820; border:1px solid var(--line); border-radius:12px; padding:8px; display:grid; gap:6px; text-align:left; }
.v-level:hover, .v-level:focus-within { border-color:var(--cyan); }
.v-level canvas { width:100%; aspect-ratio:16/10; image-rendering:pixelated; border-radius:6px; background:#1a1650; }
.v-level b { font-size:14px; } .v-level small { color:var(--muted); }
.v-row label { display:grid; gap:4px; flex:1; font-size:13px; color:var(--muted); }
`;

export function initVisitor({ host, sfx, toolbar }) {
  let dead = false;
  const nodes = [];
  const scores = new Scores();
  const passport = new Passport();
  const featured = featuredFor();
  const style = el('style'); style.textContent = CSS; document.head.appendChild(style); nodes.push(style);

  // ---------------- toasts ----------------
  const toasts = el('div'); toasts.id = 'v-toasts'; toasts.setAttribute('role', 'status'); toasts.setAttribute('aria-live', 'polite');
  document.body.appendChild(toasts); nodes.push(toasts);
  function toast(icon, title, text, ms = 4200) {
    const t = el('div', 'v-toast');
    t.append(el('span', 'ic', icon)); const tx = el('div'); tx.append(el('b', null, title), el('small', null, text)); t.append(tx);
    toasts.appendChild(t); setTimeout(() => t.remove(), ms);
  }
  passport.on((a) => { toast(a.icon, 'Achievement: ' + a.title, a.text); sfx?.play?.('power'); refreshMarks(); });

  // ---------------- toolbar buttons ----------------
  const passBtn = el('button', 'btn'); passBtn.innerHTML = '🎫<span class="lbl"> Passport</span>'; passBtn.title = 'Passport, high scores and achievements';
  const tourBtn = el('button', 'btn'); tourBtn.innerHTML = '🎧<span class="lbl"> Tour</span>'; tourBtn.title = 'Guided tour with narration';
  passBtn.addEventListener('click', () => openPassport());
  tourBtn.addEventListener('click', () => tour.running ? tour.stop() : tour.start());
  toolbar?.prepend(tourBtn, passBtn); nodes.push(tourBtn, passBtn);

  // ---------------- modal helpers ----------------
  let modalOpen = null;
  function modal(id, label) {
    const m = el('div', 'v-modal'); m.id = id; m.hidden = true;
    m.setAttribute('role', 'dialog'); m.setAttribute('aria-modal', 'true'); m.setAttribute('aria-label', label);
    const card = el('div', 'v-card'); m.appendChild(card);
    m.addEventListener('click', (e) => { if (e.target === m && m.dataset.dismiss !== 'no') close(m); });
    document.body.appendChild(m); nodes.push(m);
    return { m, card };
  }
  function open(m, focusSel) {
    modalOpen = m; m.hidden = false;
    (m.querySelector(focusSel || 'button') || m).focus();
  }
  function close(m) {
    m.hidden = true; if (modalOpen === m) modalOpen = null;
    m.onClose?.();
  }
  // a modal swallows the keyboard so games and walking don't react underneath it
  addEventListener('keydown', (e) => {
    if (dead || !modalOpen) return;
    if (modalOpen.onKey?.(e)) { e.preventDefault(); e.stopImmediatePropagation(); return; }
    if (e.code === 'Escape' && modalOpen.dataset.dismiss !== 'no') { close(modalOpen); e.stopImmediatePropagation(); return; }
    e.stopImmediatePropagation(); // Tab, Enter and Space still work normally on the dialog's own controls
  }, true);

  // ---------------- initials entry ----------------
  const ALPHA = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789 ';
  const ini = modal('v-initials', 'Enter your initials'); ini.m.dataset.dismiss = 'no';
  ini.card.innerHTML = `<div class="v-new">NEW HIGH SCORE!</div><h2 style="text-align:center"></h2><p class="sub" style="text-align:center"></p>
    <div class="v-initials"></div>
    <p class="sub" style="text-align:center">Type letters, or use ▲ ▼ to change and ◀ ▶ to move.</p>
    <div class="v-row" style="justify-content:center"><button class="btn primary" data-act="ok">Save score</button><button class="btn" data-act="skip">Skip</button></div>`;
  let letters = (passport.d.name || 'AAA').toUpperCase().replace(/[^A-Z0-9 ]/g, '').padEnd(3, 'A').slice(0, 3).split('');
  let cur = 0, pending = null;
  const slots = [0, 1, 2].map((i) => {
    const s = el('div', 'v-slot');
    const up = el('button', 'btn', '▲'), out = el('output'), dn = el('button', 'btn', '▼');
    up.setAttribute('aria-label', `Letter ${i + 1} up`); dn.setAttribute('aria-label', `Letter ${i + 1} down`);
    up.addEventListener('click', () => { cur = i; spin(1); }); dn.addEventListener('click', () => { cur = i; spin(-1); });
    out.addEventListener('click', () => { cur = i; drawIni(); });
    s.append(up, out, dn); ini.card.querySelector('.v-initials').appendChild(s); return s;
  });
  function spin(d) { const k = ALPHA.indexOf(letters[cur]); letters[cur] = ALPHA[(k + d + ALPHA.length) % ALPHA.length]; drawIni(); }
  function drawIni() { slots.forEach((s, i) => { s.querySelector('output').textContent = letters[i]; s.classList.toggle('on', i === cur); }); }
  ini.m.onKey = (e) => {
    if (e.code === 'ArrowUp') { spin(1); return true; }
    if (e.code === 'ArrowDown') { spin(-1); return true; }
    if (e.code === 'ArrowLeft') { cur = Math.max(0, cur - 1); drawIni(); return true; }
    if (e.code === 'ArrowRight') { cur = Math.min(2, cur + 1); drawIni(); return true; }
    if (e.code === 'Backspace') { cur = Math.max(0, cur - 1); drawIni(); return true; }
    if (e.code === 'Escape') { finishIni(false); return true; }
    if (e.code === 'Enter' || e.code === 'NumpadEnter') { finishIni(!e.target.closest?.('[data-act="skip"]')); return true; }
    if (/^[a-z0-9]$/i.test(e.key)) { letters[cur] = e.key.toUpperCase(); cur = Math.min(2, cur + 1); drawIni(); return true; }
    return false;
  };
  ini.card.querySelector('[data-act="ok"]').addEventListener('click', () => finishIni(true));
  ini.card.querySelector('[data-act="skip"]').addEventListener('click', () => finishIni(false));
  async function finishIni(save) {
    const p = pending; pending = null; close(ini.m);
    if (!p || !save) return;
    const name = letters.join('').trim() || 'AAA';
    passport.d.name = name; passport.save();
    const problem = await scores.submit(p.id, p.score, name);
    const board = await scores.get(p.id, 'all');
    if (board[0] && board[0].score <= p.score && board[0].initials === name) passport.award('top');
    if (problem) toast('⚠️', `${name} · ${fmt(p.score)}`, problem, 6000);
    else toast('🏆', `${name} · ${fmt(p.score)}`, `Saved to the ${p.title} board.`);
    host.onScoresChanged?.();
  }
  async function askInitials(ex, score) {
    const board = await scores.get(ex.id, 'all');
    const daily = await scores.get(ex.id, 'daily');
    if (!scores.qualifies(board, score) && !scores.qualifies(daily, score)) return;
    if (scores.url && !scores.canSubmit) { toast('🔒', `${fmt(score)} points`, 'Log in to put your score on this site\'s boards.', 5000); return; }
    pending = { id: ex.id, score, title: ex.title };
    const rank = board.filter(b => b.score >= score).length + 1;
    ini.card.querySelector('h2').textContent = `${ex.title}: ${fmt(score)}`;
    ini.card.querySelector('.sub').textContent = rank <= BOARD_SIZE ? `That's number ${rank} on the all-time board.` : 'That makes today\'s board.';
    cur = 0; drawIni(); open(ini.m, '[data-act="ok"]');
  }

  // ---------------- game events ----------------
  addEventListener('jat:start', (e) => {
    const ex = exForGame(e.detail.id); if (dead || !ex || !host.isPlaying()) return;
    if (passport.stamp(ex.id)) { toast('🎫', 'Passport stamped', `${ex.year} · ${ex.title}  (${passport.count}/${EXHIBITS.length})`, 2600); sfx?.play?.('gem'); refreshMarks(); }
  });
  addEventListener('jat:gameover', (e) => {
    const ex = exForGame(e.detail.id); if (dead || !ex || !host.isPlaying()) return;
    const score = e.detail.score;
    if (ex.id === featured.id) passport.dailyDone(score);
    setTimeout(() => askInitials(ex, score), 900);
  });
  setInterval(() => { if (!dead && host.isPlaying() && !document.hidden) passport.addPlayTime(5); }, 5000);

  // ---------------- passport panel ----------------
  const pp = modal('v-passport', 'Passport');
  pp.card.innerHTML = `<div class="v-row"><h2 style="flex:1;margin:0">🎫 Museum Passport</h2><button class="btn" data-act="close" aria-label="Close">✕</button></div>
    <div class="v-daily"><span style="font-size:24px">⭐</span><div class="txt"></div><button class="btn primary" data-act="daily">Go</button></div>
    <div class="v-tabs" role="tablist">
      <button class="btn" role="tab" data-tab="stamps">Stamps</button>
      <button class="btn" role="tab" data-tab="scores">High scores</button>
      <button class="btn" role="tab" data-tab="ach">Achievements</button>
    </div>
    <div data-pane="stamps"></div><div data-pane="scores" hidden></div><div data-pane="ach" hidden></div>`;
  pp.card.querySelector('[data-act="close"]').addEventListener('click', () => close(pp.m));
  pp.card.querySelector('[data-act="daily"]').addEventListener('click', () => { close(pp.m); host.go(featured); });
  let tab = 'stamps';
  pp.card.querySelectorAll('[data-tab]').forEach(b => b.addEventListener('click', () => { tab = b.dataset.tab; renderPassport(); }));

  function renderPassport() {
    pp.card.querySelectorAll('[data-tab]').forEach(b => b.setAttribute('aria-selected', String(b.dataset.tab === tab)));
    pp.card.querySelectorAll('[data-pane]').forEach(p => { p.hidden = p.dataset.pane !== tab; });
    const done = passport.d.daily[today()] != null;
    const dt = pp.card.querySelector('.v-daily .txt'); dt.textContent = '';
    dt.append(el('b', null, 'Machine of the day: '), `${featured.year} · ${featured.title}. `,
      done ? `Done today with ${fmt(passport.d.daily[today()])} points.` : 'Finish a game on it to complete today\'s challenge.');
    if (tab === 'stamps') renderStamps(); else if (tab === 'scores') renderScores(); else renderAch();
  }
  function renderStamps() {
    const pane = pp.card.querySelector('[data-pane="stamps"]'); pane.textContent = '';
    const pct = Math.round(passport.count / EXHIBITS.length * 100);
    pane.append(el('p', 'sub', `${passport.count} of ${EXHIBITS.length} machines played (${pct}%). Play a machine to stamp it.`));
    const bar = el('div', 'v-progress'); const fill = el('i'); fill.style.width = pct + '%'; bar.appendChild(fill); pane.appendChild(bar);
    for (const w of WINGS) {
      const items = EXHIBITS.filter(e => e.wing === w.id).sort((a, b) => a.year - b.year);
      if (!items.length) continue;
      const sec = el('section', 'v-wing');
      const h = el('h3', null, `${w.title} · ${items.filter(e => passport.d.stamps[e.id]).length}/${items.length}`);
      if (passport.wingDone(w.id)) {
        const c = el('button', 'btn', '📜 Certificate');
        c.addEventListener('click', () => certificate(w, items));
        h.appendChild(c);
      }
      sec.appendChild(h);
      const grid = el('div', 'v-stamps');
      for (const ex of items) {
        const on = !!passport.d.stamps[ex.id];
        const s = el('button', 'v-stamp' + (on ? ' on' : '') + (ex.id === featured.id ? ' today' : ''));
        s.append(el('span', 'yr', String(ex.year)), el('span', null, ex.title));
        s.setAttribute('aria-label', `${ex.year} ${ex.title}${on ? ', stamped' : ', not played yet'}${ex.id === featured.id ? ', machine of the day' : ''}`);
        s.addEventListener('click', () => { close(pp.m); host.go(ex); });
        grid.appendChild(s);
      }
      sec.appendChild(grid); pane.appendChild(sec);
    }
  }
  let scoreEx = featured.id, scorePeriod = 'all';
  async function renderScores() {
    const pane = pp.card.querySelector('[data-pane="scores"]'); pane.textContent = '';
    const row = el('div', 'v-row');
    const sel = el('select'); sel.setAttribute('aria-label', 'Machine');
    for (const ex of [...EXHIBITS].sort((a, b) => a.year - b.year)) { const o = el('option', null, `${ex.year} · ${ex.title}`); o.value = ex.id; o.selected = ex.id === scoreEx; sel.appendChild(o); }
    sel.addEventListener('change', () => { scoreEx = sel.value; renderScores(); });
    const per = el('div', 'seg v-btn-row');
    for (const [p, label] of [['all', 'All time'], ['daily', 'Today']]) {
      const b = el('button', 'btn', label); b.setAttribute('aria-pressed', String(p === scorePeriod));
      b.addEventListener('click', () => { scorePeriod = p; renderScores(); }); per.appendChild(b);
    }
    row.append(sel, per); pane.appendChild(row);
    const where = el('p', 'sub', scores.url ? 'Scores from everyone who plays on this site.' : 'Scores kept in this browser.');
    pane.appendChild(where);
    const board = await scores.get(scoreEx, scorePeriod);
    if (tab !== 'scores') return;
    const t = el('table', 'v-board');
    if (!board.length) { pane.appendChild(el('p', 'sub', 'No scores yet. Be the first!')); }
    board.forEach((b, i) => {
      const tr = t.insertRow(); if (b.initials === passport.d.name) tr.className = 'me';
      tr.insertCell().textContent = String(i + 1).padStart(2, '0');
      tr.insertCell().textContent = b.initials;
      tr.insertCell().textContent = fmt(b.score);
    });
    if (board.length) pane.appendChild(t);
    const play = el('button', 'btn primary', '▶ Play this machine'); play.style.marginTop = '12px';
    play.addEventListener('click', () => { close(pp.m); host.go(exById.get(scoreEx)); });
    pane.appendChild(play);
  }
  function renderAch() {
    const pane = pp.card.querySelector('[data-pane="ach"]'); pane.textContent = '';
    const n = ACHIEVEMENTS.filter(a => passport.d.ach[a.id]).length;
    pane.append(el('p', 'sub', `${n} of ${ACHIEVEMENTS.length} unlocked.`));
    for (const a of ACHIEVEMENTS) {
      const r = el('div', 'v-ach' + (passport.d.ach[a.id] ? ' on' : ''));
      r.append(el('span', 'ic', passport.d.ach[a.id] ? a.icon : '🔒'), el('b', null, a.title), el('small', null, a.text));
      pane.appendChild(r);
    }
  }
  function openPassport(t) { if (t) tab = t; tour.pause(); renderPassport(); open(pp.m, '[data-act="close"]'); }

  // ---------------- certificates ----------------
  async function certificate(w, items) {
    try { await document.fonts?.load('20px "Press Start 2P"'); } catch { /* use fallback font */ }
    const c = document.createElement('canvas'); c.width = 1600; c.height = 1130;
    const g = c.getContext('2d');
    const bg = g.createRadialGradient(800, 300, 50, 800, 565, 1100); bg.addColorStop(0, '#2a1a6a'); bg.addColorStop(1, '#07041a');
    g.fillStyle = bg; g.fillRect(0, 0, 1600, 1130);
    g.strokeStyle = '#ffe14d'; g.lineWidth = 10; g.strokeRect(40, 40, 1520, 1050);
    g.strokeStyle = '#ff2bd6'; g.lineWidth = 3; g.strokeRect(62, 62, 1476, 1006);
    g.textAlign = 'center'; g.textBaseline = 'middle';
    const pix = (s) => `${s}px "Press Start 2P", monospace`, sans = (s, wt = 400) => `${wt} ${s}px "Space Grotesk", system-ui, sans-serif`;
    g.fillStyle = '#ffe14d'; g.font = pix(44); g.shadowColor = '#ff2bd6'; g.shadowBlur = 24; g.fillText('JAT ARCADE ARCHIVES', 800, 170); g.shadowBlur = 0;
    g.fillStyle = '#00e5ff'; g.font = pix(22); g.fillText('CERTIFICATE OF COMPLETION', 800, 250);
    g.fillStyle = '#d9d4f5'; g.font = sans(30); g.fillText('This certifies that', 800, 340);
    g.fillStyle = '#ffffff'; g.font = pix(64); g.fillText(passport.d.name || 'VISITOR', 800, 430);
    g.fillStyle = '#d9d4f5'; g.font = sans(30); g.fillText('played every machine in', 800, 520);
    g.fillStyle = '#ff2bd6'; g.font = sans(54, 700); g.fillText(w.title, 800, 590);
    g.fillStyle = '#a9a3c9'; g.font = sans(28); g.fillText(w.years, 800, 645);
    g.font = sans(24); g.fillStyle = '#d9d4f5';
    items.forEach((ex, i) => { const col = i % 2, row = (i / 2) | 0; g.textAlign = col ? 'left' : 'right'; g.fillText(`${ex.year} · ${ex.title}`, col ? 830 : 770, 720 + row * 44); });
    g.textAlign = 'center'; g.fillStyle = '#a9a3c9'; g.font = sans(22);
    g.fillText(new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }), 800, 1010);
    const url = c.toDataURL('image/png');
    const a = document.createElement('a'); a.href = url; a.download = `jat-arcade-${w.id}-certificate.png`;
    document.body.appendChild(a); a.click(); a.remove();
    toast('📜', 'Certificate saved', `${w.title}: check your downloads.`);
  }

  // ---------------- guided tour ----------------
  const tourEl = el('section'); tourEl.id = 'v-tour'; tourEl.hidden = true; tourEl.setAttribute('aria-label', 'Guided tour');
  tourEl.innerHTML = `<p class="cap" aria-live="polite"></p><div class="ctl">
    <button class="btn" data-t="prev" aria-label="Previous stop">⏮</button>
    <button class="btn" data-t="pause" aria-label="Pause">⏸</button>
    <button class="btn" data-t="next" aria-label="Next stop">⏭</button>
    <button class="btn primary" data-t="play">▶ Play it</button>
    <button class="btn" data-t="voice" aria-pressed="true" title="Narration on/off">🗣️</button>
    <span class="n"></span>
    <button class="btn" data-t="stop" aria-label="End tour">✕</button></div>`;
  document.body.appendChild(tourEl); nodes.push(tourEl);
  const tq = (s) => tourEl.querySelector(s);
  const STOPS = [...EXHIBITS].sort((a, b) => a.year - b.year || a.title.localeCompare(b.title));
  const synth = globalThis.speechSynthesis;
  const tour = {
    running: false, paused: false, i: 0, timer: null, token: 0, voice: LS.get('jat-tour-voice', true),
    async start(at = 0) {
      this.running = true; this.paused = false; tourEl.hidden = false; tourBtn.innerHTML = '🎧<span class="lbl"> End tour</span>';
      tq('[data-t="voice"]').setAttribute('aria-pressed', String(this.voice));
      this.goto(at);
    },
    stop() {
      this.running = false; this.token++; clearTimeout(this.timer); synth?.cancel(); tourEl.hidden = true; tourBtn.innerHTML = '🎧<span class="lbl"> Tour</span>';
    },
    pause() { if (!this.running || this.paused) return; this.paused = true; this.token++; clearTimeout(this.timer); synth?.cancel(); tq('[data-t="pause"]').textContent = '▶'; tq('[data-t="pause"]').setAttribute('aria-label', 'Resume'); },
    resume() { if (!this.running) return; this.paused = false; tq('[data-t="pause"]').textContent = '⏸'; tq('[data-t="pause"]').setAttribute('aria-label', 'Pause'); this.goto(this.i, true); },
    async goto(i, resumed = false) {
      if (i >= STOPS.length) { this.finish(); return; }
      this.i = Math.max(0, i); const tok = ++this.token; clearTimeout(this.timer); synth?.cancel();
      const ex = STOPS[this.i];
      tq('.n').textContent = `${this.i + 1} / ${STOPS.length}`;
      const cap = tq('.cap'); cap.textContent = ''; cap.append(el('b', null, `${ex.year} · ${ex.title}. `), ex.plaque[0]);
      if (!resumed) await host.go(ex, { tour: true });
      if (tok !== this.token || this.paused) return;
      passport.readPlaque(ex.id);
      const text = `${ex.year}. ${ex.title}. ${ex.plaque[0]}`;
      const advance = () => { if (tok === this.token && !this.paused) this.timer = setTimeout(() => this.goto(this.i + 1), 2500); };
      if (this.voice && synth && !sfx?.muted) speak(text, () => tok === this.token && advance());
      else this.timer = setTimeout(advance, 2500 + text.split(/\s+/).length * 330);
    },
    finish() { this.stop(); passport.award('tour'); toast('🎧', 'Tour complete', 'Thanks for visiting! Every machine is still open to play.'); },
  };
  function speak(text, done) {
    // speak sentence by sentence: some browsers stop long utterances part-way
    const parts = text.match(/[^.!?]+[.!?]+["')\]]*|\S[^.!?]*$/g) || [text];
    let k = 0;
    const next = () => {
      if (k >= parts.length) { done(); return; }
      const u = new SpeechSynthesisUtterance(parts[k++].trim());
      u.rate = 1.0; u.pitch = 1.0; u.lang = 'en-US';
      u.onend = next; u.onerror = () => done();
      synth.speak(u);
    };
    next();
  }
  tq('[data-t="prev"]').addEventListener('click', () => tour.goto(tour.i - 1));
  tq('[data-t="next"]').addEventListener('click', () => tour.goto(tour.i + 1));
  tq('[data-t="pause"]').addEventListener('click', () => tour.paused ? tour.resume() : tour.pause());
  tq('[data-t="stop"]').addEventListener('click', () => tour.stop());
  tq('[data-t="play"]').addEventListener('click', () => { const ex = STOPS[tour.i]; tour.pause(); host.play(ex); });
  tq('[data-t="voice"]').addEventListener('click', (e) => {
    tour.voice = !tour.voice; LS.set('jat-tour-voice', tour.voice); e.currentTarget.setAttribute('aria-pressed', String(tour.voice));
    if (!tour.voice) synth?.cancel();
  });


  // ---------------- Visitor Gallery (Maker Lab levels) ----------------
  const cfg = globalThis.JAT_ARCADE_CONFIG || {};
  const FEATURED = [
    { title: 'Stairway', initials: 'JAT', code: '0u810d240a310e230a310e230971310d1w' },
    { title: 'Spike Run', initials: 'JAT', code: '0z0z0t31043103310471095102810113014113014113411i' },
    { title: 'Bounce House', initials: 'JAT', code: '0z0b810c150n330n710e18611n' },
  ];
  const mine = () => LS.get('jat-my-levels', []);
  const gal = modal('v-gallery', 'Visitor Gallery');
  gal.card.innerHTML = `<div class="v-row"><h2 style="flex:1;margin:0">🖼 Visitor Gallery</h2><button class="btn" data-act="close" aria-label="Close">✕</button></div>
    <p class="sub"></p>
    <div class="v-tabs" role="tablist"><button class="btn" role="tab" data-g="featured">Featured</button><button class="btn" role="tab" data-g="visitors">Visitors</button><button class="btn" role="tab" data-g="mine">My levels</button></div>
    <div class="v-levels"></div>`;
  gal.card.querySelector('[data-act="close"]').addEventListener('click', () => close(gal.m));
  let gtab = 'featured';
  gal.card.querySelectorAll('[data-g]').forEach(b => b.addEventListener('click', () => { gtab = b.dataset.g; renderGallery(); }));
  function preview(code) {
    const c = document.createElement('canvas'); c.width = 64; c.height = 40;
    const g = c.getContext('2d'), cols = { 1: '#7a5a3a', 2: '#b05a3a', 3: '#5ce1ff', 4: '#d0d0e0', 5: '#b05ad8', 6: '#ffd040', 7: '#7cff6b', 8: '#ff2bd6' };
    let i = 0;
    for (let k = 0; k < code.length; k += 2) { const v = +code[k], n = parseInt(code[k + 1], 36); for (let j = 0; j < n; j++, i++) if (cols[v]) { g.fillStyle = cols[v]; g.fillRect((i % 16) * 4, ((i / 16) | 0) * 4, 4, 4); } }
    return c;
  }
  async function renderGallery() {
    gal.card.querySelectorAll('[data-g]').forEach(b => b.setAttribute('aria-selected', String(b.dataset.g === gtab)));
    const grid = gal.card.querySelector('.v-levels'), sub = gal.card.querySelector('.sub');
    grid.textContent = '';
    let list = [];
    if (gtab === 'featured') { list = FEATURED; sub.textContent = 'Levels made for the museum. Pick one to play it in the Maker Lab.'; }
    else if (gtab === 'mine') { list = mine(); sub.textContent = 'Levels you published from this browser.'; }
    else if (!cfg.levelsUrl) { sub.textContent = 'Visitor levels appear here when the museum runs on a site with the JAT Arcade Archives plugin. Your own levels are under My levels.'; }
    else {
      sub.textContent = 'Loading levels from other visitors…';
      try { const r = await fetch(new URL(cfg.levelsUrl, location.href), { credentials: 'same-origin' }); list = r.ok ? await r.json() : []; } catch { list = []; }
      if (gtab !== 'visitors') return;
      sub.textContent = list.length ? 'Levels shared by visitors to this site.' : 'No visitor levels yet. Make one in the Maker Lab and publish it!';
    }
    if (!list.length && gtab === 'mine') grid.append(el('p', 'sub', 'Nothing yet. Build a level in the Maker Lab and press 📤 Publish.'));
    for (const lv of list) {
      const card = el('div', 'v-level');
      card.append(preview(lv.code), el('b', null, lv.title), el('small', null, `by ${lv.initials}${lv.plays != null ? ` · ${fmt(lv.plays)} plays` : ''}${lv.status === 'pending' ? ' · awaiting approval' : ''}`));
      const play = el('button', 'btn primary', '▶ Play');
      play.addEventListener('click', () => { close(gal.m); playLevel(lv); });
      card.append(play); grid.append(card);
    }
  }
  async function playLevel(lv) {
    const ex = exById.get('makerlab'); if (!ex) return;
    try { localStorage.setItem('jat-maker-level', lv.code); } catch { /* storage blocked */ }
    const game = host.makerGame?.(); game?.loadCode(lv.code);
    await host.play(ex);
    // once seated at the Maker Lab, jump straight into play mode
    for (let k = 0; k < 60; k++) { const g = host.makerGame?.(); if (g && g.mode === 'play') { g.loadCode(lv.code); g.play(); break; } await new Promise(r => setTimeout(r, 100)); }
    toast('▶', lv.title, `A level by ${lv.initials}. Hold ▼ to look at it in the editor.`);
    if (lv.id && cfg.levelsUrl && cfg.nonce) fetch(new URL(cfg.levelsUrl.replace(/\/levels.*$/, '/levels/' + lv.id + '/play'), location.href), { method: 'POST', credentials: 'same-origin', headers: { 'X-WP-Nonce': cfg.nonce } }).catch(() => {});
  }
  function openGallery(tab) { if (tab) gtab = tab; tour.pause(); renderGallery(); open(gal.m, '[data-act="close"]'); }

  const pub = modal('v-publish', 'Publish your level');
  pub.card.innerHTML = `<div class="v-row"><h2 style="flex:1;margin:0">📤 Publish your level</h2><button class="btn" data-act="close" aria-label="Close">✕</button></div>
    <p class="sub"></p>
    <div class="v-row"><label>Level name<input name="title" maxlength="40" autocomplete="off"></label><label style="flex:0 0 90px">Initials<input name="ini" maxlength="3" autocomplete="off"></label></div>
    <div class="v-row"><button class="btn primary" data-act="go">Publish</button></div>`;
  pub.card.querySelector('[data-act="close"]').addEventListener('click', () => close(pub.m));
  // let people type in the form: only Escape and Enter are handled here
  pub.m.onKey = (e) => { if (e.code === 'Enter') { pub.card.querySelector('[data-act="go"]').click(); return true; } return false; };
  pub.card.querySelector('[data-act="go"]').addEventListener('click', async () => {
    const game = host.makerGame?.(); if (!game) return;
    const code = game.levelCode();
    if (!/7/.test(code.replace(/(.)./g, '$1')) || !/8/.test(code.replace(/(.)./g, '$1'))) { toast('⚠️', 'Not ready yet', 'Your level needs a start and a flag.'); return; }
    const title = (pub.card.querySelector('[name="title"]').value || 'Untitled').trim().slice(0, 40);
    const initials = (pub.card.querySelector('[name="ini"]').value || passport.d.name || 'AAA').toUpperCase().replace(/[^A-Z0-9 ]/g, '').slice(0, 3) || 'AAA';
    passport.d.name = initials; passport.save();
    let status = 'local', problem = null;
    if (cfg.levelsUrl && cfg.canPublish !== false) {
      try {
        const r = await fetch(new URL(cfg.levelsUrl, location.href), { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json', ...(cfg.nonce ? { 'X-WP-Nonce': cfg.nonce } : {}) }, body: JSON.stringify({ title, initials, code }) });
        const j = await r.json().catch(() => ({}));
        if (r.ok) status = j.status; else problem = j.message || 'The site could not take this level.';
      } catch { problem = 'Offline: the level was kept in this browser.'; }
    }
    const list = mine(); list.unshift({ title, initials, code, status: status === 'pending' ? 'pending' : undefined }); LS.set('jat-my-levels', list.slice(0, 30));
    close(pub.m);
    passport.award('maker');
    if (problem) toast('⚠️', title, problem, 6000);
    else toast('📤', title, status === 'pending' ? 'Sent! It will appear in the gallery once it is approved.' : status === 'approved' ? 'Published to the Visitor Gallery.' : 'Saved under My levels. Share it with the 🔗 link.');
  });
  function openPublish() {
    const p = pub.card.querySelector('.sub');
    p.textContent = cfg.levelsUrl ? (cfg.canPublish === false ? 'Log in to publish to this site\'s gallery. Your level will still be saved under My levels.' : cfg.moderated ? 'New levels are checked by the site owner before they appear.' : 'Your level goes straight into the Visitor Gallery.') : 'Your level is saved under My levels in this browser.';
    pub.card.querySelector('[name="ini"]').value = passport.d.name || '';
    tour.pause(); open(pub.m, '[name="title"]');
  }

  // ---------------- marks on menus and focus cards ----------------
  const marked = [];
  function markItem(node, ex) { marked.push([node, ex]); paintMark(node, ex); }
  function paintMark(node, ex) {
    node.querySelectorAll('.v-mark, .v-star').forEach(n => n.remove());
    const target = node.querySelector('strong') || node;
    if (ex.id === featured.id) { const s = el('span', 'v-star', '★'); s.title = 'Machine of the day'; target.appendChild(s); }
    if (passport.d.stamps[ex.id]) { const s = el('span', 'v-mark', '✓'); s.title = 'Played'; target.appendChild(s); }
  }
  function refreshMarks() { marked.forEach(([n, ex]) => paintMark(n, ex)); }
  async function boardLine(ex) {
    const b = (scores.cache.get(ex.id + '|all')) || await scores.get(ex.id, 'all');
    const top = b[0];
    return (ex.id === featured.id ? '★ MACHINE OF THE DAY  ' : '') + (top ? `HI ${top.initials} ${fmt(top.score)}` : '');
  }

  // welcome toast with the day's machine (once per day)
  if (LS.get('jat-daily-seen', '') !== today()) {
    LS.set('jat-daily-seen', today());
    setTimeout(() => toast('⭐', 'Machine of the day', `${featured.year} · ${featured.title}. Find the ★ in the exhibit list.`, 6000), 1500);
  }

  return {
    scores, passport, featured, tour, toast, boardLine, markItem, openPassport, openGallery, openPublish,
    get busy() { return !!modalOpen; },
    destroy() { dead = true; tour.stop(); nodes.forEach(n => n.remove()); },
  };
}
