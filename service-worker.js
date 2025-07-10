const CACHE_NAME = 'scalp-pro-static-cache-v2';
const urlsToCache = [
  '/',
  'index.html',
  'style.css',
  'app.js',
  'manifest.json',
  'icon-192.png',
  'icon-512.png',
  'https://unpkg.com/react@18/umd/react.development.js',
  'https://unpkg.com/react-dom@18/umd/react-dom.development.js',
  'https://unpkg.com/babel-standalone@6/babel.min.js',
  'https://unpkg.com/lucide@latest/dist/umd/lucide.js',
  'https://unpkg.com/lightweight-charts/dist/lightweight-charts.standalone.production.js',
  'https://cdnjs.cloudflare.com/ajax/libs/jsSHA/3.3.1/sha256.js',
  'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap',
  'https://fonts.gstatic.com/s/inter/v13/UcC73FwrK3iLTeHuS_fvQtMwCp50KnMa1ZL7W0Q5nw.woff2'
];

self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Opened cache');
        // Add all core assets to the cache.
        return cache.addAll(urlsToCache);
      })
  );
});

self.addEventListener('fetch', event => {
  // We only cache GET requests.
  if (event.request.method !== 'GET') {
    return;
  }
  
  // Network first strategy
  event.respondWith(
    fetch(event.request)
      .then(networkResponse => {
        // If the fetch is successful, cache the new response for app shell files
        let cache = caches.open(CACHE_NAME);
        // Check if the request URL is one of the core assets we want to cache
        if (urlsToCache.includes(event.request.url) || urlsToCache.includes(new URL(event.request.url).pathname)) {
            cache.then(c => c.put(event.request, networkResponse.clone()));
        }
        return networkResponse;
      })
      .catch(() => {
        // If the network fetch fails, try to serve from the cache.
        // This provides offline support for the app shell.
        return caches.match(event.request);
      })
  );
});

self.addEventListener('activate', event => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('notificationclick', event => {
    event.notification.close();
    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientList => {
            if (clientList.length > 0) {
                let client = clientList[0];
                for (let i = 0; i < clientList.length; i++) {
                    if (clientList[i].focused) {
                        client = clientList[i];
                    }
                }
                return client.focus();
            }
            return clients.openWindow('/');
        })
    );
});
