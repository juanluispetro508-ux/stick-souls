/* =====================================================================
   Partículas con un depósito fijo (no se crean objetos cada fotograma).
   Tipos: dot, glow, spark, ash, shard, ink, ring, firefly, feather,
   ember, leaf, mote, bubble, wisp.
   ===================================================================== */
(function () {
  "use strict";
  var SS = window.SS;

  function P() { this.alive = false; }

  var Particles = (SS.Particles = function (max) {
    this.list = new Array(max);
    for (var i = 0; i < max; i++) this.list[i] = new P();
    this.next = 0;
  });

  Particles.prototype.clear = function () {
    for (var i = 0; i < this.list.length; i++) this.list[i].alive = false;
  };

  Particles.prototype.spawn = function (type, x, y, vx, vy, life, size, color, o) {
    var p = this.list[this.next];
    this.next = (this.next + 1) % this.list.length;
    p.alive = true; p.type = type; p.x = x; p.y = y; p.vx = vx; p.vy = vy;
    p.life = p.max = life; p.size = size; p.color = color;
    p.grav = o && o.grav !== undefined ? o.grav : 0;
    p.drag = o && o.drag !== undefined ? o.drag : 0;
    p.collide = !!(o && o.collide);
    p.world = !(o && o.screen);
    p.rot = Math.random() * 6.283; p.vr = (Math.random() - 0.5) * 8;
    p.seed = Math.random() * 100;
    return p;
  };

  /** Ráfaga radial de partículas. */
  Particles.prototype.burst = function (type, x, y, n, speed, life, size, color, o) {
    for (var i = 0; i < n; i++) {
      var a = Math.random() * Math.PI * 2, s = speed * (0.35 + Math.random() * 0.65);
      this.spawn(type, x, y, Math.cos(a) * s, Math.sin(a) * s - (o && o.up ? o.up : 0),
        life * (0.6 + Math.random() * 0.5), size * (0.6 + Math.random() * 0.6), color, o);
    }
  };

  Particles.prototype.update = function (dt, room, time) {
    for (var i = 0; i < this.list.length; i++) {
      var p = this.list[i];
      if (!p.alive) continue;
      p.life -= dt;
      if (p.life <= 0) { p.alive = false; continue; }
      if (p.type === "firefly") {
        p.vx += Math.sin(time * 1.3 + p.seed) * 14 * dt;
        p.vy += Math.cos(time * 1.1 + p.seed * 1.7) * 14 * dt;
      } else if (p.type === "ash") {
        p.vx += Math.sin(time * 0.8 + p.seed) * 6 * dt;
      } else if (p.type === "ember") {
        p.vx += Math.sin(time * 2.1 + p.seed) * 22 * dt;
      } else if (p.type === "leaf") {
        p.vx = Math.sin(time * 1.5 + p.seed) * 22 + p.vy * 0.2;
        p.rot = Math.sin(time * 2 + p.seed) * 1.2;
      } else if (p.type === "mote") {
        p.vx += Math.sin(time * 0.6 + p.seed) * 3 * dt;
        p.vy += Math.cos(time * 0.5 + p.seed * 2) * 3 * dt;
      }
      p.vy += p.grav * dt;
      if (p.drag) { var k = 1 / (1 + p.drag * dt); p.vx *= k; p.vy *= k; }
      var nx = p.x + p.vx * dt, ny = p.y + p.vy * dt;
      if (p.collide && room && room.solidPx(nx, ny)) {
        if (room.solidPx(p.x, ny)) { p.vy *= -0.35; p.vx *= 0.7; ny = p.y; }
        if (room.solidPx(nx, p.y)) { p.vx *= -0.4; nx = p.x; }
      }
      p.x = nx; p.y = ny;
      p.rot += p.vr * dt;
    }
  };

  Particles.prototype.draw = function (ctx, x0, y0, x1, y1, time) {
    for (var i = 0; i < this.list.length; i++) {
      var p = this.list[i];
      if (!p.alive) continue;
      if (p.x < x0 - 40 || p.x > x1 + 40 || p.y < y0 - 40 || p.y > y1 + 40) continue;
      var a = p.life / p.max, s = p.size;
      switch (p.type) {
        case "dot":
          ctx.globalAlpha = a; ctx.fillStyle = p.color;
          ctx.fillRect(p.x - s / 2, p.y - s / 2, s, s);
          break;
        case "glow":
          SS.drawGlow(ctx, p.x, p.y, s, p.color, a * 0.9);
          break;
        case "firefly":
          var blink = 0.5 + 0.5 * Math.sin(time * 3 + p.seed * 3);
          var fade = Math.min(1, a * 4, (p.max - p.life) * 2);
          SS.drawGlow(ctx, p.x, p.y, s * 3, p.color, fade * blink * 0.7);
          ctx.globalAlpha = fade * blink; ctx.fillStyle = "rgb(" + p.color + ")";
          ctx.fillRect(p.x - 0.8, p.y - 0.8, 1.6, 1.6);
          break;
        case "spark":
          ctx.globalAlpha = a; ctx.strokeStyle = p.color; ctx.lineWidth = s;
          ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x - p.vx * 0.035, p.y - p.vy * 0.035); ctx.stroke();
          break;
        case "ash":
          ctx.globalAlpha = Math.min(1, a * 3) * 0.7; ctx.fillStyle = p.color;
          ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot);
          ctx.fillRect(-s / 2, -s / 4, s, s / 2); ctx.restore();
          break;
        case "shard":
          ctx.globalAlpha = Math.min(1, a * 2); ctx.fillStyle = p.color;
          ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot);
          ctx.beginPath(); ctx.moveTo(-s / 2, s / 2); ctx.lineTo(0, -s / 2); ctx.lineTo(s / 2, s / 3); ctx.fill();
          ctx.restore();
          break;
        case "ink":
          ctx.globalAlpha = a; ctx.fillStyle = p.color;
          ctx.beginPath(); ctx.arc(p.x, p.y, s * (0.5 + a * 0.5), 0, 6.283); ctx.fill();
          break;
        case "ring":
          ctx.globalAlpha = a; ctx.strokeStyle = p.color; ctx.lineWidth = 2 * a + 0.5;
          ctx.beginPath(); ctx.arc(p.x, p.y, s * (1.2 - a), 0, 6.283); ctx.stroke();
          break;
        case "ember":
          var fe = Math.min(1, a * 3, (p.max - p.life) * 4) * (0.6 + 0.4 * Math.sin(time * 14 + p.seed * 9));
          SS.drawGlow(ctx, p.x, p.y, s * 3.2, p.color, fe * 0.55);
          ctx.globalAlpha = fe; ctx.fillStyle = "rgb(" + p.color + ")";
          ctx.fillRect(p.x - s * 0.35, p.y - s * 0.35, s * 0.7, s * 0.7);
          break;
        case "leaf":
          ctx.globalAlpha = Math.min(1, a * 2, (p.max - p.life) * 2) * 0.85; ctx.fillStyle = p.color;
          ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot);
          ctx.beginPath(); ctx.ellipse(0, 0, s, s * 0.45, 0, 0, 6.283); ctx.fill(); ctx.restore();
          break;
        case "mote":
          var fm = Math.min(1, a * 2, (p.max - p.life) * 1.5) * (0.5 + 0.5 * Math.sin(time * 2 + p.seed * 5));
          ctx.globalAlpha = fm * 0.6; ctx.fillStyle = "rgb(" + p.color + ")";
          ctx.fillRect(p.x - s / 2, p.y - s / 2, s, s);
          break;
        case "bubble":
          ctx.globalAlpha = a * 0.8; ctx.strokeStyle = p.color; ctx.lineWidth = 0.7;
          ctx.beginPath(); ctx.arc(p.x, p.y, s * (1.2 - a * 0.4), 0, 6.283); ctx.stroke();
          break;
        case "wisp":
          ctx.globalAlpha = a * 0.22; ctx.fillStyle = p.color;
          ctx.beginPath(); ctx.arc(p.x, p.y, s * (1.4 - a * 0.6), 0, 6.283); ctx.fill();
          break;
        case "feather":
          ctx.globalAlpha = a; ctx.strokeStyle = p.color; ctx.lineWidth = 1.2;
          ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(Math.sin(time * 4 + p.seed) * 0.8);
          ctx.beginPath(); ctx.moveTo(-s, 0); ctx.quadraticCurveTo(0, -s * 0.6, s, 0); ctx.stroke(); ctx.restore();
          break;
      }
    }
    ctx.globalAlpha = 1;
  };
})();
