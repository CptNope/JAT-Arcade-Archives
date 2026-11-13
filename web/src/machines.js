// Procedural, era-style machine models. These are original designs (no real product is replicated
// and no logos are used); each one evokes a period of game hardware.
// Every builder returns { group, screen, radius } — `screen` is the mesh the player sits in front of.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { createScreen } from './crt.js';

const std = (color, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.6, metalness: 0.05, ...o });

function add(parent, geo, mat, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z);
  parent.add(m);
  return m;
}
const box = (w, h, d) => new THREE.BoxGeometry(w, h, d);
const rbox = (w, h, d, r) => new RoundedBoxGeometry(w, h, d, 3, r);
const cyl = (rt, rb, h, s = 20) => new THREE.CylinderGeometry(rt, rb, h, s);

// ---------- canvas textures --------------------------------------------------------
function canvasTex(w, h, paint, { srgb = true } = {}) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  paint(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

export function woodTexture(base = '#6b3f1f') {
  return canvasTex(512, 512, (g, w, h) => {
    g.fillStyle = base; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 140; i++) {
      const y = Math.random() * h;
      g.strokeStyle = `rgba(${30 + Math.random() * 30},${15 + Math.random() * 15},5,${0.15 + Math.random() * 0.25})`;
      g.lineWidth = 1 + Math.random() * 3;
      g.beginPath(); g.moveTo(0, y);
      for (let x = 0; x <= w; x += 32) g.lineTo(x, y + Math.sin(x * 0.01 + i) * 6);
      g.stroke();
    }
  });
}

export function labelTexture(text, { w = 512, h = 160, bg = '#000', fg = '#fff', glow = '#ff2bd6', font = '900 92px "Arial Black", Impact, sans-serif' } = {}) {
  return canvasTex(w, h, (g) => {
    g.fillStyle = bg; g.fillRect(0, 0, w, h);
    const grad = g.createLinearGradient(0, 0, w, 0);
    grad.addColorStop(0, glow); grad.addColorStop(1, fg);
    // shrink the font until the text fits with a margin
    let f = font, px = parseInt(/(\d+)px/.exec(font)[1], 10);
    g.font = f;
    while (g.measureText(text).width > w * 0.9 && px > 10) { px -= 4; f = font.replace(/\d+px/, px + 'px'); g.font = f; }
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.shadowColor = glow; g.shadowBlur = 24;
    g.fillStyle = grad; g.fillText(text, w / 2, h / 2 + 4);
    g.shadowBlur = 0; g.lineWidth = 3; g.strokeStyle = '#fff'; g.strokeText(text, w / 2, h / 2 + 4);
  });
}

function sideArtTexture() {
  return canvasTex(512, 1024, (g, w, h) => {
    g.fillStyle = '#0d0b2b'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 90; i++) { g.fillStyle = `rgba(255,255,255,${Math.random() * 0.7})`; g.fillRect(Math.random() * w, Math.random() * h, 2, 2); }
    const stripes = ['#ff2bd6', '#ff8a00', '#ffe14d'];
    stripes.forEach((c, i) => {
      g.fillStyle = c; g.beginPath();
      g.moveTo(0, 620 + i * 46); g.lineTo(w, 360 + i * 46); g.lineTo(w, 386 + i * 46); g.lineTo(0, 646 + i * 46); g.fill();
    });
    // a little original planet
    g.fillStyle = '#5ce1ff'; g.beginPath(); g.arc(330, 230, 70, 0, Math.PI * 2); g.fill();
    g.strokeStyle = '#ffe14d'; g.lineWidth = 8; g.beginPath(); g.ellipse(330, 230, 120, 26, -0.3, 0, Math.PI * 2); g.stroke();
  });
}

function grilleTexture() {
  return canvasTex(128, 128, (g, w, h) => {
    g.fillStyle = '#2a2420'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#5a5048'; for (let y = 4; y < h; y += 8) g.fillRect(0, y, w, 3);
  });
}

// ---------- machines -----------------------------------------------------------------

// 1972-style wood-grain TV with a tabletop game console and two paddle controllers.
export function buildTVConsole(game) {
  const g = new THREE.Group();
  const wood = std(0xffffff, { map: woodTexture('#7a4a24'), roughness: 0.55 });
  const metal = std(0xb8b8b8, { metalness: 0.8, roughness: 0.3 });
  const dark = std(0x18181a, { roughness: 0.4 });

  // legs
  for (const [x, z] of [[-0.42, -0.22], [0.42, -0.22], [-0.42, 0.22], [0.42, 0.22]]) {
    const leg = add(g, cyl(0.018, 0.012, 0.42), metal, x, 0.21, z);
    leg.rotation.z = x * 0.25; leg.rotation.x = -z * 0.25;
  }
  add(g, rbox(1.0, 0.78, 0.62, 0.04), wood, 0, 0.8, 0);
  add(g, rbox(0.68, 0.56, 0.06, 0.05), std(0x8c8c88, { roughness: 0.35, metalness: 0.4 }), -0.12, 0.82, 0.3);
  const screen = createScreen(game, 0.56, { curve: 0.16 });
  screen.position.set(-0.12, 0.82, 0.335);
  g.add(screen);
  // control strip: knobs + speaker grille
  const strip = add(g, box(0.2, 0.6, 0.02), std(0xd6d0c4, { roughness: 0.5 }), 0.36, 0.8, 0.312);
  strip.material.color.set(0xcfc8b8);
  for (const y of [1.0, 0.88]) { const k = add(g, cyl(0.035, 0.04, 0.04), dark, 0.36, y, 0.33); k.rotation.x = Math.PI / 2; }
  add(g, box(0.15, 0.22, 0.01), std(0xffffff, { map: grilleTexture() }), 0.36, 0.64, 0.325);

  // console on top of the TV
  const top = 1.19;
  add(g, box(0.4, 0.06, 0.22), wood, -0.05, top + 0.03, 0.08);
  add(g, box(0.4, 0.012, 0.22), std(0xf2efe6, { roughness: 0.4 }), -0.05, top + 0.066, 0.08);
  add(g, box(0.05, 0.012, 0.03), std(0xff4d1a), 0.08, top + 0.075, 0.15);
  // paddles with cords
  const cordMat = std(0x111111, { roughness: 0.8 });
  for (const s of [-1, 1]) {
    const px = -0.05 + s * 0.34, pz = 0.2;
    add(g, rbox(0.09, 0.05, 0.13, 0.015), wood, px, top + 0.025, pz);
    const knob = add(g, cyl(0.025, 0.028, 0.03), std(0xf2efe6), px, top + 0.06, pz - 0.02);
    knob.rotation.y = s;
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(px, top + 0.02, pz - 0.06),
      new THREE.Vector3(px - s * 0.05, top + 0.005, pz - 0.12),
      new THREE.Vector3(-0.05 + s * 0.12, top + 0.005, 0.0),
      new THREE.Vector3(-0.05 + s * 0.1, top + 0.03, -0.03),
    ]);
    add(g, new THREE.TubeGeometry(curve, 24, 0.005, 6), cordMat);
  }
  return { group: g, screen, radius: 0.75 };
}

