const CACHE_NAME = 'finance-manager-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/src/main.js',
  '/src/css/styles.css',
  '/views/landing.html',
  '/views/auth/login.html',
  '/views/auth/register.html',
  '/views/dashboard/dashboard.html',
  '/manifest.json',
];

// Install event - cache files
self.addEventListener('install', event => {
  event.waitUntil(
	 caches.open(CACHE_NAME)
		.then(cache => {
		  console.log('Opened cache');
		  return cache.addAll(urlsToCache);
		})
		.then(() => self.skipWaiting())
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', event => {
  const cacheWhitelist = [CACHE_NAME];

  event.waitUntil(
	 caches.keys().then(cacheNames => {
	   return Promise.all(
		  cacheNames.map(cacheName => {
			if (!cacheWhitelist.includes(cacheName)) {
			  console.log('Deleting old cache:', cacheName);
			  return caches.delete(cacheName);
			}
		  })
	   );
	 }).then(() => self.clients.claim())
  );
});

// Fetch event - serve cached content when offline
self.addEventListener('fetch', event => {
  // Don't cache API requests or non-GET requests
  if (event.request.method !== 'GET' ||
	 event.request.url.includes('/api/') ||
	 event.request.url.includes('chrome-extension://')) {
	return;
  }

  event.respondWith(
	 caches.match(event.request)
		.then(response => {
		  // Return cached response if found
		  if (response) {
			return response;
		  }

		  // Clone the request to use for both cache and network
		  const fetchRequest = event.request.clone();

		  return fetch(fetchRequest)
			 .then(response => {
			   // Check if we received a valid response
			   if (!response || response.status !== 200 || response.type !== 'basic') {
				 return response;
			   }

			   // Clone the response to add to cache
			   const responseToCache = response.clone();

			   caches.open(CACHE_NAME)
				  .then(cache => {
					cache.put(event.request, responseToCache);
				  });

			   return response;
			 })
			 .catch(() => {
			   // Fallback for assets when offline
			   if (event.request.url.includes('.html')) {
				 return caches.match('/landing.html');
			   }

			   if (event.request.url.includes('.css')) {
				 return caches.match('/styles.css');
			   }

			   // Generic offline page for other resources
			   return caches.match('/offline.html');
			 });
		})
  );
});

// Push notification handling (for future implementation)
self.addEventListener('push', event => {
  const data = event.data.json();

  self.registration.showNotification(data.title, {
	body: data.body,
	icon: '/icons/icon-192x192.png',
	badge: '/icons/icon-72x72.png',
	data: {
	  url: data.url || '/'
	}
  });
});

self.addEventListener('notificationclick', event => {
  event.notification.close();

  event.waitUntil(
	 clients.matchAll({type: 'window'}).then(clientList => {
	   for (const client of clientList) {
		 if (client.url === event.notification.data.url && 'focus' in client) {
		   return client.focus();
		 }
	   }

	   if (clients.openWindow) {
		 return clients.openWindow(event.notification.data.url);
	   }
	 })
  );
});