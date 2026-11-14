import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

import { EXHIBITS, NOTE, RECON_NOTE } from './exhibits.js';
import { BUILDERS, labelTexture, buildTapeDrives } from './machines.js';
import { Sfx } from './sfx.js';
import { GAMES } from './registry.js';
import { startFlat } from './flat.js';
import { initVisitor } from './visitor.js';
import { initInside } from './inside.js';
import { NO_INPUT } from './games/base.js';

const $ = (s) => document.querySelector(s);
const isTouch = matchMedia('(pointer: coarse)').matches;
if (isTouch) document.body.classList.add('is-touch');

// ---------- device profile + quality ----------------------------------------------------------
const lowPower = isTouch || (navigator.hardwareConcurrency || 8) <= 4 || (navigator.deviceMemory || 8) <= 4;
const store = {
  get(k, d) { try { return localStorage.getItem(k) ?? d; } catch { return d; } },
  set(k, v) { try { localStorage.setItem(k, v); } catch { /* storage blocked */ } },
};
let quality = store.get('jat-quality', 'auto'); // auto | high | low
const MAX_DPR = Math.min(window.devicePixelRatio || 1, lowPower ? 1.5 : 2);
let dprScale = quality === 'low' ? 0.6 : lowPower ? 0.85 : 1; // fraction of MAX_DPR

// ---------- renderer / scene ------------------------------------------------------------
const app = $('#app');
const renderer = new THREE.WebGLRenderer({ antialias: !lowPower, powerPreference: 'high-performance' }); // throws if WebGL fails: boot falls back to 2D
renderer.setPixelRatio(MAX_DPR * dprScale);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
app.appendChild(renderer.domElement);
const size = () => ({ w: Math.max(1, app.clientWidth || innerWidth), h: Math.max(1, app.clientHeight || innerHeight) });
renderer.setSize(size().w, size().h);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x07051a);
scene.fog = new THREE.Fog(0x07051a, 14, 34);
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
scene.environmentIntensity = 0.22;
pmrem.dispose();

const camera = new THREE.PerspectiveCamera(62, size().w / size().h, 0.03, 60);
const EYE = 1.6;

const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
const bloomScale = lowPower ? 0.3 : 0.5;
const bloom = new UnrealBloomPass(new THREE.Vector2(size().w * bloomScale, size().h * bloomScale), 0.55, 0.45, 0.82);
composer.addPass(bloom);
composer.addPass(new OutputPass());
bloom.enabled = quality !== 'low';

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

function tileTexture() {
  const c = document.createElement('canvas'); c.width = c.height = 256;
  const g = c.getContext('2d');
  g.fillStyle = '#4a4f57'; g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 600; i++) { g.fillStyle = `rgba(${Math.random() < 0.5 ? '255,255,255' : '0,0,0'},0.05)`; g.fillRect(Math.random() * 256, Math.random() * 256, 2, 2); }
  g.strokeStyle = '#2b2f35'; g.lineWidth = 6; g.strokeRect(0, 0, 256, 256);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8;
  return t;
}