// 1978-style upright arcade cabinet (vertical monitor).
export function buildArcade(game, marquee = 'STAR SIEGE') {
  const g = new THREE.Group();
  const shape = new THREE.Shape();
  const P = [[0, 0], [0.66, 0], [0.66, 0.86], [0.8, 0.95], [0.8, 1.0], [0.58, 1.06], [0.5, 1.1], [0.44, 1.56],
             [0.62, 1.62], [0.62, 1.88], [0.1, 1.88], [0, 1.7]];
  shape.moveTo(...P[0]); P.slice(1).forEach(p => shape.lineTo(...p)); shape.closePath();
  const W = 0.72;
  const geo = new THREE.ExtrudeGeometry(shape, { depth: W, bevelEnabled: false });
  geo.rotateY(-Math.PI / 2);
  geo.translate(W / 2, 0, -0.4);
  const art = sideArtTexture();
  art.repeat.set(1 / 0.8, 1 / 1.88);
  const sideMat = std(0xffffff, { map: art, roughness: 0.5 });
  const edgeMat = std(0x111018, { roughness: 0.35, metalness: 0.2 });
  g.add(new THREE.Mesh(geo, [sideMat, edgeMat]));

  // screen on the slanted face between (0.5,1.1) and (0.44,1.56)
  const tilt = Math.atan2(0.06, 0.46);
  const bezel = add(g, box(0.62, 0.5, 0.01), std(0x050505, { roughness: 0.2 }), 0, 1.33, 0.47 - 0.4 + 0.004);
  bezel.rotation.x = -tilt;
  const screen = createScreen(game, 0.38, { curve: 0.13 });
  screen.position.set(0, 1.33, 0.47 - 0.4 + 0.012);
  screen.rotation.x = -tilt;
  g.add(screen);

  // marquee (lit)
  const mq = add(g, new THREE.PlaneGeometry(0.7, 0.24), new THREE.MeshBasicMaterial({ map: labelTexture(marquee, { glow: '#00e5ff', fg: '#ffe14d' }), toneMapped: false }), 0, 1.75, 0.62 - 0.4 + 0.003);
  mq.userData.glow = true;

  // control panel: joystick + two buttons on the sloped panel top
  const ang = Math.atan2(0.06, 0.22);
  const panel = new THREE.Group();
  panel.position.set(0, 1.035, 0.69 - 0.4); panel.rotation.x = ang;
  g.add(panel);
  add(panel, box(0.66, 0.006, 0.2), std(0x1b1b2e, { roughness: 0.3 }), 0, 0.003, 0);
  add(panel, cyl(0.035, 0.04, 0.01), std(0x111111), -0.15, 0.01, 0);
  add(panel, cyl(0.007, 0.007, 0.08), std(0x222222, { metalness: 0.7 }), -0.15, 0.05, 0);
  add(panel, new THREE.SphereGeometry(0.022, 16, 12), std(0xff1744, { roughness: 0.25 }), -0.15, 0.095, 0);
  for (const [x, c] of [[0.08, 0x00e5ff], [0.16, 0xffe14d]]) add(panel, cyl(0.022, 0.022, 0.02), std(c, { roughness: 0.3 }), x, 0.012, 0);
  // coin door
  add(g, box(0.3, 0.32, 0.02), std(0x2b2b2b, { metalness: 0.7, roughness: 0.35 }), 0, 0.5, 0.66 - 0.4 + 0.01);
  for (const x of [-0.06, 0.06]) add(g, box(0.05, 0.07, 0.01), new THREE.MeshBasicMaterial({ color: 0xff3b30, toneMapped: false }), x, 0.58, 0.66 - 0.4 + 0.022).userData.glow = true;
  return { group: g, screen, radius: 0.65 };
}

// 1980-style cocktail table cabinet: screen faces up under glass.
export function buildCocktail(game) {
  const g = new THREE.Group();
  const lam = std(0x7a1020, { roughness: 0.4 });
  const chrome = std(0xcccccc, { metalness: 0.9, roughness: 0.2 });
  add(g, box(0.64, 0.66, 0.8), lam, 0, 0.33, 0);
  add(g, box(0.66, 0.02, 0.82), chrome, 0, 0.665, 0);
  add(g, box(0.62, 0.02, 0.78), std(0x050505, { roughness: 0.9, envMapIntensity: 0 }), 0, 0.68, 0);
  const screen = createScreen(game, 0.4, { curve: 0.08 });
  screen.rotation.x = -Math.PI / 2;
  screen.position.set(0, 0.692, 0);
  g.add(screen);
  const glass = add(g, box(0.7, 0.012, 0.86), new THREE.MeshBasicMaterial({ color: 0x9fb8c8, transparent: true, opacity: 0.05, depthWrite: false }), 0, 0.705, 0);
  glass.renderOrder = 2;
  // control panels at both ends
  for (const s of [-1, 1]) {
    const p = new THREE.Group(); p.position.set(0, 0.58, s * 0.45); g.add(p);
    add(p, box(0.4, 0.06, 0.1), std(0x151515), 0, 0, 0);
    add(p, cyl(0.006, 0.006, 0.06), chrome, -0.1, 0.06, 0);
    add(p, new THREE.SphereGeometry(0.018, 14, 10), std(0x111111, { roughness: 0.3 }), -0.1, 0.095, 0);
    add(p, cyl(0.018, 0.018, 0.014), std(0xffe14d), 0.08, 0.036, 0);
  }
  add(g, box(0.5, 0.05, 0.66), std(0x0a0a0a), 0, 0.025, 0);
  return { group: g, screen, radius: 0.7 };
}

