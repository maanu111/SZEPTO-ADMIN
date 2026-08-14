/**
 * Service worker for the Kiranaclick admin PWA.
 *
 * Deliberately conservative: the dashboard shows live order and payment data, so
 * nothing from the network is cached and served stale. Only the static app shell
 * is precached, which is what makes the app installable and gives it an offline
 * fallback instead of the browser's error page.
 */
const VERSION = "szepto-admin-v1";
const SHELL = `${VERSION}-shell`;

const SHELL_ASSETS = [
  "/manifest.webmanifest",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/offline",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(SHELL)
      // A missing asset must not abort the whole install.
      .then((cache) => Promise.allSettled(SHELL_ASSETS.map((a) => cache.add(a))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== SHELL).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;

  // Never touch anything that isn't a plain GET page/asset request.
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Supabase calls and auth must always hit the network.
  if (url.pathname.startsWith("/auth/")) return;

  if (request.mode === "navigate") {
    // Network-first: the dashboard must never render stale orders.
    event.respondWith(
      fetch(request).catch(async () => {
        const cache = await caches.open(SHELL);
        return (await cache.match("/offline")) ?? Response.error();
      })
    );
    return;
  }

  // Static assets: cache-first, they're content-hashed by Next.
  if (url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/icons/")) {
    event.respondWith(
      caches.open(SHELL).then(async (cache) => {
        const hit = await cache.match(request);
        if (hit) return hit;
        const response = await fetch(request);
        if (response.ok) cache.put(request, response.clone());
        return response;
      })
    );
  }
});
