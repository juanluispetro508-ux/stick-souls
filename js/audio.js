/* =====================================================================
   Sonido original generado con Web Audio API (sin archivos externos).
   Efectos sintetizados y un fondo ambiental distinto por zona.
   ===================================================================== */
(function () {
  "use strict";
  var SS = window.SS;

  var A = (SS.audio = {
    ctx: null, master: null, sfxBus: null, musBus: null, noiseBuf: null,
    volume: 0.7, muted: false, zone: null, pendingZone: null, amb: null, last: {}
  });

  A.init = function () {
    if (A.ctx) {
      if (A.ctx.state === "suspended") A.ctx.resume();
      return;
    }
    var AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    try { A.ctx = new AC(); } catch (e) { return; }
    var c = A.ctx;
    A.master = c.createGain();
    A.master.connect(c.destination);
    A.sfxBus = c.createGain();
    A.sfxBus.gain.value = 0.85;
    A.sfxBus.connect(A.master);
    A.musBus = c.createGain();
    A.musBus.gain.value = 0.32;
    A.musBus.connect(A.master);
    var len = c.sampleRate;
    var buf = c.createBuffer(1, len, c.sampleRate);
    var d = buf.getChannelData(0);
    for (var i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    A.noiseBuf = buf;
    A.applyVolume();
    if (A.pendingZone) { var z = A.pendingZone; A.pendingZone = null; A.setZone(z); }
  };

  A.applyVolume = function () {
    if (!A.master) return;
    A.master.gain.setTargetAtTime(A.muted ? 0 : A.volume, A.ctx.currentTime, 0.05);
  };

  function tone(type, f0, f1, dur, vol, delay) {
    var c = A.ctx, t = c.currentTime + (delay || 0);
    var o = c.createOscillator(), g = c.createGain();
    o.type = type;
    o.frequency.setValueAtTime(f0, t);
    if (f1) o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(A.sfxBus);
    o.start(t); o.stop(t + dur + 0.05);
  }

  function noise(dur, vol, ftype, f0, f1, delay, q) {
    var c = A.ctx, t = c.currentTime + (delay || 0);
    var s = c.createBufferSource();
    s.buffer = A.noiseBuf;
    var f = c.createBiquadFilter();
    f.type = ftype;
    f.Q.value = q || 0.8;
    f.frequency.setValueAtTime(f0, t);
    if (f1) f.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
    var g = c.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.006);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f); f.connect(g); g.connect(A.sfxBus);
    s.start(t, Math.random() * 0.5);
    s.stop(t + dur + 0.05);
  }

  /** Reproduce un efecto por nombre. Limita repeticiones demasiado seguidas. */
  A.play = function (name) {
    if (!A.ctx || A.muted || A.volume <= 0) return;
    var now = A.ctx.currentTime;
    var gap = { pickup: 0.035, hit: 0.03, step: 0.08 }[name] || 0.015;
    if (A.last[name] && now - A.last[name] < gap) return;
    A.last[name] = now;
    switch (name) {
      case "jump": tone("triangle", 260, 520, 0.12, 0.18); noise(0.06, 0.05, "highpass", 3000); break;
      case "djump": tone("triangle", 420, 840, 0.14, 0.16); noise(0.1, 0.06, "bandpass", 2400, 5000); break;
      case "land": noise(0.07, 0.12, "lowpass", 700, 200); break;
      case "swing": noise(0.1, 0.16, "bandpass", 1800, 5200, 0, 1.4); break;
      case "hit": tone("square", 190, 70, 0.1, 0.12); noise(0.08, 0.14, "lowpass", 2600, 400); break;
      case "clank": tone("square", 900, 500, 0.08, 0.06); noise(0.05, 0.1, "highpass", 4000); break;
      case "hurt": tone("sawtooth", 260, 70, 0.3, 0.16); noise(0.18, 0.12, "lowpass", 1400, 200); break;
      case "pickup": tone("sine", 900 + Math.random() * 300, 1500, 0.07, 0.08); break;
      case "dash": noise(0.18, 0.16, "bandpass", 800, 3000, 0, 1.2); tone("sine", 200, 120, 0.15, 0.05); break;
      case "break": noise(0.35, 0.2, "lowpass", 1800, 120); tone("triangle", 140, 60, 0.25, 0.1); break;
      case "kill": noise(0.25, 0.15, "bandpass", 900, 200, 0, 1); tone("sine", 300, 90, 0.25, 0.1); break;
      case "charge": tone("sine", 300, 900, 0.5, 0.06); break;
      case "cslash": noise(0.25, 0.25, "bandpass", 1200, 6000, 0, 1.5); tone("sawtooth", 160, 60, 0.3, 0.12); break;
      case "slam": noise(0.5, 0.3, "lowpass", 600, 60); tone("sine", 70, 35, 0.5, 0.3); break;
      case "roar": tone("sawtooth", 95, 50, 1.2, 0.18); tone("sawtooth", 100, 55, 1.2, 0.12, 0.02); noise(1.1, 0.1, "lowpass", 500, 120); break;
      case "bench": tone("sine", 392, 0, 0.9, 0.08); tone("sine", 494, 0, 0.9, 0.07, 0.08); tone("sine", 587, 0, 1.0, 0.06, 0.16); break;
      case "ability":
        [523, 659, 784, 1047].forEach(function (f, i) { tone("triangle", f, 0, 0.5, 0.09, i * 0.09); });
        break;
      case "levelup":
        [392, 523, 659, 784].forEach(function (f, i) { tone("sine", f, 0, 0.4, 0.08, i * 0.07); });
        break;
      case "death": tone("sine", 440, 110, 1.4, 0.15); noise(1.2, 0.08, "lowpass", 900, 100); break;
      case "eco": tone("sine", 220, 660, 0.6, 0.1); break;
      case "shoot": noise(0.12, 0.1, "bandpass", 600, 300, 0, 2); tone("sine", 240, 160, 0.12, 0.06); break;
      case "door": noise(0.6, 0.22, "lowpass", 400, 80); tone("square", 55, 40, 0.5, 0.08); break;
      case "ui": tone("triangle", 660, 0, 0.06, 0.06); break;
      case "uiback": tone("triangle", 440, 0, 0.06, 0.05); break;
      case "secret": [330, 415, 494, 659].forEach(function (f, i) { tone("sine", f, 0, 0.35, 0.07, i * 0.1); }); break;
      case "victory": [392, 494, 587, 784, 988].forEach(function (f, i) { tone("triangle", f, 0, 0.9, 0.08, i * 0.12); }); break;
    }
  };

  var PADS = {
    menu:    { notes: [49.0, 73.4, 98.0], cutoff: 520, lfo: 0.05 },
    refugio: { notes: [55.0, 82.4, 110.0, 164.8], cutoff: 620, lfo: 0.06 },
    bosque:  { notes: [65.4, 98.0, 130.8, 196.0], cutoff: 760, lfo: 0.08 },
    cueva:   { notes: [41.2, 61.7, 82.4], cutoff: 420, lfo: 0.04 },
    boss:    { notes: [41.2, 43.6, 82.4, 87.3], cutoff: 900, lfo: 0.9 }
  };

  /** Cambia el fondo ambiental con un fundido suave. */
  A.setZone = function (zone) {
    if (!A.ctx) { A.pendingZone = zone; return; }
    if (A.zone === zone) return;
    A.zone = zone;
    var c = A.ctx, now = c.currentTime;
    if (A.amb) {
      var old = A.amb;
      old.g.gain.setTargetAtTime(0.0001, now, 0.6);
      setTimeout(function () { old.nodes.forEach(function (n) { try { n.stop(); } catch (e) { /* ya detenido */ } }); }, 3500);
    }
    var cfg = PADS[zone] || PADS.refugio;
    var g = c.createGain();
    g.gain.value = 0.0001;
    g.connect(A.musBus);
    var f = c.createBiquadFilter();
    f.type = "lowpass";
    f.frequency.value = cfg.cutoff;
    f.connect(g);
    var nodes = [];
    cfg.notes.forEach(function (fr, i) {
      var o = c.createOscillator();
      o.type = i === 0 ? "sine" : "triangle";
      o.frequency.value = fr;
      o.detune.value = (i % 2 ? 7 : -5);
      var og = c.createGain();
      og.gain.value = i === 0 ? 0.5 : 0.18;
      o.connect(og); og.connect(f);
      o.start(); nodes.push(o);
    });
    var lfo = c.createOscillator();
    lfo.frequency.value = cfg.lfo;
    var lg = c.createGain();
    lg.gain.value = cfg.cutoff * 0.45;
    lfo.connect(lg); lg.connect(f.frequency);
    lfo.start(); nodes.push(lfo);
    g.gain.setTargetAtTime(zone === "boss" ? 0.7 : 0.5, now, 1.2);
    A.amb = { g: g, nodes: nodes };
  };
})();
