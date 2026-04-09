var CACHE_NAME = 'lb-agent-cache-v1';
var CACHE_TTL = 30 * 60 * 1000;

self.addEventListener('install', function(e) {
  self.skipWaiting();
});

self.addEventListener('activate', function(e) {
  e.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', function(e) {
  var url = e.request.url;
  if (url.indexOf('/agents/') === -1 || url.indexOf(':run') === -1) {
    return;
  }

  e.respondWith(
    e.request.clone().text().then(function(body) {
      var cacheKey = new Request(url + '?_body=' + encodeURIComponent(body));

      return caches.open(CACHE_NAME).then(function(cache) {
        return cache.match(cacheKey).then(function(cached) {
          if (cached) {
            var tsHeader = cached.headers.get('x-cache-ts');
            if (tsHeader && (Date.now() - parseInt(tsHeader)) < CACHE_TTL) {
              return cached;
            }
          }
          return fetch(e.request).then(function(response) {
            var cloned = response.clone();
            var headers = new Headers(cloned.headers);
            headers.set('x-cache-ts', String(Date.now()));
            return cloned.blob().then(function(blob) {
              var cachedResponse = new Response(blob, {
                status: cloned.status,
                statusText: cloned.statusText,
                headers: headers
              });
              cache.put(cacheKey, cachedResponse);
              return response;
            });
          });
        });
      });
    })
  );
});
