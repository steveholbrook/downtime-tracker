// Safer Service Worker for GitHub Pages (Project Site) – avoids ERR_FAILED and stale loads
// Generated: 2025-09-27T23:25:23.104284Z
//
// What it does:
//  - Network-first for HTML/CSS/JS so normal reload picks up new code (no need for Shift+F5)
//  - Cache-first (with background refresh) for images/fonts
//  - Never throws for navigations: always returns a Response (network, cached index, or lightweight offline page)
//  - Cleans old caches and enables navigation preload for faster first paint
//
// Use:
// 1) Save as service-worker.js at your project root (same folder as index.html).
// 2) In index.html: navigator.serviceWorker.register('./service-worker.js');
// 3) Bump CACHE_VERSION on each deploy.

const CACHE_VERSION = 'v2025-09-28-02';   // <-- bump on each deploy
const CACHE_NAME    = 'downtime-tracker-' + CACHE_VERSION;
const SCOPE_BASE    = self.registration.scope;  // e.g., https://user.github.io/repo/
const INDEX_URL     = new URL('./index.html', SCOPE_BASE).toString();

// Best-effort precache: index.html + a few assets (misses won't fail install)
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil((async () => {
    try {
      const cache = await caches.open(CACHE_NAME);
      // Ensure index.html is in cache so we can always fall back
      try { await cache.add(new Request(INDEX_URL, { cache: 'reload' })); } catch (e) {}
      const extras = [
        './manifest.webmanifest',
        './icons/icon-192.png',
        './icons/icon-512.png',
        './icons/apple-touch-icon.png',
        './favicon.ico'
      ];
      await Promise.all(extras.map(u => cache.add(new URL(u, SCOPE_BASE).toString()).catch(() => null)));
    } catch (e) { /* swallow */ }
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    // Delete old versioned caches
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)));
    // Enable navigation preload for faster navigations
    if ('navigationPreload' in self.registration) {
      try { await self.registration.navigationPreload.enable(); } catch (e) {}
    }
    await self.clients.claim();
  })());
});

// Helpers
async function networkFirst(request, noStore = false) {
  try {
    const net = await fetch(request, noStore ? { cache: 'no-store' } : undefined);
    try { (await caches.open(CACHE_NAME)).put(request, net.clone()); } catch (e) {}
    return net;
  } catch (e) {
    const cached = await caches.match(request);
    if (cached) return cached;
    throw e;
  }
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request);
  const refresh = fetch(request).then((res) => { cache.put(request, res.clone()); return res; }).catch(() => null);
  return cached || refresh || fetch(request);
}

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);

  // 1) Navigations (HTML): try preload -> network(no-store) -> cached index -> tiny offline HTML
  if (req.mode === 'navigate') {
    event.respondWith((async () => {
      try {
        const preload = await event.preloadResponse;
        if (preload) return preload;
      } catch (e) { /* ignore */ }
      try {
        const net = await fetch(req, { cache: 'no-store' });
        // keep a copy of the latest index for offline fallback
        try {
          const cache = await caches.open(CACHE_NAME);
          await cache.put(INDEX_URL, net.clone());
        } catch (e) { /* ignore */ }
        return net;
      } catch (e) {
        const cachedIndex = await caches.match(INDEX_URL);
        if (cachedIndex) return cachedIndex;
        // Guaranteed fallback to avoid ERR_FAILED
        return new Response('<!doctype html><meta charset="utf-8"><title>Offline</title>\n<style>body{font-family:system-ui,-apple-system,Segoe UI,Roboto,Ubuntu,Helvetica,Arial,sans-serif;padding:2rem;}</style>\n<h1>Offline</h1><p>The app can\'t reach the network and no cached page is available yet.</p>',
          { headers: { 'Content-Type': 'text/html; charset=utf-8' } }
        );
      }
    })());
    return;
  }

  // Only apply caching strategies to same-origin resources
  if (url.origin === self.location.origin) {
    // 2) CSS/JS: network-first to pick up new code on normal reloads
    if (/\.(css|js|mjs)$/i.test(url.pathname)) {
      event.respondWith(networkFirst(req, /*noStore*/ true));
      return;
    }
    // 3) Static assets (images/fonts/etc.): cache-first with background refresh
    if (/\.(png|jpg|jpeg|gif|webp|svg|ico|json|woff2?|ttf|eot)$/i.test(url.pathname)) {
      event.respondWith(staleWhileRevalidate(req));
      return;
    }
  }

  // 4) Default: passthrough
  event.respondWith(fetch(req));
});

// Optional: allow the page to force-activate a newly installed SW immediately
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
