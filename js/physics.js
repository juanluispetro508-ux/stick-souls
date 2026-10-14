/* =====================================================================
   Física ligera: cuerdas y cadenas (Verlet), muñecos de trapo al morir,
   objetos rompibles que ruedan, rebotan y se pueden empujar.
   ===================================================================== */
(function () {
  "use strict";
  var SS = window.SS, T = SS.T;

  /* ----------------------------------------------------- cuerda / cadena */
  var Rope = (SS.Rope = function (x, y, n, seg, o) {
    o = o || {};
    this.seg = seg;
    this.pts = [];
    for (var i = 0; i < n; i++) {
      var py = y + i * seg;
      this.pts.push({ x: x, y: py, px: x, py: py, im: 1 });
    }
    if (o.heavyEnd) this.pts[n - 1].im = o.heavyEnd;
    this.pinA = true;
    this.pinB = !!o.pinB;
    this.grav = o.grav !== undefined ? o.grav : 900;
    this.damp = o.damp !== undefined ? o.damp : 0.985;
    this.collide = !!o.collide;
    this.iter = o.iter || 4;
    this.wind = 0;
  });

  Rope.prototype.pin = function (i, x, y) {
    var p = this.pts[i < 0 ? this.pts.length + i : i];
    p.x = x; p.y = y; p.px = x; p.py = y;
  };
  /** Mueve un extremo fijo sin borrar su velocidad (para anclas que se mueven). */
  Rope.prototype.moveTo = function (i, x, y) {
    var p = this.pts[i < 0 ? this.pts.length + i : i];
    p.px = p.x; p.py = p.y; p.x = x; p.y = y;
  };

  Rope.prototype.update = function (dt, room) {
    var pts = this.pts, n = pts.length, i, p;
    var g = this.grav * dt * dt;
    for (i = 0; i < n; i++) {
      p = pts[i];
      if ((i === 0 && this.pinA) || (i === n - 1 && this.pinB)) continue;
      var vx = (p.x - p.px) * this.damp, vy = (p.y - p.py) * this.damp;
      p.px = p.x; p.py = p.y;
      p.x += vx + this.wind * dt * dt;
      p.y += vy + g;
    }
    for (var it = 0; it < this.iter; it++) {
      for (i = 1; i < n; i++) {
        var a = pts[i - 1], b = pts[i];
        var dx = b.x - a.x, dy = b.y - a.y, d = Math.sqrt(dx * dx + dy * dy) || 0.0001;
        var diff = (d - this.seg) / d;
        var wa = (i - 1 === 0 && this.pinA) ? 0 : a.im, wb = (i === n - 1 && this.pinB) ? 0 : b.im;
        var sum = wa + wb;
        if (sum <= 0) continue;
        a.x += dx * diff * (wa / sum); a.y += dy * diff * (wa / sum);
        b.x -= dx * diff * (wb / sum); b.y -= dy * diff * (wb / sum);
      }
    }
    if (this.collide && room) {
      for (i = 1; i < n; i++) {
        p = pts[i];
        if (room.solidPx(p.x, p.y)) {
          if (!room.solidPx(p.px, p.y)) p.x = p.px;
          else if (!room.solidPx(p.x, p.py)) p.y = p.py;
          else { p.x = p.px; p.y = p.py; }
        }
      }
    }
  };

  /** Empuja los puntos cercanos a (x,y) con una velocidad (vx,vy). */
  Rope.prototype.impulse = function (x, y, r, vx, vy) {
    var hit = false;
    for (var i = 1; i < this.pts.length; i++) {
      var p = this.pts[i];
      var dx = p.x - x, dy = p.y - y;
      if (dx * dx + dy * dy < r * r) {
        p.px = p.x - vx * SS.STEP; p.py = p.y - vy * SS.STEP;
        hit = true;
      }
    }
    return hit;
  };

  Rope.prototype.end = function () { return this.pts[this.pts.length - 1]; };

  /** Dibuja la cuerda como línea o como eslabones de cadena. */
  Rope.prototype.draw = function (ctx, col, w, chain) {
    var pts = this.pts, i;
    ctx.strokeStyle = col;
    ctx.lineCap = "round";
    if (!chain) {
      ctx.lineWidth = w;
      ctx.beginPath();
      ctx.moveTo(pts[0].x, pts[0].y);
      for (i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
      ctx.stroke();
      return;
    }
    ctx.lineWidth = w * 0.55;
    for (i = 1; i < pts.length; i++) {
      var a = pts[i - 1], b = pts[i];
      var mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
      var ang = Math.atan2(b.y - a.y, b.x - a.x);
      var len = SS.dist(a.x, a.y, b.x, b.y) * 0.62;
      ctx.save();
      ctx.translate(mx, my);
      ctx.rotate(ang);
      ctx.beginPath();
      if (i % 2) ctx.ellipse(0, 0, len, w * 0.95, 0, 0, 6.283);
      else { ctx.moveTo(-len, 0); ctx.lineTo(len, 0); }
      ctx.stroke();
      ctx.restore();
    }
  };

  /* -------------------------------------------------------- muñeco de trapo
     Se crea desde las articulaciones de una pose y cae con gravedad,
     choca con el terreno y se desliza con fricción. */
  var LINKS = [["head", "neck"], ["neck", "hip"], ["hip", "kF"], ["kF", "fF"], ["hip", "kB"], ["kB", "fB"],
    ["neck", "eF"], ["eF", "hF"], ["neck", "eB"], ["eB", "hB"], ["head", "hip"]];
  var Ragdoll = (SS.Ragdoll = function (joints, vx, vy, spin) {
    this.p = {};
    this.links = [];
    var k, j;
    for (k in joints) {
      j = joints[k];
      if (!j || typeof j.x !== "number") continue;
      var rx = k === "head" ? spin : k === "fF" || k === "fB" ? -spin * 0.5 : 0;
      this.p[k] = { x: j.x, y: j.y, px: j.x - (vx + rx) * SS.STEP, py: j.y - vy * SS.STEP };
    }
    for (var i = 0; i < LINKS.length; i++) {
      var a = this.p[LINKS[i][0]], b = this.p[LINKS[i][1]];
      if (a && b) this.links.push([a, b, SS.dist(a.x, a.y, b.x, b.y)]);
    }
    this.t = 0;
    this.rest = 0;
  });

  Ragdoll.prototype.update = function (dt, room) {
    this.t += dt;
    var g = 1300 * dt * dt, k, p, moving = 0;
    for (k in this.p) {
      p = this.p[k];
      var vx = (p.x - p.px) * 0.99, vy = (p.y - p.py) * 0.99;
      p.px = p.x; p.py = p.y;
      p.x += vx; p.y += vy + g;
      moving += Math.abs(vx) + Math.abs(vy);
    }
    for (var it = 0; it < 5; it++) {
      for (var i = 0; i < this.links.length; i++) {
        var L = this.links[i], a = L[0], b = L[1];
        var dx = b.x - a.x, dy = b.y - a.y, d = Math.sqrt(dx * dx + dy * dy) || 0.0001;
        var diff = (d - L[2]) / d * 0.5;
        a.x += dx * diff; a.y += dy * diff;
        b.x -= dx * diff; b.y -= dy * diff;
      }
      if (room) {
        for (k in this.p) {
          p = this.p[k];
          var tyTop = Math.floor(p.y / T) * T;
          if (room.solidPx(p.x, p.y)) {
            if (!room.solidPx(p.px, p.y)) { p.x = p.px; }
            else if (!room.solidPx(p.x, p.py)) {
              if (p.py < p.y) { p.y = tyTop - 0.5; p.px = p.x - (p.x - p.px) * 0.55; } // suelo con fricción
              else p.y = p.py;
            } else { p.x = p.px; p.y = p.py; }
          } else if (room.oneway(Math.floor(p.x / T), Math.floor(p.y / T)) && p.py <= tyTop + 0.5 && p.y > p.py) {
            p.y = tyTop - 0.5; p.px = p.x - (p.x - p.px) * 0.55;
          }
        }
      }
    }
    this.rest = moving < 0.4 ? this.rest + dt : 0;
  };

  Ragdoll.prototype.impulse = function (vx, vy) {
    for (var k in this.p) { var p = this.p[k]; p.px = p.x - vx * SS.STEP; p.py = p.y - vy * SS.STEP; }
  };

  /* ------------------------------------------------------ objeto rompible
     Barriles, vasijas y cajas: se empujan, ruedan al golpearlos y se
     rompen en pedazos que chocan con el suelo. */
  var PROPS = {
    barril: { w: 18, h: 22, hp: 2, col: "#3b2a1e", band: "#6d5a48" },
    vasija: { w: 16, h: 18, hp: 1, col: "#4a3b33", band: "#8a6f5c" },
    caja:   { w: 20, h: 20, hp: 2, col: "#2f261f", band: "#5e4b3b" }
  };
  var Prop = (SS.Prop = function (kind, tx, ty, key) {
    var d = PROPS[kind] || PROPS.barril;
    this.kind = kind; this.def = d; this.key = key;
    this.w = d.w; this.h = d.h; this.hp = d.hp;
    this.x = tx + T / 2 - d.w / 2; this.y = ty + T - d.h;
    this.vx = 0; this.vy = 0; this.rot = 0; this.vr = 0;
    this.onGround = false; this.flash = 0; this.dead = false; this.lastHit = -1;
  });
  Prop.prototype.cx = function () { return this.x + this.w / 2; };
  Prop.prototype.cy = function () { return this.y + this.h / 2; };
  Prop.prototype.update = function (dt, G) {
    var room = G.room;
    if (this.flash > 0) this.flash -= dt;
    this.vy = Math.min(this.vy + 1400 * dt, 700);
    var hx = room.moveX(this, this.vx * dt);
    if (hx) { this.vx = -this.vx * 0.45; this.vr = -this.vr * 0.6; if (Math.abs(this.vx) > 60) SS.audio.play("thud"); }
    var prevVy = this.vy;
    var hy = room.moveY(this, this.vy * dt);
    if (hy === 1) {
      if (prevVy > 220) { this.vy = -prevVy * 0.32; SS.audio.play("thud"); G.dust(this.cx(), this.y + this.h, 2, 0); }
      else this.vy = 0;
      this.onGround = true;
      this.vx = SS.approach(this.vx, 0, 420 * dt);
      // al rodar se endereza poco a poco
      var target = Math.round(this.rot / (Math.PI / 2)) * (Math.PI / 2);
      this.vr = this.vx / (this.w * 0.5) * 0.6 + (target - this.rot) * 6;
    } else {
      this.onGround = false;
      if (hy === -1) this.vy = 0;
    }
    this.rot += this.vr * dt;
    if (room.touchesSpikes(this)) this.smash(G, 99);
  };
  Prop.prototype.hit = function (G, fromX, dir) {
    var d = this.cx() < fromX ? -1 : 1;
    this.vx = d * 150; this.vy = dir === "down" ? 120 : -170; this.vr = d * 9;
    this.flash = 0.1;
    SS.audio.play("wood");
    G.particles.burst("shard", this.cx(), this.cy(), 4, 140, 0.6, 3, this.def.band, { grav: 800, collide: true });
    this.smash(G, 1);
  };
  Prop.prototype.smash = function (G, n) {
    this.hp -= n;
    if (this.hp > 0) return;
    this.dead = true;
    SS.audio.play("break");
    G.save.collected[this.key] = 1;
    G.particles.burst("shard", this.cx(), this.cy(), 14, 240, 1.1, 5, this.def.col, { grav: 900, collide: true, up: 80 });
    G.particles.burst("shard", this.cx(), this.cy(), 6, 200, 1.0, 4, this.def.band, { grav: 900, collide: true, up: 60 });
    if (Math.random() < 0.7) G.spawnEssence(this.cx(), this.cy(), SS.randi(2, 5));
  };
  Prop.prototype.draw = function (ctx) {
    var d = this.def, cx = this.cx(), cy = this.cy();
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(this.rot);
    var w = this.w, h = this.h, fl = this.flash > 0;
    ctx.fillStyle = fl ? "#fff" : d.col;
    ctx.strokeStyle = "#0b0807";
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    if (this.kind === "vasija") {
      ctx.moveTo(-w * 0.22, -h / 2);
      ctx.quadraticCurveTo(-w * 0.65, -h * 0.05, -w * 0.3, h / 2);
      ctx.lineTo(w * 0.3, h / 2);
      ctx.quadraticCurveTo(w * 0.65, -h * 0.05, w * 0.22, -h / 2);
      ctx.closePath();
    } else if (this.kind === "barril") {
      ctx.moveTo(-w * 0.4, -h / 2);
      ctx.quadraticCurveTo(-w * 0.62, 0, -w * 0.4, h / 2);
      ctx.lineTo(w * 0.4, h / 2);
      ctx.quadraticCurveTo(w * 0.62, 0, w * 0.4, -h / 2);
      ctx.closePath();
    } else {
      ctx.rect(-w / 2, -h / 2, w, h);
    }
    ctx.fill();
    ctx.stroke();
    ctx.strokeStyle = fl ? "#fff" : d.band;
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    if (this.kind === "caja") {
      ctx.moveTo(-w / 2 + 2, -h / 2 + 2); ctx.lineTo(w / 2 - 2, h / 2 - 2);
      ctx.moveTo(-w / 2 + 2, -h / 2 + 4); ctx.lineTo(w / 2 - 2, -h / 2 + 4);
    } else {
      ctx.moveTo(-w * 0.5, -h * 0.22); ctx.lineTo(w * 0.5, -h * 0.22);
      ctx.moveTo(-w * 0.5, h * 0.22); ctx.lineTo(w * 0.5, h * 0.22);
    }
    ctx.stroke();
    ctx.restore();
  };
})();
