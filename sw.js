// Today's Status — Lesson 6 service worker
// Keeps the app installable and usable offline.
const CACHE_NAME = 'todays-status-v32';
const APP_SHELL = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL))
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(names.filter((n) => n !== CACHE_NAME).map((n) => caches.delete(n)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  const isHTML = req.mode === 'navigate' ||
    req.destination === 'document' ||
    req.url.endsWith('/') ||
    req.url.endsWith('index.html');

  if (isHTML) {
    // Network-first for the HTML shell: always try to get the live,
    // current version first. Only fall back to the cached copy if the
    // network request fails (offline). This is what actually solves
    // "stuck on an old version" — no update-detection dance required,
    // no double-reload needed, no stale content when online.
    event.respondWith(
      fetch(req).then((response) => {
        const clone = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(req, clone));
        return response;
      }).catch(() => caches.match(req))
    );
    return;
  }

  // Cache-first for everything else (icons, manifest) — these rarely
  // change, so serving from cache is fast and still safe.
  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;
      return fetch(req).catch(() => cached);
    })
  );
});
