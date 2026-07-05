// ⚠️ Change CACHE_NAME on every update
const CACHE_NAME = 'tile-planet-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/Logo.png',
  '/Company.png',
  '/showroom.jpg',
  '/map.jpeg',
  '/upi-qr.png',
  '/contact-qr.jpg',
  '/Walltiles.jpg',
  '/Floortiles.jpg',
  '/Vitrifiedtiles.jpg',
  '/Parckingtiles.jpg',
  '/bathroomtiles.jpg',
  '/manifest.json'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[SW] Caching assets');
        return cache.addAll(urlsToCache);
      })
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('[SW] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
    .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const request = event.request;
  const url = new URL(request.url);
  if (url.origin !== location.origin) return;

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then(response => {
          const clonedResponse = response.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(request, clonedResponse);
          });
          return response;
        })
        .catch(() => caches.match(request))
    );
    return;
  }

  event.respondWith(
    caches.match(request)
      .then(cachedResponse => {
        const networkFetch = fetch(request)
          .then(networkResponse => {
            if (networkResponse && networkResponse.status === 200) {
              const clonedResponse = networkResponse.clone();
              caches.open(CACHE_NAME).then(cache => {
                cache.put(request, clonedResponse);
              });
            }
            return networkResponse;
          })
          .catch(() => {});
        return cachedResponse || networkFetch;
      })
  );
});
