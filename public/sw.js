/**
 * Pixeliia service worker: app-shell resilience only.
 *
 * - Runtime caching of same-origin static GETs (JS/CSS/images/fonts).
 *   Hashed Expo bundles are NEVER precached and NEVER pinned: entries are
 *   written on successful fetch and the whole cache is dropped whenever
 *   CACHE_VERSION changes, so deploys can never serve stale code mixes.
 * - Everything else passes through untouched: cross-origin requests
 *   (Supabase, Replicate CDN, signed URLs), POST/PUT/DELETE, auth, uploads,
 *   AI jobs, credits, private photos and API traffic are never cached.
 * - Offline: previously seen static resources load; navigations fall back
 *   to the cached shell; online-only actions fail in the app's own UI.
 */
const CACHE_VERSION = "pixeliia-v1";
const SHELL_CACHE = `pixeliia-shell-${CACHE_VERSION}`;

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== SHELL_CACHE)
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname === "/sw.js") return;

  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response.ok) {
          const copy = response.clone();
          event.waitUntil(
            caches.open(SHELL_CACHE).then((cache) => cache.put(request, copy)),
          );
        }
        return response;
      })
      .catch(async () => {
        const cached = await caches.match(request);
        if (cached) return cached;
        if (request.mode === "navigate") {
          const shell = await caches.match("/index.html");
          if (shell) return shell;
        }
        throw new Error("offline and not cached");
      }),
  );
});
