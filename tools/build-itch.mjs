// Packages the museum for itch.io as an HTML5 game: index.html at the root of the zip, with three.js
// and the fonts bundled (no CDN), and no service worker (itch.io serves the game from its own iframe).
//   npm install && npm run build:itch   ->   dist/jat-arcade-archives-itch.zip
import { rmSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { bundleMuseum } from './bundle.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const out = join(root, 'build', 'itch');
bundleMuseum(root, out);
rmSync(join(out, 'manifest.webmanifest'), { force: true });
rmSync(join(out, 'icons'), { recursive: true, force: true });
const index = join(out, 'index.html');
writeFileSync(index, readFileSync(index, 'utf8').replace(/\s*<link rel="manifest"[^>]*>/, '').replace(/\s*<link rel="icon"[^>]*>/, ''));

mkdirSync(join(root, 'dist'), { recursive: true });
const zip = join(root, 'dist', 'jat-arcade-archives-itch.zip');
rmSync(zip, { force: true });
execFileSync('zip', ['-qr', zip, '.'], { cwd: out });
console.log('Built', zip);
