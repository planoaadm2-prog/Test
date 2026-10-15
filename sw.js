const CACHE = 'convenios-demo-mobile-v1-' + new URL('./', self.location).pathname;
const ASSETS = ['./', './manifest.webmanifest', './icon-192.png', './icon-512.png'].map(path => new URL(path, self.location).pathname);
self.addEventListener('install', event => event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(ASSETS)).then(() => self.skipWaiting())));
self.addEventListener('activate', event => event.waitUntil(self.clients.claim()));
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  if (event.request.method !== 'GET' || url.origin !== self.location.origin || !ASSETS.includes(url.pathname)) return;
  event.respondWith(fetch(event.request).then(async response => {
    if (response.ok) { const cache = await caches.open(CACHE); await cache.put(event.request, response.clone()); }
    return response;
  }).catch(() => caches.match(event.request).then(response => response || Response.error())));
});
