/* =====================================================================
   Esqueleto y dibujo de personajes.
   - Las poses son ángulos (piernas, brazos, torso, cabeza, arma).
   - Las poses se MEZCLAN con suavidad hacia la pose objetivo: nada salta
     de golpe de un fotograma a otro.
   - SS.drawKnight dibuja al caballero de capucha roja (diseño de Juan):
     capucha roja puntiaguda, torso descubierto, brazos y botas vendados,
     faldón rojo rasgado y machete.
   ===================================================================== */
(function () {
  "use strict";
  var SS = window.SS;

  var KEYS = ["lean", "crouch", "bob", "tF", "kF", "tB", "kB", "aF", "eF", "aB", "eB", "head", "sw", "rot", "pivot", "hipX"];
  SS.POSE_KEYS = KEYS;

  SS.basePose = function () {
    return { lean: 0.05, crouch: 0, bob: 0, tF: 0.12, kF: -0.12, tB: -0.14, kB: 0.04, aF: 0.4, eF: 0.25, aB: -0.25, eB: 0.35,
      head: 0, sw: 0.6, rot: 0, pivot: 0, hipX: 0 };
  };

  /** Mezcla la pose actual hacia el objetivo (k entre 0 y 1). */
  SS.blendPose = function (cur, tgt, k) {
    for (var i = 0; i < KEYS.length; i++) {
      var key = KEYS[i];
      cur[key] += (tgt[key] - cur[key]) * k;
    }
  };

  SS.lerpPose = function (a, b, t, out) {
    out = out || {};
    for (var i = 0; i < KEYS.length; i++) {
      var k = KEYS[i];
      out[k] = a[k] + ((b[k] === undefined ? a[k] : b[k]) - a[k]) * t;
    }
    return out;
  };

  /** Interpola una lista de fotogramas clave [{t, p: pose parcial}] sobre una base. */
  SS.keyPose = function (base, keys, t) {
    var i = 0;
    while (i < keys.length - 1 && t > keys[i + 1].t) i++;
    var a = keys[i], b = keys[Math.min(i + 1, keys.length - 1)], k;
    if (t <= keys[0].t || a === b) k = 0;
    else k = SS.easeInOut(SS.clamp((t - a.t) / (b.t - a.t), 0, 1));
    var out = {};
    for (var n = 0; n < KEYS.length; n++) {
      var K = KEYS[n];
      var va = a.p[K] !== undefined ? a.p[K] : base[K], vb = b.p[K] !== undefined ? b.p[K] : base[K];
      out[K] = va + (vb - va) * k;
    }
    return out;
  };

  /** Calcula las articulaciones (coordenadas del mundo) desde la pose. */
  SS.solveJoints = function (P, cx, footY, dir, s) {
    s = s || 1;
    var J = {};
    var hipX = cx + (P.hipX + Math.sin(P.lean) * 1.5) * dir * s, hipY = footY - (16 - P.crouch) * s + P.bob * s;
    J.hip = { x: hipX, y: hipY };
    var tl = 12.5 * s;
    J.sh = { x: hipX + Math.sin(P.lean) * dir * tl, y: hipY - Math.cos(P.lean) * tl };
    var ha = P.lean + P.head;
    J.neck = { x: J.sh.x + Math.sin(ha) * dir * 2.5 * s, y: J.sh.y - Math.cos(ha) * 2.5 * s };
    J.head = { x: J.sh.x + Math.sin(ha) * dir * 7.2 * s, y: J.sh.y - Math.cos(ha) * 7.2 * s };
    var leg = function (t, k) {
      var kn = { x: hipX + Math.sin(t) * dir * 8.4 * s, y: hipY + Math.cos(t) * 8.4 * s };
      var ft = { x: kn.x + Math.sin(t + k) * dir * 8.2 * s, y: kn.y + Math.cos(t + k) * 8.2 * s };
      return [kn, ft];
    };
    var lf = leg(P.tF, P.kF), lb = leg(P.tB, P.kB);
    J.kF = lf[0]; J.fF = lf[1]; J.kB = lb[0]; J.fB = lb[1];
    var arm = function (a, e) {
      var el = { x: J.sh.x + Math.sin(a + P.lean) * dir * 6.8 * s, y: J.sh.y + 1 * s + Math.cos(a + P.lean) * 6.8 * s };
      var hd = { x: el.x + Math.sin(a + e + P.lean) * dir * 6.6 * s, y: el.y + Math.cos(a + e + P.lean) * 6.6 * s };
      return [el, hd];
    };
    var af = arm(P.aF, P.eF), ab = arm(P.aB, P.eB);
    J.eF = af[0]; J.hF = af[1]; J.eB = ab[0]; J.hB = ab[1];
    if (P.rot) {
      var px = cx, py = footY - (P.pivot || 0) * s;
      var r = P.rot * dir, cs = Math.cos(r), sn = Math.sin(r);
      for (var key in J) {
        var p = J[key], dx = p.x - px, dy = p.y - py;
        p.x = px + dx * cs - dy * sn; p.y = py + dx * sn + dy * cs;
      }
      J.rotA = r;
    } else J.rotA = 0;
    return J;
  };

  /* ---------------------------------------------------------- dibujo */
  var C = {
    skin: "#8a6551", skinD: "#5b4134", skinL: "#a88068", wrap: "#c6b79c", wrapD: "#8a7d68",
    boot: "#33251e", red: "#a3232a", redL: "#c9363b", redD: "#5e1116", skirt: "#8b1c22", skirtD: "#55100f",
    belt: "#2a1c15", blade: "#aeb7bd", bladeL: "#e3e9ec", bladeD: "#4f555a", handle: "#3a281d", ink: "#0b0809"
  };
  SS.KNIGHT_COL = C;

  function seg(ctx, a, b, w, col) {
    ctx.strokeStyle = col; ctx.lineWidth = w;
    ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
  }
  function lerpPt(a, b, t) { return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t }; }

  /** Vendas: rayas claras a lo largo de un segmento. */
  function wraps(ctx, a, b, w, n, col) {
    ctx.strokeStyle = col; ctx.lineWidth = 0.8;
    var dx = b.x - a.x, dy = b.y - a.y, L = Math.sqrt(dx * dx + dy * dy) || 1, nx = -dy / L, ny = dx / L;
    ctx.beginPath();
    for (var i = 0; i < n; i++) {
      var t = (i + 0.5) / n, p = lerpPt(a, b, t);
      ctx.moveTo(p.x - nx * w * 0.5 - dx / L * 0.8, p.y - ny * w * 0.5 - dy / L * 0.8);
      ctx.lineTo(p.x + nx * w * 0.5 + dx / L * 0.8, p.y + ny * w * 0.5 + dy / L * 0.8);
    }
    ctx.stroke();
  }

  /** Machete: hoja ancha y algo curva, lomo con muescas, mango de madera. */
  SS.drawMachete = function (ctx, hx, hy, ang, dir, len, flash) {
    var ux = Math.sin(ang) * dir, uy = Math.cos(ang);       // a lo largo de la hoja
    var nx = Math.cos(ang) * dir, ny = -Math.sin(ang);      // hacia el filo
    var L = len || 19;
    ctx.lineCap = "round";
    // mango
    seg(ctx, { x: hx - ux * 4.5, y: hy - uy * 4.5 }, { x: hx + ux * 1.5, y: hy + uy * 1.5 }, 2.6, flash ? "#fff" : C.handle);
    // guarda
    seg(ctx, { x: hx + ux * 1.6 - nx * 2.2, y: hy + uy * 1.6 - ny * 2.2 }, { x: hx + ux * 1.6 + nx * 2.4, y: hy + uy * 1.6 + ny * 2.4 }, 1.6, flash ? "#fff" : C.ink);
    var b0 = { x: hx + ux * 2.2, y: hy + uy * 2.2 };
    var tip = { x: hx + ux * L, y: hy + uy * L };
    ctx.fillStyle = flash ? "#ffffff" : C.blade;
    ctx.strokeStyle = C.ink;
    ctx.lineWidth = 0.9;
    ctx.beginPath();
    ctx.moveTo(b0.x - nx * 1.3, b0.y - ny * 1.3);                                          // lomo
    for (var i = 1; i <= 4; i++) {                                                          // muescas del lomo
      var t = i / 5, p = lerpPt(b0, tip, t);
      ctx.lineTo(p.x - nx * (1.3 + t * 0.5) - ux * 0.8, p.y - ny * (1.3 + t * 0.5) - uy * 0.8);
      ctx.lineTo(p.x - nx * (0.6 + t * 0.4), p.y - ny * (0.6 + t * 0.4));
    }
    ctx.lineTo(tip.x - nx * 1.6, tip.y - ny * 1.6);
    ctx.lineTo(tip.x + nx * 1.2 + ux * 0.5, tip.y + ny * 1.2 + uy * 0.5);                  // punta en bisel
    ctx.quadraticCurveTo(hx + ux * L * 0.6 + nx * 3.6, hy + uy * L * 0.6 + ny * 3.6, b0.x + nx * 2.2, b0.y + ny * 2.2); // filo curvo
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.strokeStyle = flash ? "#fff" : C.bladeL;
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(b0.x + nx * 1.6, b0.y + ny * 1.6);
    ctx.quadraticCurveTo(hx + ux * L * 0.6 + nx * 2.8, hy + uy * L * 0.6 + ny * 2.8, tip.x + nx * 0.8, tip.y + ny * 0.8);
    ctx.stroke();
    return tip;
  };

  /**
   * Dibuja al caballero desde sus articulaciones.
   * o: { dir, sw (ángulo del machete), flash, hood:[puntos], skirt:[[puntos],...], item, itemAng, noSword }
   */
  SS.drawKnight = function (ctx, J, o) {
    var dir = o.dir, fl = o.flash, i;
    var skin = fl ? "#fff" : C.skin, skinD = fl ? "#fff" : C.skinD;
    ctx.lineCap = "round"; ctx.lineJoin = "round";

    // --- brazo trasero
    seg(ctx, J.sh, J.eB, 3.0, skinD);
    seg(ctx, J.eB, J.hB, 2.7, fl ? "#fff" : C.wrapD);
    // --- pierna trasera
    seg(ctx, J.hip, J.kB, 3.9, skinD);
    seg(ctx, J.kB, J.fB, 3.3, fl ? "#fff" : "#2a1f19");
    footShape(ctx, J.kB, J.fB, dir, fl ? "#fff" : "#241a15");

    // --- faldón trasero
    if (o.skirt) skirtLayer(ctx, J, o.skirt, true, fl);

    // --- torso descubierto
    var hip = J.hip, sh = J.sh;
    var tdx = sh.x - hip.x, tdy = sh.y - hip.y, tl = Math.sqrt(tdx * tdx + tdy * tdy) || 1;
    var nx = -tdy / tl, ny = tdx / tl;
    ctx.fillStyle = skin;
    ctx.beginPath();
    ctx.moveTo(hip.x - nx * 3.2, hip.y - ny * 3.2);
    ctx.lineTo(sh.x - nx * 4.6 - tdx / tl * 0.5, sh.y - ny * 4.6 - tdy / tl * 0.5);
    ctx.quadraticCurveTo(sh.x + tdx / tl * 2, sh.y + tdy / tl * 2, sh.x + nx * 4.6, sh.y + ny * 4.6);
    ctx.lineTo(hip.x + nx * 3.2, hip.y + ny * 3.2);
    ctx.closePath();
    ctx.fill();
    if (!fl) {
      // sombra lateral y marcas del pecho / abdomen
      ctx.fillStyle = C.skinD;
      ctx.beginPath();
      var side = dir > 0 ? -1 : 1;
      ctx.moveTo(hip.x + nx * 3.2 * side, hip.y + ny * 3.2 * side);
      ctx.lineTo(sh.x + nx * 4.6 * side, sh.y + ny * 4.6 * side);
      ctx.lineTo(sh.x + nx * 2.4 * side, sh.y + ny * 2.4 * side + 2);
      ctx.lineTo(hip.x + nx * 1.6 * side, hip.y + ny * 1.6 * side);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = "rgba(40,24,18,0.55)"; ctx.lineWidth = 0.6;
      ctx.beginPath();
      var m1 = lerpPt(hip, sh, 0.72), m2 = lerpPt(hip, sh, 0.45), m3 = lerpPt(hip, sh, 0.25);
      ctx.moveTo(m1.x - nx * 2.6, m1.y - ny * 2.6); ctx.lineTo(m1.x + nx * 2.6, m1.y + ny * 2.6);
      ctx.moveTo(m2.x, m2.y); ctx.lineTo(m3.x, m3.y);
      ctx.stroke();
    }
    // cinturón
    var bl = lerpPt(hip, sh, 0.06);
    ctx.strokeStyle = fl ? "#fff" : C.belt; ctx.lineWidth = 2.4;
    ctx.beginPath(); ctx.moveTo(bl.x - nx * 3.6, bl.y - ny * 3.6); ctx.lineTo(bl.x + nx * 3.6, bl.y + ny * 3.6); ctx.stroke();

    // --- pierna delantera
    seg(ctx, J.hip, J.kF, 4.1, skin);
    seg(ctx, J.kF, J.fF, 3.5, fl ? "#fff" : C.boot);
    if (!fl) wraps(ctx, J.kF, J.fF, 3.5, 3, C.wrapD);
    footShape(ctx, J.kF, J.fF, dir, fl ? "#fff" : C.boot);

    // --- faldón delantero
    if (o.skirt) skirtLayer(ctx, J, o.skirt, false, fl);

    // --- cabeza con capucha puntiaguda
    var hd = J.head;
    var ha = Math.atan2(hd.x - J.neck.x, J.neck.y - hd.y);   // inclinación de la cabeza
    var hood = o.hood;
    ctx.fillStyle = fl ? "#fff" : C.red;
    ctx.beginPath();
    var ca = Math.cos(ha), sa = Math.sin(ha);
    var rot = function (x, y) { return { x: hd.x + (x * ca - y * sa), y: hd.y + (x * sa + y * ca) }; };
    var b1 = rot(-5.6 * dir, 5.5), b2 = rot(5.2 * dir, 5.5), s1 = rot(-6.2 * dir, -1.5), s2 = rot(5.6 * dir, -2);
    var tip = hood && hood.length ? hood[hood.length - 1] : rot(-3 * dir, -15);
    var mid = hood && hood.length > 1 ? hood[1] : rot(-1.5 * dir, -9);
    // caída de la capucha sobre los hombros
    var sL = { x: J.sh.x - nx * 5.6, y: J.sh.y - ny * 5.6 }, sR = { x: J.sh.x + nx * 5.6, y: J.sh.y + ny * 5.6 };
    ctx.moveTo(sL.x, sL.y + 1.5);
    ctx.lineTo(b1.x, b1.y);
    ctx.quadraticCurveTo(s1.x, s1.y, mid.x - 1.8 * dir, mid.y);
    ctx.lineTo(tip.x, tip.y);
    ctx.lineTo(mid.x + 1.8 * dir, mid.y + 0.5);
    ctx.quadraticCurveTo(s2.x, s2.y, b2.x, b2.y);
    ctx.lineTo(sR.x, sR.y + 1.5);
    // borde inferior rasgado sobre los hombros
    ctx.lineTo(lerpPt(sR, sL, 0.3).x, lerpPt(sR, sL, 0.3).y + 3);
    ctx.lineTo(lerpPt(sR, sL, 0.5).x, lerpPt(sR, sL, 0.5).y + 1);
    ctx.lineTo(lerpPt(sR, sL, 0.72).x, lerpPt(sR, sL, 0.72).y + 3.5);
    ctx.closePath();
    ctx.fill();
    if (!fl) {
      ctx.fillStyle = C.redD;
      ctx.beginPath();
      var back1 = rot(-5.6 * dir, 4), back2 = rot(-2.5 * dir, -4);
      ctx.moveTo(back1.x, back1.y); ctx.lineTo(s1.x, s1.y); ctx.lineTo(mid.x - 1.8 * dir, mid.y); ctx.lineTo(back2.x, back2.y);
      ctx.closePath(); ctx.fill();
      ctx.strokeStyle = C.redL; ctx.lineWidth = 0.7;
      ctx.beginPath();
      var hl1 = rot(3.6 * dir, -3), hl2 = rot(1.2 * dir, -9);
      ctx.moveTo(hl1.x, hl1.y); ctx.lineTo(hl2.x, hl2.y);
      ctx.stroke();
      // rendijas de la cara en sombra con un brillo tenue
      ctx.fillStyle = "#3a080b";
      var e1 = rot(2.4 * dir, -0.8), e2 = rot(4.6 * dir, -0.8);
      ctx.beginPath(); ctx.ellipse(e1.x, e1.y, 0.9, 0.55, ha, 0, 6.283); ctx.ellipse(e2.x, e2.y, 0.9, 0.55, ha, 0, 6.283); ctx.fill();
      if (o.eyes !== false) {
        SS.drawGlow(ctx, (e1.x + e2.x) / 2, e1.y, 5, "255,190,150", 0.18);
      }
    }

    // --- objeto en la mano trasera (petaca o botella)
    if (o.item) drawItem(ctx, J.hB, o.itemAng || 0, o.item, dir);

    // --- brazo delantero (sostiene el machete)
    seg(ctx, J.sh, J.eF, 3.2, skin);
    seg(ctx, J.eF, J.hF, 3.0, fl ? "#fff" : C.wrap);
    if (!fl) wraps(ctx, J.eF, J.hF, 3, 3, C.wrapD);
    if (!o.noSword) o.tip = SS.drawMachete(ctx, J.hF.x, J.hF.y, o.sw, dir, o.swordLen, fl);
    ctx.fillStyle = skinD;
    ctx.beginPath(); ctx.arc(J.hF.x, J.hF.y, 1.6, 0, 6.283); ctx.fill();
    return o.tip;
  };

  function footShape(ctx, k, f, dir, col) {
    ctx.fillStyle = col;
    ctx.beginPath();
    ctx.ellipse(f.x + dir * 1.6, f.y - 0.6, 3.1, 1.6, 0, 0, 6.283);
    ctx.fill();
  }

  /** Faldón: tiras de tela con física que cuelgan de la cintura. */
  function skirtLayer(ctx, J, strips, back, fl) {
    ctx.fillStyle = fl ? "#fff" : back ? C.skirtD : C.skirt;
    var n = strips.length, i;
    var half = Math.floor(n / 2);
    var list = back ? strips.slice(0, half + 1) : strips.slice(half - 1);
    if (list.length < 2) return;
    ctx.beginPath();
    var first = list[0][0];
    ctx.moveTo(first.x, first.y);
    for (i = 1; i < list.length; i++) ctx.lineTo(list[i][0].x, list[i][0].y);
    for (i = list.length - 1; i >= 0; i--) {
      var st = list[i], end = st[st.length - 1], mid = st[Math.floor(st.length / 2)];
      ctx.lineTo(mid.x, mid.y);
      ctx.lineTo(end.x, end.y);
      if (i > 0) {
        var nx = list[i - 1][list[i - 1].length - 1];
        ctx.lineTo((end.x + nx.x) / 2, (end.y + nx.y) / 2 - 3);
      }
    }
    ctx.closePath();
    ctx.fill();
    if (!fl && !back) {
      ctx.strokeStyle = "rgba(30,4,6,0.55)"; ctx.lineWidth = 0.6;
      ctx.beginPath();
      for (i = 1; i < list.length - 1; i++) {
        var s2 = list[i];
        ctx.moveTo(s2[0].x, s2[0].y); ctx.lineTo(s2[s2.length - 1].x, s2[s2.length - 1].y);
      }
      ctx.stroke();
    }
  }

  function drawItem(ctx, h, ang, kind, dir) {
    ctx.save();
    ctx.translate(h.x, h.y);
    ctx.rotate(ang * dir);
    if (kind === "flask") {
      // petaca plateada
      ctx.fillStyle = "#c9cfd6";
      ctx.strokeStyle = "#3b3f44"; ctx.lineWidth = 0.6;
      ctx.beginPath(); ctx.rect(-2.2, -3.5, 4.4, 6); ctx.fill(); ctx.stroke();
      ctx.fillStyle = "#8d949b"; ctx.fillRect(-1, -5, 2, 1.6);
      ctx.fillStyle = "#f4f8fb"; ctx.fillRect(-1.6, -2.8, 0.9, 4.2);
    } else {
      // botella de cerveza
      ctx.fillStyle = "#4a2d10";
      ctx.strokeStyle = "#140a04"; ctx.lineWidth = 0.6;
      ctx.beginPath();
      ctx.moveTo(-1.8, 4); ctx.lineTo(-1.8, -2); ctx.lineTo(-0.8, -4); ctx.lineTo(-0.8, -7); ctx.lineTo(0.8, -7);
      ctx.lineTo(0.8, -4); ctx.lineTo(1.8, -2); ctx.lineTo(1.8, 4); ctx.closePath();
      ctx.fill(); ctx.stroke();
      ctx.fillStyle = "#d8c49a"; ctx.fillRect(-1.8, 0, 3.6, 2.2);
      ctx.fillStyle = "rgba(255,220,160,0.5)"; ctx.fillRect(-1.2, -1.5, 0.7, 4.5);
    }
    ctx.restore();
  }
  SS.drawItem = drawItem;
})();
