// Cache only static assets, never pages, API responses, or authentication redirects.
const CACHE = 'docflow-static-v1';
self.addEventListener('install', event => { event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(['/icon-192.png','/icon-512.png','/manifest.webmanifest']))); self.skipWaiting(); });
self.addEventListener('activate', event => { event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k.startsWith('docflow-static-') && k !== CACHE).map(k => caches.delete(k))))); self.clients.claim(); });
self.addEventListener('fetch', event => { const url = new URL(event.request.url); if (event.request.method !== 'GET' || url.origin !== location.origin || !['/icon-192.png','/icon-512.png','/manifest.webmanifest'].includes(url.pathname)) return; event.respondWith(caches.match(event.request).then(cached => cached || fetch(event.request))); });
