// Basic service worker for offline caching of static assets and navigation fallback
const CACHE_NAME = 'diva-salon-v3';
const OFFLINE_URL = '/';

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll([
      '/',
      '/manifest.webmanifest',
      '/icons/icon-192.svg',
      '/icons/icon-512.svg',
      '/icons/icon-192.png',
      '/icons/icon-512.png',
    ]))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  // Only handle GET
  if (req.method !== 'GET') return;

  // For navigations, try network first then offline fallback
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req).catch(() => caches.match(OFFLINE_URL))
    );
    return;
  }

  // For same-origin requests
  const url = new URL(req.url);
  if (url.origin === location.origin) {
    const path = url.pathname;

    // Never cache API responses; let network + server headers control it
    if (path.startsWith('/api/')) return;

    // Only cache-known static assets: Next static, icons, manifest
    const isStatic =
      path.startsWith('/_next/static/') ||
      path.startsWith('/icons/') ||
      path === '/manifest.webmanifest' ||
      path.endsWith('.png') || path.endsWith('.svg') || path.endsWith('.jpg') || path.endsWith('.jpeg') || path.endsWith('.gif') || path.endsWith('.webp') ||
      path.endsWith('.css') || path.endsWith('.js');

    if (isStatic) {
      // cache-first for static files
      event.respondWith(
        caches.match(req).then((cached) => {
          if (cached) return cached;
          return fetch(req).then((res) => {
            const copy = res.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(req, copy)).catch(()=>{});
            return res;
          }).catch(() => cached);
        })
      );
    } else {
      // network-first for other same-origin content, no caching
      event.respondWith(
        fetch(req).catch(() => caches.match(req))
      );
    }
  }
});
