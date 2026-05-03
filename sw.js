const CACHE = 'granny-v1';
const SHELL = ['/', '/index.html', '/manifest.json', '/icons/icon.svg'];

// Install: cache the app shell
self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL).catch(() => {})));
  self.skipWaiting();
});

// Activate: delete old caches
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch: network-first for APIs, cache-first for the app shell
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);

  // Skip non-GET and cross-origin (API proxy calls go to Netlify functions)
  if (e.request.method !== 'GET') return;
  if (url.origin !== self.location.origin) return;

  // Netlify functions → always network (live data)
  if (url.pathname.startsWith('/.netlify/')) {
    e.respondWith(fetch(e.request).catch(() => new Response('', { status: 503 })));
    return;
  }

  // App shell → cache-first, update in background
  e.respondWith(
    caches.open(CACHE).then(async cache => {
      const cached = await cache.match(e.request);
      const networkFetch = fetch(e.request).then(res => {
        if (res.ok) cache.put(e.request, res.clone());
        return res;
      }).catch(() => null);
      return cached ?? await networkFetch ?? new Response('Offline', { status: 503 });
    })
  );
});
