import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

import { EXHIBITS, NOTE, RECON_NOTE } from './exhibits.js';
import { BUILDERS, labelTexture } from './machines.js';
import { Sfx } from './sfx.js';
import { Volley } from './games/volley.js';
import { StarSiege } from './games/starsiege.js';
import { GemRunner } from './games/gemrunner.js';
import { Serpent } from './games/serpent.js';
import { Brickfall } from './games/brickfall.js';
import { TargetBeam } from './games/targetbeam.js';
import { Bertie } from './games/bertie.js';
import { Oxo } from './games/oxo.js';
import { Tennis } from './games/tennis.js';
import { Spacewar } from './games/spacewar.js';

const GAMES = { targetbeam: TargetBeam, bertie: Bertie, oxo: Oxo, tennis: Tennis, spacewar: Spacewar, volley: Volley, starsiege: StarSiege, gemrunner: GemRunner, serpent: Serpent, brickfall: Brickfall };

const $ = (s) => document.querySelector(s);
const isTouch = matchMedia('(pointer: coarse)').matches;
if (isTouch) document.body.classList.add('is-touch');

// ---------- renderer / scene ------------------------------------------------------------
const app = $('#app');
const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, isTouch ? 1.5 : 2));
renderer.setSize(innerWidth, innerHeight);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
app.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x07051a);
scene.fog = new THREE.Fog(0x07051a, 14, 34);
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
scene.environmentIntensity = 0.22;

const camera = new THREE.PerspectiveCamera(62, innerWidth / innerHeight, 0.03, 60);
const EYE = 1.6;

const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
const bloomScale = isTouch ? 0.35 : 0.5;
const bloom = new UnrealBloomPass(new THREE.Vector2(innerWidth * bloomScale, innerHeight * bloomScale), 0.55, 0.45, 0.82);
composer.addPass(bloom);
composer.addPass(new OutputPass());

// ---------- the hall ----------------------------------------------------------------------
const HALL = { x: 14.5, z: 7, h: 4.2 };

function carpetTexture() {
  const c = document.createElement('canvas'); c.width = c.height = 512;
  const g = c.getContext('2d');
  g.fillStyle = '#120a2e'; g.fillRect(0, 0, 512, 512);
  const cols = ['#ff2bd6', '#00e5ff', '#ffe14d', '#7a5cff'];
  for (let i = 0; i < 70; i++) {
    g.strokeStyle = cols[i % 4]; g.globalAlpha = 0.55; g.lineWidth = 4;
    const x = (i * 137) % 512, y = (i * 211) % 512, s = 10 + (i % 5) * 6;
    g.beginPath();
    if (i % 3 === 0) g.arc(x, y, s, 0, Math.PI * 2);
    else if (i % 3 === 1) { g.moveTo(x - s, y); g.lineTo(x, y - s); g.lineTo(x + s, y); g.lineTo(x, y + s); g.closePath(); }
    else { g.moveTo(x - s, y + s); g.quadraticCurveTo(x, y - s * 2, x + s, y + s); }
    g.stroke();
  }
  g.globalAlpha = 1;
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(8, 4); t.anisotropy = 8;
  return t;
}

function shadowTexture() {
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const g = c.getContext('2d');
  const r = g.createRadialGradient(64, 64, 4, 64, 64, 64);
  r.addColorStop(0, 'rgba(0,0,0,0.75)'); r.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = r; g.fillRect(0, 0, 128, 128);
  return new THREE.CanvasTexture(c);
}

