/* =====================================================================
   El guerrero stickman: movimiento, salto variable, esquiva/dash,
   ataques direccionales, golpe cargado, daño, muerte y animación
   procedural (esqueleto con ángulos + bufanda con física simple).
   ===================================================================== */
(function () {
  "use strict";
  var SS = window.SS, T = SS.T;

  var RUN = 168, GRAV = 1550, MAXFALL = 620, JUMP = 560, DJUMP = 500;
  var COYOTE = 0.09, BUFFER = 0.12;
  var DODGE_T = 0.22, DODGE_V = 340, DASH_T = 0.2, DASH_V = 490, DODGE_CD = 0.5;
  var ATK_CD = 0.3;
  var CHARGE_NEED = 0.55;
  SS.PLAYER_CONST = { RUN: RUN, GRAV: GRAV, JUMP: JUMP, DASH_V: DASH_V, DASH_T: DASH_T };

  var COL = "#06060a";

  var Player = (SS.Player = function (x, y) {
    this.w = 14; this.h = 34;
    this.x = x; this.y = y; this.vx = 0; this.vy = 0; this.dir = 1;
    this.onGround = false; this.coyote = 0; this.jumpBuf = 0; this.jumping = false;
    this.airJumps = 0; this.airDash = true;
    this.state = "normal"; this.stateT = 0;
    this.atk = null; this.atkCd = 0; this.attackHold = 0;
    this.charge = 0; this.charging = false; this.chargeReady = false;
    this.dodgeCd = 0; this.dashing = false; this.dodgeFromGround = false;
    this.iframes = 0; this.stun = 0; this.flash = 0;
    this.hp = 5; this.maxHp = 5;
    this.runPhase = 0; this.anim = 0; this.landSquash = 0;
    this.trail = []; this.trailT = 0;
    this.safe = { x: x, y: y }; this.safeT = 0;
    this.dropping = false; this.dropT = 0;
    this.deathT = 0;
    this.scarf = [];
    for (var i = 0; i < 7; i++) this.scarf.push({ x: x, y: y, px: x, py: y });
  });

  Player.prototype.cx = function () { return this.x + this.w / 2; };
  Player.prototype.cy = function () { return this.y + this.h / 2; };
  Player.prototype.invulnerable = function () { return this.iframes > 0 || this.state === "dodge" || this.state === "dead"; };

  Player.prototype.placeAt = function (x, y) {
    this.x = x; this.y = y; this.safe.x = x; this.safe.y = y;
    for (var i = 0; i < this.scarf.length; i++) {
      var s = this.scarf[i];
      s.x = s.px = x + this.w / 2; s.y = s.py = y + 8;
    }
    this.trail.length = 0;
  };

  Player.prototype.update = function (dt, G) {
    var I = SS.input, room = G.room, ab = G.save.abilities;
    this.anim += dt;
    this.stateT += dt;
    if (this.atkCd > 0) this.atkCd -= dt;
    if (this.dodgeCd > 0) this.dodgeCd -= dt;
    if (this.iframes > 0) this.iframes -= dt;
    if (this.stun > 0) this.stun -= dt;
    if (this.flash > 0) this.flash -= dt;
    if (this.landSquash > 0) this.landSquash = Math.max(0, this.landSquash - dt * 5);
    if (this.dropT > 0) { this.dropT -= dt; if (this.dropT <= 0) this.dropping = false; }

    if (this.state === "dead") {
      this.deathT += dt;
      this.vx *= 0.92;
      this.vy = Math.min(this.vy + GRAV * dt, MAXFALL);
      this.physics(dt, room, null);
      this.updateScarf(dt);
      return;
    }
    if (this.state === "sit") {
      this.vx = 0; this.vy = 0;
      // levantarse con cualquier acción de movimiento
      if (this.stateT > 0.25 && (I.down.left || I.down.right || I.pressed.jump || I.pressed.attack || I.pressed.dodge || I.pressed.down)) {
        this.setState("normal");
        this.y -= 1;
        if (I.down.left) this.dir = -1; else if (I.down.right) this.dir = 1;
      }
      this.updateScarf(dt);
      return;
    }
    if (this.state === "hazard" || this.state === "frozen") {
      this.vx = 0;
      this.updateScarf(dt);
      return;
    }
    if (this.state === "wake") {
      this.vx = 0;
      this.vy = Math.min(this.vy + GRAV * dt, MAXFALL);
      this.physics(dt, room, null);
      if (this.stateT > 1.7) this.setState("normal");
      this.updateScarf(dt);
      return;
    }

    var mx = (I.down.right ? 1 : 0) - (I.down.left ? 1 : 0);

    // --- esquiva / dash
    if (I.pressed.dodge && this.dodgeCd <= 0 && this.state === "normal" && this.stun <= 0) {
      if (this.onGround || (ab.dash && this.airDash)) this.startDodge(G, mx);
      else if (!ab.dash && !this.onGround) G.hint("dash", "En el aire necesitas el Dash. Dicen que duerme en la Hondonada del bosque.");
    }

    if (this.state === "dodge") {
      var dur = this.dashing ? DASH_T : DODGE_T;
      this.vx = this.dir * (this.dashing ? DASH_V : DODGE_V);
      if (this.dashing && !this.dodgeFromGround) this.vy = 0;
      else this.vy = Math.min(this.vy + GRAV * dt, MAXFALL);
      this.trailT -= dt;
      if (this.trailT <= 0) {
        this.trailT = 0.028;
        this.trail.push({ x: this.x, y: this.y, dir: this.dir, a: 0.55, pose: this.pose() });
      }
      if (this.stateT >= dur) { this.setState("normal"); this.vx = this.dir * RUN * 0.85; }
    } else if (this.state === "cslash") {
      this.vx = SS.approach(this.vx, 0, 900 * dt);
      this.vy = Math.min(this.vy + GRAV * 0.6 * dt, MAXFALL);
      if (this.stateT > 0.36) this.setState("normal");
    } else {
      // --- movimiento horizontal
      if (this.stun > 0) {
        this.vx = SS.approach(this.vx, 0, 520 * dt);
      } else {
        var spd = RUN * (this.charging ? 0.45 : 1);
        var acc = this.onGround ? (mx === 0 ? 2600 : 2200) : 1500;
        this.vx = SS.approach(this.vx, mx * spd, acc * dt);
        if (mx !== 0 && !(this.atk && this.atk.t < 0.1)) this.dir = mx;
      }
      // --- salto
      if (I.pressed.jump) this.jumpBuf = BUFFER;
      else if (this.jumpBuf > 0) this.jumpBuf -= dt;
      if (this.onGround) { this.coyote = COYOTE; this.airJumps = ab.doublejump ? 1 : 0; this.airDash = true; }
      else if (this.coyote > 0) this.coyote -= dt;
      if (this.jumpBuf > 0 && this.stun <= 0) {
        if (I.down.down && this.onGround && room.onOneway(this)) {
          this.dropping = true; this.dropT = 0.25; this.jumpBuf = 0; this.onGround = false; this.y += 2;
        } else if (this.coyote > 0) {
          this.vy = -JUMP; this.coyote = 0; this.jumpBuf = 0; this.jumping = true; this.onGround = false;
          SS.audio.play("jump");
          G.dust(this.cx(), this.y + this.h, 5, 0);
        } else if (this.airJumps > 0) {
          this.vy = -DJUMP; this.airJumps--; this.jumpBuf = 0; this.jumping = true;
          SS.audio.play("djump");
          G.particles.burst("feather", this.cx(), this.y + this.h, 6, 80, 0.7, 4, "rgba(230,240,255,0.8)", { grav: 120 });
        }
      }
      if (this.jumping && !I.down.jump && this.vy < 0) { this.vy *= 0.45; this.jumping = false; }
      if (this.vy >= 0) this.jumping = false;
      var g = GRAV;
      if (I.down.jump && Math.abs(this.vy) < 70 && !this.onGround) g *= 0.6;
      this.vy = Math.min(this.vy + g * dt, MAXFALL);
    }

    this.updateCombat(dt, G, I, ab);
    this.physics(dt, room, G);

    if (room.touchesSpikes(this)) this.hitSpikes(G);

    // último suelo seguro (para volver tras pisar púas)
    if (this.onGround && this.state === "normal" && this.stun <= 0 && !room.onOneway(this) && this.isSafeSpot(room)) {
      this.safeT += dt;
      if (this.safeT > 0.25) { this.safe.x = this.x; this.safe.y = this.y; }
    } else this.safeT = 0;

    for (var i = this.trail.length - 1; i >= 0; i--) {
      this.trail[i].a -= dt * 2.6;
      if (this.trail[i].a <= 0) this.trail.splice(i, 1);
    }
    this.runPhase += Math.abs(this.vx) * dt * 0.075;
    this.updateScarf(dt);
  };

  Player.prototype.setState = function (s) { this.state = s; this.stateT = 0; };

  Player.prototype.isSafeSpot = function (room) {
    var fy = Math.floor((this.y + this.h + 2) / T);
    var l = Math.floor((this.x - 10) / T), r = Math.floor((this.x + this.w + 10) / T);
    if (!room.solid(Math.floor(this.x / T), fy) || !room.solid(Math.floor((this.x + this.w) / T), fy)) return false;
    for (var tx = l; tx <= r; tx++) {
      if (room.spike(tx, fy - 1) || room.spike(tx, fy)) return false;
    }
    return true;
  };

  Player.prototype.physics = function (dt, room, G) {
    var hx = room.moveX(this, this.vx * dt);
    if (hx !== 0) this.vx = 0;
    var wasGround = this.onGround, prevVy = this.vy;
    var hy = room.moveY(this, this.vy * dt);
    if (hy === 1) {
      if (!wasGround && prevVy > 260 && G) {
        this.landSquash = 1;
        SS.audio.play("land");
        G.dust(this.cx(), this.y + this.h, 4, 0);
      }
      this.onGround = true;
      this.vy = 0;
    } else {
      if (hy === -1) this.vy = Math.max(this.vy, 0);
      this.onGround = false;
    }
  };

  Player.prototype.startDodge = function (G, mx) {
    var ab = G.save.abilities;
    if (mx !== 0) this.dir = mx;
    this.dashing = !!ab.dash;
    this.dodgeFromGround = this.onGround;
    if (!this.onGround) this.airDash = false;
    this.setState("dodge");
    this.dodgeCd = DODGE_CD;
    this.atk = null; this.charging = false; this.charge = 0;
    if (this.dashing && !this.onGround) this.vy = 0;
    SS.audio.play("dash");
    G.dust(this.cx(), this.y + this.h, 6, -this.dir);
  };

  /* ---------------------------------------------------------- combate */
  Player.prototype.atkTimes = function (a) {
    return a.dir === "charged" ? { active: 0.16, dur: 0.34 } : { active: 0.1, dur: 0.2 };
  };

  Player.prototype.updateCombat = function (dt, G, I, ab) {
    if (this.atk) {
      this.atk.t += dt;
      if (this.atk.t >= this.atkTimes(this.atk).dur) this.atk = null;
    }
    if (this.state !== "normal" || this.stun > 0) {
      if (this.state !== "cslash") { this.charging = false; this.charge = 0; }
      if (!I.down.attack) this.attackHold = 0;
      return;
    }
    if (I.pressed.attack && this.atkCd <= 0) {
      var d = "side";
      if (I.down.up) d = "up";
      else if (I.down.down && !this.onGround) d = "down";
      this.atk = { dir: d, t: 0, id: ++G.atkId, pogo: false };
      this.atkCd = ATK_CD;
      this.attackHold = 0;
      SS.audio.play("swing");
    }
    var holding = false;
    if (ab.charge) {
      if (I.down.special) holding = true;
      else if (I.down.attack) { this.attackHold += dt; if (this.attackHold > 0.32) holding = true; }
    } else if (I.pressed.special) {
      G.hint("charge", "Aún no dominas esta técnica. Quizá el Verdugo la guarde…");
    }
    if (!I.down.attack) this.attackHold = 0;

    if (holding) {
      if (!this.charging) { this.charging = true; this.charge = 0; this.chargeReady = false; SS.audio.play("charge"); }
      this.charge += dt;
      if (Math.random() < 0.5) {
        var a = Math.random() * 6.283, r = 26;
        G.particles.spawn("glow", this.cx() + Math.cos(a) * r, this.cy() + Math.sin(a) * r,
          -Math.cos(a) * 70, -Math.sin(a) * 70, 0.35, 3, "190,235,255", {});
      }
      if (this.charge >= CHARGE_NEED && !this.chargeReady) {
        this.chargeReady = true;
        SS.audio.play("clank");
        G.particles.burst("glow", this.cx(), this.cy() - 6, 10, 90, 0.4, 5, "220,245,255", {});
      }
    } else if (this.charging) {
      if (this.charge >= CHARGE_NEED) this.chargedSlash(G);
      this.charging = false; this.charge = 0; this.chargeReady = false;
    }
  };

  Player.prototype.chargedSlash = function (G) {
    this.setState("cslash");
    this.vx = this.dir * 150;
    this.atk = { dir: "charged", t: 0, id: ++G.atkId, pogo: false };
    this.atkCd = ATK_CD;
    SS.audio.play("cslash");
    G.shake = Math.max(G.shake, 5);
  };

  /** Caja de impacto del ataque actual (solo durante los fotogramas activos). */
  Player.prototype.attackBox = function () {
    var a = this.atk;
    if (!a || a.t > this.atkTimes(a).active) return null;
    var cx = this.cx();
    switch (a.dir) {
      case "up": return { x: cx - 17, y: this.y - 36, w: 34, h: 42 };
      case "down": return { x: cx - 17, y: this.y + this.h - 8, w: 34, h: 40 };
      case "charged": return { x: this.dir > 0 ? cx - 6 : cx - 84, y: this.y - 14, w: 90, h: 56 };
      default: return { x: this.dir > 0 ? cx + 2 : cx - 48, y: this.y + 1, w: 46, h: 30 };
    }
  };

  Player.prototype.damage = function (G) {
    var base = 2 + (G.save.lvlAtk || 0);
    return this.atk && this.atk.dir === "charged" ? base * 3 : base;
  };

  /** Rebote del golpe hacia abajo y retroceso del golpe lateral. */
  Player.prototype.onHitTarget = function (G, kind) {
    var a = this.atk;
    if (!a) return;
    if (a.dir === "down" && !a.pogo) {
      a.pogo = true;
      this.vy = -430;
      this.airDash = true;
      this.airJumps = G.save.abilities.doublejump ? 1 : 0;
      this.jumping = false;
    } else if (a.dir === "side" && kind !== "light") {
      this.vx -= this.dir * (this.onGround ? 90 : 60);
    }
  };

  Player.prototype.hurt = function (G, dmg, srcX) {
    if (this.invulnerable() || G.cinematic) return false;
    this.hp -= dmg;
    this.iframes = 1.1; this.stun = 0.22; this.flash = 0.12;
    var d = this.cx() < srcX ? -1 : 1;
    this.vx = d * 240; this.vy = -300;
    if (this.state !== "normal") this.setState("normal");
    this.atk = null; this.charging = false; this.charge = 0;
    G.hitstop = 0.1;
    G.shake = Math.max(G.shake, 7);
    SS.audio.play("hurt");
    SS.vibrate(70);
    G.particles.burst("ink", this.cx(), this.cy(), 14, 200, 0.6, 4, "#050507", { grav: 500 });
    G.particles.burst("spark", this.cx(), this.cy(), 8, 260, 0.3, 1.5, "#ffffff", {});
    if (this.hp <= 0) { this.hp = 0; this.die(G); }
    return true;
  };

  Player.prototype.hitSpikes = function (G) {
    if (this.state === "dead" || this.state === "hazard") return;
    if (this.iframes <= 0) {
      this.hp -= 1;
      SS.audio.play("hurt");
      SS.vibrate(70);
      G.shake = Math.max(G.shake, 6);
      G.particles.burst("ink", this.cx(), this.cy(), 12, 180, 0.6, 4, "#050507", { grav: 500 });
    }
    this.iframes = Math.max(this.iframes, 1.0);
    this.atk = null; this.charging = false;
    if (this.hp <= 0) { this.hp = 0; this.die(G); return; }
    G.hazardRespawn();
  };

  Player.prototype.die = function (G) {
    this.setState("dead");
    this.deathT = 0;
    this.vy = -220;
    this.atk = null; this.charging = false;
    SS.audio.play("death");
    SS.vibrate([80, 60, 120]);
    G.onPlayerDeath();
  };

  /* --------------------------------------------------------- animación */
  Player.prototype.pose = function () {
    var P = { lean: 0, bob: 0, tF: 0.1, sF: -0.12, tB: -0.12, sB: 0.05, aF: 0.35, fF: 0.5, aB: -0.25, fB: 0.35, sword: 0.6, rot: 0 };
    var t = this.anim;
    if (this.state === "dead") {
      P.rot = -Math.min(1.45, this.deathT * 4);
      P.tF = 0.5; P.sF = -0.5; P.tB = -0.2; P.sB = 0.2; P.aF = 1.6; P.aB = -1.8; P.sword = 1.9;
    } else if (this.state === "sit") {
      P.tF = 1.45; P.sF = -1.5; P.tB = 1.3; P.sB = -1.4; P.bob = 8; P.aF = 0.6; P.fF = 0.7;
      P.aB = 0.25; P.fB = 0.9; P.sword = 0.15; P.lean = -1;
    } else if (this.state === "wake") {
      var k = SS.clamp((this.stateT - 0.5) / 1.0, 0, 1);
      P.rot = -1.45 * (1 - k);
      P.tF = 0.5 * (1 - k); P.sF = -0.6 * (1 - k); P.aF = 0.35 + 1.2 * (1 - k);
    } else if (this.state === "dodge") {
      P.lean = 6; P.tF = 1.0; P.sF = -0.8; P.tB = -0.9; P.sB = 0.4;
      P.aF = -0.6; P.fF = -0.2; P.aB = -1.3; P.fB = 0; P.sword = -1.3; P.bob = 3;
    } else if (!this.onGround) {
      if (this.vy < 0) {
        P.tF = 0.9; P.sF = -1.3; P.tB = 0.1; P.sB = -0.6; P.aF = 2.0; P.fF = 0.4; P.aB = -1.9; P.fB = -0.4; P.sword = 2.5;
      } else {
        P.tF = 0.35; P.sF = -0.4; P.tB = -0.3; P.sB = 0.5; P.aF = 1.3; P.fF = 0.3; P.aB = -1.3; P.fB = -0.2; P.sword = 1.6;
      }
    } else if (Math.abs(this.vx) > 15) {
      var ph = this.runPhase, s = Math.sin(ph), c = Math.cos(ph);
      P.tF = s * 0.75; P.sF = -Math.max(0, -c) * 1.1 - 0.1;
      P.tB = -s * 0.75; P.sB = -Math.max(0, c) * 1.1 - 0.1;
      P.aF = -s * 0.5 + 0.35; P.fF = 0.6; P.aB = s * 0.55; P.fB = 0.5;
      P.lean = 2.5; P.bob = -Math.abs(c) * 1.5; P.sword = 0.9;
    } else {
      var br = Math.sin(t * 2.2);
      P.bob = br * 0.6; P.aF = 0.3 + br * 0.05; P.aB = -0.25; P.sword = 0.55;
    }
    if (this.landSquash > 0) P.bob += this.landSquash * 3;
    if (this.charging) {
      var kc = Math.min(1, this.charge / CHARGE_NEED);
      P.aF = SS.lerp(P.aF, -2.4, kc); P.fF = -0.3; P.sword = SS.lerp(P.sword, -2.7, kc); P.lean = -1.5 * kc;
      if (this.onGround) { P.tF = 0.45; P.sF = -0.7; P.tB = -0.45; P.sB = 0.3; P.bob += 2 * kc; }
    }
    if (this.atk) {
      var a = this.atk, kk = Math.min(1, a.t / (a.dir === "charged" ? 0.15 : 0.1)), e = 1 - (1 - kk) * (1 - kk);
      switch (a.dir) {
        case "side": P.aF = SS.lerp(2.7, 1.0, e); P.fF = 0.1; P.sword = SS.lerp(2.9, 0.85, e); P.lean += 2; break;
        case "up": P.aF = SS.lerp(1.0, 3.5, e); P.fF = 0.1; P.sword = SS.lerp(1.2, 3.9, e); break;
        case "down": P.aF = SS.lerp(1.6, -0.1, e); P.fF = 0; P.sword = SS.lerp(1.7, -0.3, e); break;
        case "charged": P.aF = SS.lerp(-2.4, 1.2, e); P.fF = 0.1; P.sword = SS.lerp(-2.6, 1.05, e); P.lean = 4; break;
      }
    }
    return P;
  };

  function limb(ctx, ox, oy, a1, a2, l1, l2, dir) {
    var kx = ox + Math.sin(a1) * dir * l1, ky = oy + Math.cos(a1) * l1;
    var a = a1 + a2;
    var ex = kx + Math.sin(a) * dir * l2, ey = ky + Math.cos(a) * l2;
    ctx.moveTo(ox, oy); ctx.lineTo(kx, ky); ctx.lineTo(ex, ey);
    return { x: ex, y: ey };
  }

  /**
   * Dibuja una figura de palitos. Se reutiliza para enemigos y jefes (escala s).
   * Devuelve la posición de la mano delantera, la cabeza y los hombros.
   */
  SS.drawStickFigure = function (ctx, bx, by, w, h, dir, P, col, s, lw) {
    s = s || 1;
    var cx = bx + w / 2, fy = by + h;
    ctx.save();
    if (P.rot) { ctx.translate(cx, fy); ctx.rotate(P.rot * dir); ctx.translate(-cx, -fy); }
    var hipX = cx + P.lean * 0.3 * dir * s, hipY = fy - 15 * s + P.bob * s;
    var shX = cx + P.lean * dir * s, shY = fy - 26 * s + P.bob * s;
    var hdX = cx + P.lean * 1.25 * dir * s, hdY = fy - 33 * s + P.bob * s;
    ctx.strokeStyle = col;
    ctx.lineWidth = (lw || 3.2) * s;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    limb(ctx, hipX, hipY, P.tB, P.sB, 8.5 * s, 8 * s, dir);
    limb(ctx, hipX, hipY, P.tF, P.sF, 8.5 * s, 8 * s, dir);
    ctx.moveTo(hipX, hipY); ctx.lineTo(shX, shY); ctx.lineTo(hdX - 0.6 * dir * s, hdY + 5 * s);
    limb(ctx, shX, shY + 1 * s, P.aB, P.fB, 7 * s, 7 * s, dir);
    ctx.stroke();
    ctx.beginPath();
    var hand = limb(ctx, shX, shY + 1 * s, P.aF, P.fF, 7 * s, 7 * s, dir);
    ctx.stroke();
    ctx.fillStyle = col;
    ctx.beginPath();
    ctx.arc(hdX, hdY, 6.2 * s, 0, 6.283);
    ctx.fill();
    ctx.restore();
    if (P.rot) {
      // posiciones aproximadas tras la rotación (solo para efectos)
      var rr = P.rot * dir, cs = Math.cos(rr), sn = Math.sin(rr);
      var rot = function (p) { var dx = p.x - cx, dy = p.y - fy; return { x: cx + dx * cs - dy * sn, y: fy + dx * sn + dy * cs }; };
      return { hand: rot(hand), head: rot({ x: hdX, y: hdY }), shoulder: rot({ x: shX, y: shY }) };
    }
    return { hand: hand, head: { x: hdX, y: hdY }, shoulder: { x: shX, y: shY } };
  };

  Player.prototype.updateScarf = function (dt) {
    var ax = this.cx() - this.dir * 1.5, ay = this.y + this.h - 27;
    if (this.state === "sit") ay += 8;
    var pts = this.scarf;
    pts[0].x = ax; pts[0].y = ay;
    var wind = -this.dir * 30 - this.vx * 0.15;
    for (var i = 1; i < pts.length; i++) {
      var p = pts[i];
      var vx = (p.x - p.px) * 0.86, vy = (p.y - p.py) * 0.86;
      p.px = p.x; p.py = p.y;
      p.x += vx + (wind + Math.sin(this.anim * 6 + i) * 12) * dt * dt * 60;
      p.y += vy + (40 - this.vy * 0.02) * dt * dt * 60;
    }
    for (var it = 0; it < 2; it++) {
      for (var j = 1; j < pts.length; j++) {
        var a = pts[j - 1], b = pts[j];
        var dx = b.x - a.x, dy = b.y - a.y, d = Math.sqrt(dx * dx + dy * dy) || 0.001;
        var diff = (d - 3.4) / d;
        b.x -= dx * diff; b.y -= dy * diff;
      }
    }
  };

  Player.prototype.draw = function (ctx, G, time) {
    if (this.state === "hazard" && G.fade.a > 0.9) return;
    var i;
    // estelas del dash
    for (i = 0; i < this.trail.length; i++) {
      var tr = this.trail[i];
      SS.drawStickFigure(ctx, tr.x, tr.y, this.w, this.h, tr.dir, tr.pose, "rgba(150,205,255," + (tr.a * 0.5).toFixed(3) + ")", 1);
    }
    var alpha = 1;
    if (this.iframes > 0 && this.state !== "dead") alpha = Math.floor(this.iframes * 14) % 2 ? 0.4 : 1;
    if (this.state === "dead") alpha = SS.clamp(1 - (this.deathT - 0.7) / 0.6, 0, 1);
    if (alpha <= 0) return;
    ctx.globalAlpha = alpha;

    // bufanda
    var pts = this.scarf;
    ctx.strokeStyle = "#a8232c";
    ctx.lineCap = "round";
    for (i = 1; i < pts.length; i++) {
      ctx.lineWidth = 3.4 - i * 0.38;
      ctx.beginPath();
      ctx.moveTo(pts[i - 1].x, pts[i - 1].y);
      ctx.lineTo(pts[i].x, pts[i].y);
      ctx.stroke();
    }

    var P = this.pose();
    // halo tenue para separar la silueta del fondo oscuro
    SS.drawGlow(ctx, this.cx(), this.y + 14, 34, "150,180,220", 0.07 * alpha);
    var col = this.flash > 0 ? "#ffffff" : COL;
    var parts = SS.drawStickFigure(ctx, this.x, this.y, this.w, this.h, this.dir, P, col, 1);

    // espada
    var hx = parts.hand.x, hy = parts.hand.y, sa = P.sword + (P.rot ? P.rot : 0) * 0;
    var len = this.atk && this.atk.dir === "charged" ? 24 : 20;
    var tipX = hx + Math.sin(sa) * this.dir * len, tipY = hy + Math.cos(sa) * len;
    ctx.strokeStyle = "#d8e1ea";
    ctx.lineWidth = 2.2;
    ctx.beginPath(); ctx.moveTo(hx, hy); ctx.lineTo(tipX, tipY); ctx.stroke();
    ctx.strokeStyle = COL;
    ctx.lineWidth = 2.4;
    var gx = Math.cos(sa) * this.dir * 3.5, gy = -Math.sin(sa) * 3.5;
    var bx = hx + Math.sin(sa) * this.dir * 2.5, by = hy + Math.cos(sa) * 2.5;
    ctx.beginPath(); ctx.moveTo(bx - gx, by - gy); ctx.lineTo(bx + gx, by + gy); ctx.stroke();
    if (this.charging) {
      var kc = Math.min(1, this.charge / CHARGE_NEED);
      SS.drawGlow(ctx, tipX, tipY, 8 + kc * 14 + (this.chargeReady ? Math.sin(time * 30) * 3 : 0), "200,240,255", 0.4 + kc * 0.5);
    }

    // ojos luminosos
    var hdX = parts.head.x, hdY = parts.head.y;
    if (this.state !== "dead" || this.deathT < 0.5) {
      var blink = (Math.sin(time * 0.9) > 0.985 || this.state === "sit") ? 0.25 : 1;
      SS.drawGlow(ctx, hdX + this.dir * 2.4, hdY - 0.6, 7, "150,235,255", 0.45 * alpha);
      ctx.fillStyle = "#e4fcff";
      ctx.beginPath();
      ctx.ellipse(hdX + this.dir * 1.3, hdY - 0.8, 0.95, 1.7 * blink, 0, 0, 6.283);
      ctx.ellipse(hdX + this.dir * 3.9, hdY - 0.8, 0.85, 1.6 * blink, 0, 0, 6.283);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // tajo
    if (this.atk) this.drawSlash(ctx);
  };

  Player.prototype.drawSlash = function (ctx) {
    var a = this.atk, charged = a.dir === "charged";
    var life = charged ? 0.24 : 0.15;
    if (a.t > life) return;
    var k = a.t / life, alpha = 1 - k;
    var cx = this.cx(), cy = this.y + this.h / 2 - 3;
    var base, ox = 0, oy = 0, R = charged ? 50 : 30;
    switch (a.dir) {
      case "up": base = -Math.PI / 2; oy = -6; break;
      case "down": base = Math.PI / 2; oy = 8; break;
      default: base = this.dir > 0 ? 0 : Math.PI; ox = this.dir * (charged ? 4 : 6);
    }
    ctx.save();
    ctx.translate(cx + ox, cy + oy);
    ctx.rotate(base);
    if (a.dir !== "up" && a.dir !== "down" && this.dir < 0) ctx.scale(1, -1);
    var sweep = 0.4 + Math.min(1, k * 2.5) * 0.8;
    ctx.globalAlpha = alpha * 0.95;
    ctx.fillStyle = charged ? "rgba(205,240,255,1)" : "rgba(240,246,255,1)";
    ctx.beginPath();
    ctx.arc(0, 0, R, -sweep, sweep * 0.9);
    ctx.arc(-R * 0.32, 0, R * 0.86, sweep * 0.9, -sweep, true);
    ctx.closePath();
    ctx.fill();
    ctx.globalAlpha = alpha * 0.35;
    ctx.beginPath();
    ctx.arc(0, 0, R + 5, -sweep, sweep * 0.9);
    ctx.arc(-R * 0.2, 0, R, sweep * 0.9, -sweep, true);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
    ctx.globalAlpha = 1;
  };
})();
