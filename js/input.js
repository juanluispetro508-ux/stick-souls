/* =====================================================================
   Entradas: teclado (reasignable), ratón y botones táctiles con
   multitoque (moverse y atacar a la vez, deslizar entre botones).
   ===================================================================== */
(function () {
  "use strict";
  var SS = window.SS;
  var ACTS = ["left", "right", "up", "down", "jump", "attack", "dodge", "special", "pause", "map"];
  var GAME_KEYS = ["Space", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Tab"];

  var I = (SS.input = {
    ACTS: ACTS, keysDown: {}, raw: {}, prev: {}, down: {}, pressed: {}, released: {}, tapped: {},
    touch: {}, mouse: false, keymap: null, rebind: null, touchEls: [], rects: [],
    touchActive: false, lastDevice: "kb"
  });

  I.LABELS = {
    left: "Izquierda", right: "Derecha", up: "Arriba / Interactuar", down: "Abajo",
    jump: "Saltar", attack: "Atacar", dodge: "Esquivar / Dash", special: "Habilidad (golpe cargado)",
    pause: "Pausa", map: "Mapa"
  };

  I.defaultKeymap = function () {
    return {
      left: ["ArrowLeft", "KeyA"], right: ["ArrowRight", "KeyD"], up: ["ArrowUp", "KeyW"],
      down: ["ArrowDown", "KeyS"], jump: ["Space", "KeyZ"], attack: ["KeyJ", "KeyX"],
      dodge: ["ShiftLeft", "ShiftRight", "KeyK", "KeyC"], special: ["KeyL", "KeyV"],
      pause: ["Escape", "KeyP"], map: ["KeyM", "Tab"]
    };
  };

  I.keyName = function (code) {
    if (!code) return "—";
    var map = { Space: "Espacio", ArrowLeft: "←", ArrowRight: "→", ArrowUp: "↑", ArrowDown: "↓",
      ShiftLeft: "Shift", ShiftRight: "Shift der.", Escape: "Esc", Tab: "Tab", Enter: "Enter",
      ControlLeft: "Ctrl", ControlRight: "Ctrl der.", AltLeft: "Alt" };
    if (map[code]) return map[code];
    if (code.indexOf("Key") === 0) return code.slice(3);
    if (code.indexOf("Digit") === 0) return code.slice(5);
    return code;
  };

  function actsForCode(code) {
    var r = [];
    for (var a in I.keymap) if (I.keymap[a].indexOf(code) >= 0) r.push(a);
    return r;
  }

  function recompute() {
    for (var i = 0; i < ACTS.length; i++) {
      var a = ACTS[i], ks = I.keymap[a] || [], d = false;
      for (var j = 0; j < ks.length; j++) if (I.keysDown[ks[j]]) { d = true; break; }
      I.raw[a] = d;
    }
  }

  I.clear = function () {
    I.keysDown = {}; I.touch = {}; I.mouse = false;
    for (var i = 0; i < ACTS.length; i++) I.raw[ACTS[i]] = false;
    for (var j = 0; j < I.touchEls.length; j++) I.touchEls[j].classList.remove("on");
  };

  I.init = function (keymap) {
    I.keymap = keymap || I.defaultKeymap();
    window.addEventListener("keydown", function (e) {
      if (I.rebind) {
        e.preventDefault();
        var cb = I.rebind; I.rebind = null;
        cb(e.code);
        return;
      }
      var acts = actsForCode(e.code);
      var inMenu = SS.ui && SS.ui.menuOpen();
      if (!inMenu && (acts.length || GAME_KEYS.indexOf(e.code) >= 0)) e.preventDefault();
      if (inMenu && (e.code === "Tab")) e.preventDefault();
      I.lastDevice = "kb";
      if (SS.audio) SS.audio.init();
      if (SS.ui && SS.ui.onKey(e, acts)) return;   // la tecla la usó un menú
      if (e.repeat) return;
      I.keysDown[e.code] = true;
      recompute();
      for (var i = 0; i < acts.length; i++) I.tapped[acts[i]] = true;
    });
    window.addEventListener("keyup", function (e) { I.keysDown[e.code] = false; recompute(); });
    window.addEventListener("blur", function () { I.clear(); if (SS.G) SS.G.autoPause(); });
    document.addEventListener("visibilitychange", function () {
      if (document.hidden) { I.clear(); if (SS.G) SS.G.autoPause(); }
    });
  };

  /** Se llama una vez por paso de simulación: calcula pulsado/soltado. */
  I.poll = function () {
    for (var i = 0; i < ACTS.length; i++) {
      var a = ACTS[i];
      var cur = !!(I.raw[a] || I.touch[a] || (a === "attack" && I.mouse));
      var tap = !!I.tapped[a];
      I.pressed[a] = (cur && !I.prev[a]) || tap;
      I.released[a] = (!cur && !!I.prev[a]) || (tap && !cur);
      I.down[a] = cur;
      I.prev[a] = cur;
      I.tapped[a] = false;
    }
  };

  /** Consume un pulsado (para que un menú no lo reciba también el juego). */
  I.consume = function (a) { I.pressed[a] = false; I.tapped[a] = false; };

  I.setupMouse = function (canvas) {
    canvas.addEventListener("mousedown", function (e) {
      if (e.button !== 0 || I.lastDevice === "touch") return;
      I.mouse = true; I.tapped.attack = true;
      if (SS.audio) SS.audio.init();
    });
    window.addEventListener("mouseup", function (e) { if (e.button === 0) I.mouse = false; });
    canvas.addEventListener("contextmenu", function (e) { e.preventDefault(); });
  };

  function hitTest(x, y) {
    var best = null, bd = 1e12;
    for (var i = 0; i < I.rects.length; i++) {
      var r = I.rects[i];
      if (!r.w) continue;
      var pad = r.w * 0.2;
      if (x >= r.x - pad && x <= r.x + r.w + pad && y >= r.y - pad && y <= r.y + r.h + pad) {
        var dx = x - (r.x + r.w / 2), dy = y - (r.y + r.h / 2), d = dx * dx + dy * dy;
        if (d < bd) { bd = d; best = r.act; }
      }
    }
    return best;
  }

  I.setupTouch = function (layer) {
    I.touchEls = Array.prototype.slice.call(layer.querySelectorAll("[data-act]"));
    var handle = function (e) {
      I.lastDevice = "touch";
      if (SS.audio) SS.audio.init();
      if (!I.touchActive) return;
      if (e.cancelable) e.preventDefault();
      var map = {};
      for (var i = 0; i < e.touches.length; i++) {
        var t = e.touches[i];
        var a = hitTest(t.clientX, t.clientY);
        if (a) map[a] = true;
      }
      for (var k in map) if (!I.touch[k]) { I.tapped[k] = true; SS.vibrate(8); }
      I.touch = map;
      for (var j = 0; j < I.touchEls.length; j++) {
        var el = I.touchEls[j];
        el.classList.toggle("on", !!map[el.getAttribute("data-act")]);
      }
    };
    ["touchstart", "touchmove", "touchend", "touchcancel"].forEach(function (n) {
      layer.addEventListener(n, handle, { passive: false });
    });
  };

  I.refreshRects = function () {
    I.rects = I.touchEls.map(function (el) {
      var r = el.getBoundingClientRect();
      return { x: r.left, y: r.top, w: r.width, h: r.height, act: el.getAttribute("data-act") };
    });
  };
})();