function woodFloorTexture() {
  const c = document.createElement('canvas'); c.width = c.height = 256;
  const g = c.getContext('2d');
  for (let y = 0; y < 8; y++) for (let x = 0; x < 2; x++) {
    const shade = 90 + Math.random() * 40;
    g.fillStyle = `rgb(${shade},${shade * 0.62},${shade * 0.36})`; g.fillRect(x * 128 + (y % 2) * 64, y * 32, 128, 32);
    g.strokeStyle = 'rgba(0,0,0,0.35)'; g.strokeRect(x * 128 + (y % 2) * 64, y * 32, 128, 32);
  }
  for (let i = 0; i < 300; i++) { g.fillStyle = 'rgba(40,20,5,0.08)'; g.fillRect(Math.random() * 256, Math.random() * 256, 30, 1); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8;
  return t;
}
function shagTexture() {
  const c = document.createElement('canvas'); c.width = c.height = 256;
  const g = c.getContext('2d');
  g.fillStyle = '#a8501a'; g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 4000; i++) { g.fillStyle = ['#c0602a', '#8a3e12', '#d4782f', '#9a4a1a'][i % 4]; g.fillRect(Math.random() * 256, Math.random() * 256, 2, 3); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8;
  return t;
}
function chalkboardTexture() {
  const c = document.createElement('canvas'); c.width = 1200; c.height = 380;
  const g = c.getContext('2d');
  g.fillStyle = '#1f3327'; g.fillRect(0, 0, 1200, 380);
  g.strokeStyle = '#6b4a2b'; g.lineWidth = 16; g.strokeRect(8, 8, 1184, 364);
  g.fillStyle = 'rgba(235,240,230,0.85)'; g.strokeStyle = 'rgba(235,240,230,0.8)'; g.lineWidth = 3;
  g.font = '34px "Comic Sans MS", "Segoe Print", cursive';
  g.fillText('P = 1   N = 3   B = 3½   R = 5   Q = 10', 50, 70);
  g.fillText('nim-sum:  1 ⊕ 3 ⊕ 5 ⊕ 7 = 0', 50, 130);
  g.fillText('max  min  eval(position)', 50, 190);
  g.fillText('grain = feed + seed + store', 50, 250);
  g.fillText('if (caught) swap(hunter, runner)', 50, 310);
  // a little game tree
  const node = (x, y) => { g.beginPath(); g.arc(x, y, 10, 0, Math.PI * 2); g.stroke(); };
  node(900, 70); for (const [x, y] of [[820, 160], [900, 160], [980, 160]]) { g.beginPath(); g.moveTo(900, 80); g.lineTo(x, y - 10); g.stroke(); node(x, y); for (const dx of [-25, 25]) { g.beginPath(); g.moveTo(x, y + 10); g.lineTo(x + dx, y + 70); g.stroke(); node(x + dx, y + 80); } }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  return t;
}

const DOOR = { w: 2.2, h: 2.8 };
const neon = (color) => new THREE.MeshBasicMaterial({ color, toneMapped: false });

// A rectangular room with optional doorways. doors: { east: zCentre, west: zCentre, ... }
function buildRoom({ x0, x1, z0, z1, h = HALL.h, floor, wall = 0x15102e, ceil = 0x0b0820, trims = [0xff2bd6, 0x00e5ff, 0x7a5cff], doors = {} }) {
  const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2, W = x1 - x0, D = z1 - z0;
  const f = new THREE.Mesh(new THREE.PlaneGeometry(W, D), floor);
  f.rotation.x = -Math.PI / 2; f.position.set(cx, 0, cz); scene.add(f);
  const c = new THREE.Mesh(new THREE.PlaneGeometry(W, D), new THREE.MeshStandardMaterial({ color: ceil, roughness: 1 }));
  c.rotation.x = Math.PI / 2; c.position.set(cx, h, cz); scene.add(c);
  const wallMat = new THREE.MeshStandardMaterial({ color: wall, roughness: 0.9 });
  const walls = [ // u() maps a world coordinate along the wall to the plane's local x
    { len: W, pos: [cx, z0], ry: 0, door: doors.north, u: (v) => v - cx },
    { len: W, pos: [cx, z1], ry: Math.PI, door: doors.south, u: (v) => -(v - cx) },
    { len: D, pos: [x0, cz], ry: Math.PI / 2, door: doors.west, u: (v) => -(v - cz) },
    { len: D, pos: [x1, cz], ry: -Math.PI / 2, door: doors.east, u: (v) => v - cz },
  ];
  for (const wl of walls) {
    const pieces = []; // [uCentre, width, yCentre, height, touchesFloor]
    const doorsHere = (wl.door === undefined ? [] : [].concat(wl.door)).map(wl.u).sort((a, b) => a - b);
    let from = -wl.len / 2;
    for (const du of doorsHere) {
      const a = du - DOOR.w / 2;
      if (a > from) pieces.push([(from + a) / 2, a - from, h / 2, h, true]);
      pieces.push([du, DOOR.w, (DOOR.h + h) / 2, h - DOOR.h, false]);
      from = du + DOOR.w / 2;
    }
    if (from < wl.len / 2) pieces.push([(from + wl.len / 2) / 2, wl.len / 2 - from, h / 2, h, true]);
    const holder = new THREE.Group();
    holder.position.set(wl.pos[0], 0, wl.pos[1]);
    holder.rotation.y = wl.ry; scene.add(holder);
    for (const [u, w, y, ph, floorPiece] of pieces) {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(w, ph), wallMat);
      m.position.set(u, y, 0); holder.add(m);
      for (const [ty, col, th, needFloor] of [[h - 0.35, trims[0], 0.04, false], [h - 0.45, trims[1], 0.025, false], [0.06, trims[2], 0.03, true]]) {
        if (needFloor !== floorPiece && needFloor) continue;
        if (!needFloor && (ty < y - ph / 2 || ty > y + ph / 2)) continue;
        const t = new THREE.Mesh(new THREE.BoxGeometry(w, th, 0.02), neon(col));
        t.position.set(u, ty, 0.02); holder.add(t);
      }
    }
  }
}

function wallSign(text, { glow, fg, w, x, y, z, ry, h }) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h || w / 6.4),
    new THREE.MeshBasicMaterial({ map: labelTexture(text, { w: 1600, h: 250, bg: 'rgba(0,0,0,0)', glow, fg, font: '900 120px "Arial Black", Impact, sans-serif' }), transparent: true, toneMapped: false }));
  m.position.set(x, y, z); m.rotation.y = ry; scene.add(m);
}