function buildHall() {
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(HALL.x * 2, HALL.z * 2),
    new THREE.MeshStandardMaterial({ map: carpetTexture(), roughness: 0.95 }));
  floor.rotation.x = -Math.PI / 2;
  scene.add(floor);
  const wallMat = new THREE.MeshStandardMaterial({ color: 0x15102e, roughness: 0.9 });
  const ceil = new THREE.Mesh(new THREE.PlaneGeometry(HALL.x * 2, HALL.z * 2), new THREE.MeshStandardMaterial({ color: 0x0b0820, roughness: 1 }));
  ceil.rotation.x = Math.PI / 2; ceil.position.y = HALL.h; scene.add(ceil);
  const walls = [
    [HALL.x * 2, 0, -HALL.z, 0], [HALL.x * 2, 0, HALL.z, Math.PI],
    [HALL.z * 2, -HALL.x, 0, Math.PI / 2], [HALL.z * 2, HALL.x, 0, -Math.PI / 2],
  ];
  const neon = (color) => new THREE.MeshBasicMaterial({ color, toneMapped: false });
  for (const [w, x, z, ry] of walls) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, HALL.h), wallMat);
    m.position.set(x, HALL.h / 2, z); m.rotation.y = ry; scene.add(m);
    // neon trim near the ceiling and a baseboard glow
    for (const [y, c, th] of [[HALL.h - 0.35, 0xff2bd6, 0.04], [HALL.h - 0.45, 0x00e5ff, 0.025], [0.06, 0x7a5cff, 0.03]]) {
      const s = new THREE.Mesh(new THREE.BoxGeometry(w, th, 0.02), neon(c));
      s.position.set(x, y, z); s.rotation.y = ry; s.translateZ(0.02); scene.add(s);
    }
  }
  // title sign on the back wall
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(7.2, 1.15),
    new THREE.MeshBasicMaterial({ map: labelTexture('JAT ARCADE ARCHIVES', { w: 1600, h: 256, bg: 'rgba(0,0,0,0)', glow: '#ff2bd6', fg: '#ffe14d', font: '900 150px "Arial Black", Impact, sans-serif' }), transparent: true, toneMapped: false }));
  sign.position.set(0, 3.05, -HALL.z + 0.03); scene.add(sign);
  const wingSign = (text, glow, fg, w, z, ry, y) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, w / 6.4),
      new THREE.MeshBasicMaterial({ map: labelTexture(text, { w: 1600, h: 250, bg: 'rgba(0,0,0,0)', glow, fg, font: '900 120px "Arial Black", Impact, sans-serif' }), transparent: true, toneMapped: false }));
    m.position.set(0, y, z); m.rotation.y = ry; scene.add(m);
  };
  wingSign('THE PIONEERS · 1947–1962', '#ffb347', '#fff3d0', 6.4, HALL.z - 0.03, Math.PI, 3.05);
  wingSign('THE GOLDEN AGE · 1972–1989', '#00e5ff', '#ffffff', 4.2, -HALL.z + 0.03, 0, 2.4);
  // "next wing" doorway on the east wall: placeholder for future galleries / a Librarium link
  const door = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 2.8), new THREE.MeshBasicMaterial({ color: 0x000000 }));
  door.position.set(HALL.x - 0.02, 1.4, 0); door.rotation.y = -Math.PI / 2; scene.add(door);
  const doorSign = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 0.4),
    new THREE.MeshBasicMaterial({ map: labelTexture('MORE WINGS SOON', { w: 1024, h: 160, bg: 'rgba(0,0,0,0)', glow: '#00e5ff', fg: '#ffffff', font: '900 80px "Arial Black", Impact, sans-serif' }), transparent: true, toneMapped: false }));
  doorSign.position.set(HALL.x - 0.03, 3.1, 0); doorSign.rotation.y = -Math.PI / 2; scene.add(doorSign);

  scene.add(new THREE.HemisphereLight(0x8a7dff, 0x200c2a, 0.55));
  for (const [x, c] of [[-10, 0xff2bd6], [0, 0x00e5ff], [10, 0x7a5cff]]) {
    const p = new THREE.PointLight(c, 6, 12, 1.6); p.position.set(x, 3.4, 3); scene.add(p);
  }
}
buildHall();

// ---------- exhibits ------------------------------------------------------------------------
const shadowTex = shadowTexture();
const exhibits = [];
const clickables = [];

