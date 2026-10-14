/* =====================================================================
   Criaturas sin alma, proyectiles, esencia, pajaritos posados y el eco
   que queda al morir. Cada enemigo tiene su IA sencilla y su dibujo.
   ===================================================================== */
(function () {
  "use strict";
  var SS = window.SS, T = SS.T;
  var GRAV = 1400;

  var TYPES = {
    c: { name: "rastrero", w: 26, h: 18, hp: 4, ess: [3, 5], speed: 42, gravity: true },
    f: { name: "polilla", w: 22, h: 18, hp: 4, ess: [4, 6], speed: 95, gravity: false },
    j: { name: "saltador", w: 20, h: 30, hp: 8, ess: [7, 10], speed: 50, gravity: true },
    s: { name: "escupidor", w: 24, h: 22, hp: 6, ess: [5, 7], speed: 0, gravity: true }
  };

  var Enemy = (SS.Enemy = function (type, tx, ty) {
    var d = TYPES[type];
    this.type = type; this.def = d;
    this.w = d.w; this.h = d.h;
    this.x = tx + T / 2 - d.w / 2;
    this.y = ty + T - d.h;
    this.vx = 0; this.vy = 0;
    this.hp = d.hp; this.dir = Math.random() < 0.5 ? -1 : 1;
    this.state = "idle"; this.t = Math.random() * 2; this.stateT = 0;
    this.flash = 0; this.dead = false; this.lastHit = -1; this.kb = 0;
    this.homeX = this.x; this.homeY = this.y; this.onGround = false;
    this.anim = Math.random() * 10;
  });

  Enemy.prototype.cx = function () { return this.x + this.w / 2; };
  Enemy.prototype.cy = function () { return this.y + this.h / 2; };
  Enemy.prototype.setState = function (s) { this.state = s; this.stateT = 0; };

  Enemy.prototype.update = function (dt, G) {
    var room = G.room, p = G.player;
    this.t += dt; this.stateT += dt; this.anim += dt;
    if (this.flash > 0) this.flash -= dt;
    if (this.kb > 0) this.kb -= dt;
    var dx = p.cx() - this.cx(), dy = p.cy() - this.cy();
    var dist = Math.sqrt(dx * dx + dy * dy);

    switch (this.type) {
      case "c": // rastrero: patrulla y gira en paredes y bordes
        if (this.kb <= 0) {
          this.vx = this.dir * this.def.speed;
          var aheadX = this.dir > 0 ? this.x + this.w + 2 : this.x - 2;
          if (this.onGround && !room.groundPx(aheadX, this.y + this.h + 4)) this.dir *= -1;
        }
        break;
      case "f": // polilla: persigue con vaivén si el jugador está cerca
        if (this.kb <= 0) {
          var tx, ty;
          if (dist < 240 && p.state !== "dead") { tx = dx; ty = dy - 10; this.state = "chase"; }
          else { tx = this.homeX - this.x; ty = this.homeY - this.y + Math.sin(this.t * 1.5) * 20; this.state = "idle"; }
          var tl = Math.sqrt(tx * tx + ty * ty) || 1;
          var sp = this.state === "chase" ? this.def.speed : 45;
          this.vx = SS.approach(this.vx, tx / tl * sp, 260 * dt);
          this.vy = SS.approach(this.vy, ty / tl * sp + Math.sin(this.t * 6) * 30, 260 * dt);
          if (Math.abs(this.vx) > 5) this.dir = this.vx > 0 ? 1 : -1;
        } else {
          this.vx *= 0.92; this.vy *= 0.92;
        }
        break;
      case "j": // saltador: se agacha (aviso) y salta hacia el jugador
        if (this.state === "idle") {
          if (this.kb <= 0) {
            this.vx = SS.approach(this.vx, this.dir * 30, 300 * dt);
            var ahead = this.dir > 0 ? this.x + this.w + 2 : this.x - 2;
            if (this.onGround && !room.groundPx(ahead, this.y + this.h + 4)) this.dir *= -1;
          }
          if (this.onGround && Math.abs(dx) < 210 && Math.abs(dy) < 90 && this.stateT > 0.8 && p.state !== "dead") {
            this.dir = dx > 0 ? 1 : -1;
            this.setState("crouch");
            this.vx = 0;
          }
        } else if (this.state === "crouch") {
          this.vx = 0;
          if (this.stateT > 0.45) {
            this.setState("leap");
            this.vy = -430;
            this.vx = SS.clamp(dx * 1.6, -230, 230);
            SS.audio.play("jump");
          }
        } else if (this.state === "leap") {
          if (this.onGround && this.stateT > 0.1) { this.setState("idle"); this.vx = 0; G.dust(this.cx(), this.y + this.h, 3, 0); }
        }
        break;
      case "s": // escupidor: dispara arcos cada cierto tiempo
        this.vx = 0;
        this.dir = dx > 0 ? 1 : -1;
        if (this.state === "idle" && this.stateT > 2.0 && dist < 330 && p.state !== "dead") this.setState("wind");
        if (this.state === "wind" && this.stateT > 0.45) {
          this.setState("idle");
          var tFlight = SS.clamp(Math.abs(dx) / 220, 0.6, 1.3);
          var pvx = dx / tFlight, pvy = (dy - 0.5 * 650 * tFlight * tFlight) / tFlight;
          pvy = SS.clamp(pvy, -520, 120);
          G.projectiles.push(new SS.Projectile(this.cx(), this.y + 4, pvx, pvy));
          SS.audio.play("shoot");
        }
        break;
    }

    if (this.def.gravity) this.vy = Math.min(this.vy + GRAV * dt, 600);
    var hx = room.moveX(this, this.vx * dt);
    if (hx !== 0) { if (this.type === "c" || this.type === "j") this.dir = -hx; if (this.type === "f") this.vx *= -0.5; }
    var hy = room.moveY(this, this.vy * dt);
    if (hy === 1) { this.onGround = true; this.vy = 0; }
    else { this.onGround = false; if (hy === -1) this.vy = 0; }

    // daño por contacto
    if (!p.invulnerable() && SS.overlap(this.x + 3, this.y + 3, this.w - 6, this.h - 4, p.x, p.y, p.w, p.h)) {
      p.hurt(G, 1, this.cx());
    }
  };

  Enemy.prototype.hit = function (G, dmg, fromX, dir) {
    this.hp -= dmg;
    this.flash = 0.12;
    var push = this.cx() < fromX ? -1 : 1;
    if (dir === "up") { this.vy = Math.min(this.vy, -200); }
    this.vx = push * (this.type === "f" ? 230 : 170);
    if (this.type === "f" && dir === "down") this.vy = 160;
    this.kb = 0.18;
    if (this.state === "crouch") this.setState("idle");
    G.particles.burst("spark", this.cx(), this.cy(), 7, 240, 0.25, 1.4, "#ffffff", {});
    G.particles.burst("ink", this.cx(), this.cy(), 6, 140, 0.5, 3, "#120d12", { grav: 400 });
    if (this.hp <= 0) this.kill(G);
  };

  Enemy.prototype.kill = function (G) {
    this.dead = true;
    SS.audio.play("kill");
    G.particles.burst("ink", this.cx(), this.cy(), 16, 220, 0.8, 4, "#0d090c", { grav: 500, collide: true });
    G.particles.burst("glow", this.cx(), this.cy(), 6, 90, 0.6, 5, "255,170,90", {});
    G.particles.spawn("ring", this.cx(), this.cy(), 0, 0, 0.35, 26, "rgba(255,230,200,0.8)", {});
    G.spawnEssence(this.cx(), this.cy(), SS.randi(this.def.ess[0], this.def.ess[1]));
  };

  Enemy.prototype.draw = function (ctx, time) {
    var col = this.flash > 0 ? "#ffffff" : "#09070a";
    var cx = this.cx(), by = this.y + this.h, d = this.dir, a = this.anim, i;
    ctx.strokeStyle = col; ctx.fillStyle = col;
    ctx.lineCap = "round"; ctx.lineJoin = "round";
    switch (this.type) {
      case "c": {
        ctx.lineWidth = 2.4;
        ctx.beginPath();
        for (i = 0; i < 4; i++) {
          var lx = cx - 9 + i * 6, ph = Math.sin(a * 10 + i * 1.7) * 3;
          ctx.moveTo(lx, by - 8); ctx.lineTo(lx + ph - 2, by - 3); ctx.lineTo(lx + ph, by);
        }
        ctx.stroke();
        ctx.beginPath();
        ctx.ellipse(cx, by - 10, 12, 7.5, 0, Math.PI, 0);
        ctx.lineTo(cx + 12, by - 8); ctx.lineTo(cx - 12, by - 8);
        ctx.fill();
        ctx.beginPath(); ctx.arc(cx + d * 11, by - 10, 4.5, 0, 6.283); ctx.fill();
        SS.drawGlow(ctx, cx + d * 13, by - 11, 6, "255,150,70", 0.6);
        ctx.fillStyle = "#ffb070";
        ctx.fillRect(cx + d * 13 - 1, by - 12, 2, 2);
        break;
      }
      case "f": {
        var flap = Math.sin(a * 22);
        ctx.globalAlpha = 0.55;
        ctx.fillStyle = this.flash > 0 ? "#ffffff" : "#2b2530";
        ctx.beginPath();
        ctx.ellipse(cx - 7, this.y + 7 - flap * 3, 9, 5 + flap * 2, -0.5 - flap * 0.4, 0, 6.283);
        ctx.ellipse(cx + 7, this.y + 7 - flap * 3, 9, 5 + flap * 2, 0.5 + flap * 0.4, 0, 6.283);
        ctx.fill();
        ctx.globalAlpha = 1;
        ctx.fillStyle = col;
        ctx.beginPath(); ctx.ellipse(cx, this.y + 10, 4, 7, 0, 0, 6.283); ctx.fill();
        ctx.lineWidth = 1.2;
        ctx.beginPath(); ctx.moveTo(cx - 1, this.y + 4); ctx.lineTo(cx - 5, this.y - 2); ctx.moveTo(cx + 1, this.y + 4); ctx.lineTo(cx + 5, this.y - 2); ctx.stroke();
        SS.drawGlow(ctx, cx + d * 1.5, this.y + 7, 7, "255,210,120", 0.55);
        ctx.fillStyle = "#ffe0a0";
        ctx.fillRect(cx + d * 1.5 - 1, this.y + 6, 2, 2);
        break;
      }
      case "j": {
        var crouch = this.state === "crouch" ? Math.min(1, this.stateT / 0.3) : 0;
        var P = { lean: 3 + crouch * 2, bob: crouch * 7, tF: 0.3 + crouch * 0.9, sF: -0.5 - crouch * 1.3, tB: -0.2 + crouch * 0.6, sB: -0.3 - crouch * 1.1,
          aF: 1.2 + crouch * 0.6, fF: 0.6, aB: -1.0, fB: 0.4, rot: 0 };
        if (this.state === "leap") { P.tF = 1.1; P.sF = -1.5; P.tB = 0.6; P.sB = -1.2; P.aF = 2.3; P.aB = -2.2; }
        else if (Math.abs(this.vx) > 5 && this.onGround) {
          var ph2 = a * 8; P.tF = Math.sin(ph2) * 0.6; P.tB = -Math.sin(ph2) * 0.6; P.sF = -0.3; P.sB = -0.3;
        }
        var shake = this.state === "crouch" ? Math.sin(time * 60) * 1 : 0;
        var parts = SS.drawStickFigure(ctx, this.x + shake, this.y - 4, this.w, this.h + 4, d, P, col, 0.95, 2.6);
        // cuernos
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(parts.head.x - 3, parts.head.y - 4); ctx.lineTo(parts.head.x - 7 * d, parts.head.y - 11);
        ctx.moveTo(parts.head.x + 2, parts.head.y - 5); ctx.lineTo(parts.head.x + 1 * d, parts.head.y - 12);
        ctx.stroke();
        var eyeA = this.state === "crouch" ? 0.95 : 0.55;
        SS.drawGlow(ctx, parts.head.x + d * 2.5, parts.head.y - 0.5, 7, "255,90,60", eyeA);
        ctx.fillStyle = "#ff8a6a";
        ctx.fillRect(parts.head.x + d * 2.5 - 1, parts.head.y - 1.5, 2, 2);
        break;
      }
      case "s": {
        var swell = this.state === "wind" ? Math.min(1, this.stateT / 0.45) : 0;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(cx - 9, by); ctx.quadraticCurveTo(cx - 4, by - 8, cx, by - 12);
        ctx.moveTo(cx + 9, by); ctx.quadraticCurveTo(cx + 4, by - 8, cx, by - 12);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(cx, by - 15 - swell * 2, 7 + swell * 3, 0, 6.283);
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(cx + d * 4, by - 18); ctx.lineTo(cx + d * (12 + swell * 3), by - 21); ctx.lineTo(cx + d * 4, by - 13);
        ctx.fill();
        SS.drawGlow(ctx, cx, by - 15, 8 + swell * 8, "170,255,140", 0.35 + swell * 0.5);
        ctx.fillStyle = "#c8ff9a";
        ctx.fillRect(cx + d * 2 - 1, by - 17, 2, 2);
        break;
      }
    }
  };

  /* --------------------------------------------------------- proyectil */
  var Projectile = (SS.Projectile = function (x, y, vx, vy) {
    this.x = x; this.y = y; this.vx = vx; this.vy = vy; this.r = 5; this.dead = false; this.life = 4; this.t = 0;
  });
  Projectile.prototype.update = function (dt, G) {
    this.t += dt; this.life -= dt;
    this.vy += 650 * dt;
    this.x += this.vx * dt; this.y += this.vy * dt;
    if (this.life <= 0 || G.room.solidPx(this.x, this.y)) {
      this.dead = true;
      G.particles.burst("glow", this.x, this.y, 6, 80, 0.4, 4, "170,255,140", {});
      return;
    }
    if (Math.random() < 0.5) G.particles.spawn("glow", this.x, this.y, 0, 0, 0.3, 4, "150,240,120", {});
    var p = G.player;
    if (!p.invulnerable() && SS.overlap(this.x - 4, this.y - 4, 8, 8, p.x, p.y, p.w, p.h)) {
      p.hurt(G, 1, this.x);
      this.dead = true;
    }
  };
  Projectile.prototype.draw = function (ctx) {
    SS.drawGlow(ctx, this.x, this.y, 12, "160,255,130", 0.7);
    ctx.fillStyle = "#1a2a12";
    ctx.beginPath(); ctx.arc(this.x, this.y, 4, 0, 6.283); ctx.fill();
    ctx.fillStyle = "#d8ffb8";
    ctx.beginPath(); ctx.arc(this.x - 1, this.y - 1, 1.5, 0, 6.283); ctx.fill();
  };

  /* ----------------------------------------------------------- esencia */
  var Orb = (SS.Orb = function (x, y, val) {
    this.x = x; this.y = y; this.val = val;
    this.vx = SS.rand(-130, 130); this.vy = SS.rand(-320, -150);
    this.t = 0; this.dead = false; this.w = 6; this.h = 6;
  });
  Orb.prototype.update = function (dt, G) {
    this.t += dt;
    var p = G.player;
    var dx = p.cx() - this.x, dy = p.cy() - this.y, d = Math.sqrt(dx * dx + dy * dy);
    if ((d < 80 && this.t > 0.35) || this.t > 6) {
      var k = this.t > 6 ? 900 : 1400;
      this.vx += dx / (d || 1) * k * dt; this.vy += dy / (d || 1) * k * dt;
      this.vx *= 0.9; this.vy *= 0.9;
      this.x += this.vx * dt; this.y += this.vy * dt;
    } else {
      this.vy = Math.min(this.vy + 900 * dt, 500);
      var b = { x: this.x - 3, y: this.y - 3, w: 6, h: 6 };
      var hx = G.room.moveX(b, this.vx * dt);
      if (hx) this.vx *= -0.5;
      var hy = G.room.moveY(b, this.vy * dt);
      if (hy === 1) { this.vy *= -0.4; this.vx *= 0.75; if (Math.abs(this.vy) < 40) this.vy = 0; }
      else if (hy === -1) this.vy = 0;
      this.x = b.x + 3; this.y = b.y + 3;
    }
    if (d < 14 && this.t > 0.2 && p.state !== "dead") {
      this.dead = true;
      G.addEssence(this.val);
      SS.audio.play("pickup");
      G.particles.spawn("glow", this.x, this.y, 0, -20, 0.3, 6, "255,215,140", {});
    }
  };
  Orb.prototype.draw = function (ctx, time) {
    var pulse = 0.8 + Math.sin(time * 8 + this.x) * 0.2;
    SS.drawGlow(ctx, this.x, this.y, 9 * pulse, "255,200,120", 0.75);
    ctx.fillStyle = "#fff1d0";
    ctx.beginPath(); ctx.arc(this.x, this.y, 2.2, 0, 6.283); ctx.fill();
  };

  /* ---------------------------------------------------- pajarito posado */
  var Bird = (SS.Bird = function (tx, ty) {
    this.x = tx + T / 2 + SS.rand(-8, 8); this.y = ty + T;
    this.state = "perch"; this.t = Math.random() * 3; this.vx = 0; this.vy = 0; this.dir = Math.random() < 0.5 ? -1 : 1;
    this.peck = 0; this.dead = false; this.flap = Math.random() * 6;
  });
  Bird.prototype.update = function (dt, G) {
    this.t += dt;
    var p = G.player;
    if (this.state === "perch") {
      if (this.peck > 0) this.peck -= dt;
      else if (Math.random() < dt * 0.6) this.peck = 0.3;
      if (Math.random() < dt * 0.25) this.dir *= -1;
      var dx = p.cx() - this.x, dy = p.cy() - this.y;
      if ((Math.abs(dx) < 85 && Math.abs(dy) < 70) || (p.atk && Math.abs(dx) < 120 && Math.abs(dy) < 80)) {
        this.state = "fly";
        this.dir = dx > 0 ? -1 : 1;
        this.vx = this.dir * SS.rand(70, 120);
        this.vy = SS.rand(-170, -120);
        G.particles.spawn("feather", this.x, this.y - 3, SS.rand(-20, 20), SS.rand(-30, 0), 1.2, 3, "rgba(30,26,30,0.8)", { grav: 40 });
      }
    } else {
      this.flap += dt * 24;
      this.vy = Math.max(this.vy - 160 * dt, -230);
      this.vx += this.dir * 60 * dt;
      this.x += this.vx * dt; this.y += this.vy * dt;
      if (this.y < G.cam.y - 80 || this.t > 12) this.dead = true;
    }
  };
  Bird.prototype.draw = function (ctx) {
    ctx.fillStyle = "#0c0a0d";
    ctx.strokeStyle = "#0c0a0d";
    if (this.state === "perch") {
      var hop = this.peck > 0 ? 2 : 0;
      ctx.beginPath(); ctx.ellipse(this.x, this.y - 4, 4, 3, 0, 0, 6.283); ctx.fill();
      ctx.beginPath(); ctx.arc(this.x + this.dir * 3.5, this.y - 6.5 + hop, 2.2, 0, 6.283); ctx.fill();
      ctx.beginPath(); ctx.moveTo(this.x + this.dir * 5.5, this.y - 7 + hop); ctx.lineTo(this.x + this.dir * 8, this.y - 6 + hop); ctx.lineTo(this.x + this.dir * 5.5, this.y - 5.5 + hop); ctx.fill();
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(this.x - this.dir * 3, this.y - 4); ctx.lineTo(this.x - this.dir * 7, this.y - 2); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(this.x - 1, this.y - 1.5); ctx.lineTo(this.x - 1, this.y); ctx.moveTo(this.x + 1, this.y - 1.5); ctx.lineTo(this.x + 1, this.y); ctx.stroke();
    } else {
      ctx.lineWidth = 1.6;
      ctx.lineCap = "round";
      SS.drawBird(ctx, this.x, this.y, 6, Math.sin(this.flap) * 0.9);
    }
  };

  /* --------------------------------------------- eco (esencia perdida) */
  var Eco = (SS.Eco = function (x, y, val) {
    this.x = x; this.y = y; this.val = val; this.t = 0; this.dead = false;
  });
  Eco.prototype.update = function (dt, G) {
    this.t += dt;
    var p = G.player;
    if (Math.random() < dt * 8) G.particles.spawn("ink", this.x + SS.rand(-8, 8), this.y + SS.rand(-6, 10), 0, SS.rand(-30, -10), 0.8, 3, "rgba(10,8,14,0.7)", {});
    if (p.state !== "dead" && SS.overlap(this.x - 12, this.y - 18, 24, 34, p.x, p.y, p.w, p.h)) {
      this.dead = true;
      G.recoverEco(this);
    }
  };
  Eco.prototype.draw = function (ctx, time) {
    var bob = Math.sin(time * 2) * 3, x = this.x, y = this.y + bob;
    ctx.globalAlpha = 0.85;
    ctx.fillStyle = "#08060b";
    ctx.beginPath();
    ctx.moveTo(x - 10, y + 14);
    ctx.quadraticCurveTo(x - 13, y - 6, x, y - 16);
    ctx.quadraticCurveTo(x + 13, y - 6, x + 10, y + 14);
    for (var i = 0; i < 4; i++) ctx.lineTo(x + 10 - i * 6.6 - 3.3, y + 10 + (i % 2) * 5 + Math.sin(time * 6 + i) * 2);
    ctx.closePath();
    ctx.fill();
    ctx.globalAlpha = 1;
    SS.drawGlow(ctx, x, y - 4, 26, "120,90,200", 0.25);
    ctx.fillStyle = "#cfc0ff";
    ctx.fillRect(x - 4, y - 7, 2, 3); ctx.fillRect(x + 2, y - 7, 2, 3);
  };
})();
