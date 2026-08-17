/* OfflinePOS service worker.
 *
 * Strategy:
 *  - `install` precaches the app shell (index.html, logo, icons) plus every
 *    product image so the menu renders fully offline on first use.
 *  - At build time `scripts/inject-sw-precache.mjs` replaces the
 *    `PRECACHE_ASSETS` placeholder below with the full hashed `dist` file list
 *    (`/assets/*.js`, `/assets/*.css`, …), so a production install ships the
 *    whole app offline. The line must stay byte-identical for the script.
 *  - Navigations are network-first with a cached-shell fallback; static
 *    assets (images, JS/CSS) are cache-first with a background refresh.
 *  - Vite dev-server modules (`/@…`, `/src/…`, `/node_modules/…`) are never
 *    intercepted so HMR keeps working during development.
 */

const CACHE = "offlinepos-v2";

const PRECACHE_ASSETS = []; // __PRECACHE_ASSETS__

const IMAGES = Array.from({ length: 24 }, (_, i) => `/images/p${String(i + 1).padStart(2, "0")}.jpg`);

const PRECACHE_URLS = [...new Set([
  "/",
  "/index.html",
  "/logo.svg",
  "/manifest.webmanifest",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/icons/apple-touch-icon.png",
  ...IMAGES,
  ...PRECACHE_ASSETS,
])];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))),
      )
      .then(() => self.clients.claim()),
  );
});

// The page asks the waiting worker to take over when the cashier taps
// "Reload" on the update banner. `controllerchange` on the page then reloads
// onto the new build.
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

const isDevAsset = (url) =>
  url.pathname.startsWith("/@") ||
  url.pathname.startsWith("/src/") ||
  url.pathname.startsWith("/node_modules/");

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (isDevAsset(url)) return;

  // Page navigations: try the network, fall back to the cached app shell.
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response && response.ok) {
            const copy = response.clone();
            caches.open(CACHE).then((cache) => cache.put("/index.html", copy));
          }
          return response;
        })
        .catch(() =>
          caches
            .match("/index.html")
            .then((cached) => cached || caches.match("/")),
        ),
    );
    return;
  }

  // Images + static assets: cache-first, refresh in the background.
  event.respondWith(
    caches.match(request).then((cached) => {
      const network = fetch(request)
        .then((response) => {
          if (response && response.ok) {
            const copy = response.clone();
            caches.open(CACHE).then((cache) => cache.put(request, copy));
          }
          return response;
        })
        .catch(() => cached);
      return cached || network;
    }),
  );
});
