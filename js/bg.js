/* =====================================================================
   Fondos: la pintura de cada zona (assets/arte) con paralaje suave,
   rayos de sol que se mueven, motas de polvo que brillan al cruzar la
   luz, niebla que avanza, brasas o luciérnagas, aves, cadenas y ramas
   en primer plano, niebla baja y viñeta.
   ===================================================================== */
(function () {
  "use strict";
  var SS = window.SS;

  var BG = (SS.BG = { cache: {}, flocks: [], flockT: 2, ambT: 0, motes: [], beam: null, fog: null });

  /** Versión procesada de la pintura: algo más oscura y suave, para que
      el escenario de juego se distinga bien por delante. Se hace una vez. */
  function painted(zoneId) {
    if (BG.cache[zoneId] !== undefined) return BG.cache[zoneId];
    var z = SS.ZONES[zoneId], im = SS.img(z.img);
    if (!im) { BG.cache[zoneId] = null; return null; }
    var c = document.createElement("canvas");
    c.width = im.width; c.height = im.height;
    var g = c.getContext("2d");
    var hasFilter = typeof g.filter === "string";
    try { if (hasFilter) g.filter = "blur(1.1px) brightness(0.78) saturate(0.85)"; } catch (e) { hasFilter = false; }
    g.drawImage(im, 0, 0);
    if (hasFilter) g.filter = "none";
    else { g.fillStyle = "rgba(0,0,0,0.22)"; g.fillRect(0, 0, c.width, c.height); }
    g.fillStyle = z.bgTint;
    g.fillRect(0, 0, c.width, c.height);
    BG.cache[zoneId] = c;
    return c;
  }

  /** Un rayo de luz: degradado suave en los bordes y a lo largo. */
  function beamSprite() {
    if (BG.beam) return BG.beam;
    var c = document.createElement("canvas");
    c.width = 64; c.height = 256;
    var g = c.getContext("2d");
    var gx = g.createLinearGradient(0, 0, 64, 0);
    gx.addColorStop(0, "rgba(255,255,255,0)");
    gx.addColorStop(0.5, "rgba(255,255,255,1)");
    gx.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = gx;
    g.fillRect(0, 0, 64, 256);
    g.globalCompositeOperation = "destination-in";
    var gy = g.createLinearGradient(0, 0, 0, 256);
    gy.addColorStop(0, "rgba(0,0,0,0.9)");
    gy.addColorStop(0.6, "rgba(0,0,0,0.45)");
    gy.addColorStop(1, "rgba(0,0,0,0)");
    g.fillStyle = gy;
    g.fillRect(0, 0, 64, 256);
    BG.beam = c;
    return c;
  }

  /** Banda de niebla con manchas suaves (se repite en horizontal). */
  function fogSprite() {
    if (BG.fog) return BG.fog;
    var c = document.createElement("canvas");
    c.width = 512; c.height = 96;
    var g = c.getContext("2d"), rng = SS.makeRng(99);
    for (var i = 0; i < 40; i++) {
      var x = rng() * 512, y = 30 + rng() * 40, r = 20 + rng() * 40;
      for (var k = -1; k <= 1; k++) {
        var grd = g.createRadialGradient(x + k * 512, y, 0, x + k * 512, y, r);
        grd.addColorStop(0, "rgba(255,255,255,0.22)");
        grd.addColorStop(1, "rgba(255,255,255,0)");
        g.fillStyle = grd;
        g.fillRect(x + k * 512 - r, y - r, r * 2, r * 2);
      }
    }
    BG.fog = c;
    return c;
  }

  BG.reset = function () {
    BG.flocks.length = 0; BG.flockT = 1 + Math.random() * 2;
    BG.motes.length = 0;
  };

  /* ---------------------------------------------------------- aves */
  BG.update = function (dt, z, vw, vh, room) {
    if (z.birds && !(room && room.def.dark)) {
      BG.flockT -= dt;
      if (BG.flockT <= 0) {
        BG.flockT = 6 + Math.random() * 9;
        var dir = Math.random() < 0.5 ? 1 : -1;
        var n = 3 + Math.floor(Math.random() * 5);
        var y = vh * (0.08 + Math.random() * 0.3);
        var sp = 34 + Math.random() * 30, sc = 0.7 + Math.random() * 0.6;
        var birds = [];
        for (var i = 0; i < n; i++) {
          birds.push({ ox: -i * (14 + Math.random() * 10) + (i % 2 ? 6 : 0), oy: (i % 2 ? -1 : 1) * i * 4 + Math.random() * 6,
            ph: Math.random() * 6, rate: 9 + Math.random() * 3 });
        }
        BG.flocks.push({ x: dir > 0 ? -40 : vw + 40, y: y, dir: dir, sp: sp, sc: sc, birds: birds, t: 0 });
      }
    }
    for (var f = BG.flocks.length - 1; f >= 0; f--) {
      var fl = BG.flocks[f];
      fl.t += dt;
      fl.x += fl.dir * fl.sp * dt;
      fl.y += Math.sin(fl.t * 0.7) * 6 * dt;
      if ((fl.dir > 0 && fl.x > vw + 200) || (fl.dir < 0 && fl.x < -200)) BG.flocks.splice(f, 1);
    }
    // motas de polvo en pantalla (flotan y brillan al cruzar un rayo)
    while (BG.motes.length < 46) {
      BG.motes.push({ x: Math.random() * vw, y: Math.random() * vh, vx: SS.rand(-4, 4), vy: SS.rand(-3, 5), s: SS.rand(0.6, 1.6), ph: Math.random() * 6 });
    }
    for (var m = 0; m < BG.motes.length; m++) {
      var mo = BG.motes[m];
      mo.x += (mo.vx + Math.sin(mo.ph + fl2(m)) * 3) * dt;
      mo.y += mo.vy * dt;
      mo.ph += dt * 0.6;
      if (mo.x < -10) mo.x += vw + 20; else if (mo.x > vw + 10) mo.x -= vw + 20;
      if (mo.y < -10) mo.y += vh + 20; else if (mo.y > vh + 10) mo.y -= vh + 20;
    }
  };
  function fl2(i) { return i * 1.7; }

  function drawBird(ctx, x, y, s, wing) {
    ctx.beginPath();
    ctx.moveTo(x - s, y - s * wing);
    ctx.quadraticCurveTo(x - s * 0.4, y - s * 0.15, x, y);
    ctx.quadraticCurveTo(x + s * 0.4, y - s * 0.15, x + s, y - s * wing);
    ctx.stroke();
  }
  SS.drawBird = drawBird;

  /** Posiciones de los rayos (en pantalla). Se mueven despacio y respiran. */
  function beams(room, camX, vw, time) {
    var out = [], n = room.zoneId === "bosque" ? 4 : 3;
    for (var r = 0; r < n; r++) {
      var base = (r + 0.5) / n * (vw + 260) - 130;
      var x = base + Math.sin(time * 0.06 + r * 2.1) * 70 - (camX * 0.06 % 90);
      var w = 34 + Math.sin(time * 0.37 + r * 1.3) * 12 + r * 6;
      var a = 0.55 + 0.25 * Math.sin(time * 0.5 + r * 1.9) + 0.12 * Math.sin(time * 1.7 + r * 3.1);
      out.push({ x: x, w: w, a: Math.max(0.15, a), ang: 0.32 + Math.sin(time * 0.05 + r) * 0.05 });
    }
    return out;
  }

  /** Dibuja todo el fondo en coordenadas de pantalla (unidades del mundo). */
  BG.draw = function (ctx, room, camX, camY, vw, vh, time) {
    var z = room.zone, dark = !!room.def.dark;
    var pic = painted(room.zoneId);
    if (!pic) {
      var grd = ctx.createLinearGradient(0, 0, 0, vh);
      grd.addColorStop(0, z.sky[0]);
      grd.addColorStop(0.55, z.sky[1]);
      grd.addColorStop(1, z.sky[2]);
      ctx.fillStyle = grd;
      ctx.fillRect(0, 0, vw, vh);
    } else {
      var sc = Math.max(vw / pic.width, vh / pic.height) * 1.16;
      var dw = pic.width * sc, dh = pic.height * sc;
      var fx = room.pw > vw ? SS.clamp(camX / (room.pw - vw), 0, 1) : 0.5;
      var fy = room.ph > vh ? SS.clamp(camY / (room.ph - vh), 0, 1) : 0.55;
      var ox = -(dw - vw) * fx + Math.sin(time * 0.05) * 3;
      var oy = -(dh - vh) * fy + Math.sin(time * 0.07) * 2;
      ctx.drawImage(pic, ox, oy, dw, dh);
    }
    if (dark) {
      ctx.fillStyle = "rgba(2,6,6,0.72)";
      ctx.fillRect(0, 0, vw, vh);
    }

    BG.drawFlocks(ctx, z, time);

    // rayos de luz que se desplazan y respiran
    var bm = beamSprite(), list = beams(room, camX, vw, time), i;
    var strength = dark ? 0.04 : room.zoneId === "bosque" ? 0.16 : 0.09;
    ctx.globalCompositeOperation = "lighter";
    var tint = SS.glow(z.ray);
    for (i = 0; i < list.length; i++) {
      var b = list[i];
      ctx.save();
      ctx.translate(b.x, -20);
      ctx.rotate(-b.ang);
      ctx.globalAlpha = strength * b.a;
      ctx.drawImage(bm, -b.w / 2, 0, b.w, vh * 1.5);
      ctx.globalAlpha = strength * b.a * 0.6;
      ctx.drawImage(tint, -b.w * 0.8, 0, b.w * 1.6, vh * 0.9);
      ctx.restore();
    }
    // motas: brillan más cerca del eje de un rayo
    ctx.fillStyle = "rgb(" + z.ray + ")";
    for (i = 0; i < BG.motes.length; i++) {
      var mo = BG.motes[i], lit = 0.12;
      for (var k = 0; k < list.length; k++) {
        var bx = list[k].x + Math.tan(list[k].ang) * (mo.y + 20);
        var d = Math.abs(mo.x - bx);
        if (d < list[k].w) lit = Math.max(lit, (1 - d / list[k].w) * list[k].a);
      }
      ctx.globalAlpha = lit * (dark ? 0.35 : 0.8) * (0.6 + 0.4 * Math.sin(time * 1.3 + mo.ph * 3));
      ctx.fillRect(mo.x, mo.y, mo.s, mo.s);
    }
    ctx.globalAlpha = 1;
    // resplandor de brasas lejanas en el refugio
    if (room.zoneId === "refugio" && !dark) {
      var eg = ctx.createLinearGradient(0, vh * 0.7, 0, vh);
      var pul = 0.07 + Math.sin(time * 0.9) * 0.025 + Math.sin(time * 2.3) * 0.015;
      eg.addColorStop(0, "rgba(255,90,30,0)");
      eg.addColorStop(1, "rgba(255,90,30," + pul.toFixed(3) + ")");
      ctx.fillStyle = eg;
      ctx.fillRect(0, vh * 0.7, vw, vh * 0.3);
    }
    ctx.globalCompositeOperation = "source-over";

    // bancos de niebla que avanzan
    var fog = fogSprite();
    for (var l = 0; l < 2; l++) {
      var sp = l ? 9 : 4, par = l ? 0.35 : 0.18;
      var fxo = -((camX * par + time * sp) % 512);
      if (fxo > 0) fxo -= 512;
      var fyo = vh * (l ? 0.55 : 0.38) - (camY * par * 0.2) % 40;
      ctx.globalAlpha = (dark ? 0.12 : 0.3) * (l ? 0.9 : 0.6);
      for (var fxx = fxo; fxx < vw; fxx += 512) ctx.drawImage(fog, fxx, fyo, 512, 96 + l * 30);
    }
    ctx.globalAlpha = 1;
  };

  BG.drawFlocks = function (ctx, z, time) {
    ctx.strokeStyle = z.birdColor;
    ctx.lineCap = "round";
    for (var f = 0; f < BG.flocks.length; f++) {
      var fl = BG.flocks[f];
      ctx.lineWidth = 1.3 * fl.sc;
      for (var b = 0; b < fl.birds.length; b++) {
        var bd = fl.birds[b];
        var wing = Math.sin(time * bd.rate + bd.ph) * 0.8;
        drawBird(ctx, fl.x - bd.ox * fl.dir * fl.sc, fl.y + bd.oy * fl.sc, 5 * fl.sc, wing);
      }
    }
  };

  /** Primer plano: cadenas (refugio) o ramas (bosque) que cuelgan arriba
      y se mueven más rápido que el escenario (sensación de profundidad). */
  BG.drawFront = function (ctx, room, camX, camY, vw, vh, time) {
    if (room.def.dark) return;
    var par = 1.25, span = 420, i;
    var off = -((camX * par) % span);
    if (off > 0) off -= span;
    var yoff = -Math.min(60, camY * 0.05);
    ctx.lineCap = "round";
    for (var base = off; base < vw + span; base += span) {
      if (room.zoneId === "refugio") {
        for (i = 0; i < 2; i++) {
          var x = base + 60 + i * 190, len = 50 + i * 35 + Math.sin(base * 0.01) * 10;
          var sw = Math.sin(time * 0.8 + i + base * 0.003) * 6;
          ctx.strokeStyle = "rgba(8,6,6,0.85)";
          ctx.lineWidth = 2.6;
          ctx.beginPath();
          for (var k = 0; k <= len; k += 7) {
            var tt = k / len, cx = x + sw * tt * tt;
            ctx.moveTo(cx - 2.2, yoff + k); ctx.lineTo(cx + 2.2, yoff + k + 4);
          }
          ctx.stroke();
          if (i === 1) {
            ctx.fillStyle = "rgba(8,6,6,0.9)";
            ctx.fillRect(x + sw - 5, yoff + len, 10, 12);
          }
        }
      } else {
        ctx.strokeStyle = "rgba(4,10,8,0.9)";
        ctx.fillStyle = "rgba(4,10,8,0.9)";
        for (i = 0; i < 2; i++) {
          var bx = base + 30 + i * 230, sway = Math.sin(time * 0.6 + i * 2) * 4;
          ctx.lineWidth = 6 - i * 2;
          ctx.beginPath();
          ctx.moveTo(bx - 40, yoff - 4);
          ctx.quadraticCurveTo(bx, yoff + 18 + sway, bx + 60, yoff + 6 + sway);
          ctx.stroke();
          for (var lf = 0; lf < 6; lf++) {
            var lx = bx - 30 + lf * 16, ly = yoff + 12 + Math.sin(lf * 1.7) * 6 + sway;
            ctx.beginPath(); ctx.ellipse(lx, ly + 6, 4, 9, 0.4 * Math.sin(time + lf), 0, 6.283); ctx.fill();
          }
        }
      }
    }
  };

  /** Niebla baja, viñeta y oscuridad de cueva (encima del mundo). */
  BG.drawOverlay = function (ctx, room, vw, vh, px, py) {
    var z = room.zone;
    var fg = ctx.createLinearGradient(0, vh * 0.62, 0, vh);
    fg.addColorStop(0, "rgba(" + z.fog + ",0)");
    fg.addColorStop(1, "rgba(" + z.fog + ",0.14)");
    ctx.fillStyle = fg;
    ctx.fillRect(0, vh * 0.62, vw, vh * 0.38);
    if (room.def.dark) {
      var dg = ctx.createRadialGradient(px, py, 50, px, py, Math.max(vw, vh) * 0.7);
      dg.addColorStop(0, "rgba(0,0,0,0)");
      dg.addColorStop(0.35, "rgba(0,0,0,0.35)");
      dg.addColorStop(1, "rgba(0,0,0,0.82)");
      ctx.fillStyle = dg;
      ctx.fillRect(0, 0, vw, vh);
    }
    ctx.drawImage(vignette(vw, vh), 0, 0, vw, vh);
  };

  /** Viñeta precalculada (se rehace solo si cambia el tamaño de la vista). */
  function vignette(vw, vh) {
    var key = Math.round(vw) + "x" + Math.round(vh);
    if (BG.vig && BG.vig.key === key) return BG.vig.c;
    var c = document.createElement("canvas");
    c.width = Math.max(1, Math.round(vw)); c.height = Math.max(1, Math.round(vh));
    var g = c.getContext("2d");
    var vg = g.createRadialGradient(vw / 2, vh / 2, Math.min(vw, vh) * 0.35, vw / 2, vh / 2, Math.max(vw, vh) * 0.75);
    vg.addColorStop(0, "rgba(0,0,0,0)");
    vg.addColorStop(1, "rgba(0,0,0,0.55)");
    g.fillStyle = vg;
    g.fillRect(0, 0, c.width, c.height);
    BG.vig = { key: key, c: c };
    return c;
  }

  /** Partículas ambientales en el mundo, alrededor de la cámara. */
  BG.ambient = function (dt, room, particles, camX, camY, vw, vh) {
    var z = room.zone;
    BG.ambT -= dt;
    if (BG.ambT > 0) return;
    if (z.particles === "ash") {
      BG.ambT = 0.07;
      particles.spawn("ash", camX + Math.random() * (vw + 100) - 50, camY - 10, SS.rand(-8, 22), SS.rand(14, 34),
        9, SS.rand(1.5, 3.2), "#a39790", {});
      if (Math.random() < 0.35) {
        particles.spawn("ember", camX + Math.random() * vw, camY + vh + 5, SS.rand(-10, 10), SS.rand(-40, -18),
          SS.rand(4, 7), SS.rand(1.4, 2.6), "255,140,60", {});
      }
    } else if (z.particles === "fireflies") {
      BG.ambT = room.def.dark ? 0.45 : 0.24;
      particles.spawn("firefly", camX + Math.random() * vw, camY + vh * (0.25 + Math.random() * 0.7),
        SS.rand(-8, 8), SS.rand(-8, 8), SS.rand(4, 7), SS.rand(1.5, 2.6), room.def.dark ? "140,220,255" : "205,255,150", { drag: 0.6 });
      if (!room.def.dark && Math.random() < 0.3) {
        particles.spawn("leaf", camX + Math.random() * (vw + 80) - 40, camY - 8, 0, SS.rand(16, 30),
          SS.rand(8, 12), SS.rand(2.2, 3.4), SS.pick(["#3f5a32", "#5a6b2e", "#2f4a2c", "#6b5a2a"]), {});
      }
    }
  };
})();
