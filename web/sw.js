// Offline cache for the PWA build. Bump VERSION whenever files change.
const VERSION = 'jat-arcade-v2';
const SHELL = [
  './', './index.html', './manifest.webmanifest', './icons/icon.svg',
  './src/main.js', './src/machines.js', './src/crt.js', './src/sfx.js', './src/exhibits.js',
  './src/games/base.js', './src/games/volley.js', './src/games/starsiege.js', './src/games/gemrunner.js',
  './src/games/serpent.js', './src/games/brickfall.js', './src/games/ttt.js', './src/games/targetbeam.js',
  './src/games/bertie.js', './src/games/oxo.js', './src/games/tennis.js', './src/games/spacewar.js',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
// cache-first for everything (app shell, three.js from the CDN, fonts); fill the cache as we go
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  e.respondWith(caches.match(e.request).then((hit) => hit || fetch(e.request).then((res) => {
    if (res.ok || res.type === 'opaque') { const copy = res.clone(); caches.open(VERSION).then((c) => c.put(e.request, copy)); }
    return res;
  })));
});
