const CACHE_NAME = 'robots-massacre-v1';
const CORE_ASSETS = [
  '/',
  '/index.html',
  '/manifest.webmanifest',
  '/icons/icon.svg',
  '/icons/maskable.svg',
  '/icons/apple-touch-icon.svg',
  '/assets/art/Font.png',
  '/assets/art/FontBig.png',
  '/assets/art/Graphics.png',
  '/assets/art/GraphicsBig.png',
  '/assets/audio/Shoot.wav',
  '/assets/audio/BrickHit.wav',
  '/assets/audio/MetalHit.wav',
  '/levels/dm/open.rmm',
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(CORE_ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== location.origin) return;

  event.respondWith(
    caches.match(request).then((cached) => {
      const fetched = fetch(request).then((response) => {
        if (response.ok) {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
        }
        return response;
      }).catch(() => cached);
      return cached || fetched;
    }),
  );
});
