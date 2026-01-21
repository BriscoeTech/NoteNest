// Minimal Service Worker for PWA installability
const CACHE_NAME = 'notes-app-v1';
const ASSETS = [
  '/',
  '/index.html',
  '/pwa-icon.png'
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
