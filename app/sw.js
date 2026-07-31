const CACHE_NAME = 'ebc-manager-v11';
const APP_SHELL = [
  './',
  './index.html',
  './app.css',
  './app.js',
  './quotes-center.css',
  './quotes-center.js',
  './quote.html',
  './quote.css',
  './quote-cloud.css',
  './quote.js',
  './proposal.html',
  './proposal.css',
  './proposal-core.js',
  './proposal.js',
  './invoice.html',
  './invoice.css',
  './invoice-core.js',
  './invoice.js',
  './render.html',
  './render.css',
  './render-core.js',
  './render.js',
  './plan-math.js',
  './plan.js',
  './manifest.webmanifest',
  '../assets/images/logo.png'
];
const CACHE_PATHS = new Set(APP_SHELL.map(path => new URL(path, self.location.href).pathname));

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const requestUrl = new URL(event.request.url);
  if (
    event.request.method !== 'GET' ||
    requestUrl.origin !== self.location.origin ||
    !CACHE_PATHS.has(requestUrl.pathname)
  ) return;

  event.respondWith(
    fetch(event.request)
      .then(response => {
        if (response.ok) {
          const copy = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, copy));
        }
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});
