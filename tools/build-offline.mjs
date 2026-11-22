// Packages the museum as a download that runs offline: unzip, then double-click "Play JAT Arcade
// Archives.html". Browsers refuse ES modules and web fonts from file:// pages, so this build bundles
// every module (three.js included) into one classic script and inlines the fonts into the page.
//   npm install && npm run build:offline   ->   dist/jat-arcade-archives-offline.zip
import { rmSync, mkdirSync, readFileSync, writeFileSync, cpSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';
import { bundleMuseum } from './bundle.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const stage = join(root, 'build', 'offline-stage');
const out = join(root, 'build', 'offline', 'JAT Arcade Archives');
rmSync(join(root, 'build', 'offline'), { recursive: true, force: true });
bundleMuseum(root, stage);
mkdirSync(out, { recursive: true });

// 1. One classic script. The import map's two entries become esbuild aliases.
const html0 = readFileSync(join(stage, 'index.html'), 'utf8');
const map = JSON.parse(html0.match(/<script type="importmap">([\s\S]*?)<\/script>/)[1]).imports;
await build({
  entryPoints: [join(stage, 'src', 'main.js')],
  bundle: true, format: 'iife', target: 'es2020', minify: true, legalComments: 'eof',
  alias: { three: join(stage, map.three) },
  plugins: [{
    name: 'three-addons',
    setup(b) { b.onResolve({ filter: /^three\/addons\// }, (a) => ({ path: join(stage, map['three/addons/'], a.path.slice('three/addons/'.length)) })); },
  }],
  outfile: join(out, 'museum.js'),
});

// 2. Fonts inlined as data: URLs.
const fontDir = join(stage, 'vendor', 'fonts');
const fontsCss = readFileSync(join(fontDir, 'fonts.css'), 'utf8').replace(/url\(\.\/([^)]+)\)/g,
  (_, f) => `url(data:font/woff2;base64,${readFileSync(join(fontDir, f)).toString('base64')})`);

// 3. The page: no import map, no module script, no PWA bits, a note if JavaScript is off.
let html = html0
  .replace(/\s*<script type="importmap">[\s\S]*?<\/script>/, '')
  .replace(/<link href="vendor\/fonts\/fonts\.css" rel="stylesheet">/, () => `<style>${fontsCss}</style>`)
  .replace(/\s*<link rel="manifest"[^>]*>/, '')
  .replace(/\s*<link rel="icon"[^>]*>/, '')
  .replace(/<script type="module" src="src\/main\.js"><\/script>\s*<script nomodule>[\s\S]*?<\/script>/, '<script src="museum.js"></script>');
if (html.includes('type="module"') || html.includes('importmap')) throw new Error('module markup left in the offline page');
writeFileSync(join(out, 'Play JAT Arcade Archives.html'), html);

// 4. Licences and a short readme.
mkdirSync(join(out, 'licenses'), { recursive: true });
cpSync(join(stage, 'vendor', 'three', 'LICENSE'), join(out, 'licenses', 'three.js-LICENSE.txt'));
for (const f of ['press-start-2p-LICENSE.txt', 'space-grotesk-LICENSE.txt']) cpSync(join(fontDir, f), join(out, 'licenses', f));
writeFileSync(join(out, 'README.txt'), [
  'JAT Arcade Archives - offline version',
  '',
  'To play: double-click "Play JAT Arcade Archives.html". It opens in your web browser and needs',
  'no internet connection and no installation. Works in current Chrome, Edge, Firefox and Safari.',
  '',
  'High scores, your passport and your Maker Lab levels are saved in that browser on this computer.',
  'Keep this folder together: the page needs museum.js next to it.',
  '',
  'Controls: WASD or arrows to walk, drag to look, E or click to play, Space is the A button,',
  'F for 2D full screen, Esc to stand up. Gamepads work too.',
  '',
  'Free to play. If you enjoy it, you can support new rooms at https://cptnope.itch.io/jat-arcade-archives',
  'Made by Jeremy Anderson - https://jeremyanderson.tech',
  'Source: https://github.com/CptNope/JAT-Arcade-Archives',
  '',
].join('\r\n'));
rmSync(stage, { recursive: true, force: true });

mkdirSync(join(root, 'dist'), { recursive: true });
const zip = join(root, 'dist', 'jat-arcade-archives-offline.zip');
rmSync(zip, { force: true });
execFileSync('zip', ['-qr', zip, 'JAT Arcade Archives'], { cwd: join(root, 'build', 'offline') });
console.log('Built', zip);
