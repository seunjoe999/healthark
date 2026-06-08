const CACHE = 'compcare-v3';
const OFFLINE_URL = '/index.html';

const PRECACHE = [
  '/',
  '/index.html',
  '/manifest.json',
  '/pwa-192.png',
  '/pwa-512.png',
  '/logo.jpeg',
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE)
      .then(cache => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  // Never intercept non-GET or API requests — let browser handle them directly
  if (request.method !== 'GET') return;
  if (url.pathname.startsWith('/api/')) return;
  if (url.pathname.startsWith('/uploads/')) return;

  // Navigation requests (page loads) — always try network first, fall back to cached index.html
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then(response => {
          // Cache a fresh copy of index.html on each successful navigation
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE).then(cache => cache.put(OFFLINE_URL, clone));
          }
          return response;
        })
        .catch(async () => {
          const cached = await caches.match(OFFLINE_URL);
          return cached || new Response('Offline — please check your connection', {
            status: 503,
            headers: { 'Content-Type': 'text/plain' },
          });
        })
    );
    return;
  }

  // Static assets (JS/CSS/images/fonts) — cache-first, network fallback
  if (url.pathname.match(/\.(js|css|png|jpg|jpeg|svg|ico|woff2|woff|ttf)$/)) {
    event.respondWith(
      caches.match(request).then(cached => {
        if (cached) return cached;
        return fetch(request).then(response => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE).then(cache => cache.put(request, clone));
          }
          return response;
        }).catch(() => new Response('', { status: 503 }));
      })
    );
    return;
  }

  // Everything else — network only, no caching
  event.respondWith(
    fetch(request).catch(() => new Response('', { status: 503 }))
  );
});