// Early-1980s home computer on a desk: keyboard wedge, beige monitor, floppy drive, joystick.
export function buildComputer(game) {
  const g = new THREE.Group();
  const beige = std(0xd9cfb4, { roughness: 0.55 });
  const brown = std(0x5a4a3a, { roughness: 0.6 });
  const wood = std(0xffffff, { map: woodTexture('#8a5a32'), roughness: 0.5 });
  const metal = std(0x333333, { metalness: 0.7, roughness: 0.4 });

  add(g, box(1.3, 0.04, 0.7), wood, 0, 0.74, 0);
  for (const [x, z] of [[-0.6, -0.3], [0.6, -0.3], [-0.6, 0.3], [0.6, 0.3]]) add(g, box(0.04, 0.72, 0.04), metal, x, 0.36, z);

  const deskTop = 0.76;
  // keyboard wedge
  const ks = new THREE.Shape();
  ks.moveTo(0, 0); ks.lineTo(0.22, 0); ks.lineTo(0.22, 0.03); ks.lineTo(0, 0.065); ks.closePath();
  const kgeo = new THREE.ExtrudeGeometry(ks, { depth: 0.44, bevelEnabled: false });
  kgeo.rotateY(-Math.PI / 2); kgeo.translate(0.22, 0, -0.06);
  const kb = new THREE.Mesh(kgeo, brown); kb.position.set(0, deskTop, 0.08); g.add(kb);
  // keys as one instanced mesh
  const keyGeo = rbox(0.02, 0.012, 0.02, 0.003);
  const keys = new THREE.InstancedMesh(keyGeo, std(0x3a2e24, { roughness: 0.5 }), 4 * 16);
  const m4 = new THREE.Matrix4(); const q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), Math.atan2(0.035, 0.22));
  let n = 0;
  for (let r = 0; r < 4; r++) for (let i = 0; i < 16; i++) {
    const z = 0.13 - r * 0.035 - 0.02, y = 0.03 + (0.22 - (z + 0.06)) * 0.16 + 0.006;
    m4.compose(new THREE.Vector3(-0.19 + i * 0.024 + (r % 2) * 0.008, deskTop + y, 0.08 + z), q, new THREE.Vector3(1, 1, 1));
    keys.setMatrixAt(n++, m4);
  }
  g.add(keys);
  add(g, box(0.18, 0.012, 0.02), std(0x3a2e24), 0, deskTop + 0.03, 0.17); // space bar

  // monitor
  const mon = new THREE.Group(); mon.position.set(-0.05, deskTop, -0.12); g.add(mon);
  add(mon, rbox(0.44, 0.36, 0.22, 0.02), beige, 0, 0.2, 0.06);
  add(mon, box(0.34, 0.28, 0.2), beige, 0, 0.2, -0.12); // tapered rear (simplified)
  add(mon, box(0.36, 0.24, 0.01), std(0x111111, { roughness: 0.3 }), 0, 0.21, 0.172);
  const screen = createScreen(game, 0.32, { curve: 0.14 });
  screen.position.set(-0.05, deskTop + 0.21, -0.12 + 0.18);
  g.add(screen);
  add(mon, box(0.04, 0.008, 0.01), new THREE.MeshBasicMaterial({ color: 0x33ff66, toneMapped: false }), 0.17, 0.05, 0.172).userData.glow = true;
  // floppy drive
  add(g, rbox(0.3, 0.09, 0.32, 0.01), beige, 0.42, deskTop + 0.045, -0.08);
  add(g, box(0.18, 0.012, 0.005), std(0x111111), 0.42, deskTop + 0.05, 0.082);
  add(g, box(0.02, 0.01, 0.005), new THREE.MeshBasicMaterial({ color: 0xff3b30, toneMapped: false }), 0.33, deskTop + 0.02, 0.082);
  // joystick
  add(g, rbox(0.09, 0.035, 0.09, 0.01), std(0x111111), -0.48, deskTop + 0.018, 0.12);
  const st = add(g, cyl(0.007, 0.009, 0.1), std(0x111111), -0.48, deskTop + 0.08, 0.12); st.rotation.z = 0.15;
  add(g, cyl(0.009, 0.009, 0.012), std(0xff3b30), -0.45, deskTop + 0.04, 0.155);
  // floppy disks
  for (let i = 0; i < 3; i++) { const d = add(g, box(0.13, 0.003, 0.13), std(0x161616), 0.42 + i * 0.01, deskTop + 0.095 + i * 0.004, -0.06 - i * 0.01); d.rotation.y = i * 0.15; }
  return { group: g, screen, radius: 0.8 };
}

// Late-1980s style monochrome-LCD handheld, shown big on a display pedestal.
export function buildHandheld(game) {
  const g = new THREE.Group();
  const body = std(0x1f9e8f, { roughness: 0.45 });
  const darkGray = std(0x2c2f36, { roughness: 0.4 });
  add(g, box(0.55, 0.95, 0.55), std(0x15151c, { roughness: 0.7 }), 0, 0.475, 0);
  add(g, box(0.57, 0.02, 0.57), std(0x00e5ff, { emissive: 0x00e5ff, emissiveIntensity: 0.6 }), 0, 0.96, 0);
  const dev = new THREE.Group();
  dev.position.set(0, 1.16, 0.02); dev.rotation.x = -0.32; g.add(dev);
  // acrylic stand
  add(g, box(0.3, 0.12, 0.02), new THREE.MeshStandardMaterial({ color: 0xbfefff, transparent: true, opacity: 0.25, roughness: 0.1 }), 0, 1.02, -0.04).rotation.x = -0.3;

  add(dev, rbox(0.62, 0.32, 0.07, 0.05), body, 0, 0, 0);
  add(dev, rbox(0.27, 0.24, 0.02, 0.02), darkGray, 0, 0.01, 0.035);
  const screen = createScreen(game, 0.2, { lcd: true });
  screen.position.set(0, 0.01, 0.046);
  dev.add(screen);
  // d-pad
  add(dev, box(0.09, 0.028, 0.02), std(0x16181c), -0.22, 0, 0.04);
  add(dev, box(0.028, 0.09, 0.02), std(0x16181c), -0.22, 0, 0.04);
  // action buttons
  for (const [x, y] of [[0.2, -0.025], [0.25, 0.025]]) { const b = add(dev, cyl(0.022, 0.022, 0.02), std(0xff7a1a, { roughness: 0.3 }), x, y, 0.04); b.rotation.x = Math.PI / 2; }
  // start / select
  for (const x of [-0.03, 0.03]) { const p = add(dev, rbox(0.04, 0.012, 0.01, 0.005), std(0x16181c), x, -0.135, 0.036); p.rotation.z = 0.2; }
  // power LED
  add(dev, cyl(0.005, 0.005, 0.005), new THREE.MeshBasicMaterial({ color: 0xff2040, toneMapped: false }), -0.15, 0.1, 0.04).rotation.x = Math.PI / 2;
  return { group: g, screen, radius: 0.5 };
}


// ---------- the pioneers (1947–1962) -------------------------------------------------------

const glowMat = (color) => new THREE.MeshBasicMaterial({ color, toneMapped: false });

function roundBezel(parent, r, x, y, z, color = 0x1a1a1a) {
  const ring = add(parent, new THREE.TorusGeometry(r, r * 0.12, 10, 48), std(color, { roughness: 0.35, metalness: 0.5 }), x, y, z);
  return ring;
}
function knob(parent, x, y, z, r = 0.03, color = 0x151515) {
  const k = add(parent, cyl(r, r * 1.1, r * 0.9, 24), std(color, { roughness: 0.3 }), x, y, z);
  k.rotation.x = Math.PI / 2;
  add(parent, box(r * 0.25, r * 0.9, 0.004), std(0xdddddd), x, y + r * 0.4, z + r * 0.46);
  return k;
}
function labBench(g, w = 1.2, d = 0.65, h = 0.78) {
  const top = std(0xffffff, { map: woodTexture('#5b3a1e'), roughness: 0.5 });
  const metal = std(0x3a3a3a, { metalness: 0.6, roughness: 0.4 });
  add(g, box(w, 0.04, d), top, 0, h, 0);
  for (const [x, z] of [[-w / 2 + 0.04, -d / 2 + 0.04], [w / 2 - 0.04, -d / 2 + 0.04], [-w / 2 + 0.04, d / 2 - 0.04], [w / 2 - 0.04, d / 2 - 0.04]]) add(g, box(0.04, h, 0.04), metal, x, h / 2, z);
  return h + 0.02;
}

