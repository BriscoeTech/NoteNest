// Minimal Service Worker for PWA installability with safer updates.
const CACHE_PREFIX = 'notenest-v';
const CACHE_NAME = `${CACHE_PREFIX}2.43.0`;
// Use relative paths so GitHub Pages subpaths work.
const PRECACHE_ASSETS = [
  './icons/pwa-icon.png',
  './manifest.json',
  './icons/favicon.ico',
  './version.json',
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      await cache.addAll(PRECACHE_ASSETS);
    })().catch((err) => console.log('SW cache error:', err))
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((key) => key.startsWith(CACHE_PREFIX) && key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      );
      await self.clients.claim();
    })()
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

  // Always fetch latest runtime version file.
  if (request.url.includes('/version.json')) {
    event.respondWith(fetch(request, { cache: 'no-store' }));
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
          caches.open(CACHE_NAME)
            .then((cache) => cache.put(request, responseCopy))
            .catch(() => {});
        }
        return response;
      });
    })
  );
});
