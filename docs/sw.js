// Minimal Service Worker for PWA installability
const CACHE_NAME = 'notes-app-v1';
// Use relative paths so GitHub Pages subpaths work.
const ASSETS = [
  './',
  './index.html',
  './pwa-icon.png',
  './manifest.json'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(ASSETS))
      .catch((err) => console.log('SW cache error:', err))
  );
});

self.addEventListener('fetch', (e) => {
  e.respondWith(
    caches.match(e.request).then((response) => response || fetch(e.request))
  );
});
