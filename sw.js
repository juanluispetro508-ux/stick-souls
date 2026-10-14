/* Caché para jugar sin conexión en la versión publicada (no se usa al abrir index.html directo). */
var CACHE = "stick-souls-v3";
var FILES = [
  "./",
  "./index.html",
  "./style.css",
  "./manifest.json",
  "./js/core.js",
  "./js/audio.js",
  "./js/input.js",
  "./js/rooms.js",
  "./js/rooms_data.js",
  "./js/physics.js",
  "./js/world.js",
  "./js/particles.js",
  "./js/bg.js",
  "./js/skeleton.js",
  "./js/player.js",
  "./js/enemies.js",
  "./js/boss.js",
  "./js/dog.js",
  "./js/objects.js",
  "./js/cinematic.js",
  "./js/ui.js",
  "./js/game.js",
  "./assets/icono-192.png",
  "./assets/icono-512.png",
  "./assets/arte/b_bloque_flor.png",
  "./assets/arte/b_bloque_musgo.png",
  "./assets/arte/b_enredadera.png",
  "./assets/arte/b_helecho.png",
  "./assets/arte/b_losa_media.png",
  "./assets/arte/borde_bosque.png",
  "./assets/arte/borde_ceniza.png",
  "./assets/arte/c_estandarte.png",
  "./assets/arte/c_farol_viga.png",
  "./assets/arte/c_losa_inclinada.png",
  "./assets/arte/c_losa_peq.png",
  "./assets/arte/c_losa_peq2.png",
  "./assets/arte/fondo_bosque.jpg",
  "./assets/arte/fondo_refugio.jpg",
  "./assets/arte/k_espalda.png",
  "./assets/arte/k_frente.png",
  "./assets/arte/k_lado.png",
  "./assets/arte/roca_bosque.png",
  "./assets/arte/roca_ceniza.png",
  "./assets/arte/v_capucha.png",
  "./assets/arte/v_frente.png",
  "./assets/fuentes/cormorant-garamond-latin-500-italic.woff2",
  "./assets/fuentes/cormorant-garamond-latin-600-italic.woff2",
  "./assets/fuentes/im-fell-english-latin-400-italic.woff2"
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