const WING2 = { x0: HALL.x, x1: HALL.x + 16, z0: -HALL.z, z1: HALL.z };
const WING3 = { x0: -HALL.x - 16, x1: -HALL.x, z0: -HALL.z, z1: HALL.z };
const WING4 = { x0: -HALL.x, x1: -HALL.x + 16, z0: -HALL.z - 16, z1: -HALL.z };
const NORTH_DOOR_X = -7;
const WING5 = { x0: -HALL.x + 16, x1: -HALL.x + 32, z0: -HALL.z - 16, z1: -HALL.z };
const NORTH_DOOR2_X = 7;
const SOUTH_DOOR_X = 12.8;
const WING6 = { x0: SOUTH_DOOR_X - 8, x1: SOUTH_DOOR_X + 8, z0: HALL.z, z1: HALL.z + 16 };
// Where the visitor may stand: each room shrunk by a margin, plus the doorway between them.
const WALKABLE = [
  { x0: -HALL.x + 0.35, x1: HALL.x - 0.35, z0: -HALL.z + 0.35, z1: HALL.z - 0.35 },
  { x0: WING2.x0 + 0.35, x1: WING2.x1 - 0.35, z0: WING2.z0 + 0.35, z1: WING2.z1 - 0.35 },
  { x0: HALL.x - 0.6, x1: HALL.x + 0.6, z0: -DOOR.w / 2 + 0.3, z1: DOOR.w / 2 - 0.3 },
  { x0: WING3.x0 + 0.35, x1: WING3.x1 - 0.35, z0: WING3.z0 + 0.35, z1: WING3.z1 - 0.35 },
  { x0: -HALL.x - 0.6, x1: -HALL.x + 0.6, z0: -DOOR.w / 2 + 0.3, z1: DOOR.w / 2 - 0.3 },
  { x0: WING4.x0 + 0.35, x1: WING4.x1 - 0.35, z0: WING4.z0 + 0.35, z1: WING4.z1 - 0.35 },
  { x0: NORTH_DOOR_X - DOOR.w / 2 + 0.3, x1: NORTH_DOOR_X + DOOR.w / 2 - 0.3, z0: -HALL.z - 0.6, z1: -HALL.z + 0.6 },
  { x0: WING5.x0 + 0.35, x1: WING5.x1 - 0.35, z0: WING5.z0 + 0.35, z1: WING5.z1 - 0.35 },
  { x0: NORTH_DOOR2_X - DOOR.w / 2 + 0.3, x1: NORTH_DOOR2_X + DOOR.w / 2 - 0.3, z0: -HALL.z - 0.6, z1: -HALL.z + 0.6 },
  { x0: WING6.x0 + 0.35, x1: WING6.x1 - 0.35, z0: WING6.z0 + 0.35, z1: WING6.z1 - 0.35 },
  { x0: SOUTH_DOOR_X - DOOR.w / 2 + 0.3, x1: SOUTH_DOOR_X + DOOR.w / 2 - 0.3, z0: HALL.z - 0.6, z1: HALL.z + 0.6 },
];
const walkable = (x, z) => WALKABLE.some(r => x >= r.x0 && x <= r.x1 && z >= r.z0 && z <= r.z1);

