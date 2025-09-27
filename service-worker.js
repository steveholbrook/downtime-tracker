// Revised Service Worker – fixes "Shift+F5 required" by using network-first for HTML, CSS, JS
// Generated: 2025-09-27T22:20:43.703455Z
// How to use:
// 1) Place this file at the web root of your GitHub Pages site (same folder as index.html).
// 2) In index.html, register it: navigator.serviceWorker.register('./service-worker.js');
// 3) Bump CACHE_VERSION on each deploy (or let your build inject a hash) to evict old caches immediately.

const CACHE_VERSION = 'v2025-09-28-01';               // <-- bump on each deploy
const CACHE_NAME    = 'downtime-tracker-' + CACHE_VERSION;

// (Optional) Precache a few core assets (add more as needed)
const PRECACHE_URLS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/apple-touch-icon.png',
  './favicon.ico'
];

self.addEventListener('install', (event) => {
  // Take over immediately on install
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS)).catch(() => null)
  );
});

self.addEventListener('activate', (event) => {
  // Remove old versioned caches and take control
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)));
      await self.clients.claim();
    })()
  );
});

// Utility: network-first with cache fallback
async function networkFirst(request, useReload = false) {
  try {
    const req = useReload ? new Request(request.url, { method: request.method, headers: request.headers, mode: request.mode, credentials: request.credentials, redirect: request.redirect, referrer: request.referrer, referrerPolicy: request.referrerPolicy, cache: 'reload' }) : request;
    const response = await fetch(req);
    const cache = await caches.open(CACHE_NAME);
    cache.put(request, response.clone());
    return response;
  } catch (err) {
    const cached = await caches.match(request);
    if (cached) return cached;
    throw err;
  }
}

// Utility: stale-while-revalidate
async function staleWhileRevalidate(request) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request);
  const network = fetch(request).then((response) => { cache.put(request, response.clone()); return response; }).catch(() => null);
  return cached || network || fetch(request);
}

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return; // don't cache POST/PUT/etc.

  const url = new URL(req.url);
  const accept = req.headers.get('accept') || '';

  // 1) HTML / navigation: ALWAYS try the network first (bypass HTTP cache), fallback to cache
  const isHTML = req.mode === 'navigate' || accept.includes('text/html');
  if (isHTML) {
    event.respondWith(networkFirst(req, /*useReload*/ true).catch(() => caches.match('./index.html')));
    return;
  }

  // Only apply strategies to same-origin resources
  if (url.origin === self.location.origin) {
    // 2) CSS & JS: network-first (with reload) so updates are picked up on normal reloads
    if (url.pathname.endsWith('.css') || url.pathname.endsWith('.js') || url.pathname.endsWith('.mjs')) {
      event.respondWith(networkFirst(req, /*useReload*/ true));
      return;
    }

    // 3) Other static assets (images, fonts): cache-first with background refresh
    if (/\.(png|jpg|jpeg|gif|webp|svg|ico|json|woff2?|ttf|eot)$/i.test(url.pathname)) {
      event.respondWith(staleWhileRevalidate(req));
      return;
    }
  }

  // 4) Default: just go to network (optionally cache opaque responses if desired)
  event.respondWith(fetch(req));
});

// Optional: allow the page to trigger SKIP_WAITING on demand
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
