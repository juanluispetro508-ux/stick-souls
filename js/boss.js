/* =====================================================================
   JEFE 1 · EL VERDUGO
   Gigante con hacha. Ataques siempre anunciados:
   - Hachazo vertical: levanta el hacha (brillo), golpea y lanza una onda.
     El hacha queda clavada: ventana para atacar.
   - Embestida: se agacha levantando polvo y corre hasta la pared;
     al chocar queda aturdido (y en la fase 2 caen rocas del techo).
   - Salto aplastante: sombra en el suelo donde caerá; ondas a ambos lados.
   Fase 2 (mitad de vida): ojos rojos, más rápido, dobles ondas, combos.
   ===================================================================== */
(function () {
  "use strict";
  var SS = window.SS, T = SS.T;
  var GRAV = 1500;

  var Verdugo = (SS.Verdugo = function (tx, ty) {
    this.w = 54; this.h = 80;
    this.x = tx + T / 2 - this.w / 2;
    this.y = ty + T - this.h;
    this.vx = 0; this.vy = 0; this.dir = -1;
    this.maxHp = 70; this.hp = this.maxHp;
    this.state = "dormant"; this.stateT = 0; this.t = 0;
    this.phase = 1; this.flash = 0; this.lastHit = -1;
    this.onGround = false; this.history = [];
    this.name = "EL VERDUGO";
    this.slamBox = null; this.slamT = 0;
    this.combo = 0; this.anim = 0; this.dead = false; this.deathT = 0;
    this.leapTarget = 0; this.stagger = 0;
  });

  Verdugo.prototype.cx = function () { return this.x + this.w / 2; };
  Verdugo.prototype.cy = function () { return this.y + this.h / 2; };
  Verdugo.prototype.setState = function (s) { this.state = s; this.stateT = 0; };
  Verdugo.prototype.speedK = function () { return this.phase === 2 ? 0.72 : 1; };

  Verdugo.prototype.start = function (G) {
    this.setState("intro");
    SS.audio.play("roar");
    G.shake = Math.max(G.shake, 9);
    SS.vibrate([100, 50, 100]);
  };

  Verdugo.prototype.choose = function (G) {
    var p = G.player, dist = Math.abs(p.cx() - this.cx());
    var opts;
    if (dist > 210) opts = [["charge", 4], ["leap", 4], ["walk", 2]];
    else if (dist > 100) opts = [["slam", 3], ["leap", 3], ["charge", 3], ["walk", 1]];
    else opts = [["slam", 6], ["leap", 2], ["charge", 2]];
    var h = this.history;
    opts = opts.filter(function (o) { return !(h.length >= 2 && h[h.length - 1] === o[0] && h[h.length - 2] === o[0]); });
    var total = 0, i;
    for (i = 0; i < opts.length; i++) total += opts[i][1];
    var r = Math.random() * total, pick = opts[0][0];
    for (i = 0; i < opts.length; i++) { r -= opts[i][1]; if (r <= 0) { pick = opts[i][0]; break; } }
    h.push(pick);
    if (h.length > 4) h.shift();
    this.dir = p.cx() > this.cx() ? 1 : -1;
    switch (pick) {
      case "walk": this.setState("walk"); break;
      case "slam": this.combo = this.phase === 2 && Math.random() < 0.6 ? 1 : 0; this.setState("slamWind"); break;
      case "charge": this.setState("chargeWind"); break;
      case "leap": this.setState("leapWind"); break;
    }
  };

  Verdugo.prototype.update = function (dt, G) {
    var room = G.room, p = G.player, k = this.speedK();
    this.t += dt; this.stateT += dt; this.anim += dt;
    if (this.flash > 0) this.flash -= dt;
    this.slamBox = null;

    switch (this.state) {
      case "dormant":
        this.vx = 0;
        break;
      case "intro":
        this.vx = 0;
        this.dir = p.cx() > this.cx() ? 1 : -1;
        if (this.stateT < 1.2 && Math.random() < 0.3) G.particles.spawn("dot", this.cx() + SS.rand(-30, 30), this.y + SS.rand(0, 20), 0, SS.rand(-60, -20), 0.6, 2, "#2a1a14", {});
        if (this.stateT > 2.0) this.setState("idle");
        break;
      case "idle":
        this.vx = SS.approach(this.vx, 0, 900 * dt);
        this.dir = p.cx() > this.cx() ? 1 : -1;
        if (this.stateT > (this.phase === 2 ? 0.35 : 0.7) && p.state !== "dead") this.choose(G);
        break;
      case "walk":
        this.dir = p.cx() > this.cx() ? 1 : -1;
        this.vx = this.dir * (this.phase === 2 ? 110 : 80);
        if (this.stateT > 0.9 || Math.abs(p.cx() - this.cx()) < 85) { this.vx = 0; this.combo = 0; this.setState("slamWind"); }
        break;
      case "slamWind":
        this.vx = 0;
        if (this.stateT < 0.15) this.dir = p.cx() > this.cx() ? 1 : -1;
        if (Math.random() < 0.5) {
          var ax = this.cx() - this.dir * 18, ay = this.y - 26;
          G.particles.spawn("glow", ax + SS.rand(-6, 6), ay + SS.rand(-6, 6), 0, -20, 0.3, 4, this.phase === 2 ? "255,80,60" : "255,190,120", {});
        }
        if (this.stateT > 0.75 * k) this.slam(G);
        break;
      case "slamStuck":
        this.vx = 0;
        if (this.stateT > (this.combo > 0 ? 0.25 : 0.95 * k)) {
          if (this.combo > 0) { this.combo--; this.dir = p.cx() > this.cx() ? 1 : -1; this.setState("slamWind"); this.stateT = 0.75 * k * 0.4; }
          else this.setState("idle");
        }
        break;
      case "chargeWind":
        this.vx = 0;
        this.dir = p.cx() > this.cx() ? 1 : -1;
        if (Math.random() < 0.6) G.dust(this.x + (this.dir > 0 ? 6 : this.w - 6), this.y + this.h, 1, -this.dir);
        if (this.stateT > 0.65 * k) { this.setState("charge"); SS.audio.play("roar"); }
        break;
      case "charge":
        this.vx = this.dir * (this.phase === 2 ? 470 : 390);
        if (Math.random() < 0.7) G.dust(this.cx() - this.dir * 20, this.y + this.h, 1, -this.dir);
        if (this.stateT > 3) this.setState("idle");
        break;
      case "stunned":
        this.vx = 0;
        if (this.stateT > 1.15) this.setState("idle");
        break;
      case "leapWind":
        this.vx = 0;
        this.dir = p.cx() > this.cx() ? 1 : -1;
        if (this.stateT > 0.45 * k) {
          this.setState("leap");
          var air = 0.85;
          this.leapTarget = SS.clamp(p.cx(), 4 * T + this.w / 2, (room.w - 4) * T - this.w / 2);
          this.vy = -(GRAV * air / 2);
          this.vx = SS.clamp((this.leapTarget - this.cx()) / air, -420, 420);
          this.onGround = false;
          SS.audio.play("jump");
        }
        break;
      case "leap":
        if (this.onGround && this.stateT > 0.15) this.land(G);
        break;
      case "recover":
        this.vx = 0;
        if (this.stateT > 0.55 * k) this.setState("idle");
        break;
      case "enrage":
        this.vx = 0;
        if (Math.random() < 0.6) G.particles.spawn("glow", this.cx() + SS.rand(-25, 25), this.y + SS.rand(0, 40), 0, -60, 0.6, 5, "255,70,50", {});
        if (this.stateT > 1.4) this.setState("idle");
        break;
      case "dying":
        this.vx = 0;
        this.deathT += dt;
        if (Math.random() < 0.5) G.particles.burst("ink", this.cx() + SS.rand(-25, 25), this.cy() + SS.rand(-30, 30), 3, 160, 0.7, 4, "#0b0709", { grav: 300 });
        if (Math.random() < 0.3) G.particles.burst("glow", this.cx() + SS.rand(-20, 20), this.cy() + SS.rand(-30, 30), 2, 120, 0.6, 6, "255,190,120", {});
        if (this.deathT > 2.4 && !this.dead) { this.dead = true; G.onBossDefeated(this); }
        break;
    }

    // física
    if (this.state !== "dormant") {
      this.vy = Math.min(this.vy + GRAV * dt, 900);
      var hx = room.moveX(this, this.vx * dt);
      if (hx !== 0 && this.state === "charge") this.hitWall(G, hx);
      var hy = room.moveY(this, this.vy * dt);
      if (hy === 1) { this.onGround = true; this.vy = 0; } else { this.onGround = false; if (hy === -1) this.vy = 0; }
    }

    // daño por contacto y por el hachazo
    if (this.state !== "dormant" && this.state !== "dying" && this.state !== "intro" && !p.invulnerable()) {
      if (SS.overlap(this.x + 8, this.y + 10, this.w - 16, this.h - 10, p.x, p.y, p.w, p.h)) p.hurt(G, 1, this.cx());
      if (this.slamT > 0) {
        var b = this.slamHitbox();
        if (SS.overlap(b.x, b.y, b.w, b.h, p.x, p.y, p.w, p.h)) p.hurt(G, this.phase === 2 ? 2 : 1, this.cx());
      }
    }
    if (this.slamT > 0) this.slamT -= dt;

    if (this.phase === 1 && this.hp <= this.maxHp / 2 && this.state !== "dying") {
      this.phase = 2;
      this.setState("enrage");
      SS.audio.play("roar");
      G.shake = Math.max(G.shake, 10);
      G.particles.spawn("ring", this.cx(), this.cy(), 0, 0, 0.6, 90, "rgba(255,80,60,0.8)", {});
    }
  };

  Verdugo.prototype.slamHitbox = function () {
    return this.dir > 0 ? { x: this.x + this.w - 10, y: this.y + this.h - 62, w: 74, h: 62 }
      : { x: this.x - 64, y: this.y + this.h - 62, w: 74, h: 62 };
  };

  Verdugo.prototype.slam = function (G) {
    this.setState("slamStuck");
    this.slamT = 0.12;
    SS.audio.play("slam");
    G.shake = Math.max(G.shake, 8);
    SS.vibrate(60);
    var gx = this.dir > 0 ? this.x + this.w + 40 : this.x - 40;
    var gy = this.y + this.h;
    G.particles.burst("dot", gx, gy - 4, 16, 220, 0.6, 3, "#3a2c24", { grav: 700, up: 120 });
    G.particles.burst("glow", gx, gy - 6, 6, 120, 0.4, 6, "255,180,110", {});
    G.hazards.push(new SS.Shockwave(gx, gy, this.dir, this.phase === 2 ? 360 : 300));
    if (this.phase === 2) G.hazards.push(new SS.Shockwave(this.cx() - this.dir * 30, gy, -this.dir, 300));
  };

  Verdugo.prototype.hitWall = function (G, side) {
    this.setState("stunned");
    this.vx = -side * 60;
    SS.audio.play("slam");
    G.shake = Math.max(G.shake, 11);
    SS.vibrate(90);
    var wx = side > 0 ? this.x + this.w : this.x;
    G.particles.burst("dot", wx, this.cy(), 18, 240, 0.7, 3, "#3a2c24", { grav: 700 });
    var room = G.room, n = this.phase === 2 ? 4 : 1;
    for (var i = 0; i < n; i++) {
      var rx = (4 + Math.random() * (room.w - 8)) * T;
      if (i === 0) rx = SS.clamp(G.player.cx() + SS.rand(-40, 40), 4 * T, (room.w - 4) * T);
      G.hazards.push(new SS.Rock(rx, 3 * T, i * 0.25));
    }
  };

  Verdugo.prototype.land = function (G) {
    this.setState("recover");
    this.vx = 0;
    SS.audio.play("slam");
    G.shake = Math.max(G.shake, 9);
    var gy = this.y + this.h;
    G.particles.burst("dot", this.cx(), gy - 4, 20, 240, 0.6, 3, "#3a2c24", { grav: 700, up: 100 });
    var sp = this.phase === 2 ? 330 : 270;
    G.hazards.push(new SS.Shockwave(this.x - 6, gy, -1, sp));
    G.hazards.push(new SS.Shockwave(this.x + this.w + 6, gy, 1, sp));
  };

  Verdugo.prototype.hit = function (G, dmg) {
    if (this.state === "dormant" || this.state === "dying" || this.state === "intro") return false;
    this.hp -= dmg;
    this.flash = 0.1;
    G.particles.burst("spark", this.cx() + SS.rand(-10, 10), this.cy() + SS.rand(-20, 10), 8, 260, 0.3, 1.6, "#ffffff", {});
    G.particles.burst("ink", this.cx(), this.cy(), 5, 160, 0.5, 3, "#0b0709", { grav: 400 });
    if (this.hp <= 0) {
      this.hp = 0;
      this.setState("dying");
      this.deathT = 0;
      G.hazards.length = 0;
      G.slowmo = 0.9;
      SS.audio.play("roar");
      G.shake = 12;
    }
    return true;
  };

  /* ---------------------------------------------------------- dibujo */
  Verdugo.prototype.draw = function (ctx, G, time) {
    if (this.state === "dying" && this.deathT > 2.0) ctx.globalAlpha = Math.max(0, 1 - (this.deathT - 2.0) / 0.4);
    var col = this.flash > 0 ? "#ffffff" : "#0b090c";
    var d = this.dir, s = 2.3;
    var P = { lean: 1, bob: 0, tF: 0.15, sF: -0.15, tB: -0.15, sB: 0.1, aF: 0.4, fF: 0.3, aB: -0.3, fB: 0.3, rot: 0 };
    var axe = 0.5;   // ángulo absoluto del hacha (0 abajo, π/2 adelante, π arriba)
    var st = this.state, k;
    switch (st) {
      case "dormant": P.bob = 3; P.lean = 3; P.aF = 0.1; axe = 0.1; P.tF = 0.3; P.sF = -0.5; P.tB = -0.1; P.sB = -0.3; break;
      case "intro":
        k = Math.min(1, this.stateT / 0.8);
        P.aF = SS.lerp(0.1, 2.8, k); P.fF = 0.2; axe = SS.lerp(0.1, 3.0, k); P.aB = SS.lerp(-0.3, -2.4, k); P.lean = -2 * k;
        break;
      case "walk":
        var ph = this.anim * 6;
        P.tF = Math.sin(ph) * 0.5; P.tB = -Math.sin(ph) * 0.5; P.sF = -0.3; P.sB = -0.3; P.bob = -Math.abs(Math.cos(ph)) * 1.5;
        P.aF = 0.9; axe = 1.3;
        break;
      case "slamWind":
        k = Math.min(1, this.stateT / (0.55 * this.speedK()));
        P.aF = SS.lerp(0.6, 3.0, k); P.fF = 0.15; axe = SS.lerp(0.8, 3.4, k); P.lean = SS.lerp(0, -3, k);
        P.aB = SS.lerp(-0.3, 2.4, k); P.tF = 0.35; P.sF = -0.5; P.tB = -0.35; P.sB = 0.2;
        break;
      case "slamStuck":
        P.aF = 1.0; P.fF = 0.4; axe = 0.95; P.lean = 6; P.bob = 6; P.tF = 0.7; P.sF = -1.0; P.tB = -0.5; P.sB = 0.1; P.aB = 0.9;
        break;
      case "chargeWind":
        P.lean = 7; P.bob = 6; P.tF = 0.8; P.sF = -1.1; P.tB = -0.6; P.sB = 0.3; P.aF = -0.6; axe = -0.9; P.aB = -1.0;
        break;
      case "charge":
        var ph2 = this.anim * 14;
        P.lean = 9; P.bob = 4 - Math.abs(Math.cos(ph2)) * 2; P.tF = Math.sin(ph2) * 0.9 + 0.3; P.tB = -Math.sin(ph2) * 0.9 + 0.3;
        P.sF = -0.6; P.sB = -0.6; P.aF = -0.8; axe = -1.1; P.aB = -1.2;
        break;
      case "stunned":
        P.rot = -0.12 + Math.sin(this.stateT * 18) * 0.04; P.bob = 4; P.aF = 0.2; axe = 0.1; P.aB = 0.1; P.lean = -2;
        break;
      case "leapWind":
        P.bob = 9; P.tF = 1.0; P.sF = -1.6; P.tB = 0.6; P.sB = -1.3; P.aF = -0.4; axe = -0.6; P.aB = -0.8; P.lean = 3;
        break;
      case "leap":
        P.tF = 0.9; P.sF = -1.4; P.tB = 0.5; P.sB = -1.0; P.aF = 2.9; P.fF = 0.1; axe = 3.2; P.aB = 2.5; P.lean = 1;
        break;
      case "recover":
        P.bob = 7; P.tF = 0.8; P.sF = -1.2; P.tB = -0.6; P.sB = 0.1; P.aF = 1.0; axe = 0.9; P.lean = 5;
        break;
      case "enrage":
        P.aF = 2.6 + Math.sin(time * 20) * 0.1; axe = 3.0; P.aB = 2.6; P.lean = -3;
        break;
      case "dying":
        P.rot = -Math.min(1.3, this.deathT * 0.8); P.aF = 1.6; axe = 1.8; P.aB = -1.6;
        break;
      default:
        P.bob = Math.sin(time * 2) * 1; P.aF = 0.55; axe = 0.7;
    }
    // sombra donde caerá el salto
    if (st === "leap") {
      ctx.fillStyle = "rgba(0,0,0,0.35)";
      ctx.beginPath(); ctx.ellipse(this.leapTarget, G.room.ph - 2 * T, 34, 6, 0, 0, 6.283); ctx.fill();
    }
    var parts = SS.drawStickFigure(ctx, this.x, this.y, this.w, this.h, d, P, col, s, 3.0);
    // torso ancho y capucha
    ctx.fillStyle = col;
    var sh = parts.shoulder, hd = parts.head;
    ctx.beginPath();
    ctx.moveTo(sh.x - 15, sh.y + 4);
    ctx.lineTo(sh.x + 15, sh.y + 4);
    ctx.lineTo(sh.x + 8, sh.y + 26);
    ctx.lineTo(sh.x - 8, sh.y + 26);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(hd.x - 16, hd.y + 10);
    ctx.quadraticCurveTo(hd.x - 15, hd.y - 20, hd.x + d * 2, hd.y - 24);
    ctx.quadraticCurveTo(hd.x + 16, hd.y - 12, hd.x + 15, hd.y + 10);
    ctx.fill();
    // hacha
    var hx = parts.hand.x, hy = parts.hand.y;
    var L = 62, ex = hx + Math.sin(axe) * d * L, ey = hy + Math.cos(axe) * L;
    var bx = hx - Math.sin(axe) * d * 10, by = hy - Math.cos(axe) * 10;
    ctx.strokeStyle = "#2a1d16"; ctx.lineWidth = 4.5; ctx.lineCap = "round";
    ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(ex, ey); ctx.stroke();
    var nx = Math.cos(axe) * d, ny = -Math.sin(axe);
    var bxx = ex - Math.sin(axe) * d * 8, byy = ey - Math.cos(axe) * 8;
    ctx.fillStyle = this.flash > 0 ? "#ffffff" : "#5d5a5c";
    ctx.beginPath();
    ctx.moveTo(bxx - nx * 4, byy - ny * 4);
    ctx.quadraticCurveTo(ex + nx * 30 + Math.sin(axe) * d * 10, ey + ny * 30 + Math.cos(axe) * 10, bxx + nx * 26 - Math.sin(axe) * d * 20, byy + ny * 26 - Math.cos(axe) * 20);
    ctx.lineTo(bxx - nx * 4 - Math.sin(axe) * d * 14, byy - ny * 4 - Math.cos(axe) * 14);
    ctx.closePath();
    ctx.fill();
    if (st === "slamWind") {
      var kk = Math.min(1, this.stateT / (0.55 * this.speedK()));
      SS.drawGlow(ctx, ex + nx * 14, ey + ny * 14, 18 + kk * 18, this.phase === 2 ? "255,70,50" : "255,190,120", 0.3 + kk * 0.5);
    }
    // ojos
    var eyeCol = this.phase === 2 ? "255,60,40" : "255,170,80";
    var eyeA = st === "dormant" ? 0.2 + Math.sin(time * 1.5) * 0.1 : 0.9;
    SS.drawGlow(ctx, hd.x + d * 5, hd.y + 1, 14, eyeCol, eyeA * 0.7);
    ctx.fillStyle = this.phase === 2 ? "#ff8a70" : "#ffcf90";
    ctx.globalAlpha *= Math.min(1, eyeA + 0.1);
    ctx.fillRect(hd.x + d * 2 - 1.5, hd.y - 1, 3, 2.5);
    ctx.fillRect(hd.x + d * 8 - 1.5, hd.y - 1, 3, 2.5);
    ctx.globalAlpha = 1;
    if (st === "stunned") {
      for (var i = 0; i < 3; i++) {
        var a = time * 4 + i * 2.1;
        ctx.fillStyle = "#ffe9b0";
        ctx.fillRect(hd.x + Math.cos(a) * 16 - 1.5, hd.y - 22 + Math.sin(a) * 4, 3, 3);
      }
    }
  };

  /* ------------------------------------------------- onda de choque */
  var Shockwave = (SS.Shockwave = function (x, groundY, dir, speed) {
    this.x = x; this.gy = groundY; this.dir = dir; this.speed = speed;
    this.w = 22; this.h = 28; this.t = 0; this.dead = false;
  });
  Shockwave.prototype.update = function (dt, G) {
    this.t += dt;
    this.x += this.dir * this.speed * dt;
    var room = G.room;
    var aheadX = this.x + this.dir * this.w / 2;
    if (room.solidPx(aheadX, this.gy - 10) || !room.groundPx(this.x, this.gy + 4) || this.t > 4) {
      this.dead = true;
      G.particles.burst("dot", this.x, this.gy - 8, 8, 120, 0.4, 3, "#3a2c24", { grav: 500 });
      return;
    }
    if (Math.random() < 0.6) G.particles.spawn("dot", this.x, this.gy - 2, -this.dir * SS.rand(20, 60), SS.rand(-120, -40), 0.4, 2.5, "#4a382c", { grav: 500 });
    var p = G.player;
    if (!p.invulnerable() && SS.overlap(this.x - this.w / 2, this.gy - this.h, this.w, this.h, p.x, p.y, p.w, p.h)) p.hurt(G, 1, this.x);
  };
  Shockwave.prototype.draw = function (ctx, G, time) {
    var x = this.x, y = this.gy;
    SS.drawGlow(ctx, x, y - 12, 26, "255,170,100", 0.45);
    ctx.fillStyle = "rgba(255,225,190,0.85)";
    ctx.beginPath();
    ctx.moveTo(x - this.dir * 14, y);
    ctx.quadraticCurveTo(x - this.dir * 2, y - 30 - Math.sin(time * 30) * 3, x + this.dir * 10, y);
    ctx.closePath();
    ctx.fill();
  };

  /* --------------------------------------------------- roca que cae */
  var Rock = (SS.Rock = function (x, y, delay) {
    this.x = x; this.y = y; this.vy = 0; this.warn = 0.65 + delay; this.t = 0; this.dead = false; this.r = 11;
  });
  Rock.prototype.update = function (dt, G) {
    this.t += dt;
    if (this.t < this.warn) return;
    this.vy = Math.min(this.vy + 1400 * dt, 800);
    this.y += this.vy * dt;
    if (G.room.solidPx(this.x, this.y + this.r)) {
      this.dead = true;
      SS.audio.play("break");
      G.particles.burst("shard", this.x, this.y, 10, 200, 0.7, 5, "#4b3e36", { grav: 900, collide: true });
      return;
    }
    var p = G.player;
    if (!p.invulnerable() && SS.overlap(this.x - this.r, this.y - this.r, this.r * 2, this.r * 2, p.x, p.y, p.w, p.h)) {
      p.hurt(G, 1, this.x);
      this.dead = true;
    }
  };
  Rock.prototype.draw = function (ctx, G) {
    var floorY = G.room.ph - 2 * T;
    if (this.t < this.warn + 0.4) {
      var a = Math.min(1, this.t / this.warn);
      ctx.fillStyle = "rgba(0,0,0," + (0.15 + a * 0.3).toFixed(2) + ")";
      ctx.beginPath(); ctx.ellipse(this.x, floorY, 10 + a * 6, 3, 0, 0, 6.283); ctx.fill();
    }
    if (this.t < this.warn) {
      ctx.fillStyle = "#3a2f2a";
      ctx.fillRect(this.x - 3 + Math.sin(this.t * 50) * 1.5, this.y - 6, 6, 4);
      return;
    }
    ctx.fillStyle = "#3e332d";
    ctx.beginPath();
    ctx.moveTo(this.x - this.r, this.y);
    ctx.lineTo(this.x - 4, this.y - this.r); ctx.lineTo(this.x + this.r, this.y - 3);
    ctx.lineTo(this.x + 5, this.y + this.r); ctx.lineTo(this.x - 7, this.y + this.r - 2);
    ctx.closePath();
    ctx.fill();
  };
})();
