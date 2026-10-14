/* =====================================================================
   Habitaciones: lectura del mapa de texto, colisiones (incluye
   plataformas atravesables), decoración y dibujo del terreno con las
   texturas de piedra y musgo (assets/arte), faroles colgantes con
   física, argollas del gancho y cruces.
   ===================================================================== */
(function () {
  "use strict";
  var SS = window.SS, T = SS.T;
  var OBJECTS = "PLNBcfjswbohraK@lxukt";

  var Room = (SS.Room = function (id, save) {
    var def = SS.ROOMS[id];
    this.id = id;
    this.def = def;
    this.zoneId = def.zone;
    this.zone = SS.ZONES[def.zone];
    this.h = def.rows.length;
    this.w = def.rows[0].length;
    this.pw = this.w * T;
    this.ph = this.h * T;
    this.tiles = [];
    this.objects = [];
    this.spawns = [];
    this.props = [];
    this.ropes = [];
    this.doorsClosed = false;
    this.start = null;
    this.bossPos = null;
    this.secretHits = {};
    var loreIdx = 0, gate = null, x, y, pending = [];

    for (y = 0; y < this.h; y++) {
      var row = def.rows[y].split("");
      for (x = 0; x < this.w; x++) {
        var c = row[x], key = id + ":" + x + ":" + y;
        if (c === "S" && save.collected[key]) { row[x] = "."; continue; }
        if (c === "G") {
          if (!gate) gate = { x0: x, y0: y, x1: x, y1: y };
          gate.x0 = Math.min(gate.x0, x); gate.y0 = Math.min(gate.y0, y);
          gate.x1 = Math.max(gate.x1, x); gate.y1 = Math.max(gate.y1, y);
          continue;
        }
        if (OBJECTS.indexOf(c) < 0) continue;
        row[x] = ".";
        pending.push({ c: c, x: x, y: y, key: key });
      }
      this.tiles.push(row);
    }
    for (var i = 0; i < pending.length; i++) {
      var pd = pending[i]; x = pd.x; y = pd.y;
      var o = { tx: x, ty: y, x: x * T, y: y * T, key: pd.key, t: Math.random() * 10 };
      switch (pd.c) {
        case "P": this.start = { x: x, y: y }; break;
        case "L": o.kind = "tablet"; o.lore = def.lore ? def.lore[loreIdx++] : null; this.objects.push(o); break;
        case "N": o.kind = "npc"; this.objects.push(o); break;
        case "B": o.kind = "stand"; this.objects.push(o); this.stand = { x: x, y: y }; break;
        case "a": o.kind = "altar"; o.ability = def.ability; o.taken = !!save.abilities[def.ability]; this.objects.push(o); break;
        case "h": if (!save.collected[pd.key]) { o.kind = "fragment"; this.objects.push(o); } break;
        case "r": if (!save.collected[pd.key]) { o.kind = "relic"; this.objects.push(o); } break;
        case "o": if (!save.collected[pd.key]) { o.kind = "deposit"; o.hp = 4; o.flash = 0; o.lastHit = -1; this.objects.push(o); } break;
        case "K": this.bossPos = { x: x, y: y }; break;
        case "@": o.kind = "ring"; o.cx = x * T + T / 2; o.cy = y * T + T / 2; o.top = this.ceilingAbove(x, y); this.objects.push(o); break;
        case "t": o.kind = "cross"; o.h = 2 + SS.hash2(x, y, 9) * 1.2; this.objects.push(o); break;
        case "l": {
          var top = this.ceilingAbove(x, y);
          if (top === null) top = (y - 2) * T;
          var len = (y * T + T * 0.5) - top, n = Math.max(3, Math.round(len / 7));
          var rope = new SS.Rope(x * T + T / 2, top, n, len / (n - 1), { heavyEnd: 0.25, damp: 0.992 });
          rope.lantern = true;
          rope.phase = Math.random() * 6;
          this.ropes.push(rope);
          break;
        }
        case "x": case "u": case "k":
          if (!save.collected[pd.key]) this.props.push({ kind: pd.c === "x" ? "barril" : pd.c === "u" ? "vasija" : "caja", tx: x * T, ty: y * T, key: pd.key });
          break;
        default: this.spawns.push({ type: pd.c, x: x * T, y: y * T });
      }
    }
    if (gate) {
      this.objects.push({ kind: "gate", x: gate.x0 * T, y: gate.y0 * T,
        w: (gate.x1 - gate.x0 + 1) * T, h: (gate.y1 - gate.y0 + 1) * T, t: 0 });
    }
    this.buildDecor();
  });

  /** Borde inferior de la roca más cercana por encima de (tx,ty), en píxeles del mundo. */
  Room.prototype.ceilingAbove = function (tx, ty) {
    for (var y = ty - 1; y >= Math.max(0, ty - 12); y--) {
      var c = this.tiles[y] ? this.tiles[y][tx] : "#";
      if (c === "#" || c === "S") return (y + 1) * T;
    }
    return null;
  };

  Room.prototype.exitAt = function (side, n) {
    var ex = this.def.exits;
    for (var i = 0; i < ex.length; i++) {
      var e = ex[i];
      if (e.side === side && n >= e.a && n <= e.b) return e;
    }
    return null;
  };

  /** Baldosa en (tx,ty). Fuera de la habitación es roca, salvo en las salidas. */
  Room.prototype.tile = function (tx, ty) {
    if (ty < 0) return this.exitAt("U", tx) ? "." : "#";
    if (ty >= this.h) return this.exitAt("D", tx) ? "." : "#";
    if (tx < 0) return this.exitAt("L", ty) && this.tiles[ty][0] === "." ? "." : "#";
    if (tx >= this.w) return this.exitAt("R", ty) && this.tiles[ty][this.w - 1] === "." ? "." : "#";
    return this.tiles[ty][tx];
  };

  Room.prototype.solid = function (tx, ty) {
    var c = this.tile(tx, ty);
    return c === "#" || c === "S" || c === "G" || (c === "D" && this.doorsClosed);
  };
  Room.prototype.oneway = function (tx, ty) { return this.tile(tx, ty) === "="; };
  Room.prototype.spike = function (tx, ty) { return this.tile(tx, ty) === "^"; };
  Room.prototype.solidPx = function (px, py) { return this.solid(Math.floor(px / T), Math.floor(py / T)); };
  Room.prototype.groundPx = function (px, py) {
    var tx = Math.floor(px / T), ty = Math.floor(py / T);
    return this.solid(tx, ty) || this.oneway(tx, ty);
  };

  /** Punto de aparición al entrar por la salida que viene de "fromId". */
  Room.prototype.entryFrom = function (fromId, side) {
    var opp = { L: "R", R: "L", U: "D", D: "U" }[side];
    var ex = this.def.exits, e = null, i;
    for (i = 0; i < ex.length; i++) if (ex[i].to === fromId && ex[i].side === opp) { e = ex[i]; break; }
    if (!e) return null;
    if (opp === "L" || opp === "R") {
      var col = opp === "L" ? 0 : this.w - 1;
      for (var r = e.b; r >= e.a; r--) {
        if (this.tile(col, r) === "." && this.tile(col, r - 1) === "." && (this.solid(col, r + 1) || this.oneway(col, r + 1))) {
          return { x: col, y: r, side: opp };
        }
      }
      return { x: col, y: e.b, side: opp };
    }
    var cx = Math.floor((e.a + e.b) / 2);
    return { x: cx, y: opp === "U" ? 0 : this.h - 1, side: opp, boost: opp === "D" };
  };

  /* Movimiento con colisiones por ejes. Devuelve -1/1 si chocó. */
  Room.prototype.moveX = function (b, dx) {
    if (dx === 0) return 0;
    b.x += dx;
    var top = Math.floor(b.y / T), bot = Math.floor((b.y + b.h - 0.01) / T), tx, ty;
    if (dx > 0) {
      tx = Math.floor((b.x + b.w - 0.01) / T);
      for (ty = top; ty <= bot; ty++) if (this.solid(tx, ty)) { b.x = tx * T - b.w; return 1; }
    } else {
      tx = Math.floor(b.x / T);
      for (ty = top; ty <= bot; ty++) if (this.solid(tx, ty)) { b.x = (tx + 1) * T; return -1; }
    }
    return 0;
  };

  Room.prototype.moveY = function (b, dy) {
    if (dy === 0) return 0;
    var prevBottom = b.y + b.h;
    b.y += dy;
    var left = Math.floor(b.x / T), right = Math.floor((b.x + b.w - 0.01) / T), tx, ty;
    if (dy > 0) {
      ty = Math.floor((b.y + b.h - 0.01) / T);
      for (tx = left; tx <= right; tx++) {
        if (this.solid(tx, ty) || (!b.dropping && this.oneway(tx, ty) && prevBottom <= ty * T + 0.5)) {
          b.y = ty * T - b.h; return 1;
        }
      }
    } else {
      ty = Math.floor(b.y / T);
      for (tx = left; tx <= right; tx++) if (this.solid(tx, ty)) { b.y = (ty + 1) * T; return -1; }
    }
    return 0;
  };

  /** ¿Está el cuerpo apoyado sobre una plataforma atravesable? */
  Room.prototype.onOneway = function (b) {
    var ty = Math.floor((b.y + b.h + 1) / T);
    var l = Math.floor(b.x / T), r = Math.floor((b.x + b.w - 0.01) / T);
    var any = false;
    for (var tx = l; tx <= r; tx++) {
      if (this.solid(tx, ty)) return false;
      if (this.oneway(tx, ty)) any = true;
    }
    return any;
  };

  /** ¿Toca púas? (solo la mitad inferior de la baldosa es peligrosa) */
  Room.prototype.touchesSpikes = function (b) {
    var l = Math.floor(b.x / T), r = Math.floor((b.x + b.w - 0.01) / T);
    var t = Math.floor(b.y / T), d = Math.floor((b.y + b.h - 0.01) / T);
    for (var ty = t; ty <= d; ty++)
      for (var tx = l; tx <= r; tx++)
        if (this.spike(tx, ty) && SS.overlap(b.x, b.y, b.w, b.h, tx * T + 3, ty * T + 14, T - 6, T - 14)) return true;
    return false;
  };

  /** Golpe a un muro secreto: con 3 golpes se derrumba todo el bloque conectado. */
  Room.prototype.hitSecret = function (tx, ty, G) {
    var k = tx + ":" + ty;
    this.secretHits[k] = (this.secretHits[k] || 0) + 1;
    var total = 0, group = this.secretGroup(tx, ty), i;
    for (i = 0; i < group.length; i++) total += this.secretHits[group[i][0] + ":" + group[i][1]] || 0;
    if (total >= 3) {
      for (i = 0; i < group.length; i++) {
        var gx = group[i][0], gy = group[i][1];
        this.tiles[gy][gx] = ".";
        G.save.collected[this.id + ":" + gx + ":" + gy] = 1;
        for (var p = 0; p < 10; p++) {
          G.particles.spawn("shard", gx * T + Math.random() * T, gy * T + Math.random() * T,
            SS.rand(-120, 120), SS.rand(-220, -40), SS.rand(0.6, 1.1), SS.rand(3, 6), this.zone.groundTop, { grav: 900, collide: true });
        }
      }
      this.buildDecor();
      return true;
    }
    return false;
  };

  Room.prototype.secretGroup = function (tx, ty) {
    var out = [], seen = {}, stack = [[tx, ty]];
    while (stack.length) {
      var p = stack.pop(), k = p[0] + ":" + p[1];
      if (seen[k]) continue;
      seen[k] = 1;
      if (p[0] < 0 || p[1] < 0 || p[0] >= this.w || p[1] >= this.h || this.tiles[p[1]][p[0]] !== "S") continue;
      out.push(p);
      stack.push([p[0] + 1, p[1]], [p[0] - 1, p[1]], [p[0], p[1] + 1], [p[0], p[1] - 1]);
    }
    return out;
  };

  Room.prototype.isRock = function (tx, ty) { var k = this.tile(tx, ty); return k === "#" || k === "S"; };

  /* --------------------------------------------------------- decoración
     Se calcula una vez por sala (determinista): helechos, flores y hierba
     en el bosque; huesos, velas, estandartes y faroles en el refugio;
     enredaderas y raíces colgando de los techos. */
  Room.prototype.buildDecor = function () {
    var d = (this.decor = { top: [], hang: [], wall: [] });
    var forest = this.zoneId === "bosque";
    for (var ty = 1; ty < this.h; ty++) {
      for (var tx = 0; tx < this.w; tx++) {
        var h = SS.hash2(tx, ty, 77), h2 = SS.hash2(tx, ty, 78);
        if (this.isRock(tx, ty) && this.tile(tx, ty - 1) === "." && this.tile(tx, ty - 2) === ".") {
          if (forest) {
            if (h < 0.11) d.top.push({ k: "fern", x: tx * T + 6 + h2 * 20, y: ty * T, s: 0.26 + h2 * 0.12, f: h2 > 0.5 });
            else if (h < 0.22) d.top.push({ k: "flower", x: tx * T + 4 + h2 * 24, y: ty * T, n: 2 + Math.floor(h2 * 3) });
            else if (h < 0.27) d.top.push({ k: "mush", x: tx * T + 8 + h2 * 16, y: ty * T });
          } else {
            if (h < 0.05 && this.tile(tx, ty - 3) === ".") d.top.push({ k: "banner", x: tx * T + 16, y: ty * T, f: h2 > 0.5 });
            else if (h < 0.13) d.top.push({ k: "bones", x: tx * T + 4 + h2 * 22, y: ty * T });
            else if (h < 0.2) d.top.push({ k: "candle", x: tx * T + 6 + h2 * 20, y: ty * T, n: 1 + Math.floor(h2 * 3) });
            else if (h < 0.25) d.top.push({ k: "stake", x: tx * T + 6 + h2 * 20, y: ty * T, a: (h2 - 0.5) * 0.5 });
          }
        }
        if (this.isRock(tx, ty - 1) && this.tile(tx, ty) === "." && ty - 1 >= 0) {
          if (forest ? h < 0.45 : h < 0.12) {
            d.hang.push({ x: tx * T + 3 + h2 * 26, y: ty * T, len: forest ? 10 + h * 60 : 6 + h * 30, ph: h2 * 6, k: forest ? "vine" : "root" });
          }
        }
        // faroles de pared (solo en el refugio, a media altura)
        if (!forest && this.tile(tx, ty) === "." && this.tile(tx, ty + 1) === "." && this.tile(tx, ty + 2) !== "#" && SS.hash2(tx, ty, 91) < 0.05) {
          if (this.isRock(tx - 1, ty) && this.isRock(tx - 1, ty - 1)) d.wall.push({ x: tx * T, y: ty * T - 10, side: 1 });
          else if (this.isRock(tx + 1, ty) && this.isRock(tx + 1, ty - 1)) d.wall.push({ x: tx * T + T, y: ty * T - 10, side: -1 });
        }
      }
    }
  };

  /* ------------------------------------------------------------ dibujo */
  var patCache = {};
  function rockPattern(ctx, name) {
    if (patCache[name] !== undefined) return patCache[name];
    var im = SS.img(name);
    if (!im) return null;
    var p = ctx.createPattern(im, "repeat");
    try { if (p && p.setTransform && window.DOMMatrix) p.setTransform(new DOMMatrix().scale(0.42)); } catch (e) { /* sin escala */ }
    patCache[name] = p;
    return p;
  }

  /** Detrás del terreno: cruces de madera grandes y objetos de fondo. */
  Room.prototype.drawBack = function (ctx, x0, y0, x1, y1, time) {
    var forest = this.zoneId === "bosque", i;
    for (i = 0; i < this.objects.length; i++) {
      var o = this.objects[i];
      if (o.kind !== "cross" || o.x < x0 - 80 || o.x > x1 + 80) continue;
      var cx = o.x + T / 2, by = o.y + T, hh = o.h * T, tilt = (SS.hash2(o.tx, o.ty, 5) - 0.5) * 0.2;
      ctx.save();
      ctx.translate(cx, by);
      ctx.rotate(tilt);
      ctx.fillStyle = forest ? "#13201b" : "#1d1513";
      ctx.fillRect(-3, -hh, 6, hh);
      ctx.fillRect(-hh * 0.3, -hh * 0.78, hh * 0.6, 5);
      ctx.fillStyle = "rgba(255,255,255,0.05)";
      ctx.fillRect(-3, -hh, 1.5, hh);
      // trapo que cuelga
      ctx.strokeStyle = forest ? "rgba(70,90,70,0.7)" : "rgba(110,30,26,0.8)";
      ctx.lineWidth = 3;
      ctx.beginPath();
      var sw = Math.sin(time * 1.7 + o.tx) * 3;
      ctx.moveTo(hh * 0.22, -hh * 0.76);
      ctx.quadraticCurveTo(hh * 0.25 + sw * 0.5, -hh * 0.6, hh * 0.24 + sw, -hh * 0.45);
      ctx.stroke();
      ctx.restore();
    }
  };

  Room.prototype.draw = function (ctx, x0, y0, x1, y1, time, G) {
    var z = this.zone;
    var tx0 = Math.floor(x0 / T) - 1, ty0 = Math.floor(y0 / T) - 1;
    var tx1 = Math.floor(x1 / T) + 1, ty1 = Math.floor(y1 / T) + 1;
    var tx, ty, c, px, py, s = this;
    var isSolid = function (x, y) { var k = s.tile(x, y); return k === "#" || k === "S" || k === "G"; };

    // Masa de roca: color base + textura de piedra encima
    ctx.beginPath();
    for (ty = ty0; ty <= ty1; ty++) {
      var runStart = null;
      for (tx = tx0; tx <= tx1 + 1; tx++) {
        var sol = tx <= tx1 && isSolid(tx, ty);
        if (sol && runStart === null) runStart = tx;
        if (!sol && runStart !== null) { ctx.rect(runStart * T, ty * T, (tx - runStart) * T + 0.5, T + 0.5); runStart = null; }
      }
    }
    ctx.fillStyle = z.ground;
    ctx.fill();
    var pat = rockPattern(ctx, z.rock);
    if (pat) {
      ctx.globalAlpha = 0.55;
      ctx.fillStyle = pat;
      ctx.fill();
      ctx.globalAlpha = 1;
    }

    var edge = SS.img(z.edge);
    for (ty = ty0; ty <= ty1; ty++) {
      for (tx = tx0; tx <= tx1; tx++) {
        c = this.tile(tx, ty);
        px = tx * T; py = ty * T;
        if (c === "#" || c === "S") {
          var up = isSolid(tx, ty - 1), dn = isSolid(tx, ty + 1);
          var lf = isSolid(tx - 1, ty), rt = isSolid(tx + 1, ty);
          // sombra interior: la roca se oscurece lejos de los bordes
          if (up && dn && lf && rt) {
            ctx.fillStyle = "rgba(0,0,0,0.35)";
            ctx.fillRect(px, py, T, T);
          }
          if (!lf) { ctx.fillStyle = "rgba(0,0,0,0.55)"; ctx.fillRect(px, py, 3, T); ctx.fillStyle = "rgba(255,255,255,0.05)"; ctx.fillRect(px + 3, py, 1, T); }
          if (!rt) { ctx.fillStyle = "rgba(0,0,0,0.55)"; ctx.fillRect(px + T - 3, py, 3, T); ctx.fillStyle = "rgba(255,255,255,0.04)"; ctx.fillRect(px + T - 4, py, 1, T); }
          if (!dn) { ctx.fillStyle = "rgba(0,0,0,0.6)"; ctx.fillRect(px, py + T - 4, T, 4); }
          if (c === "S") {
            ctx.strokeStyle = "rgba(255,255,255,0.07)";
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(px + 8, py + 4); ctx.lineTo(px + 14, py + 14); ctx.lineTo(px + 10, py + 22);
            ctx.moveTo(px + 20, py + 10); ctx.lineTo(px + 25, py + 18);
            ctx.stroke();
          }
        } else if (c === "=") {
          if (this.tile(tx - 1, ty) !== "=") this.drawPlatformRun(ctx, tx, ty);
        } else if (c === "^") {
          this.drawSpikes(ctx, px, py, time, tx);
        } else if (c === "D") {
          this.drawDoor(ctx, px, py, time, isSolid(tx, ty - 1) || this.tile(tx, ty - 1) !== "D");
        } else if (c === "G") {
          ctx.fillStyle = "#1b2124";
          ctx.fillRect(px, py, T, T);
          ctx.strokeStyle = "rgba(160,200,210,0.18)";
          ctx.lineWidth = 1;
          ctx.strokeRect(px + 2.5, py + 2.5, T - 5, T - 5);
        }
      }
    }
    // bordes superiores con la textura de musgo / piedra
    for (ty = ty0; ty <= ty1; ty++) {
      for (tx = tx0; tx <= tx1; tx++) {
        c = this.tile(tx, ty);
        if ((c === "#" || c === "S") && !isSolid(tx, ty - 1)) this.drawTop(ctx, tx, ty, tx * T, ty * T, time, edge, isSolid(tx - 1, ty) && !isSolid(tx - 1, ty - 1), isSolid(tx + 1, ty) && !isSolid(tx + 1, ty - 1));
      }
    }
    this.drawDecor(ctx, x0, y0, x1, y1, time, G);
  };

  Room.prototype.drawTop = function (ctx, tx, ty, px, py, time, edge, contL, contR) {
    var z = this.zone;
    if (edge) {
      var sc = 30 / z.edgeH, sw = edge.width, wW = sw * sc, top = py - z.surf * sc;
      var u = ((px % wW) + wW) % wW, sx = u / sc, need = T / sc;
      var first = Math.min(need, sw - sx);
      ctx.drawImage(edge, sx, 0, first, edge.height, px, top, first * sc, 30);
      if (first < need) ctx.drawImage(edge, 0, 0, need - first, edge.height, px + first * sc, top, (need - first) * sc, 30);
      if (!contL) { ctx.fillStyle = "rgba(0,0,0,0.45)"; ctx.fillRect(px, top + 4, 2, 26); }
      if (!contR) { ctx.fillStyle = "rgba(0,0,0,0.45)"; ctx.fillRect(px + T - 2, top + 4, 2, 26); }
    } else {
      ctx.fillStyle = z.groundTop;
      ctx.fillRect(px, py, T, 3);
      ctx.fillStyle = z.groundEdge;
      ctx.fillRect(px, py + 3, T, 2);
    }
    if (this.zoneId === "bosque") {
      // hierba que se mece y se aparta al pasar
      var pl = SS.G && SS.G.player, pcx = pl ? pl.cx() : -1e4, pby = pl ? pl.y + pl.h : -1e4;
      ctx.strokeStyle = "rgba(120,170,90,0.85)";
      ctx.lineWidth = 1.1;
      ctx.beginPath();
      for (var i = 0; i < 5; i++) {
        var gx = px + 2 + SS.hash2(tx, ty, 10 + i) * 28;
        var gh = 4 + SS.hash2(tx, ty, 20 + i) * 7;
        var sway = Math.sin(time * 1.6 + gx * 0.05) * 1.5;
        var dx = gx - pcx;
        if (Math.abs(dx) < 18 && Math.abs(pby - py) < 6) sway += (dx > 0 ? 1 : -1) * (18 - Math.abs(dx)) * 0.45;
        ctx.moveTo(gx, py + 1);
        ctx.quadraticCurveTo(gx + sway * 0.4, py - gh * 0.5, gx + sway, py - gh);
      }
      ctx.stroke();
    }
  };

  /** Plataforma atravesable: losa de la textura cortada en tres partes. */
  Room.prototype.drawPlatformRun = function (ctx, tx, ty) {
    var n = 0;
    while (this.tile(tx + n, ty) === "=") n++;
    var x = tx * T, y = ty * T, w = n * T, z = this.zone;
    var im = SS.img(z.plat);
    if (!im) {
      ctx.fillStyle = z.platform; ctx.fillRect(x + 2, y, w - 4, 10);
      ctx.fillStyle = z.platformTop; ctx.fillRect(x + 2, y, w - 4, 2);
      return;
    }
    var H = 22, sc = H / im.height, top = y - (this.zoneId === "bosque" ? 4 : 3);
    var cap = Math.floor(im.width * 0.28), capW = cap * sc;
    var midSrc = im.width - cap * 2;
    ctx.drawImage(im, 0, 0, cap, im.height, x - 2, top, capW, H);
    var mx = x - 2 + capW, end = x + w + 2 - capW;
    while (mx < end - 0.5) {
      var seg = Math.min(midSrc * sc, end - mx);
      ctx.drawImage(im, cap, 0, seg / sc, im.height, mx, top, seg, H);
      mx += seg;
    }
    ctx.drawImage(im, im.width - cap, 0, cap, im.height, end, top, capW, H);
  };

  Room.prototype.drawSpikes = function (ctx, px, py, time, tx) {
    var by = py + T, i;
    if (this.zoneId === "bosque") {
      // zarzas espinosas
      ctx.strokeStyle = "#0c1410";
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      for (i = 0; i < 3; i++) {
        var bx = px + 4 + i * 11, h = 12 + SS.hash2(tx, i, 4) * 6;
        ctx.moveTo(bx - 4, by); ctx.quadraticCurveTo(bx + 4, by - h * 0.6, bx, by - h);
      }
      ctx.stroke();
      ctx.fillStyle = "#1c2a1f";
      ctx.beginPath();
      for (i = 0; i < 7; i++) {
        var sx = px + 2 + i * 4.4, sy = by - 4 - SS.hash2(tx, i, 7) * 12, d = i % 2 ? 1 : -1;
        ctx.moveTo(sx, sy); ctx.lineTo(sx + d * 5, sy - 3); ctx.lineTo(sx, sy + 2);
      }
      ctx.fill();
    } else {
      // estacas de hierro con puntas al rojo
      ctx.fillStyle = "#2a2423";
      ctx.strokeStyle = "#0e0b0b";
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (i = 0; i < 4; i++) {
        var x = px + i * 8 + 1, tipY = py + 12 + (i % 2) * 4;
        ctx.moveTo(x, by); ctx.lineTo(x + 3, tipY); ctx.lineTo(x + 6, by);
      }
      ctx.fill(); ctx.stroke();
      ctx.fillStyle = "rgba(255,120,60,0.7)";
      for (i = 0; i < 4; i++) ctx.fillRect(px + i * 8 + 3.4, py + 12 + (i % 2) * 4, 1.3, 2.5);
      SS.drawGlow(ctx, px + T / 2, by - 12, 14, "255,100,40", 0.12 + Math.sin(time * 3 + tx) * 0.04);
    }
  };

  Room.prototype.drawDoor = function (ctx, px, py, time, isTop) {
    if (!this.doorsClosed) {
      if (isTop) {
        ctx.fillStyle = "rgba(0,0,0,0.3)";
        ctx.fillRect(px + 6, py, 4, 6);
        ctx.fillRect(px + T - 10, py, 4, 6);
      }
      return;
    }
    ctx.fillStyle = "#1a0f10";
    for (var i = 0; i < 3; i++) {
      var bx = px + 5 + i * 9;
      ctx.fillRect(bx, py, 5, T);
      ctx.beginPath();
      ctx.moveTo(bx, py + 10); ctx.lineTo(bx - 4, py + 14); ctx.lineTo(bx, py + 16);
      ctx.moveTo(bx + 5, py + 22); ctx.lineTo(bx + 9, py + 26); ctx.lineTo(bx + 5, py + 28);
      ctx.fill();
    }
    SS.drawGlow(ctx, px + T / 2, py + T / 2, 22, "200,40,40", 0.12 + Math.sin(time * 3) * 0.04);
  };

  Room.prototype.drawDecor = function (ctx, x0, y0, x1, y1, time, G) {
    var d = this.decor, i, o;
    var fern = SS.img("b_helecho"), banner = SS.img("c_estandarte"), farol = SS.img("c_farol_viga");
    var pl = G && G.player;
    for (i = 0; i < d.top.length; i++) {
      o = d.top[i];
      if (o.x < x0 - 40 || o.x > x1 + 40 || o.y < y0 - 60 || o.y > y1 + 40) continue;
      switch (o.k) {
        case "fern":
          if (fern) {
            var fw = fern.width * o.s, fh = fern.height * o.s, bend = Math.sin(time * 1.3 + o.x * 0.1) * 0.04;
            if (pl && Math.abs(pl.cx() - o.x) < 16 && Math.abs(pl.y + pl.h - o.y) < 8) bend += (o.x - pl.cx()) * 0.012;
            ctx.save();
            ctx.translate(o.x, o.y + 2);
            ctx.rotate(bend);
            if (o.f) ctx.scale(-1, 1);
            ctx.drawImage(fern, -fw / 2, -fh, fw, fh);
            ctx.restore();
          }
          break;
        case "flower":
          for (var k = 0; k < o.n; k++) {
            var fx = o.x + k * 4, fhh = 6 + (k % 2) * 4, sw = Math.sin(time * 2 + fx) * 1;
            ctx.strokeStyle = "#2f4a2a"; ctx.lineWidth = 0.9;
            ctx.beginPath(); ctx.moveTo(fx, o.y); ctx.lineTo(fx + sw, o.y - fhh); ctx.stroke();
            ctx.fillStyle = "#e9efe0";
            ctx.beginPath(); ctx.arc(fx + sw, o.y - fhh, 1.6, 0, 6.283); ctx.fill();
            SS.drawGlow(ctx, fx + sw, o.y - fhh, 5, "220,255,220", 0.18);
          }
          break;
        case "mush":
          ctx.fillStyle = "#cfc6a8";
          ctx.fillRect(o.x - 0.8, o.y - 5, 1.6, 5);
          ctx.fillStyle = "#6b3f36";
          ctx.beginPath(); ctx.ellipse(o.x, o.y - 5, 3.5, 2, 0, Math.PI, 0); ctx.fill();
          SS.drawGlow(ctx, o.x, o.y - 5, 8, "160,255,190", 0.12 + Math.sin(time * 2 + o.x) * 0.05);
          break;
        case "bones":
          ctx.strokeStyle = "#b9ab98"; ctx.lineWidth = 1.4;
          ctx.beginPath(); ctx.moveTo(o.x, o.y - 1); ctx.lineTo(o.x + 7, o.y - 2.5); ctx.stroke();
          ctx.fillStyle = "#c9bca8";
          ctx.beginPath(); ctx.arc(o.x + 10, o.y - 2.8, 2.6, 0, 6.283); ctx.fill();
          ctx.fillStyle = "#1a1312"; ctx.fillRect(o.x + 9, o.y - 3.5, 1, 1); ctx.fillRect(o.x + 11, o.y - 3.5, 1, 1);
          break;
        case "candle":
          for (var cdl = 0; cdl < o.n; cdl++) {
            var cx = o.x + cdl * 4, ch = 4 + (cdl % 2) * 3;
            ctx.fillStyle = "#cfc2a6"; ctx.fillRect(cx - 1, o.y - ch, 2, ch);
            var fl = Math.sin(time * 12 + cx) * 0.5;
            ctx.fillStyle = "#ffcf7a";
            ctx.beginPath(); ctx.ellipse(cx + fl * 0.4, o.y - ch - 2, 0.9, 1.8, 0, 0, 6.283); ctx.fill();
            SS.drawGlow(ctx, cx, o.y - ch - 2, 10, "255,170,90", 0.35 + fl * 0.08);
          }
          break;
        case "stake":
          ctx.save(); ctx.translate(o.x, o.y); ctx.rotate(o.a);
          ctx.fillStyle = "#211a17"; ctx.fillRect(-1.5, -16, 3, 16);
          ctx.fillRect(-5, -12, 10, 2);
          ctx.restore();
          break;
        case "banner":
          if (banner) {
            var bs = 0.42;
            ctx.save(); ctx.translate(o.x, o.y + 3);
            if (o.f) ctx.scale(-1, 1);
            ctx.drawImage(banner, -banner.width * bs / 2, -banner.height * bs, banner.width * bs, banner.height * bs);
            ctx.restore();
          }
          break;
      }
    }
    // enredaderas y raíces del techo
    ctx.lineCap = "round";
    for (i = 0; i < d.hang.length; i++) {
      o = d.hang[i];
      if (o.x < x0 - 20 || o.x > x1 + 20 || o.y > y1 + 10 || o.y + o.len < y0) continue;
      var sw2 = Math.sin(time * 0.9 + o.ph) * (o.len * 0.06);
      if (pl && Math.abs(pl.cx() - o.x) < 12 && pl.y < o.y + o.len && pl.y + pl.h > o.y) sw2 += (o.x - pl.cx()) * 0.6;
      ctx.strokeStyle = o.k === "vine" ? "rgba(48,80,52,0.9)" : "rgba(36,26,22,0.9)";
      ctx.lineWidth = o.k === "vine" ? 1.6 : 2;
      ctx.beginPath();
      ctx.moveTo(o.x, o.y);
      ctx.quadraticCurveTo(o.x + sw2 * 0.3, o.y + o.len * 0.5, o.x + sw2, o.y + o.len);
      ctx.stroke();
      if (o.k === "vine") {
        ctx.fillStyle = "rgba(70,110,64,0.9)";
        for (var lv = 1; lv <= 3; lv++) {
          var ly = o.y + o.len * lv / 3.2, lx = o.x + sw2 * (lv / 3) * (lv / 3);
          ctx.beginPath(); ctx.ellipse(lx + (lv % 2 ? 2 : -2), ly, 2.2, 1.2, lv % 2 ? 0.6 : -0.6, 0, 6.283); ctx.fill();
        }
      }
    }
    // faroles en las paredes
    if (farol) {
      for (i = 0; i < d.wall.length; i++) {
        o = d.wall[i];
        if (o.x < x0 - 60 || o.x > x1 + 60) continue;
        var s = 0.26, fw2 = farol.width * s, fh2 = farol.height * s;
        ctx.save();
        ctx.translate(o.x, o.y);
        ctx.scale(-o.side, 1);
        ctx.drawImage(farol, -fw2 + 4, 0, fw2, fh2 * 0.62);
        ctx.restore();
        var lx2 = o.x + o.side * (fw2 - 9), ly2 = o.y + fh2 * 0.52;
        SS.drawGlow(ctx, lx2, ly2, 26, "255,170,90", 0.32 + Math.sin(time * 5 + o.x) * 0.05);
      }
    }
  };

  /** Faroles colgantes: la cadena se mece, la empujan el jugador y los golpes. */
  Room.prototype.updateRopes = function (dt, G) {
    var p = G.player;
    for (var i = 0; i < this.ropes.length; i++) {
      var r = this.ropes[i];
      r.wind = Math.sin(G.time * 0.7 + r.phase) * 30;
      r.update(dt, this);
      if (p && Math.abs(p.vx) + Math.abs(p.vy) > 40) {
        if (r.impulse(p.cx(), p.cy(), 16, p.vx * 0.8, p.vy * 0.5) && Math.random() < 0.1) SS.audio.play("chain");
      }
    }
  };

  Room.prototype.drawRopes = function (ctx, time) {
    for (var i = 0; i < this.ropes.length; i++) {
      var r = this.ropes[i];
      r.draw(ctx, "#2a2321", 3, true);
      var e = r.end(), prev = r.pts[r.pts.length - 2];
      var ang = Math.atan2(e.x - prev.x, prev.y - e.y);
      ctx.save();
      ctx.translate(e.x, e.y);
      ctx.rotate(-ang * 0.6);
      ctx.fillStyle = "#1d1717";
      ctx.fillRect(-5, 0, 10, 2);
      ctx.fillRect(-4, 12, 8, 2);
      ctx.strokeStyle = "#1d1717"; ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(-4, 2); ctx.lineTo(-4, 12); ctx.moveTo(0, 2); ctx.lineTo(0, 12); ctx.moveTo(4, 2); ctx.lineTo(4, 12);
      ctx.stroke();
      var fl = 0.85 + Math.sin(time * 9 + i) * 0.1;
      ctx.fillStyle = "#ffd28a";
      ctx.beginPath(); ctx.ellipse(0, 8, 1.6 * fl, 3 * fl, 0, 0, 6.283); ctx.fill();
      ctx.restore();
      SS.drawGlow(ctx, e.x, e.y + 8, 34 * fl, "255,170,90", 0.42);
    }
  };
})();