function plaqueTexture(ex) {
  const c = document.createElement('canvas'); c.width = 512; c.height = 320;
  const g = c.getContext('2d');
  g.fillStyle = '#17112f'; g.fillRect(0, 0, 512, 320);
  g.strokeStyle = '#ffe14d'; g.lineWidth = 6; g.strokeRect(8, 8, 496, 304);
  g.fillStyle = '#00e5ff'; g.font = '900 64px "Arial Black", Impact, sans-serif'; g.fillText(String(ex.year), 30, 88);
  g.fillStyle = '#fff'; g.font = '700 34px system-ui, sans-serif';
  wrap(g, ex.title, 30, 140, 452, 38);
  g.fillStyle = '#b9b2e0'; g.font = '400 24px system-ui, sans-serif';
  wrap(g, ex.short, 30, 230, 452, 30);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  return t;
}
function wrap(g, text, x, y, maxW, lh) {
  let line = '';
  for (const word of text.split(' ')) {
    const test = line ? line + ' ' + word : word;
    if (g.measureText(test).width > maxW && line) { g.fillText(line, x, y); line = word; y += lh; } else line = test;
  }
  g.fillText(line, x, y);
}

const sfx = new Sfx();

for (const ex of EXHIBITS) {
  const game = new GAMES[ex.game](sfx);
  const built = BUILDERS[ex.machine](game);
  const root = new THREE.Group();
  root.position.set(...ex.pos); root.rotation.y = ex.rot;
  root.add(built.group);
  scene.add(root);

  const sh = new THREE.Mesh(new THREE.PlaneGeometry(built.radius * 2.6, built.radius * 2.6),
    new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, depthWrite: false }));
  sh.rotation.x = -Math.PI / 2; sh.position.y = 0.004; root.add(sh);

  // plaque lectern, front-right of the machine
  const lect = new THREE.Group(); lect.position.set(built.radius + 0.45, 0, 0.55); lect.rotation.y = -0.35; root.add(lect);
  const post = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.05, 1.0, 12), new THREE.MeshStandardMaterial({ color: 0x222233, metalness: 0.7, roughness: 0.3 }));
  post.position.y = 0.5; lect.add(post);
  const board = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.32, 0.02), [
    ...Array(4).fill(new THREE.MeshStandardMaterial({ color: 0x222233 })),
    new THREE.MeshStandardMaterial({ map: plaqueTexture(ex), emissive: 0xffffff, emissiveMap: null, emissiveIntensity: 0, roughness: 0.6 }),
    new THREE.MeshStandardMaterial({ color: 0x222233 }),
  ]);
  board.position.set(0, 1.05, 0); board.rotation.x = -0.6; lect.add(board);

  // spotlight from the ceiling
  const spot = new THREE.SpotLight(0xfff1dd, 28, 9, 0.5, 0.65, 1.4);
  spot.position.set(ex.pos[0] + Math.sin(ex.rot) * 1.6, HALL.h - 0.1, ex.pos[2] + Math.cos(ex.rot) * 1.6);
  spot.target.position.set(ex.pos[0], 0.8, ex.pos[2]);
  scene.add(spot, spot.target);

  // a cheap glow on the floor in front of each screen
  const sp = new THREE.Vector3(); built.screen.getWorldPosition(sp);

  built.group.traverse(o => { if (o.isMesh) { o.userData.exhibit = exhibits.length; clickables.push(o); } });
  board.userData.exhibit = exhibits.length; board.userData.plaque = true; clickables.push(board);

  const lectWorld = new THREE.Vector3(); lect.getWorldPosition(lectWorld);
  exhibits.push({ ...ex, game, screen: built.screen, radius: built.radius, root, lectern: lectWorld, frameAcc: 0 });
}

// ---------- UI --------------------------------------------------------------------------------
const focusEl = $('#focus');
let focused = -1;
let active = -1;          // index of the exhibit being played
let tween = null;         // camera transition
const walkPose = { pos: new THREE.Vector3(), quat: new THREE.Quaternion() };

