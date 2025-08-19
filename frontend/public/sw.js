/* eslint-env serviceworker */
/* eslint-disable no-restricted-globals */
/* Basic service worker for Allify push notifications and simple runtime caching */
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('push', (event) => {
  try {
    const data = event.data ? event.data.json() : {};
    const title = data.title || 'Allify';
    const body = data.body || 'You have a new notification';
    const icon = data.icon || '/logo192.png';
    const url = data.url || '/';
    const options = { body, icon, data: { url } };
    event.waitUntil(self.registration.showNotification(title, options));
  } catch (e) {
    // ignore
  }
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = (event.notification && event.notification.data && event.notification.data.url) || '/';
  event.waitUntil(
    (async () => {
      const allClients = await self.clients.matchAll({ includeUncontrolled: true, type: 'window' });
      for (const client of allClients) {
        if ('focus' in client) { client.navigate(url); return client.focus(); }
      }
      if (self.clients.openWindow) return self.clients.openWindow(url);
    })()
  );
});

self.addEventListener('fetch', () => { /* no-op passthrough, can extend with caches if needed */ });
/* eslint-disable */
/* global self, caches, location */
const CACHE_NAME = 'app-cache-v2';
const APP_SHELL = [
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon.ico',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  // Avoid caching audio streams to prevent huge storage usage
  if (url.pathname.startsWith('/music/stream') || url.pathname.startsWith('/music/hls')) return;
  // Navigation requests: network-first, fallback to cache, then offline page (index)
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((res) => {
          if (res && res.status === 206) return res; // don't cache partial
          const copy = res.clone(); caches.open(CACHE_NAME).then((c) => c.put(request, copy)); return res;
        })
        .catch(() => caches.match(request))
        .then((res) => res || caches.match('/index.html'))
    );
    return;
  }
  // For static assets: cache-first
  if (request.method === 'GET' && (url.origin === location.origin)) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request).then((res) => {
          if (res && res.status === 206) return res; // skip caching partial responses
          const copy = res.clone(); caches.open(CACHE_NAME).then((c) => c.put(request, copy)); return res;
        });
      })
    );
  }
});
