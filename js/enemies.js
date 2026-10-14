/* =====================================================================
   Criaturas sin alma:
     c  Alimaña     se arrastra y salta a morder (aviso: levanta la cabeza)
     f  Espectro    fantasma que flota, chilla y se lanza atravesando muros
     j  Espadachín  desenvaina la espada, acecha, tajo y salto con estocada
     s  Escupidor   escupe brasas (refugio) o esporas (bosque)
     w  Ahorcado    cuelga de una soga; si pasas debajo, cae y te persigue
   Además: proyectiles, esencia, pajaritos, cadáveres (muñecos de trapo)
   y la cruz que deja el caballero al morir.
   ===================================================================== */
(function () {
  "use strict";
  var SS = window.SS, T = SS.T;
  var GRAV = 1400;

  var TYPES = {
    c: { name: "alimaña", w: 26, h: 16, hp: 5, ess: [3, 5] },
    f: { name: "espectro", w: 20, h: 30, hp: 5, ess: [5, 7], fly: true },
    j: { name: "espadachín", w: 16, h: 34, hp: 10, ess: [8, 11] },
    s: { name: "escupidor", w: 22, h: 24, hp: 6, ess: [5, 7] },
    w: { name: "ahorcado", w: 14, h: 32, hp: 6, ess: [5, 7] }
  };

  var Enemy = (SS.Enemy = function (type, tx, ty, room) {
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
    this.alpha = 1; this.cool = 1 + Math.random() * 2;
    if (type === "j") { this.P = SS.basePose(); this.drawn = 0; this.lost = 0; this.swTrail = []; }
    if (type === "w") {
      this.P = SS.basePose();
      var top = room ? room.ceilingAbove(Math.floor(tx / T), Math.floor(ty / T)) : null;
      if (top === null) top = ty - 3 * T;
      var len = Math.max(20, this.y + 4 - top), n = Math.max(3, Math.round(len / 8));
      this.rope = new SS.Rope(this.x + this.w / 2, top, n, len / (n - 1), { heavyEnd: 0.15, damp: 0.995 });
      this.state = "hang";
      this.ropeTop = top;
    }
    if (type === "f") { this.state = "drift"; this.y -= 6; this.homeY = this.y; }
  });

  Enemy.prototype.cx = function () { return this.x + this.w / 2; };
  Enemy.prototype.cy = function () { return this.y + this.h / 2; };
  Enemy.prototype.setState = function (s) { this.state = s; this.stateT = 0; };

  Enemy.prototype.update = function (dt, G) {
    var room = G.room, p = G.player;
    this.t += dt; this.stateT += dt; this.anim += dt;
    if (this.flash > 0) this.flash -= dt;
    if (this.kb > 0) this.kb -= dt;
    if (this.cool > 0) this.cool -= dt;
    var dx = p.cx() - this.cx(), dy = p.cy() - this.cy();
    var dist = Math.sqrt(dx * dx + dy * dy);
    var alive = p.state !== "dead";
    this.atkBox = null;

    switch (this.type) {
      case "c": this.aiCrawler(dt, G, dx, dy, alive); break;
      case "f": this.aiGhost(dt, G, dx, dy, dist, alive); break;
      case "j": this.aiSword(dt, G, dx, dy, alive); break;
      case "s": this.aiSpitter(dt, G, dx, dy, dist, alive); break;
      case "w": this.aiHanged(dt, G, dx, dy, alive); break;
    }

    if (this.type !== "f" && !(this.type === "w" && this.state === "hang")) {
      this.vy = Math.min(this.vy + GRAV * dt, 600);
      var hx = room.moveX(this, this.vx * dt);
      if (hx !== 0 && this.kb <= 0) { if (this.type === "c" || this.state === "patrol" || this.state === "walk") this.dir = -hx; }
      var hy = room.moveY(this, this.vy * dt);
      if (hy === 1) { this.onGround = true; this.vy = 0; }
      else { this.onGround = false; if (hy === -1) this.vy = 0; }
      if (room.touchesSpikes(this)) this.hit(G, 99, this.cx(), "side");
    }

    // daño por contacto y por el arma
    if (!p.invulnerable() && this.alpha > 0.45 && !(this.type === "w" && this.state === "hang")) {
      if (SS.overlap(this.x + 3, this.y + 3, this.w - 6, this.h - 4, p.x, p.y, p.w, p.h)) p.hurt(G, 1, this.cx());
      else if (this.atkBox && SS.boxHit(this.atkBox, p)) p.hurt(G, 1, this.cx());
    }
    if (this.y > room.ph + 60) this.dead = true;
  };

  /* -------------------------------------------------------- alimaña */
  Enemy.prototype.aiCrawler = function (dt, G, dx, dy, alive) {
    var room = G.room;
    if (this.state === "idle" || this.state === "patrol") {
      if (this.kb <= 0) {
        this.vx = this.dir * 44;
        var aheadX = this.dir > 0 ? this.x + this.w + 2 : this.x - 2;
        if (this.onGround && !room.groundPx(aheadX, this.y + this.h + 4)) this.dir *= -1;
      }
      if (alive && this.onGround && this.cool <= 0 && Math.abs(dx) < 120 && Math.abs(dy) < 40 && SS.sign(dx) === this.dir) {
        this.setState("notice"); this.vx = 0;
        SS.audio.play("growl");
      }
    } else if (this.state === "notice") {
      this.vx = 0;
      if (this.stateT > 0.38) {
        this.setState("pounce");
        this.vx = this.dir * 250; this.vy = -250;
      }
    } else if (this.state === "pounce") {
      if (this.onGround && this.stateT > 0.1) { this.setState("recover"); this.vx = 0; G.dust(this.cx(), this.y + this.h, 3, 0); }
    } else if (this.state === "recover") {
      this.vx = SS.approach(this.vx, 0, 600 * dt);
      if (this.stateT > 0.5) { this.setState("patrol"); this.cool = 1.4; }
    }
  };

  /* -------------------------------------------------------- espectro */
  Enemy.prototype.aiGhost = function (dt, G, dx, dy, dist, alive) {
    var room = G.room, tx, ty, tl;
    if (Math.random() < dt * 10) G.particles.spawn("wisp", this.cx() + SS.rand(-5, 5), this.y + this.h + 2, SS.rand(-8, 8), SS.rand(6, 16), 0.9, 2.2, "rgba(170,185,205,1)", {});
    switch (this.state) {
      case "drift":
        this.alpha = SS.approach(this.alpha, 0.85, dt);
        if (alive && dist < 260) { tx = dx; ty = dy - 26; } else { tx = this.homeX - this.x; ty = this.homeY - this.y + Math.sin(this.t * 1.2) * 18; }
        tl = Math.sqrt(tx * tx + ty * ty) || 1;
        var sp = alive && dist < 260 ? 46 : 30;
        if (tl < 20) sp *= tl / 20;
        this.vx = SS.approach(this.vx, tx / tl * sp, 120 * dt);
        this.vy = SS.approach(this.vy, ty / tl * sp + Math.sin(this.t * 2.4) * 18, 120 * dt);
        if (Math.abs(this.vx) > 4) this.dir = this.vx > 0 ? 1 : -1;
        if (alive && this.cool <= 0 && dist < 200 && this.kb <= 0) {
          this.setState("wind");
          this.dir = dx > 0 ? 1 : -1;
          SS.audio.play("shriek");
        }
        break;
      case "wind":
        this.vx *= 0.9; this.vy *= 0.9;
        this.dir = dx > 0 ? 1 : -1;
        if (this.stateT > 0.62) {
          tl = Math.sqrt(dx * dx + dy * dy) || 1;
          this.lx = dx / tl; this.ly = dy / tl;
          this.setState("lunge");
        }
        break;
      case "lunge":
        this.vx = this.lx * 330; this.vy = this.ly * 330;
        if (Math.random() < 0.6) G.particles.spawn("wisp", this.cx(), this.cy(), -this.vx * 0.1, -this.vy * 0.1, 0.5, 3.5, "rgba(190,205,225,1)", {});
        if (this.stateT > 0.5) this.setState("fade");
        break;
      case "fade":
        this.vx *= 0.92; this.vy *= 0.92;
        this.alpha = SS.approach(this.alpha, 0.22, dt * 2);
        if (this.stateT > 1.1) { this.setState("drift"); this.cool = 2 + Math.random() * 1.6; }
        break;
    }
    if (this.kb > 0) { this.vx *= 0.9; this.vy *= 0.9; }
    // atraviesa muros, pero no sale de la sala
    this.x = SS.clamp(this.x + this.vx * dt, 4, room.pw - this.w - 4);
    this.y = SS.clamp(this.y + this.vy * dt, 4, room.ph - this.h - 4);
    if (Math.random() < dt * 0.08) SS.audio.play("wail");
  };

  /* ------------------------------------------------------ espadachín */
  Enemy.prototype.aiSword = function (dt, G, dx, dy, alive) {
    var room = G.room, st = this.state, ax = Math.abs(dx);
    var near = alive && ax < 230 && Math.abs(dy) < 80;
    if (st === "idle") this.setState(st = "patrol");
    if (st === "patrol") {
      if (this.kb <= 0) {
        this.vx = SS.approach(this.vx, this.dir * 28, 300 * dt);
        var ahead = this.dir > 0 ? this.x + this.w + 2 : this.x - 2;
        if (this.onGround && !room.groundPx(ahead, this.y + this.h + 4)) this.dir *= -1;
      }
      if (near && (SS.sign(dx) === this.dir || ax < 80)) { this.dir = dx > 0 ? 1 : -1; this.setState("draw"); this.vx = 0; SS.audio.play("draw"); }
    } else if (st === "draw") {
      this.vx = 0;
      this.drawn = SS.clamp(this.stateT / 0.55, 0, 1);
      if (this.stateT > 0.6) { this.drawn = 1; this.setState("stalk"); }
    } else if (st === "stalk") {
      this.dir = dx > 0 ? 1 : -1;
      var want = ax > 46 ? this.dir * 72 : (ax < 26 ? -this.dir * 40 : 0);
      var aheadX = want > 0 ? this.x + this.w + 2 : this.x - 2;
      if (want !== 0 && this.onGround && !room.groundPx(aheadX, this.y + this.h + 4)) want = 0;
      if (this.kb <= 0) this.vx = SS.approach(this.vx, want, 500 * dt);
      if (!near) { this.lost += dt; if (this.lost > 3) { this.setState("sheathe"); this.lost = 0; } } else this.lost = 0;
      if (this.cool <= 0 && alive && this.onGround) {
        if (ax < 62 && Math.abs(dy) < 40) { this.setState("windup"); this.vx = 0; }
        else if (ax < 150 && ax > 70 && Math.abs(dy) < 60 && Math.random() < 0.02) { this.setState("leapWind"); this.vx = 0; }
      }
    } else if (st === "windup") {
      this.vx = 0;
      if (this.stateT < 0.12) this.dir = dx > 0 ? 1 : -1;
      if (this.stateT > 0.42) { this.setState("slash"); this.vx = this.dir * 150; SS.audio.play("swing"); this.swTrail.length = 0; }
    } else if (st === "slash") {
      this.vx = SS.approach(this.vx, 0, 900 * dt);
      if (this.stateT < 0.14) this.atkBox = { x: this.dir > 0 ? this.x + this.w - 4 : this.x - 30, y: this.y - 4, w: 34, h: 34 };
      if (this.stateT > 0.18) this.setState("recover");
    } else if (st === "leapWind") {
      this.vx = 0;
      if (this.stateT > 0.38) {
        this.setState("leap");
        this.dir = dx > 0 ? 1 : -1;
        this.vy = -430; this.vx = SS.clamp(dx * 1.7, -260, 260);
        this.onGround = false;
        SS.audio.play("jump");
        this.swTrail.length = 0;
      }
    } else if (st === "leap") {
      this.atkBox = { x: this.dir > 0 ? this.x + this.w - 6 : this.x - 22, y: this.y + 6, w: 28, h: 34 };
      if (this.onGround && this.stateT > 0.1) {
        this.setState("recover"); this.vx = 0;
        G.dust(this.cx(), this.y + this.h, 5, 0);
        SS.audio.play("land");
      }
    } else if (st === "recover") {
      this.vx = SS.approach(this.vx, 0, 700 * dt);
      if (this.stateT > 0.5) { this.setState("stalk"); this.cool = 0.5 + Math.random() * 0.7; }
    } else if (st === "sheathe") {
      this.vx = 0;
      this.drawn = 1 - SS.clamp(this.stateT / 0.5, 0, 1);
      if (this.stateT > 0.55) { this.drawn = 0; this.setState("patrol"); }
      if (near) { this.setState("stalk"); this.drawn = 1; }
    }
    this.animHusk(dt);
  };

  /* -------------------------------------------------------- escupidor */
  Enemy.prototype.aiSpitter = function (dt, G, dx, dy, dist, alive) {
    this.vx = 0;
    this.dir = dx > 0 ? 1 : -1;
    if (this.state === "idle" && this.stateT > 2.0 && dist < 330 && alive) this.setState("wind");
    if (this.state === "wind" && this.stateT > 0.5) {
      this.setState("idle");
      var tFlight = SS.clamp(Math.abs(dx) / 220, 0.6, 1.3);
      var pvx = dx / tFlight, pvy = (dy - 0.5 * 650 * tFlight * tFlight) / tFlight;
      pvy = SS.clamp(pvy, -520, 120);
      G.projectiles.push(new SS.Projectile(this.cx(), this.y + 6, pvx, pvy, G.room.zoneId === "bosque" ? "spore" : "ember"));
      SS.audio.play("shoot");
    }
  };

  /* --------------------------------------------------------- ahorcado */
  Enemy.prototype.aiHanged = function (dt, G, dx, dy, alive) {
    var room = G.room;
    if (this.state === "hang" || this.state === "twitch") {
      var r = this.rope;
      r.wind = Math.sin(this.t * 0.6) * 20;
      r.update(dt, null);
      var e = r.end();
      this.x = e.x - this.w / 2; this.y = e.y - 4;
      if (this.state === "hang" && alive && Math.abs(dx) < 50 && dy > -10 && dy < 140) {
        this.setState("twitch");
        SS.audio.play("growl");
      }
      if (this.state === "twitch") {
        r.impulse(e.x, e.y, 6, Math.sin(this.stateT * 60) * 40, 0);
        if (this.stateT > 0.4) {
          this.setState("fall");
          SS.audio.play("snap");
          this.vx = 0; this.vy = 60;
          this.rope.pinB = false;
          this.ropeCut = this.rope.pts.slice(0, Math.max(2, Math.floor(this.rope.pts.length * 0.6)));
        }
      }
      this.animHusk(dt);
      return;
    }
    if (this.ropeCut) {
      // el trozo de soga que queda colgando sigue meciéndose
      var cut = this.cutRope || (this.cutRope = new SS.Rope(this.ropeCut[0].x, this.ropeCut[0].y, this.ropeCut.length, this.rope.seg, { damp: 0.99 }));
      cut.update(dt, null);
    }
    if (this.state === "fall") {
      if (this.onGround) { this.setState("rise"); G.dust(this.cx(), this.y + this.h, 6, 0); SS.audio.play("thud"); }
    } else if (this.state === "rise") {
      this.vx = 0;
      if (this.stateT > 0.7) this.setState("walk");
    } else if (this.state === "walk") {
      if (alive) this.dir = dx > 0 ? 1 : -1;
      var aheadX = this.dir > 0 ? this.x + this.w + 2 : this.x - 2;
      var spd = Math.abs(dx) < 70 ? 62 : 38;
      if (this.kb <= 0) this.vx = (this.onGround && !room.groundPx(aheadX, this.y + this.h + 4)) ? 0 : this.dir * spd;
    }
    this.animHusk(dt);
  };

  /** Pose del cuerpo humanoide (espadachín y ahorcado), mezclada con suavidad. */
  Enemy.prototype.animHusk = function (dt) {
    var P = SS.basePose(), st = this.state, k, t = this.anim;
    P.aF = 0.25; P.eF = 0.2; P.aB = -0.15; P.eB = 0.3; P.sw = 0.35; P.lean = 0.18; P.head = 0.15;
    var moving = Math.abs(this.vx) > 8 && this.onGround;
    if (moving) {
      var ph = this.anim * (Math.abs(this.vx) > 50 ? 9 : 6), s = Math.sin(ph), c = Math.cos(ph);
      P.tF = s * 0.6; P.kF = -Math.max(0, -c) * 0.9 - 0.1; P.tB = -s * 0.6; P.kB = -Math.max(0, c) * 0.9 - 0.1;
      P.bob = -Math.abs(c) * 1.2; P.aB = s * 0.4;
    }
    if (this.type === "j") {
      var dr = this.drawn;
      if (st === "draw" || st === "sheathe") { P.aF = SS.lerp(-0.3, 1.2, dr); P.eF = SS.lerp(1.4, 0.2, dr); P.sw = SS.lerp(-2.6, 1.3, dr); P.lean = 0.1; }
      else if (dr > 0.5) { P.aF = 1.1; P.eF = 0.15; P.sw = 1.35; P.lean = 0.2; P.tF = moving ? P.tF : 0.45; P.kF = moving ? P.kF : -0.4; P.tB = moving ? P.tB : -0.4; P.crouch = 2; }
      if (st === "windup") { k = SS.smooth(this.stateT / 0.35); P.aF = SS.lerp(1.1, 3.0, k); P.eF = -0.4 * k; P.sw = SS.lerp(1.35, 3.6, k); P.lean = SS.lerp(0.2, -0.15, k); }
      else if (st === "slash") { k = SS.smooth(this.stateT / 0.12); P.aF = SS.lerp(3.0, 0.8, k); P.eF = 0.1; P.sw = SS.lerp(3.6, 0.4, k); P.lean = SS.lerp(-0.15, 0.4, k); P.tF = 0.7; P.kF = -0.5; P.tB = -0.6; }
      else if (st === "recover") { P.aF = 0.7; P.sw = 0.35; P.lean = 0.35; P.crouch = 3; P.tF = 0.6; P.kF = -0.7; P.tB = -0.5; }
      else if (st === "leapWind") { P.crouch = 7; P.tF = 1.1; P.kF = -1.8; P.tB = 0.6; P.kB = -1.4; P.aF = 2.6; P.sw = 3.3; P.lean = 0.3; }
      else if (st === "leap") { P.tF = 1.0; P.kF = -1.4; P.tB = 0.3; P.kB = -0.9; P.aF = SS.lerp(3.0, 0.7, SS.smooth(this.stateT / 0.35)); P.sw = SS.lerp(3.5, 0.3, SS.smooth(this.stateT / 0.35)); P.lean = 0.3; }
    } else {
      // ahorcado: colgando flácido o caminando encorvado con los brazos al frente
      if (st === "hang" || st === "twitch") {
        P.tF = 0.08; P.kF = 0.05; P.tB = -0.06; P.kB = 0.05; P.aF = 0.05; P.eF = 0.05; P.aB = -0.05; P.eB = 0.05; P.head = 0.7; P.lean = 0;
        if (st === "twitch") { P.aF = 0.4 + Math.sin(t * 50) * 0.4; P.tF = 0.3 + Math.sin(t * 40) * 0.3; P.head = 0.5 + Math.sin(t * 45) * 0.2; }
      } else if (st === "fall") { P.aF = 2.4; P.aB = 2.2; P.tF = 0.6; P.kF = -0.4; P.head = 0.4; }
      else if (st === "rise") { k = SS.smooth(this.stateT / 0.7); P.crouch = 9 * (1 - k); P.tF = SS.lerp(1.4, 0.2, k); P.kF = SS.lerp(-2.2, -0.2, k); P.tB = SS.lerp(0.4, -0.2, k); P.kB = SS.lerp(-1.8, -0.1, k); P.head = 0.6; P.lean = 0.5 * (1 - k) + 0.3; }
      else { P.aF = 1.45 + Math.sin(t * 3) * 0.1; P.eF = 0.1; P.aB = 1.35 + Math.sin(t * 3 + 1) * 0.1; P.eB = 0.15; P.lean = 0.32; P.head = 0.45 + Math.sin(t * 2) * 0.1; }
    }
    if (this.kb > 0) { P.lean = -0.4; P.head = -0.3; }
    SS.blendPose(this.P, P, SS.damp(st === "slash" || st === "leap" ? 40 : 16, dt));
    this.J = SS.solveJoints(this.P, this.cx(), this.y + this.h, this.dir, 1);
    if (this.type === "j" && (st === "slash" || st === "leap")) {
      var sw = this.P.sw, d = this.dir, J = this.J;
      this.swTrail.push({ tx: J.hF.x + Math.sin(sw) * d * 22, ty: J.hF.y + Math.cos(sw) * 22, mx: J.hF.x + Math.sin(sw) * d * 8, my: J.hF.y + Math.cos(sw) * 8, a: 1 });
      if (this.swTrail.length > 8) this.swTrail.shift();
    }
    if (this.swTrail) for (var i = this.swTrail.length - 1; i >= 0; i--) { this.swTrail[i].a -= dt * 7; if (this.swTrail[i].a <= 0) this.swTrail.splice(i, 1); }
  };

  Enemy.prototype.hit = function (G, dmg, fromX, dir) {
    this.hp -= dmg;
    this.flash = 0.12;
    var push = this.cx() < fromX ? -1 : 1;
    if (this.type === "w" && (this.state === "hang" || this.state === "twitch")) {
      this.rope.impulse(this.rope.end().x, this.rope.end().y, 10, push * 260, -60);
    } else {
      if (dir === "up") this.vy = Math.min(this.vy, -200);
      this.vx = push * (this.type === "f" ? 230 : this.type === "j" ? 140 : 170);
      if (this.type === "f" && dir === "down") this.vy = 160;
      this.kb = 0.18;
      if (this.state === "notice" || (this.state === "windup" && Math.random() < 0.3)) this.setState(this.type === "c" ? "patrol" : "stalk");
      if (this.type === "j" && this.state === "patrol") { this.setState("draw"); this.dir = -push; }
      if (this.type === "f" && this.state === "wind") this.setState("fade");
    }
    G.particles.burst("spark", this.cx(), this.cy(), 7, 240, 0.25, 1.4, "#ffffff", {});
    G.particles.burst("ink", this.cx(), this.cy(), 6, 140, 0.5, 3, this.type === "f" ? "rgba(200,210,230,0.8)" : "#120d12", { grav: this.type === "f" ? 0 : 400 });
    if (this.hp <= 0) this.kill(G, push);
  };

  Enemy.prototype.kill = function (G, push) {
    this.dead = true;
    SS.audio.play("kill");
    if (this.type === "f") {
      G.particles.burst("wisp", this.cx(), this.cy(), 18, 120, 1.2, 7, "rgba(210,220,240,1)", {});
      SS.audio.play("shriek");
    } else {
      G.particles.burst("ink", this.cx(), this.cy(), 12, 200, 0.8, 4, "#0d090c", { grav: 500, collide: true });
    }
    G.particles.burst("glow", this.cx(), this.cy(), 6, 90, 0.6, 5, "255,170,90", {});
    G.particles.spawn("ring", this.cx(), this.cy(), 0, 0, 0.35, 26, "rgba(255,230,200,0.8)", {});
    G.spawnEssence(this.cx(), this.cy(), SS.randi(this.def.ess[0], this.def.ess[1]));
    if ((this.type === "j" || this.type === "w") && this.J) {
      var rd = new SS.Ragdoll(this.J, (push || 1) * 160 + this.vx * 0.3, -200, (push || 1) * 80);
      G.corpses.push({ rd: rd, kind: this.type, dir: this.dir, t: 0, drawn: this.drawn });
    } else if (this.type === "c") {
      G.corpses.push({ kind: "c", x: this.cx(), y: this.y + this.h, vx: (push || 1) * 120, vy: -180, rot: 0, dir: this.dir, t: 0 });
    }
  };

  /* ============================================================ dibujo */
  Enemy.prototype.draw = function (ctx, time, G) {
    var col = this.flash > 0 ? "#ffffff" : "#0b080a";
    var cx = this.cx(), by = this.y + this.h, d = this.dir, a = this.anim, i;
    ctx.strokeStyle = col; ctx.fillStyle = col;
    ctx.lineCap = "round"; ctx.lineJoin = "round";
    switch (this.type) {
      case "c": drawCrawler(ctx, this, cx, by, d, a, col); break;
      case "f": drawGhost(ctx, this, time); break;
      case "j":
        if (this.swTrail && this.swTrail.length > 1) drawTrail(ctx, this.swTrail, "rgba(255,200,160,");
        SS.drawHusk(ctx, this.J, { dir: d, flash: this.flash > 0, sword: this.drawn, sw: this.P.sw, eyes: this.state === "windup" || this.state === "leapWind" ? 1 : 0.6, rag: "#3a3536" });
        if (this.state === "windup" && this.stateT > 0.2) {
          var J = this.J, sw = this.P.sw;
          SS.drawGlow(ctx, J.hF.x + Math.sin(sw) * d * 20, J.hF.y + Math.cos(sw) * 20, 12, "255,230,200", 0.7);
        }
        break;
      case "s": drawSpitter(ctx, this, cx, by, d, col, G); break;
      case "w":
        if (this.state === "hang" || this.state === "twitch") {
          this.rope.draw(ctx, "#4a3a2a", 1.6, false);
        } else if (this.cutRope) this.cutRope.draw(ctx, "#4a3a2a", 1.6, false);
        if (this.J) SS.drawHusk(ctx, this.J, { dir: d, flash: this.flash > 0, sword: 0, eyes: this.state === "hang" ? 0.15 : 0.8, rag: "#2f2a26", noose: this.state === "hang" || this.state === "twitch" });
        break;
    }
    void i;
  };

  function drawTrail(ctx, tr, rgba) {
    ctx.globalCompositeOperation = "lighter";
    for (var i = 1; i < tr.length; i++) {
      var a = tr[i - 1], b = tr[i], al = Math.min(a.a, b.a) * (i / tr.length) * 0.45;
      ctx.fillStyle = rgba + al.toFixed(3) + ")";
      ctx.beginPath(); ctx.moveTo(a.tx, a.ty); ctx.lineTo(b.tx, b.ty); ctx.lineTo(b.mx, b.my); ctx.lineTo(a.mx, a.my); ctx.closePath(); ctx.fill();
    }
    ctx.globalCompositeOperation = "source-over";
  }
  SS.drawTrail = drawTrail;

  function drawCrawler(ctx, e, cx, by, d, a, col) {
    var rear = e.state === "notice" ? Math.min(1, e.stateT / 0.3) : 0;
    var leap = e.state === "pounce";
    var bodyY = by - 8 - rear * 3, i;
    // patas
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    for (i = 0; i < 4; i++) {
      var lx = cx - 9 + i * 6, ph = Math.sin(a * 12 + i * 1.7) * (Math.abs(e.vx) > 5 ? 3 : 0.5);
      if (leap) ph = (i < 2 ? -3 : 3);
      ctx.moveTo(lx, bodyY + 2); ctx.lineTo(lx + ph - 2 * d, by - 3); ctx.lineTo(lx + ph, by);
    }
    ctx.stroke();
    // cuerpo con costillas y cerdas
    ctx.beginPath();
    ctx.ellipse(cx - d * 2, bodyY, 11, 5.5, -d * rear * 0.3, 0, 6.283);
    ctx.fill();
    ctx.strokeStyle = e.flash > 0 ? "#fff" : "#3a2f30";
    ctx.lineWidth = 0.7;
    ctx.beginPath();
    for (i = 0; i < 4; i++) { var rx = cx - d * 6 + d * i * 3; ctx.moveTo(rx, bodyY - 3); ctx.lineTo(rx + d, bodyY + 3); }
    ctx.stroke();
    ctx.strokeStyle = col; ctx.lineWidth = 1.2;
    ctx.beginPath();
    for (i = 0; i < 6; i++) { var sx = cx - d * 10 + d * i * 3.2; ctx.moveTo(sx, bodyY - 4.5); ctx.lineTo(sx - d * 2, bodyY - 8 - (i % 2) * 2); }
    // cola
    ctx.moveTo(cx - d * 12, bodyY);
    ctx.quadraticCurveTo(cx - d * 18, bodyY - 4 + Math.sin(a * 5) * 3, cx - d * 23, bodyY + 2 + Math.sin(a * 5 + 1) * 3);
    ctx.stroke();
    // cráneo con mandíbula
    var hx = cx + d * 11, hy = bodyY - 2 - rear * 5;
    ctx.fillStyle = e.flash > 0 ? "#fff" : "#2a2224";
    ctx.beginPath();
    ctx.moveTo(hx - d * 3, hy - 4); ctx.lineTo(hx + d * 7, hy - 1); ctx.lineTo(hx + d * 6, hy + 1); ctx.lineTo(hx - d * 3, hy + 3);
    ctx.closePath(); ctx.fill();
    var jaw = leap || rear > 0.5 ? 3 : 0.8;
    ctx.beginPath(); ctx.moveTo(hx - d * 2, hy + 2); ctx.lineTo(hx + d * 6, hy + 1 + jaw); ctx.lineTo(hx - d * 1, hy + 4); ctx.fill();
    ctx.fillStyle = "#d9cdb8";
    ctx.fillRect(hx + d * 4 - 0.5, hy + 1, 1, 1.5); ctx.fillRect(hx + d * 2 - 0.5, hy + 1, 1, 1.5);
    SS.drawGlow(ctx, hx + d * 1.5, hy - 1.5, 7, "255,130,60", 0.5 + rear * 0.4);
    ctx.fillStyle = "#ffb070";
    ctx.fillRect(hx + d * 1.5 - 1, hy - 2.5, 2, 1.6);
  }

  /** Espectro: velo rasgado y alargado, capucha, cara de calavera que grita
      y brazos huesudos de dedos largos. Al chillar los ojos se encienden. */
  function drawGhost(ctx, e, time) {
    var cx = e.cx(), top = e.y, d = e.dir, a = e.alpha * (e.flash > 0 ? 1 : 0.95);
    var wind = e.state === "wind" ? Math.min(1, e.stateT / 0.5) : 0;
    var lunge = e.state === "lunge";
    var shake = wind > 0 ? Math.sin(time * 70) * 1.6 * wind : 0;
    var stretch = lunge ? 1.22 : 1 + wind * 0.12;
    var i;
    ctx.save();
    ctx.translate(cx + shake, top + 10);
    if (lunge) ctx.rotate(Math.atan2(e.vy, Math.abs(e.vx) + 1) * 0.45 * d);
    ctx.scale(d / Math.sqrt(stretch), stretch);
    SS.drawGlow(ctx, 0, 2, 34, wind > 0.4 || lunge ? "255,80,70" : "150,180,220", 0.16 * a);
    // velo: se estrecha hacia abajo en jirones largos que ondulan
    var veil = ctx.createLinearGradient(0, -14, 0, 30);
    veil.addColorStop(0, e.flash > 0 ? "rgba(255,255,255,1)" : "rgba(196,206,218,0.9)");
    veil.addColorStop(0.55, "rgba(120,132,150,0.55)");
    veil.addColorStop(1, "rgba(60,66,80,0)");
    ctx.globalAlpha = a;
    ctx.fillStyle = veil;
    ctx.beginPath();
    ctx.moveTo(-8, -6);
    ctx.quadraticCurveTo(-7, -17, 1, -17);
    ctx.quadraticCurveTo(9, -16, 9, -4);
    ctx.quadraticCurveTo(11, 8, 7, 14);
    for (i = 0; i <= 6; i++) {
      var tx = 7 - i * 2.6, ty = 22 + Math.sin(time * 5 + i * 1.3) * 4 + (i % 2 ? 6 : 0) + (i === 3 ? 6 : 0);
      ctx.lineTo(tx + Math.sin(time * 3 + i) * 2.5 - 3, ty);
      if (i < 6) ctx.lineTo(tx - 1.3, 12 + Math.sin(time * 4 + i) * 1.5);
    }
    ctx.quadraticCurveTo(-11, 6, -8, -6);
    ctx.closePath();
    ctx.fill();
    // hueco oscuro de la capucha
    ctx.fillStyle = "rgba(10,12,18,0.85)";
    ctx.beginPath(); ctx.ellipse(2, -8, 5.2, 6.8, 0.12, 0, 6.283); ctx.fill();
    // calavera dentro de la capucha
    var jaw = 1 + wind * 4 + (lunge ? 4 : 0) + Math.max(0, Math.sin(time * 3)) * 0.6;
    ctx.fillStyle = e.flash > 0 ? "#fff" : "#d9dde2";
    ctx.beginPath(); ctx.ellipse(3, -10, 3.4, 3.8, 0, 0, 6.283); ctx.fill();
    ctx.beginPath(); ctx.moveTo(0.8, -7.5); ctx.lineTo(5.6, -7.5); ctx.lineTo(4.8, -5.5 + jaw); ctx.lineTo(1.4, -5.5 + jaw); ctx.closePath(); ctx.fill();
    ctx.fillStyle = "#05060a";
    ctx.beginPath(); ctx.ellipse(1.6, -10.4, 1.1, 1.6 + wind * 0.6, 0.2, 0, 6.283); ctx.ellipse(4.6, -10.4, 1.1, 1.6 + wind * 0.6, -0.2, 0, 6.283); ctx.fill();
    ctx.beginPath(); ctx.ellipse(3.2, -6 + jaw * 0.5, 1.2, 0.6 + jaw * 0.45, 0, 0, 6.283); ctx.fill();
    var eyeCol = wind > 0.3 || lunge ? "255,60,40" : "170,210,255";
    SS.drawGlow(ctx, 1.6, -10.4, 4.5, eyeCol, (wind > 0.3 || lunge ? 0.95 : 0.45) * a);
    SS.drawGlow(ctx, 4.6, -10.4, 4.5, eyeCol, (wind > 0.3 || lunge ? 0.95 : 0.45) * a);
    // brazos huesudos con dedos largos
    ctx.strokeStyle = e.flash > 0 ? "#fff" : "rgba(220,226,234,0.9)";
    ctx.lineWidth = 0.9;
    ctx.lineCap = "round";
    var reach = lunge ? 16 : 9 + wind * 7;
    ctx.beginPath();
    for (var sgn = -1; sgn <= 1; sgn += 2) {
      var sx = 5, sy = -2 + sgn * 2.5;
      var ex = reach + Math.sin(time * 2 + sgn) * 1.5, ey = 1 + sgn * 4 + Math.sin(time * 3 + sgn) * 2;
      var mx2 = (sx + ex) / 2, my2 = (sy + ey) / 2 + 2;
      ctx.moveTo(sx, sy); ctx.lineTo(mx2, my2); ctx.lineTo(ex, ey);
      for (var fz = 0; fz < 3; fz++) {
        ctx.moveTo(ex, ey);
        ctx.quadraticCurveTo(ex + 3, ey - 1.5 + fz * 1.6, ex + 5.5, ey - 0.5 + fz * 2.2 + Math.sin(time * 6 + fz) * 0.5);
      }
    }
    ctx.stroke();
    ctx.restore();
    ctx.globalAlpha = 1;
  }

  function drawSpitter(ctx, e, cx, by, d, col, G) {
    var swell = e.state === "wind" ? Math.min(1, e.stateT / 0.5) : 0;
    var forest = G && G.room.zoneId === "bosque";
    var glow = forest ? "170,255,140" : "255,140,60";
    // capa acampanada y raída
    ctx.fillStyle = e.flash > 0 ? "#fff" : "#1a1416";
    ctx.beginPath();
    ctx.moveTo(cx - 11, by);
    ctx.quadraticCurveTo(cx - 12, by - 14, cx - 3, by - 20 - swell * 2);
    ctx.quadraticCurveTo(cx + 6, by - 24 - swell * 3, cx + 11, by - 12);
    ctx.lineTo(cx + 11, by);
    for (var i = 0; i < 5; i++) ctx.lineTo(cx + 11 - i * 5.5 - 2.7, by - 3 - (i % 2) * 2);
    ctx.closePath();
    ctx.fill();
    // cabeza encorvada con fauces
    var hx = cx + d * 6, hy = by - 17 - swell * 2;
    ctx.fillStyle = e.flash > 0 ? "#fff" : "#0d0a0b";
    ctx.beginPath(); ctx.arc(hx, hy, 6 + swell * 2, 0, 6.283); ctx.fill();
    ctx.fillStyle = "rgba(" + glow + "," + (0.4 + swell * 0.6).toFixed(2) + ")";
    ctx.beginPath(); ctx.ellipse(hx + d * 3.5, hy + 1.5, 2 + swell * 1.5, 1.2 + swell * 2.4, 0, 0, 6.283); ctx.fill();
    SS.drawGlow(ctx, hx + d * 3.5, hy + 1.5, 9 + swell * 10, glow, 0.35 + swell * 0.5);
    ctx.fillStyle = forest ? "#d4ffb0" : "#ffcf9a";
    ctx.fillRect(hx + d * 1 - 1, hy - 3, 2, 1.6);
  }

  /** Cuerpo humanoide demacrado (espadachín y ahorcado). */
  SS.drawHusk = function (ctx, J, o) {
    if (!J) return;
    var dir = o.dir, fl = o.flash, body = fl ? "#fff" : "#1b1719", limb = fl ? "#fff" : "#141113";
    var segc = function (a, b, w, c) { ctx.strokeStyle = c; ctx.lineWidth = w; ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke(); };
    ctx.lineCap = "round"; ctx.lineJoin = "round";
    segc(J.sh, J.eB, 2.2, limb); segc(J.eB, J.hB, 2, limb);
    segc(J.hip, J.kB, 2.6, limb); segc(J.kB, J.fB, 2.3, limb);
    // vaina en la cadera
    if (o.sword !== undefined && o.sword < 0.95 && !o.noose) {
      var tdx = J.sh.x - J.hip.x, tdy = J.sh.y - J.hip.y, tl = Math.sqrt(tdx * tdx + tdy * tdy) || 1;
      segc({ x: J.hip.x - dir * 1, y: J.hip.y }, { x: J.hip.x - dir * 9 - tdx / tl * 3, y: J.hip.y + 9 }, 1.8, fl ? "#fff" : "#2b211c");
    }
    // torso flaco con costillas
    segc(J.hip, J.sh, 4.2, body);
    if (!fl) {
      ctx.strokeStyle = "rgba(120,110,105,0.5)"; ctx.lineWidth = 0.6;
      ctx.beginPath();
      for (var r = 0; r < 3; r++) {
        var t = 0.45 + r * 0.15, px = J.hip.x + (J.sh.x - J.hip.x) * t, py = J.hip.y + (J.sh.y - J.hip.y) * t;
        ctx.moveTo(px - 2, py); ctx.lineTo(px + 2, py + 0.6);
      }
      ctx.stroke();
    }
    // harapos
    ctx.fillStyle = fl ? "#fff" : o.rag;
    ctx.beginPath();
    ctx.moveTo(J.hip.x - 4, J.hip.y - 2); ctx.lineTo(J.hip.x + 4, J.hip.y - 2);
    ctx.lineTo(J.kF.x + 2, J.kF.y - 1); ctx.lineTo(J.hip.x, J.hip.y + 6); ctx.lineTo(J.kB.x - 2, J.kB.y - 2);
    ctx.closePath(); ctx.fill();
    segc(J.hip, J.kF, 2.6, limb); segc(J.kF, J.fF, 2.3, limb);
    // cabeza hueca (o colgando de la soga)
    ctx.fillStyle = body;
    ctx.beginPath(); ctx.arc(J.head.x, J.head.y, 4.6, 0, 6.283); ctx.fill();
    ctx.fillStyle = fl ? "#fff" : "#26201f";
    ctx.beginPath(); ctx.arc(J.head.x + dir * 1, J.head.y + 2.6, 2.8, 0, Math.PI); ctx.fill();
    if (o.noose) {
      ctx.strokeStyle = "#5a4630"; ctx.lineWidth = 1.4;
      ctx.beginPath(); ctx.ellipse(J.neck.x, J.neck.y + 1, 2.6, 1.4, 0, 0, 6.283); ctx.stroke();
    }
    if (o.eyes > 0) {
      SS.drawGlow(ctx, J.head.x + dir * 2, J.head.y - 0.6, 6, "255,190,140", 0.5 * o.eyes);
      ctx.fillStyle = "rgba(255,210,170," + o.eyes.toFixed(2) + ")";
      ctx.fillRect(J.head.x + dir * 1 - 0.7, J.head.y - 1.3, 1.4, 1.3);
      ctx.fillRect(J.head.x + dir * 3.2 - 0.7, J.head.y - 1.3, 1.4, 1.3);
    }
    // brazo delantero con la espada
    segc(J.sh, J.eF, 2.3, limb); segc(J.eF, J.hF, 2.1, limb);
    if (o.sword > 0.02 && o.sw !== undefined) {
      var L = 22 * Math.min(1, o.sword * 1.2), ux = Math.sin(o.sw) * dir, uy = Math.cos(o.sw);
      segc({ x: J.hF.x - ux * 3, y: J.hF.y - uy * 3 }, J.hF, 2.2, fl ? "#fff" : "#2a1f1a");
      segc(J.hF, { x: J.hF.x + ux * L, y: J.hF.y + uy * L }, 2, fl ? "#fff" : "#8a8580");
      segc({ x: J.hF.x + ux * 2, y: J.hF.y + uy * 2 }, { x: J.hF.x + ux * L * 0.9, y: J.hF.y + uy * L * 0.9 }, 0.6, fl ? "#fff" : "#c9c2b8");
      var nx = Math.cos(o.sw) * dir, ny = -Math.sin(o.sw);
      segc({ x: J.hF.x + ux * 1.5 - nx * 3, y: J.hF.y + uy * 1.5 - ny * 3 }, { x: J.hF.x + ux * 1.5 + nx * 3, y: J.hF.y + uy * 1.5 + ny * 3 }, 1.5, fl ? "#fff" : "#1a1412");
    }
  };

  /* ----------------------------------------------- cadáveres que caen */
  SS.updateCorpses = function (dt, G) {
    for (var i = G.corpses.length - 1; i >= 0; i--) {
      var c = G.corpses[i];
      c.t += dt;
      if (c.rd) c.rd.update(dt, G.room);
      else {
        c.vy += 1300 * dt; c.x += c.vx * dt; c.y += c.vy * dt; c.rot += c.vx * dt * 0.05;
        if (G.room.groundPx(c.x, c.y)) { c.y = Math.floor(c.y / T) * T; c.vy *= -0.3; c.vx *= 0.6; }
      }
      if (c.t > 3.2) G.corpses.splice(i, 1);
    }
  };
  SS.drawCorpses = function (ctx, G) {
    for (var i = 0; i < G.corpses.length; i++) {
      var c = G.corpses[i], a = SS.clamp(1 - (c.t - 2.2) / 1.0, 0, 1);
      ctx.globalAlpha = a;
      if (c.rd) {
        var J = c.rd.p;
        SS.drawHusk(ctx, J, { dir: c.dir, flash: false, sword: c.kind === "j" ? 1 : 0, sw: J.hF && J.eF ? Math.atan2((J.hF.x - J.eF.x) * c.dir, J.hF.y - J.eF.y) : 0, eyes: 0, rag: "#2f2a29" });
      } else {
        ctx.save(); ctx.translate(c.x, c.y - 6); ctx.rotate(c.rot);
        ctx.fillStyle = "#0b080a";
        ctx.beginPath(); ctx.ellipse(0, 0, 11, 5, 0, 0, 6.283); ctx.fill();
        ctx.restore();
      }
    }
    ctx.globalAlpha = 1;
  };

  /* --------------------------------------------------------- proyectil */
  var Projectile = (SS.Projectile = function (x, y, vx, vy, kind) {
    this.x = x; this.y = y; this.vx = vx; this.vy = vy; this.r = 5; this.dead = false; this.life = 4; this.t = 0;
    this.kind = kind || "ember";
    this.col = this.kind === "spore" ? "160,255,130" : "255,140,60";
    this.grav = 650;
  });
  Projectile.prototype.update = function (dt, G) {
    this.t += dt; this.life -= dt;
    this.vy += this.grav * dt;
    this.x += this.vx * dt; this.y += this.vy * dt;
    if (this.life <= 0 || G.room.solidPx(this.x, this.y)) {
      this.dead = true;
      G.particles.burst("glow", this.x, this.y, 6, 80, 0.4, 4, this.col, {});
      if (this.kind !== "spore") G.particles.burst("ember", this.x, this.y, 4, 70, 0.8, 2, this.col, { grav: 200 });
      return;
    }
    if (Math.random() < 0.5) G.particles.spawn(this.kind === "spore" ? "glow" : "ember", this.x, this.y, SS.rand(-10, 10), SS.rand(-20, 0), 0.4, this.kind === "spore" ? 4 : 2, this.col, {});
    var p = G.player;
    if (!p.invulnerable() && SS.overlap(this.x - 4, this.y - 4, 8, 8, p.x, p.y, p.w, p.h)) {
      p.hurt(G, 1, this.x);
      this.dead = true;
    }
  };
  Projectile.prototype.draw = function (ctx) {
    SS.drawGlow(ctx, this.x, this.y, 12, this.col, 0.7);
    ctx.fillStyle = this.kind === "spore" ? "#1a2a12" : "#3a1408";
    ctx.beginPath(); ctx.arc(this.x, this.y, 4, 0, 6.283); ctx.fill();
    ctx.fillStyle = this.kind === "spore" ? "#d8ffb8" : "#ffd2a0";
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

  /* ------------------------------------------------- cruz (al morir)
     El caballero deja una cruz de madera con un jirón rojo donde cayó.
     Guarda su esencia: tócala para recuperarla. */
  var Cruz = (SS.Cruz = function (x, groundY, val) {
    this.x = x; this.y = groundY; this.val = val; this.t = 0; this.dead = false;
    this.cloth = new SS.Rope(x + 7, groundY - 25, 5, 3.4, { grav: 500, damp: 0.93 });
  });
  Cruz.prototype.update = function (dt, G) {
    this.t += dt;
    this.cloth.pin(0, this.x + 6, this.y - 25);
    this.cloth.wind = 260 + Math.sin(this.t * 2.3) * 220 + Math.sin(this.t * 5.1) * 90;
    this.cloth.update(dt, null);
    var p = G.player;
    if (Math.random() < dt * 5) G.particles.spawn("glow", this.x + SS.rand(-10, 10), this.y - SS.rand(4, 30), 0, SS.rand(-18, -6), 1.2, 3, "190,160,255", {});
    if ((p.state === "normal" || p.state === "dodge" || p.state === "swing") && this.t > 0.5 && SS.overlap(this.x - 12, this.y - 34, 24, 34, p.x, p.y, p.w, p.h)) {
      this.dead = true;
      G.recoverCross(this);
    }
  };
  Cruz.prototype.draw = function (ctx, time) {
    var x = this.x, y = this.y;
    SS.drawGlow(ctx, x, y - 16, 34, "150,110,230", 0.22 + Math.sin(time * 2) * 0.05);
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(-0.06);
    ctx.fillStyle = "#2a1c14";
    ctx.strokeStyle = "#0b0706"; ctx.lineWidth = 0.8;
    ctx.beginPath(); ctx.rect(-2, -34, 4, 36); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.rect(-10, -26, 20, 4); ctx.fill(); ctx.stroke();
    ctx.fillStyle = "rgba(255,230,200,0.12)"; ctx.fillRect(-2, -34, 1.2, 36);
    ctx.restore();
    // jirón rojo de la capucha atado a la cruz
    var pts = this.cloth.pts;
    ctx.fillStyle = "#9a1e25";
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y - 1.5);
    for (var i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y - 1.5 + i * 0.2);
    for (i = pts.length - 1; i >= 0; i--) ctx.lineTo(pts[i].x + (i % 2 ? 0.8 : -0.5), pts[i].y + 2 - i * 0.2);
    ctx.closePath();
    ctx.fill();
    // vela
    ctx.fillStyle = "#cfc2a6"; ctx.fillRect(x + 6, y - 5, 2, 5);
    var fl = Math.sin(time * 12) * 0.5;
    ctx.fillStyle = "#ffd28a"; ctx.beginPath(); ctx.ellipse(x + 7 + fl * 0.4, y - 7, 0.9, 1.8, 0, 0, 6.283); ctx.fill();
    SS.drawGlow(ctx, x + 7, y - 7, 12, "255,170,90", 0.45);
  };
})();
