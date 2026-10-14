/* Caché para jugar sin conexión en la versión publicada (no se usa al abrir index.html directo). */
var CACHE = "stick-souls-v1";
var FILES = [
  "./", "./index.html", "./style.css", "./manifest.json",
  "./js/core.js", "./js/audio.js", "./js/input.js", "./js/rooms.js", "./js/world.js", "./js/particles.js",
  "./js/bg.js", "./js/player.js", "./js/enemies.js", "./js/boss.js", "./js/ui.js", "./js/game.js",
  "./assets/icono-192.png", "./assets/icono-512.png"
];
self.addEventListener("install", function (e) {
  e.waitUntil(caches.open(CACHE).then(function (c) { return c.addAll(FILES); }).then(function () { return self.skipWaiting(); }));
});
self.addEventListener("activate", function (e) {
  e.waitUntil(caches.keys().then(function (keys) {
    return Promise.all(keys.filter(function (k) { return k !== CACHE; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});
self.addEventListener("fetch", function (e) {
  if (e.request.method !== "GET") return;
  e.respondWith(
    fetch(e.request).then(function (r) {
      var copy = r.clone();
      caches.open(CACHE).then(function (c) { c.put(e.request, copy); });
      return r;
    }).catch(function () { return caches.match(e.request); })
  );
});
