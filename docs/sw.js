// Minimal Service Worker for PWA installability with safer updates.
const CACHE_NAME = 'notes-app-v4';
// Use relative paths so GitHub Pages subpaths work.
const PRECACHE_ASSETS = [
  './pwa-icon.png',
  './manifest.json',
  './favicon.png',
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_ASSETS))
      .catch((err) => console.log('SW cache error:', err))
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;

  if (request.mode === 'navigate') {
    // Always fetch the latest HTML to avoid stale shell/hashed assets.
    event.respondWith(
      fetch(request, { cache: 'no-store' })
    );
    return;
  }

  if (request.method !== 'GET') {
    return;
  }

  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) {
        return cached;
      }
      return fetch(request).then((response) => {
        if (response && response.ok) {
          const responseCopy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, responseCopy)).catch(() => {});
        }
        return response;
      });
    })
  );
});
