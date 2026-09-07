// Service worker minimo: no cachea nada (el alcance no contempla modo
// offline), solo existe para que el navegador considere la app instalable
// como PWA (Chrome exige un service worker con un handler de "fetch").
self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", (event) => {
  event.respondWith(fetch(event.request));
});