const menu = $('#menu');
EXHIBITS.forEach((ex, i) => {
  const b = document.createElement('button');
  b.innerHTML = `<span class="yr"></span><span><strong></strong><small></small></span>`;
  b.querySelector('.yr').textContent = ex.year;
  b.querySelector('strong').textContent = ex.title;
  b.querySelector('small').textContent = ex.short;
  b.addEventListener('click', () => { goTo(i); toggleMenu(false); });
  menu.appendChild(b);
});
function toggleMenu(open = !menu.classList.contains('open')) {
  menu.classList.toggle('open', open);
  $('#menuBtn').setAttribute('aria-expanded', String(open));
}
$('#menuBtn').addEventListener('click', () => toggleMenu());
$('#sound').addEventListener('click', (e) => {
  sfx.muted = !sfx.muted;
  e.currentTarget.textContent = sfx.muted ? '🔇' : '🔊';
  e.currentTarget.setAttribute('aria-pressed', String(!sfx.muted));
});

function showFocus(i) {
  if (i === focused) return;
  focused = i;
  if (i < 0) { focusEl.classList.remove('show'); return; }
  const ex = exhibits[i];
  focusEl.querySelector('.yr').textContent = ex.year;
  focusEl.querySelector('h2').textContent = ex.title;
  focusEl.querySelector('p').textContent = ex.short;
  focusEl.classList.add('show');
}
$('#playBtn').addEventListener('click', () => focused >= 0 && sitDown(focused));
$('#plaqueBtn').addEventListener('click', () => focused >= 0 && openPlaque(focused));

const plaqueEl = $('#plaque');
function openPlaque(i) {
  const ex = exhibits[i];
  plaqueEl.querySelector('.yr').textContent = ex.year;
  plaqueEl.querySelector('h2').textContent = ex.title;
  const body = plaqueEl.querySelector('.body'); body.textContent = '';
  ex.plaque.forEach(t => { const p = document.createElement('p'); p.textContent = t; body.appendChild(p); });
  plaqueEl.querySelector('.how').textContent = ex.play;
  plaqueEl.querySelector('.note').textContent = ex.recon ? RECON_NOTE : NOTE;
  plaqueEl.classList.add('open');
  $('#plaqueClose').focus();
}
function closePlaque() { plaqueEl.classList.remove('open'); }
$('#plaqueClose').addEventListener('click', closePlaque);
plaqueEl.addEventListener('click', (e) => { if (e.target === plaqueEl) closePlaque(); });
$('#exitBtn').addEventListener('click', () => standUp());

// ---------- player --------------------------------------------------------------------------
const player = { pos: new THREE.Vector3(0, EYE, 0.2), yaw: Math.PI, pitch: -0.05 }; // arrive facing the Pioneers
function applyWalkCamera() {
  camera.position.copy(player.pos);
  camera.quaternion.setFromEuler(new THREE.Euler(player.pitch, player.yaw, 0, 'YXZ'));
}
applyWalkCamera();

function standingSpot(i) {
  const ex = exhibits[i];
  const fwd = new THREE.Vector3(0, 0, 1).applyAxisAngle(new THREE.Vector3(0, 1, 0), ex.rot);
  return new THREE.Vector3(ex.pos[0], EYE, ex.pos[2]).addScaledVector(fwd, ex.radius + 1.5);
}
function goTo(i) {
  if (active >= 0) standUp(true);
  const spot = standingSpot(i);
  const ex = exhibits[i];
  const yaw = Math.atan2(-(ex.pos[0] - spot.x), -(ex.pos[2] - spot.z));
  const target = { pos: spot, quat: new THREE.Quaternion().setFromEuler(new THREE.Euler(-0.18, yaw, 0, 'YXZ')) };
  startTween(target, () => { player.pos.copy(spot); player.yaw = yaw; player.pitch = -0.18; });
  history.replaceState(null, '', '#' + ex.id);
}

function playPose(i) {
  const s = exhibits[i].screen;
  s.updateWorldMatrix(true, false);
  const center = new THREE.Vector3(); s.getWorldPosition(center);
  const quat = new THREE.Quaternion(); s.getWorldQuaternion(quat);
  const normal = new THREE.Vector3(0, 0, 1).applyQuaternion(quat);
  const [w, h] = s.userData.size;
  const t = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
  const d = Math.max((h / 2) / t, (w / 2) / (t * camera.aspect)) * (isTouch ? 1.05 : 1.18);
  return { pos: center.addScaledVector(normal, d), quat };
}

