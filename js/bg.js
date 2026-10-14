/* =====================================================================
   Fondos atmosféricos: capas con paralaje dibujadas a baja resolución
   y ampliadas (efecto difuminado barato), bandadas de aves, rayos de
   luz, sol velado, niebla, viñeta y partículas de ambiente por zona.
   ===================================================================== */
(function () {
  "use strict";
  var SS = window.SS;
  var LW = 1280, LH = 560;   // tamaño de cada capa en unidades del mundo (se repite en horizontal)

  var BG = (SS.BG = { cache: {}, flocks: [], flockT: 2, ambT: 0 });

  function makeLayer(div) {
    var c = document.createElement("canvas");
    c.width = Math.ceil(LW / div);
    c.height = Math.ceil(LH / div);
    var g = c.getContext("2d");
    g.scale(1 / div, 1 / div);
    return { c: c, g: g };
  }

  /** Dibuja una forma en x y, si cruza el borde, también al otro lado (capa sin costuras). */
  function wrap(x, w, fn) {
    fn(x);
    if (x < w) fn(x + LW);
    if (x + w > LW - w) fn(x - LW);
  }

  function ridge(g, color, base, amp, f1, f2, ph) {
    g.fillStyle = color;
    g.beginPath();
    g.moveTo(0, LH);
    for (var x = 0; x <= LW; x += 16) {
      var t = x / LW * Math.PI * 2;
      g.lineTo(x, base - Math.sin(t * f1 + ph) * amp - Math.sin(t * f2 + ph * 2.3) * amp * 0.45);
    }
    g.lineTo(LW, LH);
    g.closePath();
    g.fill();
  }

  /* ---------------------------------------------------------- ruinas */
  function buildRuins(z, rng) {
    var far = makeLayer(5), mid = makeLayer(2.6), near = makeLayer(1.3), i;
    var g = far.g;
    ridge(g, z.bg[0], LH - 150, 26, 2, 5, rng() * 6);
    g.fillStyle = z.bg[0];
    for (i = 0; i < 11; i++) {
      var tx = rng() * LW, tw = 26 + rng() * 46, th = 150 + rng() * 260;
      wrap(tx, tw, function (x) {
        var top = LH - 140 - th;
        g.beginPath();
        g.moveTo(x, LH);
        g.lineTo(x, top + 20);
        var steps = 4 + Math.floor(rng() * 4);
        for (var s = 0; s <= steps; s++) g.lineTo(x + tw * s / steps, top + (s % 2 ? 0 : 18) + rng() * 22);
        g.lineTo(x + tw, LH);
        g.fill();
        if (rng() > 0.5) { g.fillRect(x + tw * 0.3, top - 40, tw * 0.4, 50); }
      });
    }
    g = mid.g;
    ridge(g, z.bg[1], LH - 70, 16, 3, 7, rng() * 6);
    g.fillStyle = z.bg[1];
    g.strokeStyle = z.bg[1];
    for (i = 0; i < 7; i++) {
      var ax = rng() * LW, span = 70 + rng() * 60, pw = 14 + rng() * 8, ph = 170 + rng() * 120;
      var broken = rng() > 0.55;
      wrap(ax, span + pw, function (x) {
        g.fillRect(x, LH - 60 - ph, pw, ph + 60);
        var ph2 = broken ? ph * (0.45 + rng() * 0.2) : ph;
        g.fillRect(x + span, LH - 60 - ph2, pw, ph2 + 60);
        if (!broken) {
          g.lineWidth = 14;
          g.beginPath();
          g.arc(x + span / 2 + pw / 2, LH - 60 - ph, span / 2, Math.PI, 0);
          g.stroke();
        }
        g.fillRect(x - 6, LH - 60 - ph - 8, pw + 12, 10);
      });
    }
    g = near.g;
    ridge(g, z.bg[2], LH - 26, 10, 4, 9, rng() * 6);
    g.fillStyle = z.bg[2];
    g.strokeStyle = z.bg[2];
    g.lineCap = "round";
    for (i = 0; i < 16; i++) {
      var bx = rng() * LW;
      wrap(bx, 60, function (x) {
        var r = 14 + rng() * 26;
        g.beginPath(); g.ellipse(x, LH - 20, r * 1.6, r, 0, Math.PI, 0); g.fill();
        if (rng() > 0.5) {
          g.lineWidth = 2;
          g.beginPath();
          var bh = 30 + rng() * 40;
          g.moveTo(x, LH - 30); g.lineTo(x + 4, LH - 30 - bh);
          g.moveTo(x + 2, LH - 30 - bh * 0.5); g.lineTo(x + 16, LH - 40 - bh * 0.8);
          g.moveTo(x + 3, LH - 30 - bh * 0.7); g.lineTo(x - 10, LH - 36 - bh);
          g.stroke();
        }
      });
    }
    return [
      { img: far.c, f: 0.12, alpha: 0.9 },
      { img: mid.c, f: 0.3, alpha: 0.95 },
      { img: near.c, f: 0.55, alpha: 1 }
    ];
  }

  /* ----------------------------------------------------------- bosque */
  function tree(g, x, y, len, ang, wid, depth, rng) {
    var x2 = x + Math.sin(ang) * len, y2 = y - Math.cos(ang) * len;
    g.lineWidth = wid;
    g.beginPath();
    g.moveTo(x, y);
    g.quadraticCurveTo(x + Math.sin(ang + 0.4) * len * 0.5, y - Math.cos(ang) * len * 0.5, x2, y2);
    g.stroke();
    if (depth <= 0) return;
    var n = 2 + (rng() > 0.6 ? 1 : 0);
    for (var i = 0; i < n; i++) {
      tree(g, x2, y2, len * (0.55 + rng() * 0.2), ang + (rng() - 0.5) * 1.5, wid * 0.62, depth - 1, rng);
    }
  }

  function buildForest(z, rng) {
    var far = makeLayer(5), mid = makeLayer(2.4), near = makeLayer(1.3), i;
    var g = far.g;
    g.fillStyle = z.bg[0];
    for (i = 0; i < 30; i++) {
      var fx = rng() * LW, fw = 7 + rng() * 14;
      wrap(fx, fw, function (x) {
        g.beginPath();
        g.moveTo(x, LH); g.lineTo(x + fw * 0.2, 0); g.lineTo(x + fw * 0.8, 0); g.lineTo(x + fw, LH);
        g.fill();
      });
    }
    for (i = 0; i < 40; i++) {
      var cx = rng() * LW, cr = 30 + rng() * 60;
      wrap(cx, cr, function (x) { g.beginPath(); g.arc(x, 20 + rng() * 120, cr, 0, Math.PI * 2); g.fill(); });
    }
    ridge(g, z.bg[0], LH - 110, 18, 2, 6, rng() * 6);

    g = mid.g;
    g.strokeStyle = z.bg[1];
    g.fillStyle = z.bg[1];
    g.lineCap = "round";
    for (i = 0; i < 8; i++) {
      var tx = 40 + (i / 8) * LW + rng() * 80;
      wrap(tx, 140, function (x) { tree(g, x, LH - 40, 120 + rng() * 80, (rng() - 0.5) * 0.25, 14 + rng() * 8, 4, rng); });
    }
    ridge(g, z.bg[1], LH - 50, 14, 3, 8, rng() * 6);

    g = near.g;
    g.strokeStyle = z.bg[2];
    g.fillStyle = z.bg[2];
    g.lineCap = "round";
    ridge(g, z.bg[2], LH - 18, 8, 5, 11, rng() * 6);
    g.lineWidth = 2;
    for (i = 0; i < 220; i++) {
      var gx = rng() * LW, gh = 10 + rng() * 34;
      g.beginPath();
      g.moveTo(gx, LH - 14);
      g.quadraticCurveTo(gx + 3, LH - 14 - gh * 0.6, gx + (rng() - 0.5) * 12, LH - 14 - gh);
      g.stroke();
    }
    g.lineWidth = 1.6;
    for (i = 0; i < 26; i++) {
      var vx = rng() * LW, vl = 40 + rng() * 140;
      g.beginPath();
      g.moveTo(vx, 0);
      g.bezierCurveTo(vx + 8, vl * 0.3, vx - 8, vl * 0.7, vx + 3, vl);
      g.stroke();
      g.beginPath(); g.ellipse(vx + 3, vl, 3, 5, 0.3, 0, Math.PI * 2); g.fill();
    }
    return [
      { img: far.c, f: 0.1, alpha: 0.85 },
      { img: mid.c, f: 0.28, alpha: 0.95 },
      { img: near.c, f: 0.55, alpha: 1 }
    ];
  }

  BG.get = function (zoneId) {
    if (BG.cache[zoneId]) return BG.cache[zoneId];
    var z = SS.ZONES[zoneId];
    var rng = SS.makeRng(z.seed);
    var layers = z.layers === "forest" ? buildForest(z, rng) : buildRuins(z, rng);
    BG.cache[zoneId] = layers;
    return layers;
  };

  BG.reset = function () { BG.flocks.length = 0; BG.flockT = 1 + Math.random() * 2; };

  /* ---------------------------------------------------------- aves */
  BG.update = function (dt, z, vw, vh) {
    if (z.birds && !z.noBirds) {
      BG.flockT -= dt;
      if (BG.flockT <= 0) {
        BG.flockT = 6 + Math.random() * 9;
        var dir = Math.random() < 0.5 ? 1 : -1;
        var n = 3 + Math.floor(Math.random() * 5);
        var y = vh * (0.1 + Math.random() * 0.3);
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
  };

  function drawBird(ctx, x, y, s, wing) {
    ctx.beginPath();
    ctx.moveTo(x - s, y - s * wing);
    ctx.quadraticCurveTo(x - s * 0.4, y - s * 0.15, x, y);
    ctx.quadraticCurveTo(x + s * 0.4, y - s * 0.15, x + s, y - s * wing);
    ctx.stroke();
  }
  SS.drawBird = drawBird;

  /** Dibuja todo el fondo en coordenadas de pantalla (unidades del mundo). */
  BG.draw = function (ctx, room, camX, camY, vw, vh, time) {
    var z = room.zone;
    var grd = ctx.createLinearGradient(0, 0, 0, vh);
    grd.addColorStop(0, z.sky[0]);
    grd.addColorStop(0.55, z.sky[1]);
    grd.addColorStop(1, z.sky[2]);
    ctx.fillStyle = grd;
    ctx.fillRect(0, 0, vw, vh);
    if (room.def.dark) {
      ctx.fillStyle = "rgba(4,8,8,0.55)";
      ctx.fillRect(0, 0, vw, vh);
    }

    // Sol o luna velada
    SS.drawGlow(ctx, vw * 0.72 - camX * 0.02, vh * 0.3 - camY * 0.01, Math.max(vw, vh) * 0.42, z.sun, room.def.dark ? 0.05 : 0.22);

    var layers = BG.get(room.zoneId);
    var maxCamY = Math.max(0, room.ph - vh);
    for (var i = 0; i < layers.length; i++) {
      var L = layers[i];
      var off = -((camX * L.f) % LW);
      if (off > 0) off -= LW;
      var yoff = vh - LH + (maxCamY - camY) * L.f * 0.6 + (room.def.dark ? 60 : 0);
      ctx.globalAlpha = L.alpha * (room.def.dark ? 0.45 : 1);
      for (var x = off; x < vw; x += LW) ctx.drawImage(L.img, x, yoff, LW, LH);
      ctx.globalAlpha = 1;
      if (i === 0) BG.drawFlocks(ctx, z, time);
    }

    // Rayos de luz en el bosque
    if (z.layers === "forest" && !room.def.dark) {
      ctx.globalCompositeOperation = "lighter";
      for (var r = 0; r < 4; r++) {
        var bx = ((r * 330 + 120 - camX * 0.18) % (vw + 400) + vw + 400) % (vw + 400) - 200;
        var sway = Math.sin(time * 0.2 + r) * 30;
        var lg = ctx.createLinearGradient(0, 0, 0, vh);
        lg.addColorStop(0, "rgba(" + z.sun + ",0.10)");
        lg.addColorStop(1, "rgba(" + z.sun + ",0)");
        ctx.fillStyle = lg;
        ctx.beginPath();
        ctx.moveTo(bx + sway, 0); ctx.lineTo(bx + 60 + sway, 0);
        ctx.lineTo(bx + 180, vh); ctx.lineTo(bx + 90, vh);
        ctx.fill();
      }
      ctx.globalCompositeOperation = "source-over";
    }
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

  /** Niebla baja, viñeta y oscuridad de cueva (encima del mundo). */
  BG.drawOverlay = function (ctx, room, vw, vh, px, py) {
    var z = room.zone;
    var fg = ctx.createLinearGradient(0, vh * 0.6, 0, vh);
    fg.addColorStop(0, "rgba(" + z.fog + ",0)");
    fg.addColorStop(1, "rgba(" + z.fog + ",0.16)");
    ctx.fillStyle = fg;
    ctx.fillRect(0, vh * 0.6, vw, vh * 0.4);
    if (room.def.dark) {
      var dg = ctx.createRadialGradient(px, py, 50, px, py, Math.max(vw, vh) * 0.7);
      dg.addColorStop(0, "rgba(0,0,0,0)");
      dg.addColorStop(0.35, "rgba(0,0,0,0.35)");
      dg.addColorStop(1, "rgba(0,0,0,0.82)");
      ctx.fillStyle = dg;
      ctx.fillRect(0, 0, vw, vh);
    }
    var vg = ctx.createRadialGradient(vw / 2, vh / 2, Math.min(vw, vh) * 0.35, vw / 2, vh / 2, Math.max(vw, vh) * 0.75);
    vg.addColorStop(0, "rgba(0,0,0,0)");
    vg.addColorStop(1, "rgba(0,0,0,0.55)");
    ctx.fillStyle = vg;
    ctx.fillRect(0, 0, vw, vh);
  };

  /** Partículas ambientales en el mundo, alrededor de la cámara. */
  BG.ambient = function (dt, room, particles, camX, camY, vw, vh) {
    var z = room.zone;
    BG.ambT -= dt;
    if (BG.ambT > 0) return;
    if (z.particles === "ash") {
      BG.ambT = 0.07;
      particles.spawn("ash", camX + Math.random() * (vw + 100) - 50, camY - 10, SS.rand(-8, 22), SS.rand(14, 34),
        9, SS.rand(1.5, 3.2), "#a39790", {});
      if (Math.random() < 0.12) {
        particles.spawn("glow", camX + Math.random() * vw, camY + vh + 5, SS.rand(-6, 6), SS.rand(-30, -14),
          5, SS.rand(2, 4), "255,140,70", {});
      }
    } else if (z.particles === "fireflies") {
      BG.ambT = room.def.dark ? 0.45 : 0.28;
      particles.spawn("firefly", camX + Math.random() * vw, camY + vh * (0.25 + Math.random() * 0.7),
        SS.rand(-8, 8), SS.rand(-8, 8), SS.rand(4, 7), SS.rand(1.5, 2.6), room.def.dark ? "140,220,255" : "205,255,150", { drag: 0.6 });
    }
  };
})();
