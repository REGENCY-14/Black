/*
 * Service worker: makes the storefront installable and keeps pages you have already opened working
 * without a connection. Hand-written (no build plugin) so it works the same with Turbopack.
 *
 * Strategy
 *  - Page navigations: network first, saved copy when offline, /offline page as the last resort.
 *  - Built assets and images: cache first (hashed files never change), refreshed in the background.
 *  - Never touched: the admin area, non-GET requests, other origins, and in-app data requests.
 *
 * Bump VERSION to drop every old cache on the next visit.
 */
const VERSION = "v2";
const STATIC_CACHE = `static-${VERSION}`;
const PAGE_CACHE = `pages-${VERSION}`;
const MAX_PAGES = 40;
const PRECACHE = ["/offline", "/icons/icon-192.png", "/icons/icon-512.png", "/brand/mark.png", "/brand/mark-white.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(STATIC_CACHE);
      await cache.addAll(PRECACHE);
      // Also keep the scripts and styles the offline page needs, so it still works with no connection.
      try {
        const html = await (await fetch("/offline", { cache: "reload" })).text();
        const assets = [...new Set(html.match(/\/_next\/static\/[^"'\\\s)]+\.(?:js|css)/g) ?? [])];
        await Promise.allSettled(assets.map((a) => cache.add(a)));
      } catch {
        /* offline during install: the page itself is already cached */
      }
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keep = new Set([STATIC_CACHE, PAGE_CACHE]);
      for (const name of await caches.keys()) if (!keep.has(name)) await caches.delete(name);
      await self.clients.claim();
    })(),
  );
});

const isStaticAsset = (url) =>
  url.pathname.startsWith("/_next/static/") ||
  /^\/(icons|brand|products|delivered)\//.test(url.pathname) ||
  /\.(?:png|jpg|jpeg|webp|avif|svg|ico|woff2?)$/.test(url.pathname);

async function trimPages() {
  const cache = await caches.open(PAGE_CACHE);
  const keys = await cache.keys();
  for (const k of keys.slice(0, Math.max(0, keys.length - MAX_PAGES))) await cache.delete(k);
}

async function networkFirstPage(request) {
  const cache = await caches.open(PAGE_CACHE);
  try {
    const res = await fetch(request);
    // only keep good, same-origin, non-redirected pages
    if (res.ok && res.type === "basic" && !res.redirected) {
      cache.put(request, res.clone()).then(trimPages);
    }
    return res;
  } catch {
    return (await cache.match(request)) || (await caches.match("/offline")) || Response.error();
  }
}

async function cacheFirstAsset(request) {
  const cache = await caches.open(STATIC_CACHE);
  const hit = await cache.match(request);
  if (hit) {
    // refresh quietly, so images and icons do not go stale forever
    if (!request.url.includes("/_next/static/")) {
      fetch(request)
        .then((res) => res.ok && cache.put(request, res))
        .catch(() => undefined);
    }
    return hit;
  }
  const res = await fetch(request);
  if (res.ok && res.type === "basic") cache.put(request, res.clone());
  return res;
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/admin") || url.pathname.startsWith("/api") || url.pathname === "/sw.js") return;

  if (request.mode === "navigate") {
    event.respondWith(networkFirstPage(request));
    return;
  }
  // In-app navigations fetch RSC payloads: leave those to the network (and Next's own fallback to a full load).
  if (request.headers.get("RSC") || url.searchParams.has("_rsc")) return;

  if (isStaticAsset(url)) event.respondWith(cacheFirstAsset(request));
});
