/* =====================================================================
   JEFE DEL BOSQUE · EL VERDUGO (diseño de Juan)
   Gigante barrigón, sin camisa, capucha negra puntiaguda con rendijas,
   faldón rojo, correas de cuero, hacha de carnicero enorme y una bola
   de hierro con cadena (la cadena tiene física de verdad).
   Ataques, siempre anunciados:
   - Hachazo: levanta el hacha (brillo), golpea y lanza una onda.
   - Embestida: se agacha levantando polvo y corre hasta la pared;
     al chocar queda aturdido (en la fase 2 caen rocas del techo).
   - Salto aplastante: sombra donde caerá; ondas a ambos lados.
   - Bola con cadena: la hace girar sobre la cabeza y la lanza al frente.
   Fase 2 (mitad de vida): ojos rojos, más rápido, dobles ondas, combos.
   ===================================================================== */
(function () {
  "use strict";
  var SS = window.SS, T = SS.T;
  var GRAV = 1500, S = 2.45;

  var Verdugo = (SS.Verdugo = function (tx, ty) {
    this.w = 54; this.h = 84;
    this.x = tx + T / 2 - this.w / 2;
    this.y = ty + T - this.h;
    this.vx = 0; this.vy = 0; this.dir = -1;
    this.maxHp = 72; this.hp = this.maxHp;
    this.state = "dormant"; this.stateT = 0; this.t = 0;
    this.phase = 1; this.flash = 0; this.lastHit = -1;
    this.onGround = false; this.history = [];
    this.id = "verdugo";
    this.name = SS.BOSSES.verdugo.name;
    this.slamT = 0;
    this.combo = 0; this.anim = 0; this.dead = false; this.deathT = 0;
    this.leapTarget = 0; this.throws = 0;
    this.P = SS.basePose();
    this.J = null;
    this.chain = new SS.Rope(this.cx(), this.y + 40, 8, 5.5, { heavyEnd: 0.2, damp: 0.985, collide: true });
    this.ball = null;          // posición forzada de la bola durante el ataque
    this.ballHit = false;
    this.skirt = [new SS.Rope(0, 0, 3, 9, { grav: 700, damp: 0.9 }), new SS.Rope(0, 0, 3, 9, { grav: 700, damp: 0.9 }), new SS.Rope(0, 0, 3, 9, { grav: 700, damp: 0.9 })];
    this.hoodTip = { x: this.cx(), y: this.y - 20, vx: 0, vy: 0 };
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
    if (dist > 210) opts = [["charge", 4], ["leap", 3], ["flail", 3], ["walk", 1]];
    else if (dist > 100) opts = [["slam", 3], ["leap", 2], ["charge", 2], ["flail", 3], ["walk", 1]];
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
      case "flail": this.throws = this.phase === 2 ? 2 : 1; this.setState("flailWind"); SS.audio.play("chain"); break;
    }
  };

  Verdugo.prototype.update = function (dt, G) {
    var room = G.room, p = G.player, k = this.speedK();
    this.t += dt; this.stateT += dt; this.anim += dt;
    if (this.flash > 0) this.flash -= dt;
    this.ball = null;

    switch (this.state) {
      case "dormant": this.vx = 0; break;
      case "intro":
        this.vx = 0;
        this.dir = p.cx() > this.cx() ? 1 : -1;
        if (this.stateT < 1.2 && Math.random() < 0.3) G.particles.spawn("dot", this.cx() + SS.rand(-30, 30), this.y + SS.rand(0, 20), 0, SS.rand(-60, -20), 0.6, 2, "#2a1a14", {});
        if (this.stateT > 2.2) this.setState("idle");
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
      case "flailWind": {
        this.vx = 0;
        this.dir = p.cx() > this.cx() ? 1 : -1;
        var hB = this.J ? this.J.hB : { x: this.cx(), y: this.y + 20 };
        var ang = this.stateT * 13;
        this.ball = { x: hB.x + Math.cos(ang) * 30, y: hB.y - 26 + Math.sin(ang) * 12 };
        if (Math.random() < 0.12) SS.audio.play("chain");
        if (this.stateT > 0.8 * k) { this.setState("flailThrow"); SS.audio.play("whoosh"); this.ballHit = false; }
        break;
      }
      case "flailThrow": {
        this.vx = 0;
        var hb = this.J ? this.J.hB : { x: this.cx(), y: this.y + 30 };
        var out = 0.42, back = 0.36, reach = this.phase === 2 ? 200 : 175, tt = this.stateT;
        var f = tt < out ? SS.easeOut(tt / out) : 1 - SS.easeInOut((tt - out) / back);
        var gy = this.y + this.h - 22;
        this.ball = { x: hb.x + this.dir * reach * f, y: SS.lerp(hb.y, gy, Math.min(1, f * 2)) + Math.sin(f * Math.PI) * -18 };
        if (f > 0.95 && !this.ballHit) {
          this.ballHit = true;
          G.shake = Math.max(G.shake, 4);
          SS.audio.play("clank");
          G.particles.burst("spark", this.ball.x, this.ball.y, 10, 220, 0.3, 1.5, "#ffd8a0", {});
        }
        if (tt > out + back) {
          this.throws--;
          if (this.throws > 0) { this.setState("flailWind"); this.stateT = 0.4; }
          else this.setState("flailRecover");
        }
        break;
      }
      case "flailRecover":
        this.vx = 0;
        if (this.stateT > 0.6 * k) this.setState("idle");
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

    this.animate(dt);

    // daño por contacto, por el hachazo y por la bola
    var active = this.state !== "dormant" && this.state !== "dying" && this.state !== "intro";
    if (active && !p.invulnerable()) {
      if (SS.overlap(this.x + 8, this.y + 12, this.w - 16, this.h - 12, p.x, p.y, p.w, p.h)) p.hurt(G, 1, this.cx());
      else if (this.slamT > 0) {
        var b = this.slamHitbox();
        if (SS.overlap(b.x, b.y, b.w, b.h, p.x, p.y, p.w, p.h)) p.hurt(G, this.phase === 2 ? 2 : 1, this.cx());
      } else if (this.ball && (this.state === "flailThrow" || this.state === "flailWind")) {
        var e = this.chain.end();
        if (SS.overlap(e.x - 10, e.y - 10, 20, 20, p.x, p.y, p.w, p.h)) p.hurt(G, 1, e.x);
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
    return this.dir > 0 ? { x: this.x + this.w - 10, y: this.y + this.h - 62, w: 76, h: 62 }
      : { x: this.x - 66, y: this.y + this.h - 62, w: 76, h: 62 };
  };

  Verdugo.prototype.slam = function (G) {
    this.setState("slamStuck");
    this.slamT = 0.12;
    SS.audio.play("slam");
    G.shake = Math.max(G.shake, 8);
    SS.vibrate(60);
    var gx = this.dir > 0 ? this.x + this.w + 44 : this.x - 44;
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
    G.particles.burst("ink", this.cx(), this.cy(), 5, 160, 0.5, 3, "#2a0507", { grav: 400 });
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

  /* ------------------------------------------------------- animación */
  Verdugo.prototype.targetPose = function () {
    var P = SS.basePose(), st = this.state, k, time = this.anim;
    var axe = 0.55;
    P.lean = 0.05; P.aF = 0.5; P.eF = 0.35; P.aB = -0.1; P.eB = 0.5; P.tF = 0.2; P.kF = -0.15; P.tB = -0.2; P.kB = 0.05;
    switch (st) {
      case "dormant": P.crouch = 3; P.lean = 0.35; P.head = 0.4; P.aF = 0.15; axe = 0.15; P.tF = 0.4; P.kF = -0.6; P.tB = -0.1; P.kB = -0.3; break;
      case "intro":
        k = SS.smooth(this.stateT / 0.9);
        P.aF = SS.lerp(0.15, 2.8, k); P.eF = 0.2; axe = SS.lerp(0.15, 3.0, k); P.aB = SS.lerp(-0.1, 2.4, k); P.lean = SS.lerp(0.35, -0.2, k); P.head = SS.lerp(0.4, -0.3, k);
        break;
      case "walk": {
        var ph = this.anim * 6;
        P.tF = Math.sin(ph) * 0.5; P.tB = -Math.sin(ph) * 0.5; P.kF = -0.3; P.kB = -0.3; P.bob = -Math.abs(Math.cos(ph)) * 1.4;
        P.aF = 0.9; axe = 1.3; P.aB = Math.sin(ph) * 0.3;
        break;
      }
      case "slamWind":
        k = SS.smooth(this.stateT / (0.6 * this.speedK()));
        P.aF = SS.lerp(0.6, 3.0, k); P.eF = 0.15; axe = SS.lerp(0.8, 3.4, k); P.lean = SS.lerp(0, -0.25, k);
        P.aB = SS.lerp(-0.1, 2.6, k); P.tF = 0.35; P.kF = -0.5; P.tB = -0.35; P.kB = 0.2; P.head = -0.2 * k;
        break;
      case "slamStuck":
        P.aF = 0.75; P.eF = 0.2; axe = 0.62; P.lean = 0.62; P.crouch = 7; P.tF = 0.8; P.kF = -1.2; P.tB = -0.55; P.kB = 0.1; P.aB = 0.9; P.head = 0.3;
        break;
      case "chargeWind":
        P.lean = 0.6; P.crouch = 5; P.tF = 0.8; P.kF = -1.1; P.tB = -0.6; P.kB = 0.3; P.aF = -0.6; axe = -0.9; P.aB = -1.0; P.head = 0.2;
        break;
      case "charge": {
        var ph2 = this.anim * 14;
        P.lean = 0.75; P.crouch = 3; P.tF = Math.sin(ph2) * 0.9 + 0.3; P.tB = -Math.sin(ph2) * 0.9 + 0.3;
        P.kF = -0.6; P.kB = -0.6; P.aF = -0.8; axe = -1.1; P.aB = -1.2; P.head = 0.1;
        break;
      }
      case "stunned": P.rot = -0.12 + Math.sin(this.stateT * 18) * 0.04; P.crouch = 3; P.aF = 0.2; axe = 0.1; P.aB = 0.1; P.lean = -0.2; P.head = 0.5; break;
      case "leapWind": P.crouch = 9; P.tF = 1.0; P.kF = -1.6; P.tB = 0.6; P.kB = -1.3; P.aF = -0.4; axe = -0.6; P.aB = -0.8; P.lean = 0.3; break;
      case "leap": P.tF = 0.9; P.kF = -1.4; P.tB = 0.5; P.kB = -1.0; P.aF = 2.9; P.eF = 0.1; axe = 3.2; P.aB = 2.5; P.lean = 0.1; break;
      case "recover": P.crouch = 7; P.tF = 0.8; P.kF = -1.2; P.tB = -0.6; P.kB = 0.1; P.aF = 1.0; axe = 0.9; P.lean = 0.45; break;
      case "flailWind": P.aB = 2.9; P.eB = -0.3; P.aF = 0.5; axe = 0.5; P.lean = -0.1; P.tF = 0.35; P.kF = -0.4; P.tB = -0.35; P.head = -0.1; break;
      case "flailThrow": k = SS.smooth(this.stateT / 0.2); P.aB = SS.lerp(2.9, 1.6, k); P.eB = 0; P.lean = SS.lerp(-0.1, 0.35, k); P.aF = 0.4; axe = 0.4; P.tF = 0.6; P.kF = -0.6; P.tB = -0.5; break;
      case "flailRecover": P.aB = 0.6; P.eB = 0.4; P.lean = 0.25; P.crouch = 3; break;
      case "enrage": P.aF = 2.6 + Math.sin(time * 20) * 0.1; axe = 3.0; P.aB = 2.6; P.lean = -0.3; P.head = -0.4; break;
      case "dying": P.rot = -Math.min(1.35, this.deathT * 0.8); P.pivot = 0; P.aF = 1.6; axe = 1.8; P.aB = -1.6; P.head = 0.5; break;
      default: P.bob = Math.sin(time * 2) * 0.8; P.aF = 0.55; axe = 0.7;
    }
    P.sw = axe;
    return P;
  };

  Verdugo.prototype.animate = function (dt) {
    var st = this.state;
    var rate = st === "slamStuck" || st === "flailThrow" || st === "charge" || st === "leap" ? 30 : 12;
    SS.blendPose(this.P, this.targetPose(), SS.damp(rate, dt));
    this.J = SS.solveJoints(this.P, this.cx(), this.y + this.h, this.dir, S);
    var J = this.J;
    // cadena con bola: el primer eslabón va en la mano trasera
    this.chain.moveTo(0, J.hB.x, J.hB.y);
    if (this.ball) { this.chain.pinB = true; this.chain.moveTo(-1, this.ball.x, this.ball.y); }
    else this.chain.pinB = false;
    this.chain.update(dt, SS.G.room);
    // faldón rojo
    var tdx = J.sh.x - J.hip.x, tdy = J.sh.y - J.hip.y, tl = Math.sqrt(tdx * tdx + tdy * tdy) || 1;
    var nx = -tdy / tl, ny = tdx / tl;
    for (var i = 0; i < 3; i++) {
      var r = this.skirt[i], off = (i - 1) * 6 * this.dir;
      r.pin(0, J.hip.x + nx * off + this.dir * 4, J.hip.y + ny * off);
      r.wind = -this.vx * 4 - this.dir * 30 + Math.sin(this.anim * 5 + i) * 60;
      r.update(dt, null);
    }
    // punta de la capucha con retraso
    var hd = J.head, ha = Math.atan2(hd.x - J.neck.x, J.neck.y - hd.y);
    var ix = hd.x + Math.sin(ha) * 20 - this.dir * 6, iy = hd.y - Math.cos(ha) * 20;
    var h = this.hoodTip;
    h.vx += ((ix - h.x) * 200 - h.vx * 12 - this.vx * 0.3) * dt; h.vy += ((iy - h.y) * 200 - h.vy * 12) * dt;
    h.x += h.vx * dt; h.y += h.vy * dt;
  };

  /* ---------------------------------------------------------- dibujo */
  Verdugo.prototype.draw = function (ctx, G, time) {
    var J = this.J;
    if (!J) return;
    if (this.state === "dying" && this.deathT > 2.0) ctx.globalAlpha = Math.max(0, 1 - (this.deathT - 2.0) / 0.4);
    var fl = this.flash > 0, d = this.dir, st = this.state;
    var skin = fl ? "#fff" : "#77533f", skinD = fl ? "#fff" : "#4f3428", leather = fl ? "#fff" : "#2a1c16", cloth = fl ? "#fff" : "#2a2220";
    var seg = function (a, b, w, c) { ctx.strokeStyle = c; ctx.lineWidth = w; ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke(); };
    ctx.lineCap = "round"; ctx.lineJoin = "round";

    // sombra donde caerá el salto
    if (st === "leap") {
      ctx.fillStyle = "rgba(0,0,0,0.35)";
      ctx.beginPath(); ctx.ellipse(this.leapTarget, G.room.ph - 2 * T, 36, 6, 0, 0, 6.283); ctx.fill();
    }
    // cadena y bola (detrás si no ataca)
    var drawChain = function (self) {
      self.chain.draw(ctx, fl ? "#fff" : "#2b2726", 4.2, true);
      var e = self.chain.end();
      ctx.fillStyle = fl ? "#fff" : "#2e2b2a";
      ctx.strokeStyle = "#0b0909"; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.rect(e.x - 7, e.y - 6, 14, 13); ctx.fill(); ctx.stroke();
      ctx.fillStyle = fl ? "#fff" : "#4a4544";
      ctx.fillRect(e.x - 7, e.y - 6, 14, 3);
      ctx.fillStyle = "#0b0909";
      ctx.beginPath();
      ctx.moveTo(e.x - 9, e.y); ctx.lineTo(e.x - 7, e.y - 2); ctx.lineTo(e.x - 7, e.y + 2);
      ctx.moveTo(e.x + 9, e.y); ctx.lineTo(e.x + 7, e.y - 2); ctx.lineTo(e.x + 7, e.y + 2);
      ctx.moveTo(e.x, e.y + 9); ctx.lineTo(e.x - 2, e.y + 7); ctx.lineTo(e.x + 2, e.y + 7);
      ctx.fill();
      if (st === "flailWind" || st === "flailThrow") SS.drawGlow(ctx, e.x, e.y, 16, self.phase === 2 ? "255,80,60" : "255,190,120", 0.35);
    };
    var front = st === "flailWind" || st === "flailThrow";
    // brazo trasero (lleva la cadena)
    seg(J.sh, J.eB, 10, skinD);
    seg(J.eB, J.hB, 9, leather);
    if (!front) drawChain(this);
    // piernas: pantalón oscuro y botas
    seg(J.hip, J.kB, 13, fl ? "#fff" : "#1d1614");
    seg(J.kB, J.fB, 11, fl ? "#fff" : "#191311");
    boot(ctx, J.fB, d, fl);
    // faldón trasero
    skirt(ctx, J, this.skirt, true, fl);
    // barriga y pecho
    var hip = J.hip, sh = J.sh;
    var tdx = sh.x - hip.x, tdy = sh.y - hip.y, tl = Math.sqrt(tdx * tdx + tdy * tdy) || 1, ux = tdx / tl, uy = tdy / tl, nx = -uy, ny = ux;
    var mid = { x: (hip.x + sh.x) / 2 + d * 4, y: (hip.y + sh.y) / 2 + 3 };
    ctx.fillStyle = skin;
    ctx.beginPath();
    ctx.ellipse(mid.x, mid.y, 19, 22, Math.atan2(ux, -uy), 0, 6.283);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(sh.x - nx * 17, sh.y - ny * 17 + 2); ctx.lineTo(sh.x + nx * 17, sh.y + ny * 17 + 2);
    ctx.lineTo(mid.x + nx * 14, mid.y + ny * 14); ctx.lineTo(mid.x - nx * 14, mid.y - ny * 14);
    ctx.closePath(); ctx.fill();
    if (!fl) {
      ctx.fillStyle = "rgba(40,22,16,0.45)";
      ctx.beginPath(); ctx.ellipse(mid.x - d * 7, mid.y + 2, 9, 19, Math.atan2(ux, -uy), 0, 6.283); ctx.fill();
      ctx.strokeStyle = "rgba(40,22,16,0.6)"; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.arc(mid.x + d * 3, mid.y + 7, 1.4, 0, 6.283); ctx.stroke();       // ombligo
      ctx.beginPath(); ctx.moveTo(sh.x - 5, sh.y + 11); ctx.quadraticCurveTo(sh.x + d * 4, sh.y + 15, sh.x + d * 12, sh.y + 10); ctx.stroke();
    }
    // correas de cuero en X con anilla
    ctx.strokeStyle = leather; ctx.lineWidth = 3.4;
    ctx.beginPath();
    ctx.moveTo(sh.x - nx * 14, sh.y - ny * 14 + 2); ctx.lineTo(hip.x + nx * 12, hip.y + ny * 12 - 4);
    ctx.moveTo(sh.x + nx * 14, sh.y + ny * 14 + 2); ctx.lineTo(hip.x - nx * 12, hip.y - ny * 12 - 4);
    ctx.stroke();
    var ring = { x: (sh.x + hip.x) / 2 + d * 1, y: sh.y + (hip.y - sh.y) * 0.35 };
    ctx.strokeStyle = fl ? "#fff" : "#8f7d6a"; ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.arc(ring.x, ring.y, 3.2, 0, 6.283); ctx.stroke();
    ctx.fillStyle = fl ? "#fff" : "#7a1a1a"; ctx.beginPath(); ctx.arc(ring.x, ring.y, 1.5, 0, 6.283); ctx.fill();
    // cinturón con hebilla
    ctx.strokeStyle = leather; ctx.lineWidth = 5;
    ctx.beginPath(); ctx.moveTo(hip.x - nx * 15, hip.y - ny * 15 - 2); ctx.lineTo(hip.x + nx * 15, hip.y + ny * 15 - 2); ctx.stroke();
    ctx.fillStyle = fl ? "#fff" : "#6d6258"; ctx.fillRect(hip.x + d * 2 - 3, hip.y - 5, 6, 5);
    // pierna delantera
    seg(J.hip, J.kF, 13, fl ? "#fff" : "#241b18");
    seg(J.kF, J.fF, 11, fl ? "#fff" : "#1f1715");
    boot(ctx, J.fF, d, fl);
    // faldón delantero
    skirt(ctx, J, this.skirt, false, fl);
    // capucha negra puntiaguda
    var hd = J.head, tip = this.hoodTip;
    var ha = Math.atan2(hd.x - J.neck.x, J.neck.y - hd.y), ca = Math.cos(ha), sa = Math.sin(ha);
    var rot = function (x, y) { return { x: hd.x + x * ca - y * sa, y: hd.y + x * sa + y * ca }; };
    ctx.fillStyle = fl ? "#fff" : "#131012";
    ctx.beginPath();
    var cl = { x: sh.x - nx * 19, y: sh.y - ny * 19 + 6 }, cr = { x: sh.x + nx * 19, y: sh.y + ny * 19 + 6 };
    ctx.moveTo(cl.x, cl.y);
    var a1 = rot(-11 * d, 6), a2 = rot(-10 * d, -8), b1 = rot(10 * d, -8), b2 = rot(11 * d, 6);
    ctx.lineTo(a1.x, a1.y); ctx.lineTo(a2.x, a2.y);
    ctx.lineTo(tip.x, tip.y);
    ctx.lineTo(b1.x, b1.y); ctx.lineTo(b2.x, b2.y);
    ctx.lineTo(cr.x, cr.y);
    ctx.lineTo(cr.x - nx * 6, cr.y - ny * 6 + 5); ctx.lineTo(sh.x + d * 2, sh.y + 7); ctx.lineTo(cl.x + nx * 6, cl.y + ny * 6 + 4);
    ctx.closePath();
    ctx.fill();
    if (!fl) {
      ctx.strokeStyle = "rgba(90,80,85,0.4)"; ctx.lineWidth = 0.8;
      ctx.beginPath(); ctx.moveTo(b1.x, b1.y); ctx.lineTo(tip.x, tip.y); ctx.stroke();
    }
    // rendijas de los ojos
    var eyeCol = this.phase === 2 ? "255,60,40" : "255,170,80";
    var eyeA = st === "dormant" ? 0.25 + Math.sin(time * 1.5) * 0.1 : 0.95;
    var e1 = rot(3 * d, -1), e2 = rot(8 * d, -1);
    SS.drawGlow(ctx, (e1.x + e2.x) / 2, e1.y, 16, eyeCol, eyeA * 0.6);
    ctx.fillStyle = this.phase === 2 ? "#ff8a70" : "#ffcf90";
    ctx.globalAlpha *= Math.min(1, eyeA + 0.1);
    ctx.beginPath(); ctx.ellipse(e1.x, e1.y, 2, 0.9, ha, 0, 6.283); ctx.ellipse(e2.x, e2.y, 2, 0.9, ha, 0, 6.283); ctx.fill();
    ctx.globalAlpha = st === "dying" && this.deathT > 2.0 ? Math.max(0, 1 - (this.deathT - 2.0) / 0.4) : 1;
    // brazo delantero y hacha de carnicero
    seg(J.sh, J.eF, 11, skin);
    seg(J.eF, J.hF, 10, leather);
    if (!fl) {
      ctx.fillStyle = "#4b3f39";
      for (var sp = 0; sp < 3; sp++) {
        var t = 0.25 + sp * 0.25, px = J.eF.x + (J.hF.x - J.eF.x) * t, py = J.eF.y + (J.hF.y - J.eF.y) * t;
        ctx.beginPath(); ctx.moveTo(px - 2, py); ctx.lineTo(px - d * 6, py - 3); ctx.lineTo(px + 2, py - 1); ctx.fill();
      }
    }
    drawAxe(ctx, J.hF.x, J.hF.y, this.P.sw, d, fl);
    ctx.fillStyle = skinD; ctx.beginPath(); ctx.arc(J.hF.x, J.hF.y, 4.2, 0, 6.283); ctx.fill();
    if (st === "slamWind") {
      var kk = Math.min(1, this.stateT / (0.55 * this.speedK()));
      var ax = J.hF.x + Math.sin(this.P.sw) * d * 54, ay = J.hF.y + Math.cos(this.P.sw) * 54;
      SS.drawGlow(ctx, ax, ay, 18 + kk * 18, this.phase === 2 ? "255,70,50" : "255,190,120", 0.3 + kk * 0.5);
    }
    if (front) drawChain(this);
    if (st === "stunned") {
      for (var i = 0; i < 3; i++) {
        var a = time * 4 + i * 2.1;
        ctx.fillStyle = "#ffe9b0";
        ctx.fillRect(hd.x + Math.cos(a) * 18 - 1.5, hd.y - 26 + Math.sin(a) * 4, 3, 3);
      }
    }
    ctx.globalAlpha = 1;
  };

  function boot(ctx, f, d, fl) {
    ctx.fillStyle = fl ? "#fff" : "#140f0d";
    ctx.beginPath(); ctx.ellipse(f.x + d * 4, f.y - 2, 9, 5, 0, 0, 6.283); ctx.fill();
  }

  function skirt(ctx, J, strips, back, fl) {
    ctx.fillStyle = fl ? "#fff" : back ? "#4c0f12" : "#7c1a20";
    var list = back ? [strips[0], strips[1]] : [strips[1], strips[2]];
    var w = back ? 10 : 8;
    for (var i = 0; i < list.length; i++) {
      var p = list[i].pts;
      ctx.beginPath();
      ctx.moveTo(p[0].x - w / 2, p[0].y);
      ctx.lineTo(p[1].x - w / 2 + 1, p[1].y);
      ctx.lineTo(p[2].x - w / 2 + 2, p[2].y + 2);
      ctx.lineTo(p[2].x - 1, p[2].y - 3);
      ctx.lineTo(p[2].x + w / 2 - 2, p[2].y + 3);
      ctx.lineTo(p[1].x + w / 2 - 1, p[1].y);
      ctx.lineTo(p[0].x + w / 2, p[0].y);
      ctx.closePath();
      ctx.fill();
    }
  }

  /** Hacha de carnicero: mango largo y hoja ancha con filo dentado. */
  function drawAxe(ctx, hx, hy, ang, d, fl) {
    var ux = Math.sin(ang) * d, uy = Math.cos(ang), nx = Math.cos(ang) * d, ny = -Math.sin(ang);
    var L = 60;
    ctx.strokeStyle = fl ? "#fff" : "#3a2619"; ctx.lineWidth = 4.6; ctx.lineCap = "round";
    ctx.beginPath(); ctx.moveTo(hx - ux * 12, hy - uy * 12); ctx.lineTo(hx + ux * L, hy + uy * L); ctx.stroke();
    ctx.strokeStyle = fl ? "#fff" : "#5a3d28"; ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.moveTo(hx - ux * 10, hy - uy * 10); ctx.lineTo(hx + ux * L * 0.9, hy + uy * L * 0.9); ctx.stroke();
    // hoja: rectángulo ancho hacia el filo, al final del mango
    var b0 = { x: hx + ux * (L - 26), y: hy + uy * (L - 26) }, b1 = { x: hx + ux * (L + 2), y: hy + uy * (L + 2) };
    ctx.fillStyle = fl ? "#fff" : "#55585b";
    ctx.strokeStyle = "#0e0d0d"; ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(b0.x - nx * 3, b0.y - ny * 3);
    ctx.lineTo(b1.x - nx * 3, b1.y - ny * 3);
    ctx.lineTo(b1.x + nx * 22 + ux * 3, b1.y + ny * 22 + uy * 3);
    for (var i = 0; i <= 6; i++) {           // filo dentado
      var t = i / 6;
      var ex = b1.x + (b0.x - b1.x) * t + nx * (26 - (i % 2) * 2.5) + ux * (3 - t * 6);
      var ey = b1.y + (b0.y - b1.y) * t + ny * (26 - (i % 2) * 2.5) + uy * (3 - t * 6);
      ctx.lineTo(ex, ey);
    }
    ctx.lineTo(b0.x + nx * 14 - ux * 4, b0.y + ny * 14 - uy * 4);
    ctx.closePath();
    ctx.fill(); ctx.stroke();
    if (!fl) {
      ctx.strokeStyle = "#a9adb0"; ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(b1.x + nx * 21 + ux * 2, b1.y + ny * 21 + uy * 2);
      ctx.lineTo(b0.x + nx * 23 - ux * 2, b0.y + ny * 23 - uy * 2);
      ctx.stroke();
      ctx.fillStyle = "rgba(20,14,12,0.6)";
      ctx.beginPath(); ctx.arc(b0.x + nx * 9 + ux * 10, b0.y + ny * 9 + uy * 10, 2.4, 0, 6.283); ctx.fill();
      ctx.beginPath(); ctx.arc(b0.x + nx * 15 + ux * 18, b0.y + ny * 15 + uy * 18, 1.6, 0, 6.283); ctx.fill();
    }
  }

  /* ------------------------------------------------- onda de choque */
  var Shockwave = (SS.Shockwave = function (x, groundY, dir, speed, col) {
    this.x = x; this.gy = groundY; this.dir = dir; this.speed = speed;
    this.w = 22; this.h = 28; this.t = 0; this.dead = false; this.col = col || "255,170,100";
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
    SS.drawGlow(ctx, x, y - 12, 26, this.col, 0.45);
    ctx.fillStyle = "rgba(255,225,190,0.85)";
    ctx.beginPath();
    ctx.moveTo(x - this.dir * 14, y);
    ctx.quadraticCurveTo(x - this.dir * 2, y - 30 - Math.sin(time * 30) * 3, x + this.dir * 10, y);
    ctx.closePath();
    ctx.fill();
  };

  /* --------------------------------------------------- roca que cae */
  var Rock = (SS.Rock = function (x, y, delay, ember) {
    this.x = x; this.y = y; this.vy = 0; this.warn = 0.65 + delay; this.t = 0; this.dead = false; this.r = 11; this.ember = !!ember;
  });
  Rock.prototype.update = function (dt, G) {
    this.t += dt;
    if (this.t < this.warn) return;
    this.vy = Math.min(this.vy + 1400 * dt, 800);
    this.y += this.vy * dt;
    if (this.ember && Math.random() < 0.7) G.particles.spawn("ember", this.x + SS.rand(-5, 5), this.y, SS.rand(-20, 20), -30, 0.6, 2, "255,140,60", {});
    if (G.room.solidPx(this.x, this.y + this.r)) {
      this.dead = true;
      SS.audio.play("break");
      G.particles.burst("shard", this.x, this.y, 10, 200, 0.7, 5, this.ember ? "#5a2a18" : "#4b3e36", { grav: 900, collide: true });
      if (this.ember) G.particles.burst("ember", this.x, this.y, 8, 140, 0.9, 2.2, "255,150,70", { grav: 300 });
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
      ctx.fillStyle = this.ember ? "#5a2a18" : "#3a2f2a";
      ctx.fillRect(this.x - 3 + Math.sin(this.t * 50) * 1.5, this.y - 6, 6, 4);
      return;
    }
    if (this.ember) SS.drawGlow(ctx, this.x, this.y, 20, "255,120,50", 0.6);
    ctx.fillStyle = this.ember ? "#4a1d10" : "#3e332d";
    ctx.beginPath();
    ctx.moveTo(this.x - this.r, this.y);
    ctx.lineTo(this.x - 4, this.y - this.r); ctx.lineTo(this.x + this.r, this.y - 3);
    ctx.lineTo(this.x + 5, this.y + this.r); ctx.lineTo(this.x - 7, this.y + this.r - 2);
    ctx.closePath();
    ctx.fill();
    if (this.ember) { ctx.fillStyle = "#ff9a50"; ctx.fillRect(this.x - 2, this.y - 2, 3, 2); }
  };
})();