// 1947: a laboratory chassis with a round cathode-ray tube, two knobs and a fire button.
export function buildCRTDevice(game) {
  const g = new THREE.Group();
  const top = labBench(g);
  const steel = std(0x4f5b52, { roughness: 0.55, metalness: 0.35 });
  add(g, rbox(0.56, 0.46, 0.46, 0.015), steel, 0, top + 0.23, -0.05);
  add(g, box(0.56, 0.46, 0.005), std(0x3f4943, { roughness: 0.6 }), 0, top + 0.23, 0.18);
  const screen = createScreen(game, 0.27, { curve: 0.2 });
  screen.position.set(-0.07, top + 0.25, 0.188);
  g.add(screen);
  roundBezel(g, 0.13, -0.07, top + 0.25, 0.19, 0x222222);
  knob(g, 0.19, top + 0.33, 0.19, 0.032);
  knob(g, 0.19, top + 0.2, 0.19, 0.032);
  add(g, cyl(0.016, 0.016, 0.02), std(0xc0392b, { roughness: 0.3 }), 0.19, top + 0.09, 0.195).rotation.x = Math.PI / 2;
  add(g, cyl(0.008, 0.008, 0.006), glowMat(0xffaa33), 0.19, top + 0.42, 0.19).rotation.x = Math.PI / 2;
  // cable out the back
  const curve = new THREE.CatmullRomCurve3([new THREE.Vector3(0.2, top + 0.1, -0.28), new THREE.Vector3(0.4, top + 0.02, -0.3), new THREE.Vector3(0.5, top, -0.1)]);
  add(g, new THREE.TubeGeometry(curve, 20, 0.008, 6), std(0x111111));
  return { group: g, screen, radius: 0.75 };
}

// 1950: a tall exhibition cabinet with a lamp panel and a nine-key keypad.
export function buildBertie(game) {
  const g = new THREE.Group();
  const cream = std(0xe8dcc0, { roughness: 0.5 });
  const maroon = std(0x6e1e23, { roughness: 0.45 });
  const brass = std(0xc9a14a, { metalness: 0.85, roughness: 0.3 });
  add(g, box(1.1, 0.12, 0.7), maroon, 0, 0.06, 0);
  add(g, rbox(1.0, 2.3, 0.6, 0.04), cream, 0, 1.27, 0);
  for (const x of [-0.46, 0.46]) add(g, box(0.06, 2.3, 0.62), maroon, x, 1.27, 0);
  // lit banner
  const sign = add(g, new THREE.PlaneGeometry(0.86, 0.22), new THREE.MeshBasicMaterial({ map: labelTexture('BERTIE THE BRAIN', { glow: '#c46a1a', fg: '#ffe2a8', bg: '#2a1408', font: '900 70px Georgia, serif' }), toneMapped: false }), 0, 2.2, 0.302);
  sign.userData.glow = true;
  add(g, box(0.72, 0.84, 0.02), brass, 0, 1.52, 0.3);
  const screen = createScreen(game, 0.62, { plain: true });
  screen.position.set(0, 1.52, 0.312);
  g.add(screen);
  // keypad shelf
  const shelf = new THREE.Group(); shelf.position.set(0, 0.98, 0.36); shelf.rotation.x = 0.5; g.add(shelf);
  add(shelf, box(0.4, 0.03, 0.26), maroon, 0, 0, 0);
  for (let i = 0; i < 9; i++) add(shelf, cyl(0.03, 0.03, 0.02), std(0xf4ead2, { roughness: 0.3 }), -0.11 + (i % 3) * 0.11, 0.022, -0.07 + ((i / 3) | 0) * 0.07);
  // decorative deco lines
  for (const y of [0.55, 0.62, 0.69]) add(g, box(0.86, 0.012, 0.01), brass, 0, y, 0.305);
  return { group: g, screen, radius: 0.8 };
}

// 1952: valve racks of an early stored-program computer with its small monitor CRT and a telephone dial.
export function buildEDSAC(game) {
  const g = new THREE.Group();
  const frame = std(0x2d3033, { metalness: 0.5, roughness: 0.5 });
  const chassis = std(0x8a8f86, { metalness: 0.4, roughness: 0.5 });
  const valveGeo = cyl(0.014, 0.014, 0.07, 10);
  const valves = new THREE.InstancedMesh(valveGeo, new THREE.MeshStandardMaterial({ color: 0x553311, emissive: 0xff7a1a, emissiveIntensity: 2.2, roughness: 0.3 }), 3 * 6 * 9);
  const m4 = new THREE.Matrix4(); let n = 0;
  for (let r = 0; r < 3; r++) {
    const x = -0.7 + r * 0.7, z = -0.55;
    add(g, box(0.62, 2.0, 0.4), frame, x, 1.0, z);
    for (let s = 0; s < 6; s++) {
      add(g, box(0.56, 0.05, 0.3), chassis, x, 0.35 + s * 0.28, z + 0.06);
      for (let k = 0; k < 9; k++) { m4.makeTranslation(x - 0.24 + k * 0.06, 0.42 + s * 0.28, z + 0.12); valves.setMatrixAt(n++, m4); }
    }
  }
  g.add(valves);
  // operator's table with the display unit
  const top = labBench(g, 1.0, 0.5, 0.76);
  const unitZ = 0.05;
  add(g, rbox(0.42, 0.3, 0.32, 0.015), std(0x3c3f3a, { roughness: 0.6 }), 0, top + 0.15, unitZ);
  add(g, box(0.36, 0.22, 0.01), std(0x0c0c0c), 0, top + 0.16, unitZ + 0.16);
  const screen = createScreen(game, 0.32, { curve: 0.16 });
  screen.position.set(0, top + 0.16, unitZ + 0.168);
  g.add(screen);
  // rotary dial
  const dial = new THREE.Group(); dial.position.set(0.33, top + 0.02, 0.12); dial.rotation.x = -Math.PI / 2 + 0.35; g.add(dial);
  add(dial, cyl(0.07, 0.075, 0.03, 32), std(0x111111, { roughness: 0.3 }), 0, -0.015, 0).rotation.x = Math.PI / 2;
  add(dial, new THREE.TorusGeometry(0.05, 0.012, 8, 32), std(0xd8d8d8, { metalness: 0.7, roughness: 0.3 }), 0, 0, 0.01);
  for (let i = 0; i < 10; i++) { const a = -0.6 + i * 0.5; add(dial, cyl(0.009, 0.009, 0.02, 12), std(0x050505), Math.cos(a) * 0.05, Math.sin(a) * 0.05, 0.016).rotation.x = Math.PI / 2; }
  return { group: g, screen, radius: 1.05 };
}

