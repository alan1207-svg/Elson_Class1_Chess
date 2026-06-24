const CACHE = 'chess-v2';
const LOCAL = [
  './index.html',
  './style.css',
  './script.js',
  './laser.js',
  './manifest.json',
  './icons/icon.jpg',
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(LOCAL)));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  const local = e.request.url.startsWith(self.location.origin);
  if (local) {
    // Cache-first for local assets
    e.respondWith(caches.match(e.request).then(hit => hit || fetch(e.request)));
  } else {
    // Network-first for CDN (fonts, chess.js), fall back to cache
    e.respondWith(
      fetch(e.request)
        .then(res => {
          const clone = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
          return res;
        })
        .catch(() => caches.match(e.request))
    );
  }
});
