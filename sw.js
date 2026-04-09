const CACHE_NAME = 'cortex-cache-v1';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((names) => {
      return Promise.all(
        names.filter((name) => name !== CACHE_NAME).map((name) => caches.delete(name))
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  if (!event.request.url.includes('/api/v2/cortex/agent')) {
    return;
  }

  if (event.request.method !== 'POST') {
    return;
  }

  const requestClone = event.request.clone();

  event.respondWith(
    requestClone.text().then((body) => {
      const cacheKey = new Request(event.request.url + '?body=' + encodeURIComponent(body), {
        method: 'GET'
      });

      return caches.open(CACHE_NAME).then((cache) => {
        return cache.match(cacheKey).then((cached) => {
          if (cached) {
            return cached;
          }

          return fetch(event.request).then((response) => {
            if (response.ok) {
              cache.put(cacheKey, response.clone());
            }
            return response;
          });
        });
      });
    })
  );
});
