const CACHE_NAME = 'zarchinar-restaurant-shell-v5';

const APP_ASSETS = [
  '/',
  '/restaurant',
  '/index.html',
  '/waiter.html',
  '/delivery.html',
  '/fake-order.html',
  '/counter.html',
  '/offline.html',
  '/styles.css',
  '/theme.js',
  '/auth.js',
  '/password-toggle.js',
  '/header-nav.js',
  '/offline.js',
  '/menu-data.js',
  '/manifest.json',
  '/asad.jpg',
  '/adij.jpeg',
  '/zarlogo.png',
  '/images/kabuli.jpg',
  '/images/beryani.png',
  '/images/zar-chinar-pizza-menu.png',
  '/images/burgur.jpg',
  '/images/bro.png',
  '/images/albaik-logo-print.png',
  '/images/shurma.jpg',
  '/images/pletter.png',
  '/images/cheps.jpg',
  '/images/cheeps2.jpg',
  '/images/kabab.jpg',
  '/images/roush.png',
  '/images/tea.webp',
  '/images/mashrobat.jpg',
  '/images/rolle.png',
  '/images/juise.jpg',
  '/images/iscrem.jpg',
  '/images/large.jpg',
  '/images/small.jpg',
  '/images/pood.jpg',
  '/images/karaye.jpg',
  '/images/pizza-point-logo.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);

  if (request.method !== 'GET' || url.origin !== self.location.origin) return;

  if (url.pathname.startsWith('/socket.io/') || url.pathname === '/health' || url.pathname === '/network-info') {
    return;
  }

  if (url.pathname.startsWith('/api/') || url.pathname === '/styles.css' || url.pathname === '/auth.js' || url.pathname === '/menu-custom.js' || url.pathname === '/menu-data.js') {
    event.respondWith(
      fetch(request, { cache: 'no-store' })
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          return response;
        })
        .catch(() => caches.match(request))
    );
    return;
  }

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          return response;
        })
        .catch(() => caches.match(request).then((cached) => cached || caches.match('/offline.html')))
    );
    return;
  }

  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request).then((response) => {
        const copy = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
        return response;
      });
    })
  );
});