let tapeReels = [];
function buildHall() {
  buildRoom({ x0: -HALL.x, x1: HALL.x, z0: -HALL.z, z1: HALL.z, floor: new THREE.MeshStandardMaterial({ map: carpetTexture(), roughness: 0.95 }), doors: { east: 0, west: 0, north: [NORTH_DOOR_X, NORTH_DOOR2_X], south: SOUTH_DOOR_X } });
  // title + wing signs
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(7.2, 1.15),
    new THREE.MeshBasicMaterial({ map: labelTexture('JAT ARCADE ARCHIVES', { w: 1600, h: 256, bg: 'rgba(0,0,0,0)', glow: '#ff2bd6', fg: '#ffe14d', font: '900 150px "Arial Black", Impact, sans-serif' }), transparent: true, toneMapped: false }));
  sign.position.set(0, 3.05, -HALL.z + 0.03); scene.add(sign);
  wallSign('THE PIONEERS · 1947–1962', { glow: '#ffb347', fg: '#fff3d0', w: 6.4, x: 0, y: 3.05, z: HALL.z - 0.03, ry: Math.PI });
  wallSign('THE GOLDEN AGE · 1972–1989', { glow: '#00e5ff', fg: '#ffffff', w: 4.2, x: 0, y: 2.4, z: -HALL.z + 0.03, ry: 0 });
  wallSign('THE MAINFRAME ERA  →', { glow: '#7dff95', fg: '#ffffff', w: 3.2, x: HALL.x - 0.03, y: 3.2, z: 0, ry: -Math.PI / 2 });
  wallSign('THE ARCADE BOOM  ↑', { glow: '#ff5252', fg: '#ffffff', w: 3.0, x: NORTH_DOOR_X, y: 3.25, z: -HALL.z + 0.03, ry: 0 });
  wallSign('←  EXPERIMENTS & PROTOTYPES', { glow: '#ffb347', fg: '#ffffff', w: 3.6, x: -HALL.x + 0.03, y: 3.2, z: 0, ry: Math.PI / 2 });

  // ---- wing 4: the arcade boom (a dark arcade with neon) ----
  const arcadeCarpet = carpetTexture(); arcadeCarpet.repeat.set(5, 5);
  buildRoom({ ...WING4, floor: new THREE.MeshStandardMaterial({ map: arcadeCarpet, roughness: 0.95, color: 0xb0b0ff }), wall: 0x0c0a18, ceil: 0x07060e, trims: [0xff5252, 0xffeb3b, 0x4cc9f0], doors: { south: NORTH_DOOR_X } });
  wallSign('THE ARCADE BOOM · 1976–1981', { glow: '#ff5252', fg: '#ffeb3b', w: 6.2, x: (WING4.x0 + WING4.x1) / 2, y: 3.2, z: WING4.z0 + 0.03, ry: 0 });
  wallSign('↓  MAIN HALL', { glow: '#ff2bd6', fg: '#ffffff', w: 2.2, x: NORTH_DOOR_X, y: 3.25, z: WING4.z1 - 0.03, ry: Math.PI });
  wallSign('INSERT COIN', { glow: '#69f0ae', fg: '#ffffff', w: 2.6, x: WING4.x0 + 0.03, y: 3.1, z: -19, ry: Math.PI / 2 });
  wallSign('HIGH SCORES', { glow: '#ffeb3b', fg: '#ffffff', w: 2.6, x: WING4.x1 - 0.03, y: 3.1, z: -19, ry: -Math.PI / 2 });

  // ---- wing 5: home computers & consoles (a 1980s den: wood panelling, orange carpet, a sofa) ----
  wallSign('HOME COMPUTERS  ↑', { glow: '#ffb347', fg: '#ffffff', w: 3.2, x: NORTH_DOOR2_X, y: 3.25, z: -HALL.z + 0.03, ry: 0 });
  const shag = shagTexture(); shag.repeat.set(6, 6);
  buildRoom({ ...WING5, floor: new THREE.MeshStandardMaterial({ map: shag, roughness: 1 }), wall: 0x4a3018, ceil: 0x2a1e14, trims: [0xffb347, 0xff7a1a, 0x8a5a2b], doors: { south: NORTH_DOOR2_X } });
  wallSign('HOME COMPUTERS & CONSOLES · 1980–1984', { glow: '#ffb347', fg: '#fff3d0', w: 6.6, x: (WING5.x0 + WING5.x1) / 2, y: 3.25, z: WING5.z0 + 0.03, ry: 0 });
  wallSign('↓  MAIN HALL', { glow: '#ff2bd6', fg: '#ffffff', w: 2.2, x: NORTH_DOOR2_X, y: 3.25, z: WING5.z1 - 0.03, ry: Math.PI });
  const sofa = new THREE.Group(); sofa.position.set(9.5, 0, -14.5); scene.add(sofa);
  const fabric = new THREE.MeshStandardMaterial({ color: 0x8a5a2b, roughness: 0.95 });
  for (const [w, h, d, x, y, z] of [[2.2, 0.42, 0.9, 0, 0.21, 0], [2.2, 0.5, 0.2, 0, 0.6, 0.35], [0.2, 0.3, 0.9, -1.0, 0.55, 0], [0.2, 0.3, 0.9, 1.0, 0.55, 0]]) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), fabric); m.position.set(x, y, z); sofa.add(m);
  }

  // ---- wing 6: the 8-bit console era (a late-80s bedroom: blue carpet, posters, a bean bag) ----
  wallSign('8-BIT CONSOLES  ↓', { glow: '#3b6bff', fg: '#ffffff', w: 3.0, x: SOUTH_DOOR_X, y: 3.25, z: HALL.z - 0.03, ry: Math.PI });
  const blueCarpet = carpetTexture(); blueCarpet.repeat.set(5, 5);
  buildRoom({ ...WING6, floor: new THREE.MeshStandardMaterial({ map: blueCarpet, roughness: 0.95, color: 0x8fb0ff }), wall: 0x26306a, ceil: 0x121638, trims: [0xff3b3b, 0xffffff, 0x3b6bff], doors: { north: SOUTH_DOOR_X } });
  wallSign('THE 8-BIT CONSOLE ERA · 1983–1989', { glow: '#ff3b3b', fg: '#ffffff', w: 6.4, x: SOUTH_DOOR_X, y: 3.25, z: WING6.z1 - 0.03, ry: Math.PI });
  wallSign('↑  MAIN HALL', { glow: '#ff2bd6', fg: '#ffffff', w: 2.2, x: SOUTH_DOOR_X, y: 3.25, z: WING6.z0 + 0.03, ry: 0 });
  // posters: original designs, plain shapes and words
  const poster = (text, bg, fg, x, z, ry) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 1.25), new THREE.MeshStandardMaterial({ map: labelTexture(text, { w: 360, h: 500, bg, fg, glow: fg, font: '900 64px "Arial Black", Impact, sans-serif' }), roughness: 0.8 }));
    m.position.set(x, 1.9, z); m.rotation.y = ry; scene.add(m);
  };
  poster('1UP', '#ff3b3b', '#ffffff', WING6.x0 + 0.03, 13.8, Math.PI / 2);
  poster('PRESS START', '#2a5ad8', '#ffe14d', WING6.x1 - 0.03, 13.8, -Math.PI / 2);
  poster('GAME OVER?', '#111111', '#7cff6b', 12.8, WING6.z1 - 0.03, Math.PI);
  // a bean bag and a shelf of cartridge boxes
  const bag = new THREE.Mesh(new THREE.SphereGeometry(0.55, 24, 16), new THREE.MeshStandardMaterial({ color: 0xd62828, roughness: 0.9 }));
  bag.scale.set(1, 0.55, 1); bag.position.set(12.8, 0.3, 15.5); scene.add(bag);
  const shelf = new THREE.Group(); shelf.position.set(12.8, 0, 17.2); scene.add(shelf);
  const plank = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.06, 0.3), new THREE.MeshStandardMaterial({ map: woodFloorTexture(), roughness: 0.6 }));
  plank.position.set(0, 0.45, 0); shelf.add(plank);
  const boxCols = [0xff3b3b, 0xffe14d, 0x2a5ad8, 0x7cff6b, 0xb46cff, 0xff8c1a, 0xffffff, 0x2ac0a0];
  boxCols.forEach((col, i) => { const b = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.2, 0.18), new THREE.MeshStandardMaterial({ color: col, roughness: 0.6 })); b.position.set(-0.6 + i * 0.165, 0.58, 0); b.rotation.z = i === 7 ? 0.25 : 0; shelf.add(b); });
  for (const x of [-0.65, 0.65]) { const side = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.45, 0.3), new THREE.MeshStandardMaterial({ color: 0x5a3a20 })); side.position.set(x, 0.225, 0); shelf.add(side); }

  // ---- wing 3: experiments & prototypes (a wood-panelled research lab) ----
  const parquet = woodFloorTexture(); parquet.repeat.set(8, 7);
  buildRoom({ ...WING3, floor: new THREE.MeshStandardMaterial({ map: parquet, roughness: 0.6 }), wall: 0x1d2a22, ceil: 0x10140f, trims: [0xffb347, 0xffe14d, 0x8a5a2b], doors: { east: 0 } });
  wallSign('EXPERIMENTS & PROTOTYPES · 1948–1977', { glow: '#ffb347', fg: '#fff3d0', w: 6.4, x: WING3.x0 + 0.03, y: 3.3, z: 0, ry: Math.PI / 2 });
  wallSign('MAIN HALL  →', { glow: '#ff2bd6', fg: '#ffffff', w: 2.4, x: WING3.x1 - 0.03, y: 3.2, z: 0, ry: -Math.PI / 2 });
  const chalk = new THREE.Mesh(new THREE.PlaneGeometry(6, 1.9), new THREE.MeshStandardMaterial({ map: chalkboardTexture(), roughness: 0.9 }));
  chalk.position.set(WING3.x0 + 0.04, 1.75, 0); chalk.rotation.y = Math.PI / 2; scene.add(chalk);
  for (const x of [-17.5, -22.5, -27.5]) {
    const lamp = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.5, 0.25, 20, 1, true), new THREE.MeshStandardMaterial({ color: 0x2b3a2f, side: THREE.DoubleSide, roughness: 0.5 }));
    lamp.position.set(x, HALL.h - 0.6, 0); scene.add(lamp);
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.09, 12, 8), neon(0xffe7b0)); bulb.position.set(x, HALL.h - 0.68, 0); scene.add(bulb);
  }

  // ---- wing 2: the mainframe era (a cooler computer room with a raised tile floor) ----
  const tiles = tileTexture(); tiles.repeat.set((WING2.x1 - WING2.x0) / 0.6, (WING2.z1 - WING2.z0) / 0.6);
  buildRoom({ ...WING2, floor: new THREE.MeshStandardMaterial({ map: tiles, roughness: 0.7, metalness: 0.1 }), wall: 0x18222c, ceil: 0x0c1218, trims: [0x7dff95, 0x5ce1ff, 0x2f6b7a], doors: { west: 0 } });
  wallSign('THE MAINFRAME ERA · 1951–1976', { glow: '#7dff95', fg: '#e8ffe8', w: 6.0, x: WING2.x1 - 0.03, y: 3.1, z: 0, ry: -Math.PI / 2 });
  wallSign('←  MAIN HALL', { glow: '#ff2bd6', fg: '#ffffff', w: 2.4, x: WING2.x0 + 0.03, y: 3.2, z: 0, ry: Math.PI / 2 });
  const tapes = buildTapeDrives(5);
  tapes.group.position.set(WING2.x1 - 0.35, 0, 0); tapes.group.rotation.y = -Math.PI / 2; scene.add(tapes.group);
  tapeReels = tapes.reels;
  // ceiling light panels
  for (const x of [17.5, 22.5, 27.5]) for (const z of [-3, 3]) {
    const p = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 0.5), neon(0xdff6ff)); p.rotation.x = Math.PI / 2; p.position.set(x, HALL.h - 0.01, z); scene.add(p);
  }

  scene.add(new THREE.HemisphereLight(0x8a7dff, 0x200c2a, 0.55));
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


  built.group.traverse(o => { if (o.isMesh) { o.userData.exhibit = exhibits.length; clickables.push(o); } });
  board.userData.exhibit = exhibits.length; board.userData.plaque = true; clickables.push(board);

  const lectWorld = new THREE.Vector3(); lect.getWorldPosition(lectWorld);
  built.screen.geometry.computeBoundingSphere();
  exhibits.push({ ...ex, game, screen: built.screen, radius: built.radius, model: built.group, root, lectern: lectWorld, frameAcc: 0, room: roomOf(ex.pos[0], ex.pos[2]) });
}

