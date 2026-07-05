// ⚠️ IMPORTANT: Change CACHE_NAME on every update!
// tile-planet-v1 → tile-planet-v2 → tile-planet-v3 → ...
const CACHE_NAME = 'tile-planet-v1';

const urlsToCache = [
  '/',
  '/index.html',
  '/offline.html',           // ✅ NEW: Offline fallback page
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
  '/manifest.json',
  '/service-worker.js',      // ✅ NEW: Self-cache
  '/tileplanet.vcf',         // ✅ NEW: vCard
  '/company-profile.pdf',    // ✅ NEW: Company Profile PDF
  '/icon-192.png',           // ✅ NEW: PWA Icon 192
  '/icon-512.png'            // ✅ NEW: PWA Icon 512
];

// Install – cache all assets
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[SW] Caching all assets');
        return cache.addAll(urlsToCache);
      })
      .then(() => self.skipWaiting())
  );
});

// Activate – clean old caches
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

// Fetch – Network First for HTML, Cache First for assets, Offline fallback
self.addEventListener('fetch', event => {
  const request = event.request;
  const url = new URL(request.url);

  // Skip cross-origin requests
  if (url.origin !== location.origin) return;

  // Navigation (HTML) – Network First, fallback to cache, then offline page
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then(response => {
          // Cache the fresh response
          const clonedResponse = response.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(request, clonedResponse);
          });
          return response;
        })
        .catch(async () => {
          // Network failed – try cache
          const cachedResponse = await caches.match(request);
          if (cachedResponse) {
            return cachedResponse;
          }
          // Nothing in cache – serve offline page
          return caches.match('/offline.html');
        })
    );
    return;
  }

  // Static assets – Cache First, update in background (Stale-While-Revalidate)
  event.respondWith(
    caches.match(request)
      .then(cachedResponse => {
        // Return cached response immediately if available
        if (cachedResponse) {
          // Update cache in background
          fetch(request)
            .then(networkResponse => {
              if (networkResponse && networkResponse.status === 200) {
                caches.open(CACHE_NAME).then(cache => {
                  cache.put(request, networkResponse);
                });
              }
            })
            .catch(() => {});
          return cachedResponse;
        }

        // Not in cache – fetch from network
        return fetch(request)
          .then(networkResponse => {
            if (networkResponse && networkResponse.status === 200) {
              caches.open(CACHE_NAME).then(cache => {
                cache.put(request, networkResponse.clone());
              });
            }
            return networkResponse;
          })
          .catch(() => {
            // If asset fetch fails and it's an image, return a placeholder
            // Otherwise just let it fail
            if (request.url.match(/\.(jpg|jpeg|png|gif|svg|webp)$/)) {
              // Return a simple transparent pixel or just fall through
            }
            return new Response('', { status: 404, statusText: 'Not Found' });
          });
      })
  );
});
