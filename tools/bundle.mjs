// Copies the museum from web/ into a folder with three.js (only the add-ons it imports) and its
// fonts bundled locally, so it runs with no CDN: used by the WordPress plugin and the itch.io build.
import { cpSync, rmSync, mkdirSync, readFileSync, writeFileSync, existsSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';

export function bundleMuseum(root, museum) {
  const nm = join(root, 'node_modules');
  if (!existsSync(join(nm, 'three'))) throw new Error('Run npm install first.');
  rmSync(museum, { recursive: true, force: true });
  // the museum, minus tests and the GitHub Pages-only files
  cpSync(join(root, 'web'), museum, { recursive: true, filter: (p) => !p.includes(`${join('web', 'tests')}`) });

  // three.js, only the parts the museum imports (followed through each add-on's own imports)
  const v3 = join(museum, 'vendor', 'three');
  for (const f of ['three.module.js', 'three.core.js']) cpSync(join(nm, 'three', 'build', f), join(v3, 'build', f));
  cpSync(join(nm, 'three', 'LICENSE'), join(v3, 'LICENSE'));
  const walk = (d) => readdirSync(d, { withFileTypes: true }).flatMap(e => e.isDirectory() ? walk(join(d, e.name)) : [join(d, e.name)]);
  const jsm = join(nm, 'three', 'examples', 'jsm');
  const todo = [], seen = new Set();
  for (const f of walk(join(root, 'web', 'src')).filter(f => f.endsWith('.js'))) {
    for (const m of readFileSync(f, 'utf8').matchAll(/from\s+'three\/addons\/([^']+)'/g)) todo.push(m[1]);
  }
  while (todo.length) {
    const rel = todo.pop();
    if (seen.has(rel)) continue;
    seen.add(rel);
    cpSync(join(jsm, rel), join(v3, 'examples', 'jsm', rel));
    for (const m of readFileSync(join(jsm, rel), 'utf8').matchAll(/(?:from|import)\s*\(?\s*'([^']+)'/g)) {
      const spec = m[1];
      if (spec.startsWith('three/addons/')) todo.push(spec.slice(13));
      else if (spec.startsWith('.')) todo.push(join(dirname(rel), spec).replace(/\\/g, '/'));
    }
  }
  console.log('three.js add-ons bundled:', [...seen].sort().join(', '));

  // fonts: latin subsets only
  const vf = join(museum, 'vendor', 'fonts');
  mkdirSync(vf, { recursive: true });
  let css = '';
  for (const [pkg, file, weights] of [['press-start-2p', 'press-start-2p', [400]], ['space-grotesk', 'space-grotesk', [400, 600, 700]]]) {
    for (const w of weights) {
      const woff2 = `${file}-latin-${w}-normal.woff2`;
      cpSync(join(nm, '@fontsource', pkg, 'files', woff2), join(vf, woff2));
      const family = pkg === 'press-start-2p' ? 'Press Start 2P' : 'Space Grotesk';
      css += `@font-face{font-family:'${family}';font-style:normal;font-weight:${w};font-display:swap;src:url(./${woff2}) format('woff2');unicode-range:U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD;}\n`;
    }
    cpSync(join(nm, '@fontsource', pkg, 'LICENSE'), join(vf, `${file}-LICENSE.txt`));
  }
  writeFileSync(join(vf, 'fonts.css'), css);

  // point the page at the local copies
  const indexPath = join(museum, 'index.html');
  let html = readFileSync(indexPath, 'utf8');
  html = html.replace(/<link rel="preconnect"[^>]*>\s*/g, '')
    .replace(/<link href="https:\/\/fonts\.googleapis\.com[^>]*>/, '<link href="vendor/fonts/fonts.css" rel="stylesheet">')
    .replace('https://cdn.jsdelivr.net/npm/three@0.187.0/build/three.module.js', './vendor/three/build/three.module.js')
    .replace('https://cdn.jsdelivr.net/npm/three@0.187.0/examples/jsm/', './vendor/three/examples/jsm/');
  if (/googleapis|jsdelivr/.test(html)) { throw new Error('index.html still references a CDN'); }
  writeFileSync(indexPath, html);

  // the service worker only makes sense on the standalone site
  rmSync(join(museum, 'sw.js'), { force: true });

  // any other CDN reference left in the shipped JavaScript?
  const scan = (d) => readdirSync(d, { withFileTypes: true }).flatMap(e => e.isDirectory() ? scan(join(d, e.name)) : [join(d, e.name)]);
  for (const f of scan(join(museum, 'src'))) if (/https?:\/\/(cdn|fonts)\./.test(readFileSync(f, 'utf8'))) { throw new Error('CDN reference in', f); }

}
