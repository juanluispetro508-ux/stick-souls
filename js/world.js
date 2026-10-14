/* =====================================================================
   Habitaciones: lectura del mapa de texto, colisiones sólidas
   (incluye plataformas atravesables) y dibujo del terreno.
   ===================================================================== */
(function () {
  "use strict";
  var SS = window.SS, T = SS.T;
  var OBJECTS = "PLNBcfjsohraKb";

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
    this.doorsClosed = false;
    this.start = null;
    this.bossPos = null;
    this.secretHits = {};
    var loreIdx = 0, gate = null;

    for (var y = 0; y < this.h; y++) {
      var row = def.rows[y].split("");
      for (var x = 0; x < this.w; x++) {
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
        var o = { tx: x, ty: y, x: x * T, y: y * T, key: key, t: Math.random() * 10 };
        switch (c) {
          case "P": this.start = { x: x, y: y }; break;
          case "L": o.kind = "tablet"; o.lore = def.lore ? def.lore[loreIdx++] : null; this.objects.push(o); break;
          case "N": o.kind = "npc"; this.objects.push(o); break;
          case "B": o.kind = "bench"; this.objects.push(o); this.bench = { x: x, y: y }; break;
          case "a": o.kind = "altar"; o.ability = def.ability; o.taken = !!save.abilities[def.ability]; this.objects.push(o); break;
          case "h": if (!save.collected[key]) { o.kind = "fragment"; this.objects.push(o); } break;
          case "r": if (!save.collected[key]) { o.kind = "relic"; this.objects.push(o); } break;
          case "o": if (!save.collected[key]) { o.kind = "deposit"; o.hp = 4; o.flash = 0; o.lastHit = -1; this.objects.push(o); } break;
          case "K": this.bossPos = { x: x, y: y }; break;
          default: this.spawns.push({ type: c, x: x * T, y: y * T });
        }
      }
      this.tiles.push(row);
    }
    if (gate) {
      this.objects.push({ kind: "gate", x: gate.x0 * T, y: gate.y0 * T,
        w: (gate.x1 - gate.x0 + 1) * T, h: (gate.y1 - gate.y0 + 1) * T, t: 0 });
    }
  });

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
    if (tx < 0) return this.exitAt("L", ty) ? "." : "#";
    if (tx >= this.w) return this.exitAt("R", ty) ? "." : "#";
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

  /* ------------------------------------------------------------ dibujo */
  Room.prototype.draw = function (ctx, x0, y0, x1, y1, time) {
    var z = this.zone;
    var tx0 = Math.floor(x0 / T) - 1, ty0 = Math.floor(y0 / T) - 1;
    var tx1 = Math.floor(x1 / T) + 1, ty1 = Math.floor(y1 / T) + 1;
    var tx, ty, c, px, py, s = this;
    var isSolid = function (x, y) { var k = s.tile(x, y); return k === "#" || k === "S" || k === "G"; };

    // Masa de roca
    ctx.fillStyle = z.ground;
    for (ty = ty0; ty <= ty1; ty++) {
      var runStart = null;
      for (tx = tx0; tx <= tx1 + 1; tx++) {
        var sol = tx <= tx1 && isSolid(tx, ty);
        if (sol && runStart === null) runStart = tx;
        if (!sol && runStart !== null) { ctx.fillRect(runStart * T, ty * T, (tx - runStart) * T + 0.5, T + 0.5); runStart = null; }
      }
    }

    for (ty = ty0; ty <= ty1; ty++) {
      for (tx = tx0; tx <= tx1; tx++) {
        c = this.tile(tx, ty);
        px = tx * T; py = ty * T;
        if (c === "#" || c === "S") {
          var up = isSolid(tx, ty - 1), dn = isSolid(tx, ty + 1);
          var lf = isSolid(tx - 1, ty), rt = isSolid(tx + 1, ty);
          // textura interior
          if (SS.hash2(tx, ty, 3) > 0.55) {
            ctx.fillStyle = z.groundEdge;
            ctx.fillRect(px + SS.hash2(tx, ty, 4) * 24, py + SS.hash2(tx, ty, 5) * 24, 3 + SS.hash2(tx, ty, 6) * 4, 2);
          }
          if (!lf) { ctx.fillStyle = z.groundEdge; ctx.fillRect(px, py, 2, T); }
          if (!rt) { ctx.fillStyle = z.groundEdge; ctx.fillRect(px + T - 2, py, 2, T); }
          if (!dn) { ctx.fillStyle = z.groundEdge; ctx.fillRect(px, py + T - 3, T, 3); }
          if (!up) this.drawTop(ctx, tx, ty, px, py, time);
          if (c === "S") {
            ctx.strokeStyle = "rgba(255,255,255,0.08)";
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(px + 8, py + 4); ctx.lineTo(px + 14, py + 14); ctx.lineTo(px + 10, py + 22);
            ctx.moveTo(px + 20, py + 10); ctx.lineTo(px + 25, py + 18);
            ctx.stroke();
          }
        } else if (c === "=") {
          this.drawPlatform(ctx, tx, ty, px, py);
        } else if (c === "^") {
          this.drawSpikes(ctx, px, py);
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
  };

  Room.prototype.drawTop = function (ctx, tx, ty, px, py, time) {
    var z = this.zone;
    ctx.fillStyle = z.groundTop;
    ctx.fillRect(px, py, T, 3);
    ctx.fillStyle = z.groundEdge;
    ctx.fillRect(px, py + 3, T, 2);
    if (this.zoneId === "bosque") {
      ctx.strokeStyle = z.groundTop;
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      for (var i = 0; i < 4; i++) {
        var gx = px + 3 + SS.hash2(tx, ty, 10 + i) * 26;
        var gh = 3 + SS.hash2(tx, ty, 20 + i) * 6;
        var sway = Math.sin(time * 1.6 + gx * 0.05) * 1.5;
        ctx.moveTo(gx, py + 1);
        ctx.quadraticCurveTo(gx + sway * 0.5, py - gh * 0.5, gx + sway, py - gh);
      }
      ctx.stroke();
    } else {
      ctx.fillStyle = z.groundTop;
      for (var j = 0; j < 3; j++) {
        if (SS.hash2(tx, ty, 30 + j) > 0.45) {
          var rx = px + SS.hash2(tx, ty, 40 + j) * 28;
          ctx.fillRect(rx, py - 2, 2 + SS.hash2(tx, ty, 50 + j) * 4, 2);
        }
      }
    }
  };

  Room.prototype.drawPlatform = function (ctx, tx, ty, px, py) {
    var z = this.zone;
    var lft = this.tile(tx - 1, ty) !== "=", rgt = this.tile(tx + 1, ty) !== "=";
    ctx.fillStyle = z.platform;
    ctx.fillRect(px + (lft ? 2 : 0), py, T - (lft ? 2 : 0) - (rgt ? 2 : 0), 10);
    ctx.fillStyle = z.platformTop;
    ctx.fillRect(px + (lft ? 2 : 0), py, T - (lft ? 2 : 0) - (rgt ? 2 : 0), 2);
    ctx.fillStyle = "rgba(0,0,0,0.35)";
    ctx.fillRect(px + (lft ? 2 : 0), py + 10, T - (lft ? 2 : 0) - (rgt ? 2 : 0), 2);
    if (lft || rgt) {
      ctx.fillStyle = z.platform;
      var sx = lft ? px + 6 : px + T - 9;
      ctx.beginPath();
      ctx.moveTo(sx, py + 10); ctx.lineTo(sx + 3, py + 10); ctx.lineTo(sx + 1.5, py + 20);
      ctx.fill();
    }
  };

  Room.prototype.drawSpikes = function (ctx, px, py) {
    ctx.fillStyle = "#cfc4b4";
    ctx.strokeStyle = "#2b2422";
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (var i = 0; i < 4; i++) {
      var bx = px + i * 8;
      ctx.moveTo(bx, py + T);
      ctx.lineTo(bx + 4, py + 13 + (i % 2) * 3);
      ctx.lineTo(bx + 8, py + T);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  };

  Room.prototype.drawDoor = function (ctx, px, py, time, isTop) {
    if (!this.doorsClosed) {
      if (isTop) {
        ctx.fillStyle = "rgba(0,0,0,0.25)";
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
})();
