/* Global cache version for service worker; bump to invalidate old caches on deploy */
const CACHE_NAME = 'finance-manager-v15';

// Critical assets – these MUST load offline
const PRECACHE_URLS = [
  // index.html (via /) // e.g. /my-app/ → serves index.html
  './',
  `./index.html`,
  `./manifest.webmanifest`,

  // Core pages (offline-first)
  `./views/landing.html`,
  `./views/auth/login.html`,
  `./views/auth/register.html`,
  `./views/dashboard/dashboard.html`,
  `./views/test.html`,
  `./views/404.html`,
  `./lang/en.json`,
  `./lang/pl.json`,

  // Assets
  `./images/favicon/web-app-manifest-192x192.png`,
  `./images/favicon/web-app-manifest-512x512.png`,

  // Fallback assets
  `./offline.html`,
];

// ───────────────────────────────────────────────────────────────────────────────────────
// INSTALL – Precache everything
// ───────────────────────────────────────────────────────────────────────────────────────
self.addEventListener('install', event => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then(cache => {
        console.log('Precaching core assets');
        return cache.addAll(
          PRECACHE_URLS.map(url => new Request(url, { credentials: 'same-origin' })),
        );
      })
      .then(() => self.skipWaiting())
      .catch(err => console.error('Precaching failed:', err)),
  );
});

// ───────────────────────────────────────────────────────────────────────────────────────
// ACTIVATE – Clean old caches
// ───────────────────────────────────────────────────────────────────────────────────────
self.addEventListener('activate', event => {
  const allowedCaches = [CACHE_NAME];

  event.waitUntil(
    caches
      .keys()
      .then(keys =>
        Promise.all(
          keys.map(key => {
            if (!allowedCaches.includes(key)) {
              console.log('Deleting old cache:', key);
              return caches.delete(key);
            }
          }),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

// ───────────────────────────────────────────────────────────────────────────────────────
// FETCH – Runtime caching with offline fallbacks
// ───────────────────────────────────────────────────────────────────────────────────────
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  // Ignore non-GET, API, chrome-extension, etc.
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
    caches.match(request).then(cachedResponse => {
      // 1. Return cache if exists
      if (cachedResponse) {
        // Optional: background update
        // fetch(request).then(resp => cache.put(request, resp.clone()));
        return cachedResponse;
      }

      // 2. Try network
      return fetch(request)
        .then(networkResponse => {
          if (
            !networkResponse ||
            networkResponse.status !== 200 ||
            networkResponse.type !== 'basic'
          ) {
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

          if (
            path.endsWith('.html') ||
            request.headers.get('accept')?.includes('text/html')
          ) {
            return caches.match(`./offline.html`) || caches.match(`./views/landing.html`);
          }

          if (path.endsWith('.css')) {
            return caches.match(request);
          }

          if (path.endsWith('.js')) {
            return new Response('console.warn("Offline – script failed");', {
              headers: { 'Content-Type': 'application/javascript' },
            });
          }

          // Images: show placeholder or nothing
          if (request.destination === 'image') {
            return new Response(null, { status: 503 });
          }

          // Final fallback: try landing page
          return caches.match(`./views/landing.html`);
        });
    }),
  );
});

// ───────────────────────────────────────────────────────────────────────────────────────
// PUSH & NOTIFICATION
// ───────────────────────────────────────────────────────────────────────────────────────
self.addEventListener('push', event => {
  const data = event.data?.json() || {
    title: 'FinanceFlow',
    body: 'You have a new notification',
  };

  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      tag: 'finance-notification',
      data: { url: data.url || './' },
    }),
  );
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  const url = event.notification.data.url || './';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientList => {
      for (const client of clientList) {
        if (client.url === url && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(url);
      }
    }),
  );
});
