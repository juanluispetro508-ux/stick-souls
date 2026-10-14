/* =====================================================================
   Sonido original generado con Web Audio API (sin archivos externos).
   - Efectos sintetizados.
   - Música suave tipo clarinete, distinta en cada zona: un pequeño
     secuenciador toca melodías escritas aquí, con variaciones, bajo,
     arpegios y reverberación.
   ===================================================================== */
(function () {
  "use strict";
  var SS = window.SS;

  var A = (SS.audio = {
    ctx: null, master: null, sfxBus: null, musBus: null, revIn: null, noiseBuf: null,
    volume: 0.7, muted: false, zone: null, pendingZone: null, amb: null, last: {},
    music: null, clarWave: null, timer: null
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
    A.musBus.gain.value = 0.7;
    A.musBus.connect(A.master);
    var len = c.sampleRate;
    var buf = c.createBuffer(1, len, c.sampleRate);
    var d = buf.getChannelData(0);
    for (var i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    A.noiseBuf = buf;
    buildReverb();
    buildClarinet();
    A.applyVolume();
    A.timer = setInterval(schedule, 40);
    if (A.pendingZone) { var z = A.pendingZone; A.pendingZone = null; A.setZone(z); }
  };

  A.applyVolume = function () {
    if (!A.master) return;
    A.master.gain.setTargetAtTime(A.muted ? 0 : A.volume, A.ctx.currentTime, 0.05);
  };

  /* Reverberación: respuesta al impulso generada (ruido que decae). */
  function buildReverb() {
    var c = A.ctx, sec = 2.6, rate = c.sampleRate, n = Math.floor(sec * rate);
    var ir = c.createBuffer(2, n, rate);
    for (var ch = 0; ch < 2; ch++) {
      var d = ir.getChannelData(ch);
      for (var i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, 3.2);
    }
    var conv = c.createConvolver();
    conv.buffer = ir;
    var wet = c.createGain();
    wet.gain.value = 0.42;
    A.revIn = c.createGain();
    A.revIn.connect(conv); conv.connect(wet); wet.connect(A.master);
    var sfxSend = c.createGain();
    sfxSend.gain.value = 0.12;
    A.sfxBus.connect(sfxSend); sfxSend.connect(A.revIn);
  }

  /* Timbre de clarinete: armónicos impares fuertes y pares muy débiles. */
  function buildClarinet() {
    var c = A.ctx, N = 14;
    var real = new Float32Array(N), imag = new Float32Array(N);
    var amps = [0, 1, 0.05, 0.6, 0.03, 0.34, 0.02, 0.19, 0.01, 0.1, 0, 0.05, 0, 0.025];
    for (var i = 0; i < N; i++) imag[i] = amps[i] || 0;
    A.clarWave = c.createPeriodicWave(real, imag);
  }

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
    var gap = { pickup: 0.035, hit: 0.03, step: 0.08, thud: 0.08, chain: 0.12, wood: 0.05 }[name] || 0.015;
    if (A.last[name] && now - A.last[name] < gap) return;
    A.last[name] = now;
    switch (name) {
      case "jump": tone("triangle", 240, 470, 0.11, 0.13); noise(0.07, 0.05, "highpass", 2600); break;
      case "djump": tone("triangle", 420, 840, 0.14, 0.16); noise(0.1, 0.06, "bandpass", 2400, 5000); break;
      case "land": noise(0.08, 0.12, "lowpass", 700, 160); break;
      case "step": noise(0.04, 0.035, "lowpass", 900, 300); break;
      case "swing": noise(0.13, 0.15, "bandpass", 1300, 4800, 0, 1.6); break;
      case "swing2": noise(0.13, 0.15, "bandpass", 4200, 1400, 0, 1.6); break;
      case "hit": tone("square", 180, 60, 0.1, 0.11); noise(0.08, 0.15, "lowpass", 2600, 400); break;
      case "clank": tone("square", 1100, 620, 0.07, 0.05); noise(0.05, 0.1, "highpass", 4200); break;
      case "hurt": tone("sawtooth", 260, 70, 0.3, 0.15); noise(0.18, 0.12, "lowpass", 1400, 200); break;
      case "pickup": tone("sine", 900 + Math.random() * 300, 1500, 0.07, 0.07); break;
      case "dash": noise(0.18, 0.15, "bandpass", 800, 3000, 0, 1.2); tone("sine", 200, 120, 0.15, 0.05); break;
      case "roll": noise(0.22, 0.08, "lowpass", 600, 200); break;
      case "break": noise(0.35, 0.2, "lowpass", 1800, 120); tone("triangle", 140, 60, 0.25, 0.1); break;
      case "wood": noise(0.09, 0.16, "bandpass", 700, 300, 0, 3); tone("triangle", 180, 120, 0.08, 0.08); break;
      case "thud": noise(0.1, 0.12, "lowpass", 400, 90); break;
      case "kill": noise(0.25, 0.15, "bandpass", 900, 200, 0, 1); tone("sine", 300, 90, 0.25, 0.1); break;
      case "charge": tone("sine", 300, 900, 0.5, 0.06); break;
      case "cslash": noise(0.25, 0.25, "bandpass", 1200, 6000, 0, 1.5); tone("sawtooth", 160, 60, 0.3, 0.12); break;
      case "slam": noise(0.5, 0.3, "lowpass", 600, 60); tone("sine", 70, 35, 0.5, 0.3); break;
      case "roar": tone("sawtooth", 95, 50, 1.2, 0.17); tone("sawtooth", 100, 55, 1.2, 0.11, 0.02); noise(1.1, 0.1, "lowpass", 500, 120); break;
      case "growl": tone("sawtooth", 70, 55, 0.7, 0.12); noise(0.7, 0.08, "lowpass", 300, 120, 0, 3); break;
      case "bark": tone("sawtooth", 220, 90, 0.18, 0.16); noise(0.15, 0.14, "bandpass", 900, 400, 0, 2); break;
      case "howl": tone("sawtooth", 260, 420, 0.5, 0.08); tone("sawtooth", 420, 300, 0.8, 0.08, 0.45); tone("sawtooth", 265, 430, 0.5, 0.06, 0.02); break;
      case "flame": noise(0.6, 0.14, "bandpass", 500, 1500, 0, 0.6); noise(0.6, 0.05, "highpass", 3000); break;
      case "shriek":
        tone("sine", 900, 1500, 0.5, 0.05); tone("sawtooth", 600, 1100, 0.55, 0.04, 0.03);
        noise(0.6, 0.06, "bandpass", 2600, 4200, 0, 6); break;
      case "wail": tone("sine", 520, 380, 1.0, 0.035); tone("sine", 527, 372, 1.0, 0.03); break;
      case "draw": noise(0.35, 0.09, "bandpass", 3500, 7000, 0, 8); tone("sine", 2600, 3100, 0.3, 0.02); break;
      case "hook": noise(0.16, 0.12, "bandpass", 1500, 3500, 0, 2); tone("triangle", 500, 900, 0.1, 0.05); break;
      case "latch": tone("square", 1400, 900, 0.06, 0.06); tone("square", 1900, 1300, 0.05, 0.04, 0.03); noise(0.05, 0.1, "highpass", 5000); break;
      case "chain": noise(0.12, 0.05, "highpass", 5200); tone("square", 2400, 2000, 0.04, 0.015); break;
      case "snap": noise(0.1, 0.15, "highpass", 2500); tone("triangle", 300, 100, 0.12, 0.06); break;
      case "drink": [0, 0.22, 0.44].forEach(function (d) { tone("sine", 210, 120, 0.12, 0.08, d); noise(0.1, 0.03, "lowpass", 700, 300, d); }); break;
      case "flask": tone("sine", 1800, 1600, 0.12, 0.04); [0.15, 0.35].forEach(function (d) { tone("sine", 260, 150, 0.1, 0.07, d); }); break;
      case "bottle": tone("sine", 2200, 0, 0.18, 0.05); tone("sine", 3300, 0, 0.12, 0.03, 0.02); break;
      case "aah": tone("triangle", 330, 220, 0.5, 0.05); noise(0.4, 0.03, "bandpass", 900, 500, 0, 2); break;
      case "heal": [523, 659, 784].forEach(function (f, i) { tone("sine", f, 0, 0.4, 0.06, i * 0.06); }); break;
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
      case "whoosh": noise(0.5, 0.08, "bandpass", 300, 1600, 0, 1); break;
    }
  };

  /* =================================================== música por zona */
  var SCALES = {
    aeolian: [0, 2, 3, 5, 7, 8, 10], dorian: [0, 2, 3, 5, 7, 9, 10], phrygian: [0, 1, 3, 5, 7, 8, 10],
    major: [0, 2, 4, 5, 7, 9, 11], harmonic: [0, 2, 3, 5, 7, 8, 11]
  };

  /* Melodías: "grado:pulsos" separados por espacios; "r" es silencio.
     Los grados se cuentan dentro de la escala (0 = tónica, 7 = octava). */
  var THEMES = {
    menu: {
      bpm: 56, root: 62, scale: "aeolian", meter: 4, pad: [50, 57, 62], arp: false,
      phrases: {
        A: "4:1.5 3:0.5 2:1 0:1 1:2 -1:1 0:1 2:1.5 3:0.5 4:1 6:1 5:3 r:1",
        B: "7:1.5 6:0.5 5:1 4:1 3:2 2:1 4:1 2:1.5 1:0.5 0:1 -1:1 0:3 r:1",
        R: "r:8"
      },
      bass: { A: [0, 5, 2, 6], B: [3, 0, 4, 0], R: [0, 5] },
      form: ["A", "B", "R", "A", "B", "R"]
    },
    intro: {
      bpm: 48, root: 62, scale: "aeolian", meter: 4, pad: [50, 57], arp: false,
      phrases: {
        A: "r:4 4:2 3:1 2:1 0:3 r:1 -1:2 0:1 2:1 1:4",
        B: "4:2 5:1 4:1 2:3 r:1 3:1.5 2:0.5 1:1 -1:1 0:4"
      },
      bass: { A: [0, 0, 5, 6, 4], B: [0, 3, 6, 0] },
      form: ["A", "B"]
    },
    refugio: {
      bpm: 54, root: 69, scale: "harmonic", meter: 4, pad: [45, 52, 57], arp: false,
      phrases: {
        A: "0:2 2:1 1:1 0:1 -1:1 -3:2 r:2 4:1 3:1 2:4",
        B: "4:1.5 5:0.5 4:1 3:1 2:2 1:1 2:1 0:1 -1:1 -2:1 -1:1 -3:4",
        C: "r:4 7:3 6:1 4:2 3:2 4:4",
        R: "r:8"
      },
      bass: { A: [0, 3, 5, 4], B: [3, 5, 0, 4], C: [5, 3, 0, 4], R: [0, 4] },
      form: ["A", "B", "R", "C", "A", "R"]
    },
    bosque: {
      bpm: 66, root: 64, scale: "dorian", meter: 3, pad: [40, 47, 52], arp: true,
      phrases: {
        A: "0:1 2:0.5 3:0.5 4:1 5:1.5 4:0.5 3:1 2:1 3:0.5 2:0.5 0:1 1:3",
        B: "4:1 5:0.5 6:0.5 7:1 6:1.5 4:0.5 5:1 4:1 2:1 3:1 0:3",
        C: "7:2 6:1 5:1.5 4:0.5 2:1 3:3 r:3",
        R: "r:6"
      },
      bass: { A: [0, 3, 0, 4], B: [2, 3, 4, 0], C: [5, 3, 4, 0], R: [0, 3] },
      form: ["A", "B", "R", "C", "A", "R"]
    },
    cueva: {
      bpm: 46, root: 61, scale: "phrygian", meter: 4, pad: [37, 44], arp: false,
      phrases: {
        A: "0:3 1:1 0:4 r:4 -2:2 -1:2 0:4 r:4",
        B: "r:4 3:2 1:2 0:6 r:2"
      },
      bass: { A: [0, 0, 0, 0, 0, 0], B: [0, 0, 0] },
      form: ["A", "B"]
    },
    taberna: {
      bpm: 104, root: 67, scale: "major", meter: 3, pad: null, arp: false, waltz: true,
      phrases: {
        A: "0:1 2:1 4:1 5:2 4:1 3:1 4:1 5:1 4:3",
        B: "7:1 6:1 5:1 4:2 2:1 3:1 1:1 -1:1 0:3",
        C: "4:1.5 5:0.5 4:1 2:2 0:1 1:1 2:1 3:1 2:3"
      },
      bass: { A: [0, 3, 3, 4], B: [0, 4, 4, 0], C: [0, 0, 4, 0] },
      form: ["A", "B", "C", "B"]
    },
    boss: {
      bpm: 128, root: 62, scale: "phrygian", meter: 4, pad: [38, 45], arp: false, ostinato: "0 0 1 0 0 0 -2 -1", drums: true,
      phrases: {
        A: "r:2 4:0.5 3:0.5 1:1 r:2 0:0.5 1:0.5 3:1 r:1 7:1 6:0.5 4:0.5 3:1 1:2 0:2",
        B: "4:1 5:1 4:0.5 3:0.5 1:1 0:2 1:1 3:1 4:3 r:1 7:1.5 6:0.5 5:1 4:1 3:2 1:2"
      },
      bass: { A: [0, 0, 0, 0], B: [0, 1, 0, 0] },
      form: ["A", "B"]
    }
  };
  A.THEMES = THEMES;

  function mtof(m) { return 440 * Math.pow(2, (m - 69) / 12); }
  function degToMidi(th, deg) {
    var sc = SCALES[th.scale], n = sc.length;
    var oct = Math.floor(deg / n), idx = ((deg % n) + n) % n;
    return th.root + 12 * oct + sc[idx];
  }
  function parsePhrase(str) {
    return str.trim().split(/\s+/).map(function (tok) {
      var p = tok.split(":");
      return { d: p[0] === "r" ? null : parseFloat(p[0]), b: parseFloat(p[1]) };
    });
  }

  /** Construye una vuelta completa de la pieza con pequeñas variaciones. */
  function buildScore(th, loopN) {
    var ev = [], beat = 0, i, j;
    th.form.forEach(function (key, si) {
      var notes = parsePhrase(th.phrases[key]);
      var start = beat, len = 0;
      var vary = loopN > 0 && Math.random() < 0.35;
      for (i = 0; i < notes.length; i++) {
        var nt = notes[i], d = nt.d;
        if (d !== null && vary && Math.random() < 0.18) d += Math.random() < 0.5 ? 1 : -1;
        if (d !== null && loopN > 0 && Math.random() < 0.06) d = null; // respira
        if (d !== null) ev.push({ t: start + len, dur: nt.b, midi: degToMidi(th, d), v: "clar", vel: 0.75 + Math.random() * 0.2 });
        len += nt.b;
      }
      var bars = Math.round(len / th.meter);
      var bl = th.bass[key] || [0];
      for (j = 0; j < bars; j++) {
        var bd = bl[j % bl.length], bt = start + j * th.meter;
        var bm = degToMidi(th, bd) - 24;
        if (th.waltz) {
          ev.push({ t: bt, dur: 0.9, midi: bm, v: "bass", vel: 0.8 });
          for (var k = 1; k < 3; k++) {
            [0, 2, 4].forEach(function (cd) { ev.push({ t: bt + k, dur: 0.5, midi: degToMidi(th, bd + cd) - 12, v: "pluck", vel: 0.35 }); });
          }
        } else if (th.ostinato) {
          var os = th.ostinato.split(" ").map(Number);
          for (var e = 0; e < th.meter * 2; e++) {
            ev.push({ t: bt + e * 0.5, dur: 0.32, midi: degToMidi(th, bd + os[e % os.length]) - 24, v: "bass", vel: 0.7 });
          }
          if (th.drums) { ev.push({ t: bt, dur: 0.3, v: "kick" }); ev.push({ t: bt + 2, dur: 0.3, v: "kick" }); ev.push({ t: bt + 2.5, dur: 0.2, v: "kick", vel: 0.5 }); }
        } else {
          ev.push({ t: bt, dur: th.meter * 0.95, midi: bm + 12, v: "bass", vel: 0.55 });
          if (th.arp) {
            for (var a = 0; a < th.meter; a++) {
              ev.push({ t: bt + a, dur: 0.9, midi: degToMidi(th, bd + [0, 2, 4, 7][a % 4]), v: "pluck", vel: 0.28 });
            }
          }
        }
      }
      beat += len;
    });
    ev.sort(function (a, b) { return a.t - b.t; });
    return { events: ev, beats: beat };
  }

  /** Voces: clarinete (melodía), clarinete bajo, punteo y bombo suave. */
  function voice(m, ev, t, spb) {
    var c = A.ctx, dur = ev.dur * spb;
    if (ev.v === "kick") {
      var o = c.createOscillator(), g = c.createGain();
      o.frequency.setValueAtTime(110, t); o.frequency.exponentialRampToValueAtTime(38, t + 0.22);
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.5 * (ev.vel || 1), t + 0.005);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.3);
      o.connect(g); g.connect(m.out); o.start(t); o.stop(t + 0.35);
      return;
    }
    var f = mtof(ev.midi);
    if (ev.v === "pluck") {
      var po = c.createOscillator(), pg = c.createGain(), pf = c.createBiquadFilter();
      po.type = "triangle"; po.frequency.value = f;
      pf.type = "lowpass"; pf.frequency.value = 2600;
      pg.gain.setValueAtTime(0.0001, t);
      pg.gain.exponentialRampToValueAtTime(0.11 * ev.vel, t + 0.006);
      pg.gain.exponentialRampToValueAtTime(0.0001, t + Math.max(0.5, dur * 1.4));
      po.connect(pf); pf.connect(pg); pg.connect(m.out); pg.connect(m.send);
      po.start(t); po.stop(t + dur * 1.4 + 0.6);
      return;
    }
    var bass = ev.v === "bass";
    var osc = c.createOscillator(), gain = c.createGain(), filt = c.createBiquadFilter();
    osc.setPeriodicWave(A.clarWave);
    osc.frequency.value = f;
    // vibrato que entra despacio, como un clarinetista
    var lfo = c.createOscillator(), lg = c.createGain();
    lfo.frequency.value = 4.8 + Math.random() * 0.8;
    lg.gain.setValueAtTime(0, t);
    lg.gain.linearRampToValueAtTime(bass ? 0 : f * 0.0045, t + Math.min(0.45, dur * 0.7));
    lfo.connect(lg); lg.connect(osc.frequency);
    filt.type = "lowpass";
    filt.Q.value = 0.6;
    filt.frequency.setValueAtTime(bass ? 700 : 1500 + ev.vel * 900, t);
    filt.frequency.linearRampToValueAtTime(bass ? 520 : 1100 + ev.vel * 700, t + dur);
    var peak = (bass ? 0.085 : 0.12) * ev.vel;
    var att = bass ? 0.05 : 0.07, rel = bass ? 0.15 : 0.28;
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.linearRampToValueAtTime(peak, t + att);
    gain.gain.linearRampToValueAtTime(peak * 0.82, t + Math.max(att + 0.01, dur - 0.04));
    gain.gain.linearRampToValueAtTime(0.0001, t + dur + rel);
    osc.connect(filt); filt.connect(gain); gain.connect(m.out); gain.connect(m.send);
    osc.start(t); osc.stop(t + dur + rel + 0.05);
    lfo.start(t); lfo.stop(t + dur + rel + 0.05);
    if (!bass) {
      // soplo suave al empezar cada nota
      var ns = c.createBufferSource(), nf = c.createBiquadFilter(), ng = c.createGain();
      ns.buffer = A.noiseBuf;
      nf.type = "bandpass"; nf.frequency.value = Math.min(6000, f * 3); nf.Q.value = 1.2;
      ng.gain.setValueAtTime(0.0001, t);
      ng.gain.linearRampToValueAtTime(0.012 * ev.vel, t + 0.03);
      ng.gain.linearRampToValueAtTime(0.0001, t + 0.16);
      ns.connect(nf); nf.connect(ng); ng.connect(m.out);
      ns.start(t, Math.random() * 0.5); ns.stop(t + 0.2);
    }
  }

  function startMusic(name) {
    var th = THEMES[name];
    if (!th) return null;
    var c = A.ctx;
    var out = c.createGain(), send = c.createGain();
    out.gain.value = 0.0001;
    out.gain.setTargetAtTime(1, c.currentTime + 0.4, 0.8);
    send.gain.value = 0.55;
    out.connect(A.musBus); send.connect(A.revIn);
    var m = { name: name, th: th, out: out, send: send, loop: 0, start: c.currentTime + 0.5, idx: 0, score: null, dead: false };
    m.score = buildScore(th, 0);
    return m;
  }

  function schedule() {
    var m = A.music;
    if (!A.ctx || !m || m.dead) return;
    var spb = 60 / m.th.bpm, horizon = A.ctx.currentTime + 0.25;
    for (var guard = 0; guard < 64; guard++) {
      var ev = m.score.events[m.idx];
      if (!ev) {
        m.start += m.score.beats * spb;
        m.loop++;
        m.score = buildScore(m.th, m.loop);
        m.idx = 0;
        continue;
      }
      var t = m.start + ev.t * spb;
      if (t > horizon) break;
      if (t >= A.ctx.currentTime - 0.05) voice(m, ev, Math.max(t, A.ctx.currentTime), spb);
      m.idx++;
    }
  }

  function stopMusic(m) {
    if (!m) return;
    m.dead = true;
    m.out.gain.setTargetAtTime(0.0001, A.ctx.currentTime, 0.5);
    setTimeout(function () { try { m.out.disconnect(); m.send.disconnect(); } catch (e) { /* ya desconectado */ } }, 4000);
  }

  /* Colchón grave por debajo de la melodía (muy suave). */
  function startPad(cfg, zone) {
    var c = A.ctx, now = c.currentTime;
    var g = c.createGain();
    g.gain.value = 0.0001;
    g.connect(A.musBus);
    var f = c.createBiquadFilter();
    f.type = "lowpass";
    f.frequency.value = zone === "boss" ? 700 : 480;
    f.connect(g);
    var nodes = [];
    cfg.forEach(function (midi, i) {
      var o = c.createOscillator();
      o.type = i === 0 ? "sine" : "triangle";
      o.frequency.value = mtof(midi);
      o.detune.value = (i % 2 ? 6 : -5);
      var og = c.createGain();
      og.gain.value = i === 0 ? 0.5 : 0.16;
      o.connect(og); og.connect(f);
      o.start(); nodes.push(o);
    });
    var lfo = c.createOscillator();
    lfo.frequency.value = 0.07;
    var lg = c.createGain();
    lg.gain.value = 180;
    lfo.connect(lg); lg.connect(f.frequency);
    lfo.start(); nodes.push(lfo);
    g.gain.setTargetAtTime(0.22, now, 1.5);
    return { g: g, nodes: nodes };
  }

  /** Cambia la música con un fundido suave. */
  A.setZone = function (zone) {
    if (!A.ctx) { A.pendingZone = zone; return; }
    if (A.zone === zone) return;
    A.zone = zone;
    var c = A.ctx, now = c.currentTime;
    if (A.amb) {
      var old = A.amb;
      old.g.gain.setTargetAtTime(0.0001, now, 0.6);
      setTimeout(function () { old.nodes.forEach(function (n) { try { n.stop(); } catch (e) { /* ya detenido */ } }); }, 3500);
      A.amb = null;
    }
    stopMusic(A.music);
    A.music = null;
    var th = THEMES[zone];
    if (!th) return;
    if (th.pad) A.amb = startPad(th.pad, zone);
    A.music = startMusic(zone);
  };
})();