// 1958: an analog computer with a small round oscilloscope and two hand-held controllers.
export function buildTennis(game) {
  const g = new THREE.Group();
  const top = labBench(g, 1.3, 0.65);
  const grey = std(0x8d9196, { roughness: 0.5, metalness: 0.3 });
  add(g, rbox(0.62, 0.36, 0.42, 0.01), grey, -0.28, top + 0.18, -0.08);
  const panel = add(g, box(0.58, 0.3, 0.005), std(0x24272a), -0.28, top + 0.19, 0.135);
  // patch cords
  const cols = [0xd62828, 0xf77f00, 0x2a9d8f, 0xffffff];
  for (let i = 0; i < 7; i++) {
    const x0 = -0.52 + Math.random() * 0.48, x1 = -0.52 + Math.random() * 0.48, y0 = top + 0.08 + Math.random() * 0.2, y1 = top + 0.08 + Math.random() * 0.2;
    const c = new THREE.CatmullRomCurve3([new THREE.Vector3(x0, y0, 0.14), new THREE.Vector3((x0 + x1) / 2, Math.min(y0, y1) - 0.08, 0.2), new THREE.Vector3(x1, y1, 0.14)]);
    add(g, new THREE.TubeGeometry(c, 16, 0.004, 5), std(cols[i % 4], { roughness: 0.5 }));
  }
  for (let i = 0; i < 24; i++) add(g, cyl(0.006, 0.006, 0.01, 8), std(0xbbbbbb, { metalness: 0.8 }), -0.52 + (i % 8) * 0.068, top + 0.1 + ((i / 8) | 0) * 0.09, 0.14).rotation.x = Math.PI / 2;
  // oscilloscope
  const scope = new THREE.Group(); scope.position.set(0.32, top, -0.02); g.add(scope);
  add(scope, rbox(0.34, 0.3, 0.44, 0.015), std(0x2f3a45, { roughness: 0.5 }), 0, 0.15, 0);
  add(scope, box(0.3, 0.26, 0.005), std(0x1b2229), 0, 0.15, 0.222);
  const screen = createScreen(game, 0.2, { curve: 0.18 });
  screen.position.set(0.28, top + 0.17, 0.205);
  g.add(screen);
  roundBezel(scope, 0.13, -0.04, 0.17, 0.225, 0x111111);
  for (const y of [0.24, 0.1]) knob(scope, 0.12, y, 0.225, 0.016);
  // controllers
  for (const s of [-1, 1]) {
    const c = new THREE.Group(); c.position.set(s * 0.42, top, 0.24); c.rotation.y = -s * 0.2; g.add(c);
    add(c, rbox(0.1, 0.05, 0.08, 0.008), std(0xb8bcc2, { metalness: 0.6, roughness: 0.35 }), 0, 0.025, 0);
    add(c, cyl(0.016, 0.018, 0.02), std(0x111111), -0.022, 0.06, 0);
    add(c, cyl(0.009, 0.009, 0.012), std(0xd62828), 0.025, 0.056, 0);
  }
  return { group: g, screen, radius: 0.85 };
}

// 1962: a minicomputer console with rows of indicator lamps and a separate round-screen display.
export function buildPDP1(game) {
  const g = new THREE.Group();
  const blue = std(0x8fb3cf, { roughness: 0.5 });
  const pale = std(0xd7dee3, { roughness: 0.5 });
  const dark = std(0x1d2733, { roughness: 0.5 });
  // console
  add(g, box(1.3, 1.25, 0.55), pale, 0.35, 0.625, -0.15);
  add(g, box(1.3, 0.45, 0.02), dark, 0.35, 1.0, 0.13);
  const lamps = new THREE.InstancedMesh(new THREE.SphereGeometry(0.008, 8, 6), glowMat(0xffd27a), 6 * 18);
  const m4 = new THREE.Matrix4(); let n = 0;
  for (let r = 0; r < 6; r++) for (let k = 0; k < 18; k++) { m4.makeTranslation(-0.2 + k * 0.064, 0.86 + r * 0.055, 0.145); lamps.setMatrixAt(n++, m4); }
  g.add(lamps); lamps.userData.blink = true;
  for (let k = 0; k < 18; k++) add(g, box(0.012, 0.035, 0.012), std(0xeeeeee, { metalness: 0.6 }), -0.2 + k * 0.064, 0.72, 0.15).rotation.x = 0.4;
  add(g, box(1.3, 0.06, 0.6), blue, 0.35, 1.28, -0.15);
  add(g, box(1.32, 0.05, 0.34), blue, 0.35, 0.66, 0.24); // writing shelf
  // display tower
  add(g, rbox(0.56, 1.5, 0.62, 0.02), blue, -0.65, 0.75, -0.05);
  add(g, box(0.48, 0.48, 0.01), std(0x111418), -0.65, 1.2, 0.265);
  const screen = createScreen(game, 0.4, { curve: 0.18 });
  screen.position.set(-0.65, 1.2, 0.274);
  g.add(screen);
  roundBezel(g, 0.21, -0.65, 1.2, 0.276, 0x2a2f36);
  // the "control boxes" the MIT players built: switches on a small box
  for (const x of [-0.85, -0.45]) {
    add(g, rbox(0.14, 0.05, 0.1, 0.008), std(0x6b5440, { roughness: 0.6 }), x, 0.685, 0.33);
    for (let i = 0; i < 4; i++) add(g, box(0.01, 0.025, 0.01), std(0xdddddd, { metalness: 0.6 }), x - 0.045 + i * 0.03, 0.72, 0.33);
  }
  add(g, box(0.4, 0.66, 0.4), blue, -0.65, 0.33, 0.3); // stand for the control boxes
  return { group: g, screen, radius: 1.0, lamps };
}

// ---------- the mainframe era (1951–1976) ---------------------------------------------------

function desk(g, w = 1.3, d = 0.7, h = 0.74, color = 0x8a8f96) {
  const topM = std(color, { roughness: 0.45, metalness: 0.3 });
  add(g, box(w, 0.04, d), topM, 0, h, 0);
  add(g, box(0.04, h, d - 0.06), topM, -w / 2 + 0.03, h / 2, 0);
  add(g, box(0.04, h, d - 0.06), topM, w / 2 - 0.03, h / 2, 0);
  add(g, box(w - 0.06, h * 0.55, 0.02), topM, 0, h * 0.55, -d / 2 + 0.03);
  return h + 0.02;
}

// 1951: a wide exhibition cabinet with a lamp panel and a push-button desk.
export function buildNimrod(game) {
  const g = new THREE.Group();
  const steel = std(0x6f7f8c, { roughness: 0.5, metalness: 0.4 });
  const dark = std(0x23292e, { roughness: 0.5 });
  add(g, rbox(1.9, 1.9, 0.5, 0.03), steel, 0, 0.95, -0.25);
  add(g, box(0.96, 0.76, 0.02), dark, 0, 1.36, 0.005);
  const screen = createScreen(game, 0.88, { plain: true });
  screen.position.set(0, 1.36, 0.02);
  g.add(screen);
  add(g, new THREE.PlaneGeometry(0.7, 0.16), new THREE.MeshBasicMaterial({ map: labelTexture('NIMROD', { glow: '#ffb347', fg: '#fff3d0', bg: '#1c2024', font: '900 96px "Arial Black", Impact, sans-serif' }), toneMapped: false }), 0, 1.9, 0.006).userData.glow = true;
  // vent grilles
  for (const x of [-0.72, 0.72]) for (let i = 0; i < 9; i++) add(g, box(0.3, 0.015, 0.01), dark, x, 0.45 + i * 0.12, 0.005);
  // push-button desk
  const d = new THREE.Group(); d.position.set(0, 0.82, 0.32); d.rotation.x = 0.35; g.add(d);
  add(d, box(1.0, 0.05, 0.32), steel, 0, 0, 0);
  for (let r = 0; r < 4; r++) for (let i = 0; i < 7; i++) add(d, cyl(0.014, 0.014, 0.014, 12), std(i === 6 ? 0xd62828 : 0xeeeeee, { roughness: 0.4 }), -0.3 + i * 0.1, 0.03, -0.1 + r * 0.065);
  add(g, box(1.0, 0.8, 0.3), steel, 0, 0.4, 0.3);
  return { group: g, screen, radius: 1.1 };
}

