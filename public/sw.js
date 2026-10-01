const CACHE = 'bnd-fan-club-v2'
const APP_SHELL = ['/', '/site.webmanifest', '/favicon.svg', '/icons/icon-192.png', '/icons/icon-512.png', '/icons/icon-maskable-512.png']

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(APP_SHELL)).then(() => self.skipWaiting()))
})

self.addEventListener('activate', (event) => {
  event.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key)))).then(() => self.clients.claim()))
})

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return
  const url = new URL(event.request.url)
  if (url.origin !== self.location.origin) return
  // never cache API responses: they are private (session, dashboard, tickets) and must always be fresh
  if (url.pathname.startsWith('/api/')) return
  event.respondWith(
    fetch(event.request).then((response) => {
      const copy = response.clone()
      caches.open(CACHE).then((cache) => cache.put(event.request, copy)).catch(() => {})
      return response
    }).catch(() => caches.match(event.request).then((cached) => cached || caches.match('/')))
  )
})