// ---------- lights: a fixed pool, re-aimed at whichever room the visitor is in ----------------
// A constant light count keeps shaders from recompiling, and only one room's lights are ever lit.
const ROOM_POINTS = {
  hall: [[-10, 3.4, 3, 0xff2bd6, 6], [0, 3.4, 3, 0x00e5ff, 6], [10, 3.4, 3, 0x7a5cff, 6]],
  mainframe: [[18, 3.4, 0, 0x9fe8ff, 6], [27, 3.4, 0, 0x7dff95, 6], [22.5, 3.4, 0, 0xdff6ff, 2]],
  experiments: [[-17.5, HALL.h - 0.8, 0, 0xffd8a0, 5], [-22.5, HALL.h - 0.8, 0, 0xffd8a0, 5], [-27.5, HALL.h - 0.8, 0, 0xffd8a0, 5]],
  arcade: [[-10, 3.4, -12, 0xff5252, 6], [-4, 3.4, -18, 0x4cc9f0, 6], [-6.5, 3.4, -15, 0xffeb3b, 3]],
  home: [[5, 3.4, -12, 0xffd8a0, 6], [12, 3.4, -18, 0xffb070, 6], [9.5, 3.4, -15, 0xffe7c0, 3]],
  console: [[8.5, 3.4, 13, 0xffa0a0, 7], [17, 3.4, 13, 0xa8c0ff, 7], [12.8, 3.4, 19, 0xffffff, 6]],
};
const SPOT_POOL = Math.max(...Object.keys(ROOM_POINTS).map(r => exhibits.filter(e => e.room === r).length));
const spots = Array.from({ length: SPOT_POOL }, () => { const sp = new THREE.SpotLight(0xfff1dd, 0, 9, 0.5, 0.65, 1.4); scene.add(sp, sp.target); return sp; });
const points = Array.from({ length: 3 }, () => { const p = new THREE.PointLight(0xffffff, 0, 12, 1.6); scene.add(p); return p; });
let litRoom = null;
function lightRoom(room) {
  if (room === litRoom) return; litRoom = room;
  const list = exhibits.filter(e => e.room === room);
  spots.forEach((sp, k) => {
    const ex = list[k];
    if (!ex) { sp.intensity = 0; return; }
    sp.intensity = room === 'hall' ? 28 : 13;
    sp.position.set(ex.pos[0] + Math.sin(ex.rot) * 1.6, HALL.h - 0.1, ex.pos[2] + Math.cos(ex.rot) * 1.6);
    sp.target.position.set(ex.pos[0], 0.8, ex.pos[2]); sp.target.updateMatrixWorld();
  });
  points.forEach((p, k) => { const [x, y, z, c, i] = ROOM_POINTS[room][k]; p.position.set(x, y, z); p.color.set(c); p.intensity = i; });
}
function roomOf(x, z = 0) { return z > HALL.z ? 'console' : z < -HALL.z ? (x > WING4.x1 ? 'home' : 'arcade') : x > HALL.x ? 'mainframe' : x < -HALL.x ? 'experiments' : 'hall'; }