// 1952: a real-time computer console with a large round display scope and a light gun.
export function buildWhirlwind(game) {
  const g = new THREE.Group();
  const grey = std(0x5d6670, { roughness: 0.5, metalness: 0.35 });
  add(g, box(1.2, 0.8, 0.7), grey, 0, 0.4, 0);
  const tilt = 0.45;
  const face = new THREE.Group(); face.position.set(0, 1.05, -0.05); face.rotation.x = -tilt; g.add(face);
  add(face, rbox(1.2, 0.6, 0.5, 0.02), grey, 0, 0, -0.2);
  add(face, box(0.56, 0.5, 0.01), std(0x1b1f24), -0.2, 0, 0.055);
  roundBezel(face, 0.2, -0.2, 0, 0.06, 0x202428);
  for (let i = 0; i < 3; i++) knob(face, 0.25 + (i % 2) * 0.14, 0.15 - i * 0.12, 0.06, 0.025);
  const screen = createScreen(game, 0.38, { curve: 0.2 });
  screen.position.set(-0.2, 0, 0.062); face.add(screen);
  add(face, box(0.08, 0.04, 0.005), glowMat(0x5ce1ff), 0.42, -0.2, 0.06).userData.glow = true;
  // support under the slanted face
  add(g, box(1.2, 0.45, 0.3), grey, 0, 0.98, -0.42);
  // light gun on its cable
  const gun = new THREE.Group(); gun.position.set(0.42, 0.81, 0.22); gun.rotation.set(0, -0.5, Math.PI / 2); g.add(gun);
  add(gun, cyl(0.018, 0.022, 0.16, 12), std(0x1a1a1a), 0, 0, 0);
  add(gun, box(0.03, 0.06, 0.03), std(0x1a1a1a), 0.025, -0.05, 0);
  const cable = new THREE.CatmullRomCurve3([new THREE.Vector3(0.42, 0.82, 0.14), new THREE.Vector3(0.5, 0.8, 0.0), new THREE.Vector3(0.55, 0.9, -0.2)]);
  add(g, new THREE.TubeGeometry(cable, 16, 0.006, 6), std(0x111111));
  return { group: g, screen, radius: 0.85 };
}

// 1970s teleprinter on its pedestal, printing onto a rising sheet of paper.
export function buildTeletype(game, bodyColor = 0xcfc7b0) {
  const g = new THREE.Group();
  const body = std(bodyColor, { roughness: 0.5 });
  const dark = std(0x3b3d40, { roughness: 0.5 });
  add(g, box(0.5, 0.66, 0.42), body, 0, 0.33, -0.02);
  add(g, rbox(0.66, 0.26, 0.56, 0.04), body, 0, 0.79, 0);
  // keyboard
  const kb = new THREE.Group(); kb.position.set(0, 0.92, 0.17); kb.rotation.x = 0.25; g.add(kb);
  add(kb, box(0.5, 0.02, 0.18), dark, 0, 0, 0);
  const keys = new THREE.InstancedMesh(cyl(0.012, 0.012, 0.02, 10), std(0x1a1a1a, { roughness: 0.4 }), 4 * 11);
  const m4 = new THREE.Matrix4(); let n = 0;
  for (let r = 0; r < 4; r++) for (let i = 0; i < 11; i++) { m4.makeTranslation(-0.2 + i * 0.04 + r * 0.01, 0.02, -0.06 + r * 0.04); keys.setMatrixAt(n++, m4); }
  kb.add(keys);
  // platen + paper
  const platen = add(g, cyl(0.035, 0.035, 0.5, 20), dark, 0, 0.95, -0.12); platen.rotation.z = Math.PI / 2;
  const paperMat = std(0xefe7cf, { roughness: 0.9 });
  const screen = createScreen(game, 0.4, { plain: true });
  screen.material.uniforms.bright.value = 0.85;
  const h = screen.userData.size[1];
  screen.position.set(0, 0.98 + h / 2, -0.13); screen.rotation.x = -0.12;
  g.add(screen);
  // the paper continues behind and curls over
  add(g, new THREE.PlaneGeometry(0.4, 0.2), paperMat, 0, 0.98 + h + 0.06, -0.19).rotation.x = -0.9;
  add(g, cyl(0.06, 0.06, 0.42, 20), paperMat, 0, 0.62, -0.18).rotation.z = Math.PI / 2; // paper roll in the stand
  return { group: g, screen, radius: 0.6 };
}

// a 1970s video terminal on a desk (case colour and glyph colour vary)
export function buildTerminal(game, caseColor = 0xd9d3c3) {
  const g = new THREE.Group();
  const top = desk(g, 1.1, 0.7, 0.74, 0x6d7177);
  const cas = std(caseColor, { roughness: 0.5 });
  const mon = new THREE.Group(); mon.position.set(0, top, -0.1); g.add(mon);
  add(mon, rbox(0.5, 0.42, 0.42, 0.03), cas, 0, 0.25, 0);
  add(mon, box(0.42, 0.3, 0.3), cas, 0, 0.27, -0.25);
  add(mon, box(0.42, 0.32, 0.01), std(0x111111, { roughness: 0.3 }), 0, 0.26, 0.211);
  const screen = createScreen(game, 0.38, { curve: 0.12 });
  screen.position.set(0, top + 0.26, -0.1 + 0.218);
  g.add(screen);
  add(mon, box(0.5, 0.04, 0.4), cas, 0, 0.02, 0);
  // keyboard
  add(g, rbox(0.46, 0.04, 0.17, 0.01), cas, 0, top + 0.02, 0.2);
  const keys = new THREE.InstancedMesh(rbox(0.022, 0.012, 0.022, 0.003), std(0x2a2a2a), 4 * 14);
  const m4 = new THREE.Matrix4(); let n = 0;
  for (let r = 0; r < 4; r++) for (let i = 0; i < 14; i++) { m4.makeTranslation(-0.19 + i * 0.028 + (r % 2) * 0.008, top + 0.046, 0.15 + r * 0.03); keys.setMatrixAt(n++, m4); }
  g.add(keys);
  return { group: g, screen, radius: 0.75 };
}

