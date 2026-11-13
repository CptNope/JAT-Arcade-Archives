import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

import { EXHIBITS, NOTE, RECON_NOTE } from './exhibits.js';
import { BUILDERS, labelTexture, buildTapeDrives } from './machines.js';
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
import { Nimrod } from './games/nimrod.js';
import { BouncingBall } from './games/bouncingball.js';
import { StarPatrol } from './games/starpatrol.js';
import { Beast } from './games/beast.js';
import { Dungeon } from './games/dungeon.js';
import { Cavern } from './games/cavern.js';
import { PaperMachine } from './games/turochamp.js';
import { Draughts } from './games/draughts.js';
import { Pool } from './games/pool.js';
import { Sumer } from './games/sumer.js';
import { Chase } from './games/chase.js';
import { Conquest } from './games/empire.js';

const GAMES = { turochamp: PaperMachine, draughts: Draughts, pool: Pool, sumer: Sumer, chase: Chase, empire: Conquest, nimrod: Nimrod, bouncingball: BouncingBall, starpatrol: StarPatrol, beast: Beast, dungeon: Dungeon, cavern: Cavern, targetbeam: TargetBeam, bertie: Bertie, oxo: Oxo, tennis: Tennis, spacewar: Spacewar, volley: Volley, starsiege: StarSiege, gemrunner: GemRunner, serpent: Serpent, brickfall: Brickfall };

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
    if (wl.door === undefined) pieces.push([0, wl.len, h / 2, h, true]);
    else {
      const du = wl.u(wl.door), a = du - DOOR.w / 2, b = du + DOOR.w / 2;
      pieces.push([(-wl.len / 2 + a) / 2, a + wl.len / 2, h / 2, h, true]);
      pieces.push([(b + wl.len / 2) / 2, wl.len / 2 - b, h / 2, h, true]);
      pieces.push([du, DOOR.w, (DOOR.h + h) / 2, h - DOOR.h, false]);
    }
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
// Where the visitor may stand: each room shrunk by a margin, plus the doorway between them.
const WALKABLE = [
  { x0: -HALL.x + 0.35, x1: HALL.x - 0.35, z0: -HALL.z + 0.35, z1: HALL.z - 0.35 },
  { x0: WING2.x0 + 0.35, x1: WING2.x1 - 0.35, z0: WING2.z0 + 0.35, z1: WING2.z1 - 0.35 },
  { x0: HALL.x - 0.6, x1: HALL.x + 0.6, z0: -DOOR.w / 2 + 0.3, z1: DOOR.w / 2 - 0.3 },
  { x0: WING3.x0 + 0.35, x1: WING3.x1 - 0.35, z0: WING3.z0 + 0.35, z1: WING3.z1 - 0.35 },
  { x0: -HALL.x - 0.6, x1: -HALL.x + 0.6, z0: -DOOR.w / 2 + 0.3, z1: DOOR.w / 2 - 0.3 },
];
const walkable = (x, z) => WALKABLE.some(r => x >= r.x0 && x <= r.x1 && z >= r.z0 && z <= r.z1);

let tapeReels = [];
function buildHall() {
  buildRoom({ x0: -HALL.x, x1: HALL.x, z0: -HALL.z, z1: HALL.z, floor: new THREE.MeshStandardMaterial({ map: carpetTexture(), roughness: 0.95 }), doors: { east: 0, west: 0 } });
  // title + wing signs
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(7.2, 1.15),
    new THREE.MeshBasicMaterial({ map: labelTexture('JAT ARCADE ARCHIVES', { w: 1600, h: 256, bg: 'rgba(0,0,0,0)', glow: '#ff2bd6', fg: '#ffe14d', font: '900 150px "Arial Black", Impact, sans-serif' }), transparent: true, toneMapped: false }));
  sign.position.set(0, 3.05, -HALL.z + 0.03); scene.add(sign);
  wallSign('THE PIONEERS · 1947–1962', { glow: '#ffb347', fg: '#fff3d0', w: 6.4, x: 0, y: 3.05, z: HALL.z - 0.03, ry: Math.PI });
  wallSign('THE GOLDEN AGE · 1972–1989', { glow: '#00e5ff', fg: '#ffffff', w: 4.2, x: 0, y: 2.4, z: -HALL.z + 0.03, ry: 0 });
  wallSign('THE MAINFRAME ERA  →', { glow: '#7dff95', fg: '#ffffff', w: 3.2, x: HALL.x - 0.03, y: 3.2, z: 0, ry: -Math.PI / 2 });
  wallSign('←  EXPERIMENTS & PROTOTYPES', { glow: '#ffb347', fg: '#ffffff', w: 3.6, x: -HALL.x + 0.03, y: 3.2, z: 0, ry: Math.PI / 2 });

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
    const pl = new THREE.PointLight(0xffd8a0, 5, 10, 1.6); pl.position.set(x, HALL.h - 0.8, 0); scene.add(pl);
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
  for (const [x, c] of [[-10, 0xff2bd6], [0, 0x00e5ff], [10, 0x7a5cff], [18, 0x9fe8ff], [27, 0x7dff95]]) {
    const p = new THREE.PointLight(c, 6, 12, 1.6); p.position.set(x, 3.4, x > 14 ? 0 : 3); scene.add(p);
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
  const spot = new THREE.SpotLight(0xfff1dd, Math.abs(ex.pos[0]) > HALL.x ? 13 : 28, 9, 0.5, 0.65, 1.4); // the computer room is already bright
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
[...EXHIBITS.entries()].sort((a, b) => a[1].year - b[1].year).forEach(([i, ex]) => {
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
  for (const r of tapeReels) r.obj.rotation.z = Math.sin(elapsed * 0.3 + r.phase) > 0.2 ? r.obj.rotation.z + dt * r.speed * 3 : r.obj.rotation.z;
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
window.JATArcade = { exhibits, goTo, sitDown, standUp, camera, scene, renderer, player, get busy() { return !!tween; } };

// PWA: register the service worker when the page is served from its own origin
if ('serviceWorker' in navigator && window.top === window.self) {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}
