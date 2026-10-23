// Offline support. The app shell is cached on install; after that, files are
// served from the cache and refreshed in the background, so updates show up
// on the next launch. Bump CACHE when you want to force a clean cache.

const CACHE = 'micro-fitness-v6';
const SHELL = [
  './',
  'index.html',
  'css/app.css',
  'js/app.js',
  'js/state.js',
  'js/store.js',
  'js/data.js',
  'js/dom.js',
  'js/format.js',
  'js/queries.js',
  'js/ui.js',
  'js/router.js',
  'js/timer.js',
  'js/workout.js',
  'js/sheets.js',
  'js/progression.js',
  'js/phases.js',
  'js/rotation.js',
  'js/editor.js',
  'js/views/train.js',
  'js/views/session.js',
  'js/views/history.js',
  'js/views/progress.js',
  'js/views/routines.js',
  'manifest.webmanifest',
  'icons/icon.svg',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'icons/apple-touch-icon.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  const sameOrigin = url.origin === self.location.origin;
  const isFont = url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com';
  if (!sameOrigin && !isFont) return;

  event.respondWith(
    caches.open(CACHE).then(async (cache) => {
      const cached = await cache.match(req, { ignoreSearch: sameOrigin });
      const network = fetch(req)
        .then((res) => {
          if (res.ok || res.type === 'opaque') cache.put(req, res.clone());
          return res;
        })
        .catch(() => cached);
      // Fonts never change, so cache-first; app files: stale-while-revalidate.
      return cached || network;
    })
  );
});
