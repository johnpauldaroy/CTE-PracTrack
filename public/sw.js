// CTE PracTrack service worker.
//
// Scope: app-shell caching and Web Push display only. Per CLAUDE.md, offline
// is not supported for writes — time-in/out, session assignment, evaluation
// submission, and uploads must all fail loudly when there is no connection,
// never be queued here. Do not add a fetch handler that intercepts or
// replays POST/PUT/PATCH/DELETE requests.

const CACHE_NAME = "practrack-shell-v1";
const SHELL_ASSETS = ["/", "/manifest.webmanifest", "/icons/icon-192.png", "/icons/icon-512.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL_ASSETS)).then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

// Only ever serve cached GET navigations/assets as a fallback when offline.
// Never intercept non-GET requests — those must reach the network and fail
// loudly if it's unavailable.
self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  event.respondWith(
    fetch(event.request).catch(() =>
      caches.match(event.request).then((cached) => cached ?? caches.match("/")),
    ),
  );
});

self.addEventListener("push", (event) => {
  if (!event.data) return;
  let payload;
  try {
    payload = event.data.json();
  } catch {
    payload = { title: "CTE PracTrack", body: event.data.text() };
  }

  event.waitUntil(
    self.registration.showNotification(payload.title ?? "CTE PracTrack", {
      body: payload.body,
      icon: "/icons/icon-192.png",
      badge: "/icons/icon-192.png",
      data: payload.data ?? {},
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url ?? "/";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url === targetUrl && "focus" in client) return client.focus();
      }
      if (self.clients.openWindow) return self.clients.openWindow(targetUrl);
    }),
  );
});
