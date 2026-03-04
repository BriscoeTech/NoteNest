// Minimal Service Worker for PWA installability with safer updates.
const CACHE_PREFIX = 'notenest-v';
// Use relative paths so GitHub Pages subpaths work.
const PRECACHE_ASSETS = [
  './icons/pwa-icon.png',
  './manifest.json',
  './icons/favicon.ico',
  './version.json',
];

async function getCacheName() {
  try {
    const response = await fetch('./version.json', { cache: 'no-store' });
    if (response.ok) {
      const data = await response.json();
      if (data?.version) {
        return `${CACHE_PREFIX}${data.version}`;
      }
    }
  } catch {
    // fallback below
  }
  return `${CACHE_PREFIX}dev`;
}

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    (async () => {
      const cacheName = await getCacheName();
      const cache = await caches.open(cacheName);
      await cache.addAll(PRECACHE_ASSETS);
    })().catch((err) => console.log('SW cache error:', err))
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const cacheName = await getCacheName();
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((key) => key.startsWith(CACHE_PREFIX) && key !== cacheName)
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

  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) {
        return cached;
      }
      return fetch(request).then((response) => {
        if (response && response.ok) {
          const responseCopy = response.clone();
          getCacheName()
            .then((cacheName) => caches.open(cacheName))
            .then((cache) => cache.put(request, responseCopy))
            .catch(() => {});
        }
        return response;
      });
    })
  );
});