// mid-1970s plasma-panel teaching terminal: flat orange screen in a slanted housing
export function buildPlato(game) {
  const g = new THREE.Group();
  const top = desk(g, 1.2, 0.75, 0.72, 0x7a6f60);
  const beige = std(0xcfc3a5, { roughness: 0.5 });
  const unit = new THREE.Group(); unit.position.set(0, top, -0.08); g.add(unit);
  add(unit, rbox(0.66, 0.6, 0.46, 0.03), beige, 0, 0.32, -0.05);
  const face = new THREE.Group(); face.position.set(0, 0.34, 0.19); face.rotation.x = -0.18; unit.add(face);
  add(face, box(0.56, 0.5, 0.01), std(0x141414, { roughness: 0.3 }), 0, 0, 0);
  const screen = createScreen(game, 0.48, { plain: true });
  screen.material.uniforms.bright.value = 1.25;
  screen.position.set(0, 0, 0.008); face.add(screen);
  // keyboard with extra function keys
  add(g, rbox(0.62, 0.05, 0.2, 0.01), beige, 0, top + 0.025, 0.25);
  const keys = new THREE.InstancedMesh(rbox(0.024, 0.012, 0.024, 0.003), std(0x3a3328), 4 * 18);
  const m4 = new THREE.Matrix4(); let n = 0;
  for (let r = 0; r < 4; r++) for (let i = 0; i < 18; i++) { m4.makeTranslation(-0.27 + i * 0.031, top + 0.056, 0.19 + r * 0.033); keys.setMatrixAt(n++, m4); }
  g.add(keys);
  return { group: g, screen, radius: 0.8 };
}

// decorative tape drives with spinning reels; returns the reels so the caller can animate them
export function buildTapeDrives(count = 4) {
  const g = new THREE.Group();
  const body = std(0x9aa7b4, { roughness: 0.5, metalness: 0.25 });
  const dark = std(0x202630);
  const reelMat = std(0x8c8c8c, { metalness: 0.8, roughness: 0.3 });
  const tapeMat = std(0x3a2a1a, { roughness: 0.7 });
  const reels = [];
  for (let i = 0; i < count; i++) {
    const x = (i - (count - 1) / 2) * 0.9;
    add(g, box(0.8, 1.9, 0.6), body, x, 0.95, 0);
    add(g, box(0.7, 0.9, 0.01), dark, x, 1.35, 0.301);
    for (const y of [1.58, 1.12]) {
      const reel = new THREE.Group(); reel.position.set(x, y, 0.31); g.add(reel);
      add(reel, cyl(0.17, 0.17, 0.012, 32), reelMat, 0, 0, 0).rotation.x = Math.PI / 2;
      add(reel, cyl(0.12, 0.12, 0.016, 32), tapeMat, 0, 0, 0.002).rotation.x = Math.PI / 2;
      for (let k = 0; k < 3; k++) add(reel, box(0.03, 0.1, 0.02), dark, Math.cos(k * 2.09) * 0.07, Math.sin(k * 2.09) * 0.07, 0.012).rotation.z = k * 2.09 + Math.PI / 2;
      reels.push({ obj: reel, speed: (y > 1.3 ? 1 : -1.3) * (0.6 + Math.random()), phase: Math.random() * 10 });
    }
    for (let k = 0; k < 6; k++) add(g, box(0.02, 0.02, 0.01), glowMat([0xff3b30, 0x33ff66, 0xffd27a][k % 3]), x - 0.25 + k * 0.1, 0.75, 0.302).userData.glow = true;
  }
  return { group: g, reels };
}

// ---------- experiments & prototypes (1948–1977) --------------------------------------------

// 1948: a study desk with a drafting board holding the "paper machine" sheet, and a real chessboard.
export function buildPaperDesk(game) {
  const g = new THREE.Group();
  const wood = std(0xffffff, { map: woodTexture('#5a3a20'), roughness: 0.55 });
  const top = 0.76;
  add(g, box(1.4, 0.05, 0.75), wood, 0, top, 0);
  for (const [x, z] of [[-0.65, -0.32], [0.65, -0.32], [-0.65, 0.32], [0.65, 0.32]]) add(g, box(0.06, top, 0.06), wood, x, top / 2, z);
  // drafting board
  const board = new THREE.Group(); board.position.set(-0.15, top + 0.32, -0.12); board.rotation.x = -0.32; g.add(board);
  add(board, box(0.62, 0.62, 0.02), std(0x9a7b52, { roughness: 0.7 }), 0, 0, 0);
  const screen = createScreen(game, 0.46, { plain: true });
  screen.material.uniforms.bright.value = 0.9;
  screen.position.set(0, 0.0, 0.012); board.add(screen);
  add(board, box(0.08, 0.02, 0.02), std(0x888888, { metalness: 0.8 }), 0, 0.27, 0.02); // clip
  add(g, box(0.04, 0.34, 0.04), wood, -0.15, top + 0.16, -0.28);
  // physical chessboard with a few pieces
  const cb = new THREE.Group(); cb.position.set(0.47, top + 0.03, 0.08); g.add(cb);
  const sq = new THREE.InstancedMesh(box(0.035, 0.008, 0.035), std(0xffffff, { roughness: 0.5 }), 64);
  const m4 = new THREE.Matrix4(); const col = new THREE.Color();
  for (let i = 0; i < 64; i++) { const x = i % 8, y = (i / 8) | 0; m4.makeTranslation((x - 3.5) * 0.035, 0, (y - 3.5) * 0.035); sq.setMatrixAt(i, m4); sq.setColorAt(i, col.set((x + y) % 2 ? 0x5a3a20 : 0xe8d8b8)); }
  cb.add(sq);
  for (const [x, y, dark, h] of [[4, 0, 1, 0.05], [3, 0, 1, 0.045], [4, 7, 0, 0.05], [5, 6, 0, 0.03], [2, 2, 1, 0.035], [6, 5, 0, 0.035], [4, 3, 1, 0.025], [4, 4, 0, 0.025]])
    add(cb, cyl(0.009, 0.013, h, 12), std(dark ? 0x222222 : 0xf2eee6, { roughness: 0.4 }), (x - 3.5) * 0.035, h / 2 + 0.004, (y - 3.5) * 0.035);
  // pencil, papers, cup
  const pencil = add(g, cyl(0.004, 0.004, 0.16, 6), std(0xe0b030), 0.18, top + 0.03, 0.26); pencil.rotation.set(0, 0.6, Math.PI / 2);
  for (let i = 0; i < 5; i++) { const pp = add(g, box(0.21, 0.002, 0.29), std(0xf3ecd8, { roughness: 0.9 }), -0.5 + i * 0.006, top + 0.028 + i * 0.002, 0.15); pp.rotation.y = i * 0.07 - 0.1; }
  add(g, cyl(0.035, 0.03, 0.08, 16), std(0xf5f5f5, { roughness: 0.3 }), 0.58, top + 0.065, -0.22);
  return { group: g, screen, radius: 0.85 };
}

