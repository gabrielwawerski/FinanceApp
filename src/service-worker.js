// src/service-worker.js

// No imports here — Vite will bundle automatically if you add them.
// Keep this file simple unless you add build plugins.

const CACHE_NAME = 'finance-manager-v8';

// All these exist in final dist/
// Paths must be relative to dist/ root
const PRECACHE_URLS = [
	'./',
	'./index.html',
	'./manifest.json',

	// From /public/
	'./offline.html',
	'./fallback.css',

	// Static pages (these MUST be inside /public or copied manually)
	'./views/landing.html',
	'./views/auth/login.html',
	'./views/auth/register.html',
	'./views/dashboard/dashboard.html'
];

// Install
self.addEventListener('install', event => {
	event.waitUntil(
		caches.open(CACHE_NAME)
			.then(cache => cache.addAll(PRECACHE_URLS))
			.then(() => self.skipWaiting())
	);
});

// Activate
self.addEventListener('activate', event => {
	event.waitUntil(
		caches.keys().then(keys =>
			Promise.all(
				keys.map(k => k !== CACHE_NAME ? caches.delete(k) : null)
			)
		).then(() => self.clients.claim())
	);
});

// Fetch
self.addEventListener('fetch', event => {
	const request = event.request;
	const url = new URL(request.url);

	// Ignore non-GET or foreign domains
	if (
		request.method !== 'GET' ||
		url.origin !== location.origin
	) {
		return;
	}

	event.respondWith(
		caches.match(request)
			.then(cached => {
				if (cached) return cached;

				return fetch(request)
					.then(resp => {
						if (resp.ok && resp.type === 'basic') {
							const clone = resp.clone();
							caches.open(CACHE_NAME).then(cache => {
								cache.put(request, clone);
							});
						}
						return resp;
					})
					.catch(() => {
						// Offline fallback
						if (request.headers.get('accept')?.includes('text/html')) {
							return caches.match('./offline.html');
						}
						if (request.destination === 'style') {
							return caches.match('./fallback.css');
						}
						return new Response('', { status: 503 });
					});
			})
	);
});

// Push
self.addEventListener('push', event => {
	const data = event.data?.json() || { title: 'FinanceFlow', body: 'New notification' };

	event.waitUntil(
		self.registration.showNotification(data.title, {
			body: data.body,
			tag: 'finance-notification',
			data: { url: data.url || './' }
		})
	);
});

// Click
self.addEventListener('notificationclick', event => {
	event.notification.close();
	const target = event.notification.data.url || './';

	event.waitUntil(
		clients.matchAll({ includeUncontrolled: true, type: 'window' })
			.then(list => {
				for (const c of list) {
					if (c.url === target && 'focus' in c) return c.focus();
				}
				return clients.openWindow(target);
			})
	);
});
