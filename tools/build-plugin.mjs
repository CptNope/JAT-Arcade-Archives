// Packages the WordPress plugin: wordpress/jat-arcade-archives + the museum from web/, with three.js
// and the fonts bundled locally (WordPress.org plugins may not load code or fonts from CDNs).
//   npm install && npm run build:plugin   ->   dist/jat-arcade-archives.zip
import { cpSync, rmSync, mkdirSync, writeFileSync } from 'node:fs';
import { bundleMuseum } from './bundle.mjs';
import { execFileSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const slug = 'jat-arcade-archives';
const out = join(root, 'build', slug);

rmSync(out, { recursive: true, force: true });
cpSync(join(root, 'wordpress', slug), out, { recursive: true });

bundleMuseum(root, join(out, 'museum'));
const museum = join(out, 'museum');

// exhibit list for the REST API and the block editor
const { EXHIBITS } = await import(pathToFileURL(join(root, 'web', 'src', 'exhibits.js')).href);
writeFileSync(join(museum, 'exhibits.json'), JSON.stringify(EXHIBITS.map(e => ({ id: e.id, title: e.title, year: e.year, wing: e.wing }))));

mkdirSync(join(root, 'dist'), { recursive: true });
const zip = join(root, 'dist', `${slug}.zip`);
rmSync(zip, { force: true });
execFileSync('zip', ['-qr', zip, slug], { cwd: join(root, 'build') });
console.log('Built', zip, `(${EXHIBITS.length} exhibits)`);
