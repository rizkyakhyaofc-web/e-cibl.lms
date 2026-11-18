/* E-CIBL PWA service worker.
 * Cangkang aplikasi (berkas di folder ini) disimpan agar bisa dibuka instan & saat offline.
 * Permintaan ke Google (script.google.com, googleusercontent.com) TIDAK pernah di-cache. */
const CACHE = 'ecibl-pwa-v1';
const SHELL = ['./', './index.html', './config.js', './manifest.json', './offline.html',
  './icon-192.png', './icon-512.png', './icon-maskable-512.png', './apple-touch-icon.png'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys()
    .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;          // Google & CDN: biarkan browser menangani

  // Halaman & config: jaringan dulu (agar pembaruan langsung terasa), cadangan dari cache.
  if (req.mode === 'navigate' || url.pathname.endsWith('/config.js')) {
    e.respondWith(fetch(req).then((res) => {
      const salin = res.clone(); caches.open(CACHE).then((c) => c.put(req, salin));
      return res;
    }).catch(() => caches.match(req).then((r) => r || caches.match('./index.html') || caches.match('./offline.html'))));
    return;
  }
  // Aset statis: cache dulu, perbarui diam-diam di belakang.
  e.respondWith(caches.match(req).then((cached) => {
    const jaringan = fetch(req).then((res) => {
      if (res.ok) { const salin = res.clone(); caches.open(CACHE).then((c) => c.put(req, salin)); }
      return res;
    }).catch(() => cached);
    return cached || jaringan;
  }));
});