function sitDown(i) {
  if (active === i || tween) return;
  sfx.unlock();
  closePlaque(); toggleMenu(false);
  walkPose.pos.copy(player.pos);
  walkPose.quat.copy(camera.quaternion);
  active = i;
  document.body.classList.add('playing');
  $('#playHelp').textContent = exhibits[i].play + '  ·  Esc to stand up';
  showFocus(-1);
  startTween(playPose(i), () => exhibits[i].game.start());
}
function standUp(instant = false) {
  if (active < 0) return;
  exhibits[active].game.attract();
  active = -1;
  document.body.classList.remove('playing');
  releaseAll();
  if (instant) { tween = null; applyWalkCamera(); return; }
  startTween({ pos: walkPose.pos.clone(), quat: walkPose.quat.clone() }, null);
}

function startTween(to, done) {
  tween = { from: { pos: camera.position.clone(), quat: camera.quaternion.clone() }, to, t: 0, dur: matchMedia('(prefers-reduced-motion: reduce)').matches ? 0.01 : 0.9, done };
}
function stepTween(dt) {
  if (!tween) return;
  tween.t += dt / tween.dur;
  const k = Math.min(tween.t, 1);
  const e = k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
  camera.position.lerpVectors(tween.from.pos, tween.to.pos, e);
  camera.quaternion.slerpQuaternions(tween.from.quat, tween.to.quat, e);
  if (k >= 1) { const d = tween.done; tween = null; d && d(); }
}

// ---------- input -----------------------------------------------------------------------------
const held = new Set();
const taps = new Set();
const KEYMAP = {
  ArrowUp: 'up', KeyW: 'up', ArrowDown: 'down', KeyS: 'down', ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right',
  Space: 'a', Enter: 'a', KeyZ: 'a', KeyX: 'a', KeyJ: 'a',
};
addEventListener('keydown', (e) => {
  if (plaqueEl.classList.contains('open')) { if (e.code === 'Escape') closePlaque(); return; }
  if (e.target.closest && e.target.closest('button') && (e.code === 'Space' || e.code === 'Enter') && active < 0) return;
  const k = KEYMAP[e.code];
  if (active >= 0 && (k || e.code === 'Escape')) e.preventDefault();
  if (e.code === 'Escape' || e.code === 'Backspace') { if (active >= 0) standUp(); else toggleMenu(false); return; }
  if (e.code === 'KeyE' && active < 0 && focused >= 0) { sitDown(focused); return; }
  if (k) { if (!e.repeat) taps.add(k); held.add(k); }
});
addEventListener('keyup', (e) => { const k = KEYMAP[e.code]; if (k) held.delete(k); });
addEventListener('blur', () => releaseAll());
function releaseAll() { held.clear(); taps.clear(); touchHeld.clear(); stick.x = stick.y = 0; }

// look by dragging on the canvas; a click without dragging selects a machine
const canvas = renderer.domElement;
let drag = null;
canvas.addEventListener('pointerdown', (e) => {
  canvas.setPointerCapture(e.pointerId);
  drag = { id: e.pointerId, x: e.clientX, y: e.clientY, moved: 0 };
  sfx.unlock();
});
canvas.addEventListener('pointermove', (e) => {
  if (!drag || drag.id !== e.pointerId) return;
  const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
  drag.x = e.clientX; drag.y = e.clientY; drag.moved += Math.abs(dx) + Math.abs(dy);
  if (active >= 0 || tween) return;
  const s = isTouch ? 0.006 : 0.0035;
  player.yaw -= dx * s;
  player.pitch = THREE.MathUtils.clamp(player.pitch - dy * s, -1.2, 1.2);
});
canvas.addEventListener('pointerup', (e) => {
  if (!drag || drag.id !== e.pointerId) return;
  const wasClick = drag.moved < 8;
  drag = null;
  if (!wasClick) return;
  if (active >= 0) { taps.add('a'); return; } // tapping the screen = A
  const r = canvas.getBoundingClientRect();
  const ndc = new THREE.Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
  const ray = new THREE.Raycaster(); ray.setFromCamera(ndc, camera); ray.far = 9;
  const hit = ray.intersectObjects(clickables, false)[0];
  if (!hit) return;
  const i = hit.object.userData.exhibit;
  if (hit.object.userData.plaque) openPlaque(i); else sitDown(i);
});
canvas.addEventListener('pointercancel', () => (drag = null));