// ---------- UI --------------------------------------------------------------------------------
const focusEl = $('#focus');
let focused = -1;
let active = -1;          // index of the exhibit being played
let tween = null;         // camera transition
const walkPose = { pos: new THREE.Vector3(), quat: new THREE.Quaternion() };

// high scores, passport, machine of the day and the guided tour (shared with 2D mode)
const idxOf = (ex) => exhibits.findIndex(e => e.id === ex.id);
const arrived = () => new Promise((res) => { const t = setInterval(() => { if (!tween) { clearInterval(t); res(); } }, 100); });
const vbar = document.createElement('div'); vbar.style.display = 'contents'; $('#top').insertBefore(vbar, $('#sound'));
const visitor = initVisitor({
  sfx, toolbar: vbar,
  host: {
    async go(ex) { const i = idxOf(ex); if (i < 0) return; closePlaque(); toggleMenu(false); if (active >= 0) standUp(true); goTo(i); await arrived(); },
    async play(ex) { const i = idxOf(ex); if (i < 0) return; await arrived(); sitDown(i); },
    isPlaying: () => active >= 0,
    onScoresChanged: () => { const f = focused; focused = -2; showFocus(f); },
  },
});

const menu = $('#menu');
[...EXHIBITS.entries()].sort((a, b) => a[1].year - b[1].year).forEach(([i, ex]) => {
  const b = document.createElement('button');
  b.innerHTML = `<span class="yr"></span><span><strong></strong><small></small></span>`;
  b.querySelector('.yr').textContent = ex.year;
  b.querySelector('strong').textContent = ex.title;
  b.querySelector('small').textContent = ex.short;
  b.addEventListener('click', () => { goTo(i); toggleMenu(false); });
  visitor.markItem(b, ex);
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
  const line = focusEl.querySelector('.v-board-line'); line.textContent = '';
  visitor.boardLine(ex).then((t) => { if (focused === i) line.textContent = t; });
  focusEl.classList.add('show');
}
$('#playBtn').addEventListener('click', () => focused >= 0 && sitDown(focused));
$('#insideBtn').addEventListener('click', () => focused >= 0 && lookInside(focused));

// ---- inside the machine: pull the model apart and explain the hardware
let exploded = -1, explodeT = 0, explodeTarget = 0;
const inside = initInside({ onClose: () => { explodeTarget = 0; frameForPanel(false); } });
// shift the 3D view so the machine sits beside the panel (desktop) or above it (phones)
function frameForPanel(on) {
  const { w, h } = size();
  if (!on) { camera.clearViewOffset(); return; }
  if (w > 700) camera.setViewOffset(w, h, Math.min(200, w * 0.16), 0, w, h);
  else camera.setViewOffset(w, h, 0, h * 0.22, w, h);
}
function lookInside(i) {
  if (active >= 0) return;
  if (exploded >= 0 && exploded !== i) resetExplode(exploded);
  exploded = i; explodeTarget = 1;
  const parts = exhibits[i].model.children;
  if (!exhibits[i].parts) {
    const box = new THREE.Box3().setFromObject(exhibits[i].model), centre = box.getCenter(new THREE.Vector3());
    exhibits[i].model.worldToLocal(centre);
    exhibits[i].parts = parts.map(o => {
      const b = new THREE.Box3().setFromObject(o), c = exhibits[i].model.worldToLocal(b.getCenter(new THREE.Vector3()));
      const dir = c.sub(centre); dir.y *= 0.6; if (dir.lengthSq() < 1e-4) dir.set(0, 1, 0);
      return { o, base: o.position.clone(), dir: dir.normalize().multiplyScalar(0.3 + Math.min(0.6, b.getSize(new THREE.Vector3()).length() * 0.3)) };
    });
  }
  inside.open(exhibits[i]); visitor.passport.readPlaque(exhibits[i].id); frameForPanel(true);
}
function resetExplode(i) { for (const p of exhibits[i].parts || []) p.o.position.copy(p.base); }
function stepExplode(dt) {
  if (exploded < 0) return;
  explodeT += (explodeTarget - explodeT) * Math.min(1, dt * 7);
  const e = explodeT * explodeT * (3 - 2 * explodeT);
  for (const p of exhibits[exploded].parts) p.o.position.copy(p.base).addScaledVector(p.dir, e);
  if (explodeTarget === 0 && explodeT < 0.002) { resetExplode(exploded); exploded = -1; explodeT = 0; }
  // walking away closes the view
  if (explodeTarget === 1 && camera.position.distanceTo(new THREE.Vector3(exhibits[exploded].pos[0], EYE, exhibits[exploded].pos[2])) > 7) inside.close();
}
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
  visitor.passport.readPlaque(ex.id);
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
  history.replaceState(null, '', location.pathname + location.search + '#' + ex.id); // absolute: the WordPress embed sets a <base>
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
  inside.close();
  sfx.unlock();
  closePlaque(); toggleMenu(false);
  walkPose.pos.copy(player.pos);
  walkPose.quat.copy(camera.quaternion);
  active = i;
  document.body.classList.add('playing');
  $('#playHelp').textContent = exhibits[i].play + '  ·  Esc to stand up';
  showFocus(-1); settings.hidden = true;
  startTween(playPose(i), () => { exhibits[i].game.start(); if (Math.min(innerWidth, innerHeight) < 520) setZoom(true); });
}
function standUp(instant = false) {
  if (active < 0) return;
  exhibits[active].game.attract();
  active = -1; setZoom(false);
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
  if ((s.a || s.start) && !padPrev.a && !padPrev.start && active < 0 && focused >= 0 && !visitor.busy) { padPrev = s; taps.clear(); sitDown(focused); return s; }
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
]).concat([
  { x: 9.5, z: -14.5, r: 1.1 },   // the sofa in the home wing
  { x: 12.8, z: 15.5, r: 0.6 },   // bean bag
  { x: 12.8, z: 17.2, r: 0.75 },  // cartridge shelf
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
  const nx = player.pos.x + (-sin * f + cos * s) * speed * dt;
  const nz = player.pos.z + (-cos * f - sin * s) * speed * dt;
  // slide along walls: try each axis on its own
  if (walkable(nx, player.pos.z)) player.pos.x = nx;
  if (walkable(player.pos.x, nz)) player.pos.z = nz;
  for (const c of colliders) {
    const dx = player.pos.x - c.x, dz = player.pos.z - c.z, d = Math.hypot(dx, dz), r = c.r + 0.25;
    if (d < r && d > 1e-4) {
      const px = c.x + dx / d * r, pz = c.z + dz / d * r;
      if (walkable(px, pz)) { player.pos.x = px; player.pos.z = pz; }
    }
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
const frustum = new THREE.Frustum(), projView = new THREE.Matrix4(), sphere = new THREE.Sphere();
const zoomEl = $('#zoom'), zoomCtx = zoomEl.getContext('2d');
let zoomOn = false;

// adaptive quality: watch the frame time and trade resolution (then bloom) for smoothness
const perf = { acc: 0, frames: 0, good: 0 };
function adapt(dt) {
  if (quality !== 'auto') return;
  perf.acc += dt; perf.frames++;
  if (perf.acc < 1) return;
  const avg = perf.acc / perf.frames; perf.acc = 0; perf.frames = 0;
  if (avg > 1 / 42 && dprScale > 0.5) { setScale(dprScale * 0.85); perf.good = 0; }
  else if (avg > 1 / 42 && bloom.enabled) { bloom.enabled = false; perf.good = 0; }
  else if (avg < 1 / 57) { if (++perf.good >= 3 && dprScale < 1) { setScale(Math.min(1, dprScale * 1.1)); perf.good = 0; } }
}
function setScale(s) {
  dprScale = s;
  renderer.setPixelRatio(MAX_DPR * dprScale);
  composer.setPixelRatio(MAX_DPR * dprScale);
}
function setQuality(q) {
  quality = q; store.set('jat-quality', q);
  if (q === 'high') { setScale(1); bloom.enabled = true; }
  if (q === 'low') { setScale(0.6); bloom.enabled = false; }
  if (q === 'auto') { setScale(lowPower ? 0.85 : 1); bloom.enabled = true; }
  document.querySelectorAll('#settings [data-q]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.q === q)));
}

function frame() {
  timer.update();
  const dt = Math.min(timer.getDelta(), 0.1);
  elapsed += dt;
  const gp = pollGamepad();
  const modal = plaqueEl.classList.contains('open');

  stepExplode(dt);
  if (tween) stepTween(dt);
  else if (active < 0 && !modal && !visitor.busy) walk(dt, gp);
  const camRoom = roomOf(camera.position.x, camera.position.z);
  lightRoom(camRoom);

  // only machines the visitor can see run their attract demos and upload new frames
  camera.updateMatrixWorld();
  projView.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
  frustum.setFromProjectionMatrix(projView);
  exhibits.forEach((ex, i) => {
    const playing = i === active && !tween;
    ex.frameAcc += dt;
    if (!playing) {
      if (ex.frameAcc < 1 / 30) return;
      sphere.copy(ex.screen.geometry.boundingSphere).applyMatrix4(ex.screen.matrixWorld);
      const d2 = sphere.center.distanceToSquared(camera.position);
      // the frustum test can't see walls, so also require the same room (or close by, e.g. through a doorway)
      const near = d2 < 26 * 26 && (ex.room === camRoom || d2 < 9 * 9);
      if (!near || !frustum.intersectsSphere(sphere)) { ex.frameAcc = Math.min(ex.frameAcc, 0.2); return; }
    }
    const step = playing ? dt : ex.frameAcc;
    ex.frameAcc = 0;
    ex.game.step(step, playing ? (visitor.busy ? NO_INPUT : gameInput(gp)) : null);
    ex.screen.userData.texture.needsUpdate = true;
    ex.screen.material.uniforms.time.value = elapsed;
  });
  for (const r of tapeReels) r.obj.rotation.z = Math.sin(elapsed * 0.3 + r.phase) > 0.2 ? r.obj.rotation.z + dt * r.speed * 3 : r.obj.rotation.z;
  taps.clear();
  if (zoomOn && active >= 0) drawZoom(); // the 3D view is hidden behind the zoomed game, so skip rendering it
  else composer.render(dt);
  adapt(dt);
}

// ---- zoom: the game fills the screen while playing (crisp pixels, whole-number scale when it fits)
function drawZoom() {
  const g = exhibits[active].game;
  const r = zoomEl.getBoundingClientRect();
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  let s = Math.min(r.width / g.w, r.height / g.h); if (s >= 2) s = Math.floor(s);
  const w = Math.floor(g.w * s * dpr), h = Math.floor(g.h * s * dpr);
  if (zoomEl.width !== Math.floor(r.width * dpr) || zoomEl.height !== Math.floor(r.height * dpr)) { zoomEl.width = Math.floor(r.width * dpr); zoomEl.height = Math.floor(r.height * dpr); }
  zoomCtx.imageSmoothingEnabled = false;
  zoomCtx.fillStyle = '#000'; zoomCtx.fillRect(0, 0, zoomEl.width, zoomEl.height);
  zoomCtx.drawImage(g.canvas, Math.floor((zoomEl.width - w) / 2), Math.floor((zoomEl.height - h) / 2), w, h);
}
function setZoom(on) {
  zoomOn = on; document.body.classList.toggle('zoomed', on);
  $('#zoomBtn').setAttribute('aria-pressed', String(on));
  $('#zoomBtn').textContent = on ? '3D view' : 'Zoom';
}
$('#zoomBtn').addEventListener('click', () => setZoom(!zoomOn));
zoomEl.addEventListener('pointerdown', () => taps.add('a'));

// pause rendering in hidden tabs (saves battery); resume when visible
let running = true;
function setRunning(on) { if (on === running) return; running = on; renderer.setAnimationLoop(on ? frame : null); }
renderer.setAnimationLoop(frame);
document.addEventListener('visibilitychange', () => { setRunning(!document.hidden); if (document.hidden) releaseAll(); });

// if the GPU drops the context, switch to 2D instead of showing a frozen frame
canvas.addEventListener('webglcontextlost', (e) => {
  e.preventDefault(); setRunning(false); app.hidden = true; visitor.destroy();
  document.body.classList.remove('playing', 'zoomed');
  for (const el of ['#top', '#menu', '#focus', '#playbar', '#stick', '#pad', '#settings']) $(el)?.remove();
  startFlat({ reason: 'context-lost', sfx });
});

// resize to the container (works inside an embed, on rotation and as mobile toolbars come and go)
function onResize() {
  const { w, h } = size();
  camera.aspect = w / h; if (inside?.isOpen) frameForPanel(true); camera.updateProjectionMatrix();
  renderer.setSize(w, h); composer.setSize(w, h);
  bloom.resolution.set(w * bloomScale, h * bloomScale);
  if (active >= 0 && !tween) { const p = playPose(active); camera.position.copy(p.pos); camera.quaternion.copy(p.quat); }
}
new ResizeObserver(onResize).observe(app);
window.visualViewport?.addEventListener('resize', onResize);

// stop the browser from zooming or scrolling the page during play
for (const el of [canvas, $('#stick'), $('#pad'), zoomEl]) el.addEventListener('contextmenu', (e) => e.preventDefault());
document.addEventListener('gesturestart', (e) => e.preventDefault());
document.addEventListener('dblclick', (e) => { if (e.target === canvas || e.target.closest('#pad')) e.preventDefault(); });

// ---- settings: quality and 2D mode
const settings = $('#settings');
$('#settingsBtn').addEventListener('click', () => {
  const open = settings.hidden; settings.hidden = !open; $('#settingsBtn').setAttribute('aria-expanded', String(open)); toggleMenu(false);
});
settings.querySelectorAll('[data-q]').forEach(b => b.addEventListener('click', () => setQuality(b.dataset.q)));
$('#flatBtn').addEventListener('click', () => { try { sessionStorage.setItem('jat-flat', '1'); } catch { /* ignore */ } location.reload(); });
setQuality(quality);

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
window.JATArcade = { mode: '3d', visitor, inside, lookInside, exhibits, goTo, sitDown, standUp, camera, scene, renderer, player, setQuality, setZoom, get busy() { return !!tween; }, get dprScale() { return dprScale; } };

// PWA: register the service worker when the page is served from its own origin
if ('serviceWorker' in navigator && window.top === window.self && !window.JAT_ARCADE_CONFIG) {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}