// 1952: a console with a storage-tube display above a sloping panel of switches.
export function buildFerranti(game) {
  const g = new THREE.Group();
  const grey = std(0x8c949b, { roughness: 0.5, metalness: 0.35 });
  const dark = std(0x24292e, { roughness: 0.5 });
  add(g, box(1.6, 0.75, 0.6), grey, 0, 0.375, 0);
  const slope = new THREE.Group(); slope.position.set(0, 0.83, 0.05); slope.rotation.x = -0.6; g.add(slope);
  add(slope, box(1.6, 0.36, 0.08), grey, 0, 0, -0.04);
  const sw = new THREE.InstancedMesh(box(0.012, 0.03, 0.012), std(0xe8e8e8, { metalness: 0.6 }), 3 * 24);
  const m4 = new THREE.Matrix4(); let n = 0;
  for (let r = 0; r < 3; r++) for (let i = 0; i < 24; i++) { m4.makeTranslation(-0.66 + i * 0.057, -0.1 + r * 0.1, 0.01); sw.setMatrixAt(n++, m4); }
  slope.add(sw);
  // display hood with two tubes, one live
  add(g, box(1.0, 0.5, 0.45), grey, 0, 1.25, -0.12);
  add(g, box(0.4, 0.4, 0.01), dark, -0.23, 1.25, 0.106);
  add(g, box(0.4, 0.4, 0.01), dark, 0.23, 1.25, 0.106);
  const screen = createScreen(game, 0.34, { curve: 0.1 });
  screen.position.set(-0.23, 1.25, 0.113); g.add(screen);
  // the second tube shows a static memory pattern
  const pat = document.createElement('canvas'); pat.width = pat.height = 64; const pg = pat.getContext('2d');
  pg.fillStyle = '#020803'; pg.fillRect(0, 0, 64, 64); pg.fillStyle = '#7dff95';
  for (let y = 0; y < 32; y++) for (let x = 0; x < 20; x++) if (Math.random() < 0.45) pg.fillRect(4 + x * 3, 2 + y * 2, 2, 1);
  const pt = new THREE.CanvasTexture(pat); pt.colorSpace = THREE.SRGBColorSpace;
  add(g, new THREE.PlaneGeometry(0.34, 0.34), new THREE.MeshBasicMaterial({ map: pt, toneMapped: false }), 0.23, 1.25, 0.113);
  return { group: g, screen, radius: 0.95 };
}

// 1954: a laboratory cabinet with a square display tube at standing height.
export function buildMidsac(game) {
  const g = new THREE.Group();
  const panel = std(0x6b7660, { roughness: 0.55, metalness: 0.3 });
  const dark = std(0x1d211b);
  add(g, box(1.0, 1.85, 0.55), panel, 0, 0.925, -0.1);
  add(g, box(0.6, 0.42, 0.01), dark, 0, 1.3, 0.18);
  const screen = createScreen(game, 0.52, { curve: 0.08 });
  screen.position.set(0, 1.3, 0.187); g.add(screen);
  for (let i = 0; i < 4; i++) knob(g, -0.3 + i * 0.2, 0.95, 0.18, 0.03);
  for (let i = 0; i < 8; i++) add(g, cyl(0.008, 0.008, 0.006), glowMat(i % 3 ? 0xffb347 : 0x7dff95), -0.35 + i * 0.1, 0.82, 0.18).rotation.x = Math.PI / 2;
  // cue control box on a shelf
  add(g, box(0.7, 0.04, 0.25), panel, 0, 0.75, 0.3);
  add(g, rbox(0.22, 0.06, 0.14, 0.01), std(0x2a2a2a), 0, 0.8, 0.32);
  knob(g, -0.05, 0.84, 0.33, 0.018); knob(g, 0.05, 0.84, 0.33, 0.018);
  return { group: g, screen, radius: 0.75 };
}

// 1967–68: a wood-grain prototype box with switches, two knob controllers, and a portable TV.
export function buildPrototypeBox(game) {
  const g = new THREE.Group();
  const top = desk(g, 1.3, 0.7, 0.7, 0x7d6a55);
  // portable TV
  const tv = new THREE.Group(); tv.position.set(0, top, -0.15); g.add(tv);
  add(tv, rbox(0.56, 0.44, 0.4, 0.05), std(0xb8b2a2, { roughness: 0.45 }), 0, 0.24, 0);
  add(tv, box(0.42, 0.33, 0.01), std(0x111111), -0.04, 0.25, 0.2);
  const screen = createScreen(game, 0.38, { curve: 0.2 });
  screen.position.set(-0.04, top + 0.25, -0.15 + 0.208); g.add(screen);
  add(tv, cyl(0.015, 0.015, 0.03), std(0x222222), 0.22, 0.32, 0.2).rotation.x = Math.PI / 2;
  add(tv, cyl(0.004, 0.004, 0.4), std(0xcccccc, { metalness: 0.9 }), 0.15, 0.6, -0.05).rotation.z = -0.5;
  add(tv, cyl(0.004, 0.004, 0.4), std(0xcccccc, { metalness: 0.9 }), -0.15, 0.6, -0.05).rotation.z = 0.5;
  // the prototype box
  const wood = std(0xffffff, { map: woodTexture('#6a4024'), roughness: 0.6 });
  add(g, box(0.44, 0.09, 0.26), wood, 0, top + 0.045, 0.2);
  for (let i = 0; i < 8; i++) add(g, box(0.012, 0.028, 0.012), std(0xdddddd, { metalness: 0.7 }), -0.17 + i * 0.048, top + 0.075, 0.335).rotation.x = 0.4;
  // two controllers, each with horizontal and vertical knobs
  for (const s of [-1, 1]) {
    const c = new THREE.Group(); c.position.set(s * 0.48, top, 0.22); g.add(c);
    add(c, box(0.14, 0.07, 0.11), wood, 0, 0.035, 0);
    for (const [x, col] of [[-0.035, 0x111111], [0.035, 0x111111]]) add(c, cyl(0.016, 0.018, 0.025), std(col), x, 0.08, 0);
    const cord = new THREE.CatmullRomCurve3([new THREE.Vector3(s * 0.42, top + 0.02, 0.18), new THREE.Vector3(s * 0.3, top + 0.005, 0.12), new THREE.Vector3(s * 0.2, top + 0.03, 0.15)]);
    add(g, new THREE.TubeGeometry(cord, 12, 0.005, 6), std(0x111111));
  }
  return { group: g, screen, radius: 0.8 };
}

export const BUILDERS = {
  paperdesk: buildPaperDesk, ferranti: buildFerranti, midsac: buildMidsac, protobox: buildPrototypeBox,
  ibmterm: (gm) => buildTeletype(gm, 0x7f93a8), terminal3: (gm) => buildTerminal(gm, 0x3b4250),
  nimrod: buildNimrod, whirlwind: buildWhirlwind, teletype: buildTeletype, plato: buildPlato,
  terminal: (gm) => buildTerminal(gm, 0xd9d3c3), terminal2: (gm) => buildTerminal(gm, 0x4d5a66),
  crtdevice: buildCRTDevice, bertie: buildBertie, edsac: buildEDSAC, scope: buildTennis, pdp1: buildPDP1, tv: buildTVConsole, arcade: buildArcade, cocktail: buildCocktail, computer: buildComputer, handheld: buildHandheld };
