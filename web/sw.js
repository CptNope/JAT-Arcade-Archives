// Offline cache for the PWA build. Bump VERSION whenever files change.
const VERSION = 'jat-arcade-v9';
const SHELL = [
  './', './index.html', './manifest.webmanifest', './icons/icon.svg',
  './src/main.js', './src/museum.js', './src/flat.js', './src/visitor.js', './src/registry.js', './src/machines.js', './src/crt.js', './src/sfx.js', './src/exhibits.js',
  './src/games/base.js', './src/games/volley.js', './src/games/starsiege.js', './src/games/gemrunner.js',
  './src/games/serpent.js', './src/games/brickfall.js', './src/games/ttt.js', './src/games/targetbeam.js',
  './src/games/bertie.js', './src/games/oxo.js', './src/games/tennis.js', './src/games/spacewar.js',
  './src/games/terminal.js', './src/games/nimrod.js', './src/games/bouncingball.js', './src/games/starpatrol.js',
  './src/games/beast.js', './src/games/dungeon.js', './src/games/cavern.js', './src/games/turochamp.js',
  './src/games/draughts.js', './src/games/pool.js', './src/games/sumer.js', './src/games/chase.js', './src/games/empire.js',
  './src/games/vector.js', './src/games/nightroad.js', './src/games/rockfield.js', './src/games/moonlander.js',
  './src/games/cityshield.js', './src/games/gardenpest.js', './src/games/hopacross.js',
  './src/games/castlequest.js', './src/games/mazemonster.js', './src/games/junglerun.js', './src/games/chopper.js',
  './src/games/golddigger.js', './src/games/rockgem.js',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
// Own files: network-first, so a new deploy shows up right away; the cache is the offline fallback.
// CDN files (three.js, fonts) are versioned URLs: cache-first.
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  const sameOrigin = new URL(e.request.url).origin === self.location.origin;
  const save = (res) => {
    if (res.ok || res.type === 'opaque') { const copy = res.clone(); caches.open(VERSION).then((c) => c.put(e.request, copy)); }
    return res;
  };
  e.respondWith(sameOrigin
    ? fetch(e.request).then(save).catch(() => caches.match(e.request))
    : caches.match(e.request).then((hit) => hit || fetch(e.request).then(save)));
});
