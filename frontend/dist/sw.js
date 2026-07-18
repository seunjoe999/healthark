const CACHE = 'compcare-v4';
const DYNAMIC_CACHE = 'compcare-dynamic-v4';
const OFFLINE_URL = '/index.html';

const PRECACHE = [
  '/',
  '/index.html',
  '/manifest.json',
  '/pwa-192.png',
  '/pwa-512.png',
  '/logo.jpeg',
];

const OFFLINE_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>You're offline — CompCare Hub</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background: #0d1526;
      color: #fff;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 24px;
      text-align: center;
    }
    .card {
      max-width: 360px;
      width: 100%;
    }
    .icon {
      font-size: 56px;
      margin-bottom: 20px;
    }
    h1 {
      font-size: 22px;
      font-weight: 700;
      margin-bottom: 10px;
      color: #fff;
    }
    p {
      font-size: 14px;
      color: rgba(255,255,255,0.55);
      line-height: 1.6;
      margin-bottom: 8px;
    }
    .note {
      font-size: 13px;
      color: rgba(232,177,48,0.8);
      background: rgba(232,177,48,0.08);
      border: 1px solid rgba(232,177,48,0.2);
      border-radius: 12px;
      padding: 12px 16px;
      margin: 20px 0 24px;
    }
    button {
      background: linear-gradient(135deg, #e8b130, #d4961a);
      color: #0a0a0a;
      border: none;
      border-radius: 14px;
      padding: 14px 32px;
      font-size: 15px;
      font-weight: 700;
      cursor: pointer;
      width: 100%;
    }
    button:active { opacity: 0.85; }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">📡</div>
    <h1>You're offline</h1>
    <p>CompCare Hub needs a connection to load new data.</p>
    <div class="note">
      Daily records saved offline will sync automatically when you reconnect.
    </div>
    <button onclick="location.reload()">Try again</button>
  </div>
</body>
</html>`;

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE)
      .then(cache => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  const validCaches = [CACHE, DYNAMIC_CACHE];
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => !validCaches.includes(k)).map(k => caches.delete(k))
      ))
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

  // Navigation requests (page loads) — network first, offline HTML fallback
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
          if (cached) return cached;
          return new Response(OFFLINE_HTML, {
            status: 503,
            headers: { 'Content-Type': 'text/html; charset=utf-8' },
          });
        })
    );
    return;
  }

  // Static assets (JS/CSS/images/fonts) — cache-first, network fallback, store in dynamic cache
  if (url.pathname.match(/\.(js|css|png|jpg|jpeg|svg|ico|woff2|woff|ttf)$/)) {
    event.respondWith(
      caches.match(request).then(cached => {
        if (cached) return cached;
        return fetch(request).then(response => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(DYNAMIC_CACHE).then(cache => cache.put(request, clone));
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

// Push notification support
self.addEventListener('push', event => {
  const data = event.data?.json() ?? { title: 'CompCare Hub', body: 'You have a new notification' };
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: '/pwa-192.png',
      badge: '/pwa-192.png',
      tag: data.tag || 'compcare',
      data: { url: data.url || '/' }
    })
  );
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil(clients.openWindow(event.notification.data.url));
});