// on-screen joystick (walk) and pad (play)
const stick = { x: 0, y: 0 };
const stickEl = $('#stick'), knob = stickEl.querySelector('i');
let stickId = null;
stickEl.addEventListener('pointerdown', (e) => { stickId = e.pointerId; stickEl.setPointerCapture(e.pointerId); moveStick(e); sfx.unlock(); });
stickEl.addEventListener('pointermove', (e) => e.pointerId === stickId && moveStick(e));
const endStick = () => { stickId = null; stick.x = stick.y = 0; knob.style.transform = ''; };
stickEl.addEventListener('pointerup', endStick); stickEl.addEventListener('pointercancel', endStick);
function moveStick(e) {
  const r = stickEl.getBoundingClientRect();
  let x = (e.clientX - r.left - r.width / 2) / (r.width / 2), y = (e.clientY - r.top - r.height / 2) / (r.height / 2);
  const l = Math.hypot(x, y); if (l > 1) { x /= l; y /= l; }
  stick.x = x; stick.y = y;
  knob.style.transform = `translate(${x * 34}px, ${y * 34}px)`;
}
const touchHeld = new Set();
document.querySelectorAll('#pad [data-k]').forEach(b => {
  const k = b.dataset.k;
  const on = (e) => { e.preventDefault(); b.setPointerCapture?.(e.pointerId); touchHeld.add(k); taps.add(k); b.classList.add('on'); };
  const off = () => { touchHeld.delete(k); b.classList.remove('on'); };
  b.addEventListener('pointerdown', on); b.addEventListener('pointerup', off); b.addEventListener('pointercancel', off); b.addEventListener('pointerleave', off);
});

// gamepads
let padPrev = {};
function pollGamepad() {
  const gp = navigator.getGamepads ? [...navigator.getGamepads()].find(Boolean) : null;
  if (!gp) return { up: false, down: false, left: false, right: false, a: false, ax: 0, ay: 0, lx: 0, ly: 0 };
  const b = (i) => !!gp.buttons[i]?.pressed;
  const ax = Math.abs(gp.axes[0]) > 0.25 ? gp.axes[0] : 0, ay = Math.abs(gp.axes[1]) > 0.25 ? gp.axes[1] : 0;
  const s = { up: b(12) || ay < -0.5, down: b(13) || ay > 0.5, left: b(14) || ax < -0.5, right: b(15) || ax > 0.5, a: b(0), back: b(1), start: b(9), ax, ay, lx: Math.abs(gp.axes[2] || 0) > 0.2 ? gp.axes[2] : 0, ly: Math.abs(gp.axes[3] || 0) > 0.2 ? gp.axes[3] : 0 };
  for (const k of ['up', 'down', 'left', 'right', 'a']) if (s[k] && !padPrev[k]) taps.add(k);
  if (s.back && !padPrev.back && active >= 0) standUp();
  if ((s.a || s.start) && !padPrev.a && !padPrev.start && active < 0 && focused >= 0) { padPrev = s; taps.clear(); sitDown(focused); return s; }
  padPrev = s;
  return s;
}

function gameInput(gp) {
  const h = (k) => held.has(k) || touchHeld.has(k) || gp[k];
  return {
    up: h('up'), down: h('down'), left: h('left'), right: h('right'), a: h('a'),
    tap: { a: taps.has('a'), up: taps.has('up'), down: taps.has('down'), left: taps.has('left'), right: taps.has('right') },
  };
}

