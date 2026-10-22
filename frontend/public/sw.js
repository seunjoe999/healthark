const CACHE = 'compcare-v19';
const DYNAMIC_CACHE = 'compcare-dynamic-v19';
const OFFLINE_URL = '/index.html';

const PRECACHE = [
  '/',
  '/index.html',
  '/manifest.json',
];

// API paths cached for offline read access (stale-while-revalidate when online, cached fallback when offline)
const OFFLINE_API_PREFIXES = [
  '/api/service-users',
  '/api/care-plans',
  '/api/mar',
  '/api/tasks',
  '/api/daily-records',
  '/api/shifts',
  '/api/handover',
  '/api/homes',
  '/api/staff',
  '/api/alerts',
  '/api/incidents',
  '/api/risk-assessments',
  '/api/fluid-balance',
  '/api/medication-stock',
];

function isCacheableApiGet(request, url) {
  if (request.method !== 'GET') return false;
  if (!url.pathname.startsWith('/api/')) return false;
  return OFFLINE_API_PREFIXES.some(prefix => url.pathname === prefix || url.pathname.startsWith(prefix + '/'));
}

function offlineWriteQueuedResponse() {
  return new Response(
    JSON.stringify({
      success: true,
      queued: true,
      offline: true,
      message: 'Saved offline — queued for automatic sync when signal returns',
      data: { offlineQueued: true, queuedAt: new Date().toISOString() },
    }),
    {
      status: 202,
      headers: {
        'Content-Type': 'application/json',
        'X-Offline-Queued': '1',
      },
    }
  );
}

// ── IndexedDB helper inside Service Worker for Background Sync ────────────────
const IDB_NAME = 'compcare-offline-db';
const IDB_STORE = 'mutation-queue';

