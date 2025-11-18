// service-worker.js
import { BASE } from "@core/config.js";   // ← Yes! Keep this if BASE is not '/'

// ──────────────────────────────────────────────────────────────
// 1. CONFIG
// ──────────────────────────────────────────────────────────────
const CACHE_NAME = 'finance-manager-v8';  // ← Bump version every deploy!

// Always use BASE for consistency (handles subfolder deploys like /my-app/)
const base = BASE.endsWith('/') ? BASE : BASE + '/';

// Critical assets – these MUST load offline
const PRECACHE_URLS = [
  '/',                              // index.html (via /)
  base,                             // e.g. /my-app/ → serves index.html
  `${base}index.html`,
  `${base}src/main.js`,
  `${base}src/css/styles.css`,
  `${base}manifest.json`,

  // Core pages (offline-first)
  `${base}views/landing.html`,
  `${base}views/auth/login.html`,
  `${base}views/auth/register.html`,
  `${base}views/dashboard/dashboard.html`,

  // Fallback assets
  `${base}offline.html`,            // ← You MUST create this!
  `${base}fallback.css`,            // Optional: minimal styles for offline
  `${base}icons/icon-192x192.png`,
  `${base}icons/icon-512x512.png`,
];

// ──────────────────────────────────────────────────────────────
// 2. INSTALL – Precache everything
// ──────────────────────────────────────────────────────────────
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Precaching core assets');
        return cache.addAll(PRECACHE_URLS.map(url => new Request(url, { credentials: 'same-origin' })));
      })
      .then(() => self.skipWaiting())
      .catch(err => console.error('Precaching failed:', err))
  );
});

// ──────────────────────────────────────────────────────────────
// 3. ACTIVATE – Clean old caches
// ──────────────────────────────────────────────────────────────
self.addEventListener('activate', event => {
  const allowedCaches = [CACHE_NAME];

  event.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.map(key => {
        if (!allowedCaches.includes(key)) {
          console.log('Deleting old cache:', key);
          return caches.delete(key);
        }
      })
    ))
    .then(() => self.clients.claim())
  );
});

// ──────────────────────────────────────────────────────────────
// 4. FETCH – Runtime caching with offline fallbacks
// ──────────────────────────────────────────────────────────────
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  // 1. Ignore non-GET, API, chrome-extension, etc.
  if (
    request.method !== 'GET' ||
    url.pathname.includes('/api/') ||
    url.origin !== location.origin ||
    url.href.includes('chrome-extension://') ||
    url.href.includes('firebase') ||
    url.href.includes('google-analytics')
  ) {
    return;
  }

  event.respondWith(
    caches.match(request)
      .then(cachedResponse => {
        // 1. Return cache if exists
        if (cachedResponse) {
          // Optional: background update
          // fetch(request).then(resp => cache.put(request, resp.clone()));
          return cachedResponse;
        }

        // 2. Try network
        return fetch(request)
          .then(networkResponse => {
            if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
              return networkResponse;
            }

            // Cache successful responses (but not huge files)
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then(cache => {
              cache.put(request, responseToCache);
            });

            return networkResponse;
          })
          .catch(() => {
            // 3. OFFLINE FALLBACKS
            const path = url.pathname;

            if (path.endsWith('.html') || request.headers.get('accept')?.includes('text/html')) {
              return caches.match(`${base}offline.html`) ||
                     caches.match(`${base}views/landing.html`);
            }

            if (path.endsWith('.css')) {
              return caches.match(`${base}fallback.css`) ||
                     new Response('/* Offline – styles unavailable */', {
                       headers: { 'Content-Type': 'text/css' }
                     });
            }

            if (path.endsWith('.js')) {
              return new Response('console.warn("Offline – script failed");', {
                headers: { 'Content-Type': 'application/javascript' }
              });
            }

            // Images: show placeholder or nothing
            if (request.destination === 'image') {
              return new Response(null, { status: 503 });
            }

            // Final fallback: try landing page
            return caches.match(`${base}views/landing.html`);
          });
      })
  );
});

// ──────────────────────────────────────────────────────────────
// 5. PUSH & NOTIFICATION (unchanged – good!)
// ──────────────────────────────────────────────────────────────
self.addEventListener('push', event => {
  const data = event.data?.json() || { title: 'FinanceFlow', body: 'You have a new notification' };

  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: `${base}icons/icon-192x192.png`,
      badge: `${base}icons/icon-72x72.png`,
      tag: 'finance-notification',
      data: { url: data.url || base },
    })
  );
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  const url = event.notification.data.url || base;

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then(clientList => {
        for (const client of clientList) {
          if (client.url === url && 'focus' in client) {
            return client.focus();
          }
        }
        if (clients.openWindow) {
          return clients.openWindow(url);
        }
      })
  );
});