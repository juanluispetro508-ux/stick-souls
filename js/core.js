/* =====================================================================
   STICK SOULS · núcleo: utilidades matemáticas, azar con semilla,
   brillos precalculados, almacenamiento y vibración.
   ===================================================================== */
(function () {
  "use strict";
  var SS = (window.SS = window.SS || {});

  SS.T = 32;                       // tamaño de una baldosa en unidades del mundo
  SS.STEP = 1 / 60;                // paso fijo de la simulación
  SS.DEBUG = /[?&]debug=1/.test(location.search);

  SS.clamp = function (v, a, b) { return v < a ? a : v > b ? b : v; };
  SS.lerp = function (a, b, t) { return a + (b - a) * t; };
  SS.approach = function (v, t, d) { return v < t ? Math.min(v + d, t) : Math.max(v - d, t); };
  SS.sign = function (v) { return v < 0 ? -1 : v > 0 ? 1 : 0; };
  SS.rand = function (a, b) { return a + Math.random() * (b - a); };
  SS.randi = function (a, b) { return Math.floor(a + Math.random() * (b - a + 1)); };
  SS.pick = function (arr) { return arr[Math.floor(Math.random() * arr.length)]; };
  SS.overlap = function (ax, ay, aw, ah, bx, by, bw, bh) {
    return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
  };
  SS.boxHit = function (a, b) { return SS.overlap(a.x, a.y, a.w, a.h, b.x, b.y, b.w, b.h); };

  /** Ruido determinista por coordenada (para detalles de baldosas). */
  SS.hash2 = function (x, y, s) {
    var h = (Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263) + Math.imul((s || 0) | 0, 1442695041)) | 0;
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    h ^= h >>> 16;
    return (h >>> 0) / 4294967296;
  };

  /** Generador pseudoaleatorio con semilla (xorshift32). */
  SS.makeRng = function (seed) {
    var s = (seed >>> 0) || 1;
    return function () {
      s ^= s << 13; s >>>= 0;
      s ^= s >>> 17;
      s ^= s << 5; s >>>= 0;
      return s / 4294967296;
    };
  };

  /* Brillos: un degradado radial por color, dibujado una sola vez y reutilizado.
     Es mucho más barato que shadowBlur en teléfonos modestos. */
  var glowCache = {};
  SS.glow = function (rgb) {
    var c = glowCache[rgb];
    if (c) return c;
    c = document.createElement("canvas");
    c.width = c.height = 64;
    var g = c.getContext("2d");
    var grd = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    grd.addColorStop(0, "rgba(" + rgb + ",1)");
    grd.addColorStop(0.3, "rgba(" + rgb + ",0.5)");
    grd.addColorStop(1, "rgba(" + rgb + ",0)");
    g.fillStyle = grd;
    g.fillRect(0, 0, 64, 64);
    glowCache[rgb] = c;
    return c;
  };
  SS.drawGlow = function (ctx, x, y, r, rgb, alpha) {
    if (alpha <= 0 || r <= 0) return;
    var prevOp = ctx.globalCompositeOperation;
    ctx.globalCompositeOperation = "lighter";
    ctx.globalAlpha = Math.min(1, alpha);
    ctx.drawImage(SS.glow(rgb), x - r, y - r, r * 2, r * 2);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = prevOp;
  };

  SS.store = {
    get: function (k, def) {
      try { var v = localStorage.getItem(k); return v ? JSON.parse(v) : def; } catch (e) { return def; }
    },
    set: function (k, v) {
      try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch (e) { return false; }
    },
    del: function (k) { try { localStorage.removeItem(k); } catch (e) { /* sin almacenamiento */ } }
  };

  SS.vibrate = function (pattern) {
    if (SS.options && SS.options.vibration && navigator.vibrate) {
      try { navigator.vibrate(pattern); } catch (e) { /* no disponible */ }
    }
  };

  SS.isTouchDevice = function () {
    return ("ontouchstart" in window) || (navigator.maxTouchPoints || 0) > 0;
  };
})();