function openQueueDb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(IDB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(IDB_STORE)) {
        db.createObjectStore(IDB_STORE, { keyPath: 'id' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function flushQueuedMutationsFromSW() {
  try {
    const db = await openQueueDb();
    const items = await new Promise((resolve, reject) => {
      const tx = db.transaction(IDB_STORE, 'readonly');
      const req = tx.objectStore(IDB_STORE).getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
    items.sort((a, b) => a.createdAt - b.createdAt);
    for (const item of items) {
      try {
        const res = await fetch(item.url, {
          method: item.method,
          headers: item.headers || { 'Content-Type': 'application/json' },
          body: item.body || undefined,
        });
        if (res.ok || (res.status >= 400 && res.status < 500 && res.status !== 408 && res.status !== 429)) {
          await new Promise((resolve, reject) => {
            const tx = db.transaction(IDB_STORE, 'readwrite');
            tx.objectStore(IDB_STORE).delete(item.id);
            tx.oncomplete = () => resolve(true);
            tx.onerror = () => reject(tx.error);
          });
        } else {
          break;
        }
      } catch {
        break; // Still offline
      }
    }
    const clients = await self.clients.matchAll({ type: 'window' });
    clients.forEach(client => client.postMessage({ type: 'OFFLINE_QUEUE_SYNCED' }));
  } catch {
    // Will retry on next online event
  }
}

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE)
      .then(cache => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('message', event => {
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting();
  if (event.data?.type === 'PURGE_ALL_CACHES') {
    event.waitUntil(
      caches.keys().then(keys => Promise.all(keys.map(k => caches.delete(k))))
    );
  }
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const validCaches = [CACHE, DYNAMIC_CACHE];
    const keys = await caches.keys();
    const staleKeys = keys.filter(k => !validCaches.includes(k));
    if (staleKeys.length > 0) {
      await Promise.all(staleKeys.map(k => caches.delete(k)));
    }
    await self.clients.claim();
    // Auto-heal open mobile tabs/PWAs (including tabs trapped on older pre-self-healing
    // builds) whenever stale caches were purged by a new deployment.
    if (staleKeys.length > 0) {
      const windowClients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      await Promise.all(windowClients.map(client => {
        try {
          return client.navigate ? client.navigate(client.url) : Promise.resolve();
        } catch {
          return Promise.resolve();
        }
      }));
    }
  })());
});

self.addEventListener('sync', event => {
  if (event.tag === 'compcare-offline-sync') {
    event.waitUntil(flushQueuedMutationsFromSW());
  }
});

self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  // Only handle same-origin HTTP(S) requests
  if (url.origin !== self.location.origin) return;

  // Offline-capable API GET endpoints: network first (fresh live data), fallback to cached snapshot when offline
  if (isCacheableApiGet(request, url)) {
    event.respondWith(
      fetch(request)
        .then(response => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(DYNAMIC_CACHE).then(cache => cache.put(request, clone));
          }
          return response;
        })
        .catch(async () => {
          const cached = await caches.match(request);
          if (cached) {
            const headers = new Headers(cached.headers);
            headers.set('X-Served-From-Offline-Cache', '1');
            return new Response(cached.body, {
              status: cached.status,
              statusText: cached.statusText,
              headers,
            });
          }
          return new Response(
            JSON.stringify({ success: false, offline: true, error: 'Offline and no cached copy available yet' }),
            { status: 503, headers: { 'Content-Type': 'application/json' } }
          );
        })
    );
    return;
  }

  // Non-GET API writes when offline: let browser attempt network; if network fails on non-auth endpoints, respond gracefully
  if (url.pathname.startsWith('/api/') && request.method !== 'GET') {
    if (url.pathname.startsWith('/api/auth/')) return;
    event.respondWith(
      fetch(request).catch(() => offlineWriteQueuedResponse())
    );
    return;
  }

  // Skip other API or upload requests
  if (url.pathname.startsWith('/api/')) return;
  if (url.pathname.startsWith('/uploads/')) return;

  // Navigation requests (page loads) — network first with cache:'no-store' so HTTP disk cache never serves a stale shell
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request, { cache: 'no-store' })
        .then(response => {
          // Cache a fresh copy of index.html on each successful navigation
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE).then(cache => cache.put('/index.html', clone));
          }
          return response;
        })
        .catch(() => caches.match(OFFLINE_URL))
    );
    return;
  }

  // Static JS/CSS/font/image assets — cache first for hashed assets, with strict MIME guard so SPA HTML never poisons JS/CSS cache
  if (
    request.method === 'GET' &&
    /\.(js|css|woff2?|ttf|png|jpg|jpeg|svg|ico|webp)$/.test(url.pathname)
  ) {
    const isJs = url.pathname.endsWith('.js');
    const isCss = url.pathname.endsWith('.css');
    const hasValidAssetMime = response => {
      const ct = (response.headers.get('content-type') || '').toLowerCase();
      if (ct.includes('text/html')) return false;
      if (isJs && ct && !ct.includes('javascript') && !ct.includes('ecmascript')) return false;
      if (isCss && ct && !ct.includes('css')) return false;
      return true;
    };

    event.respondWith(
      caches.match(request).then(cached => {
        if (cached && hasValidAssetMime(cached)) return cached;
        return fetch(request, { cache: 'no-store' }).then(response => {
          if (response.ok && hasValidAssetMime(response)) {
            const clone = response.clone();
            caches.open(DYNAMIC_CACHE).then(cache => cache.put(request, clone));
          }
          return response;
        });
      })
    );
    return;
  }
});

// ── Web Push Notifications ────────────────────────────────────────────────────
self.addEventListener('push', event => {
  let payload = { title: 'CompCare Hub', body: 'New care notification', url: '/' };
  try {
    if (event.data) payload = { ...payload, ...event.data.json() };
  } catch {
    if (event.data) payload.body = event.data.text();
  }
  event.waitUntil(
    self.registration.showNotification(payload.title || 'CompCare Hub', {
      body: payload.body || '',
      icon: '/pwa-192.png',
      badge: '/pwa-192.png',
      tag: payload.tag || 'compcare-alert',
      renotify: true,
      data: { url: payload.url || '/' },
    })
  );
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || '/';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientList => {
      for (const client of clientList) {
        if ('focus' in client) {
          client.navigate(targetUrl);
          return client.focus();
        }
      }
      if (self.clients.openWindow) return self.clients.openWindow(targetUrl);
    })
  );
});
