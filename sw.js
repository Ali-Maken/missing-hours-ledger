/* Hour Debt Ledger — offline cache.
 *
 * Strategy, and why:
 *
 *   Navigations (the app itself)  -> network-first, cache as fallback.
 *     Cache-first was wrong here. It always served the previous deploy, and a
 *     background refresh through a plain fetch() could be answered from the
 *     browser's own HTTP cache — so a stale shell could re-cache itself
 *     indefinitely. Network-first costs one quick request when online and
 *     still works with no signal, which is the whole point.
 *
 *   Everything else (icons, manifest) -> cache-first.
 *     They are immutable in practice; bump CACHE to roll them.
 *
 * Bump CACHE whenever any file below changes.
 */
const CACHE = "hour-debt-v5";
const SHELL = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./icon-192.png",
  "./icon-512.png",
  "./icon-maskable-512.png",
  "./icon-180.png"
];

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE)
      // `cache: "reload"` bypasses the HTTP cache, so installing during a
      // deploy can never bake a stale shell into a fresh cache.
      .then((c) => c.addAll(SHELL.map((u) => new Request(u, { cache: "reload" }))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  if (new URL(req.url).origin !== location.origin) return;  // nothing off-origin is used

  const isPage = req.mode === "navigate" || req.destination === "document";

  if (isPage) {
    e.respondWith(
      fetch(req)
        .then((res) => {
          if (res && res.ok) {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(req, copy));
          }
          return res;
        })
        .catch(() =>
          caches.match(req, { ignoreSearch: true })
            .then((hit) => hit || caches.match("./index.html", { ignoreSearch: true }))
        )
    );
    return;
  }

  e.respondWith(
    caches.match(req, { ignoreSearch: true }).then((hit) => {
      if (hit) return hit;
      return fetch(req).then((res) => {
        if (res && res.ok) {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy));
        }
        return res;
      });
    })
  );
});