// ---------- walking + collisions ----------------------------------------------------------
const colliders = exhibits.flatMap(ex => [
  { x: ex.pos[0], z: ex.pos[2], r: ex.radius + 0.25 },
  { x: ex.lectern.x, z: ex.lectern.z, r: 0.35 },
]);
function walk(dt, gp) {
  let f = 0, s = 0;
  if (held.has('up')) f += 1; if (held.has('down')) f -= 1;
  if (held.has('right')) s += 1; if (held.has('left')) s -= 1;
  f -= stick.y + gp.ay; s += stick.x + gp.ax;
  player.yaw -= gp.lx * dt * 2.2; player.pitch = THREE.MathUtils.clamp(player.pitch - gp.ly * dt * 1.6, -1.2, 1.2);
  const len = Math.hypot(f, s);
  if (len > 1) { f /= len; s /= len; }
  const speed = 3.0;
  const sin = Math.sin(player.yaw), cos = Math.cos(player.yaw);
  player.pos.x += (-sin * f + cos * s) * speed * dt;
  player.pos.z += (-cos * f - sin * s) * speed * dt;
  const m = 0.35;
  player.pos.x = THREE.MathUtils.clamp(player.pos.x, -HALL.x + m, HALL.x - m);
  player.pos.z = THREE.MathUtils.clamp(player.pos.z, -HALL.z + m, HALL.z - m);
  for (const c of colliders) {
    const dx = player.pos.x - c.x, dz = player.pos.z - c.z, d = Math.hypot(dx, dz), r = c.r + 0.25;
    if (d < r && d > 1e-4) { player.pos.x = c.x + dx / d * r; player.pos.z = c.z + dz / d * r; }
  }
  applyWalkCamera();
  // which exhibit is the visitor facing?
  let best = -1, bestD = 3.2;
  const vx = -sin, vz = -cos;
  exhibits.forEach((ex, i) => {
    const dx = ex.pos[0] - player.pos.x, dz = ex.pos[2] - player.pos.z, d = Math.hypot(dx, dz);
    if (d < bestD && (dx * vx + dz * vz) / d > 0.55) { best = i; bestD = d; }
  });
  showFocus(best);
}

// ---------- main loop ----------------------------------------------------------------------
const timer = new THREE.Timer();
timer.connect(document);
let elapsed = 0;
function frame() {
  timer.update();
  const dt = Math.min(timer.getDelta(), 0.1);
  elapsed += dt;
  const gp = pollGamepad();
  const modal = plaqueEl.classList.contains('open');

  if (tween) stepTween(dt);
  else if (active < 0 && !modal) walk(dt, gp);

  exhibits.forEach((ex, i) => {
    const playing = i === active && !tween;
    ex.frameAcc += dt;
    // attract-mode machines tick at 30 fps to save work
    if (!playing && ex.frameAcc < 1 / 30) return;
    const step = playing ? dt : ex.frameAcc;
    ex.frameAcc = 0;
    ex.game.step(step, playing ? gameInput(gp) : null);
    ex.screen.userData.texture.needsUpdate = true;
    ex.screen.material.uniforms.time.value = elapsed;
  });
  taps.clear();
  composer.render(dt);
}
renderer.setAnimationLoop(frame);

addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
  composer.setSize(innerWidth, innerHeight);
  bloom.resolution.set(innerWidth * bloomScale, innerHeight * bloomScale);
  if (active >= 0 && !tween) { const p = playPose(active); camera.position.copy(p.pos); camera.quaternion.copy(p.quat); }
});

// ---------- start ----------------------------------------------------------------------------
const enter = $('#enter');
if (isTouch) $('#keys-desktop').innerHTML = '<span>🕹️</span><span>left stick to walk, drag to look</span><span>👆</span><span>tap a machine to play it</span><span>✕</span><span>"Stand up" to leave a machine</span>';
enter.disabled = false; enter.textContent = 'ENTER';
enter.addEventListener('click', () => {
  sfx.unlock();
  $('#intro').classList.add('hide');
  const hash = location.hash.slice(1);
  const i = exhibits.findIndex(e => e.id === hash);
  if (i >= 0) goTo(i);
  canvas.focus?.();
});
enter.focus();

// debugging / embedding hook (the WordPress plugin can drive the museum through this)
window.JATArcade = { exhibits, goTo, sitDown, standUp, camera, scene, renderer, get busy() { return !!tween; } };

// PWA: register the service worker when the page is served from its own origin
if ('serviceWorker' in navigator && window.top === window.self) {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}
