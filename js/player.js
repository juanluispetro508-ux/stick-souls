/* =====================================================================
   El caballero de capucha roja: movimiento, salto variable, rodar,
   dash, ataques con animaciones propias (tajo de ida y vuelta, tajo
   hacia arriba, estocada desde arriba, golpe cargado), gancho de cadena
   con balanceo físico, petaca plateada, beber en el puesto, daño y
   muerte como muñeco de trapo. La pose se mezcla siempre con suavidad.
   ===================================================================== */
(function () {
  "use strict";
  var SS = window.SS, T = SS.T;

  var RUN = 170, GRAV = 1550, MAXFALL = 640, JUMP = 560, DJUMP = 500;
  var COYOTE = 0.1, BUFFER = 0.13;
  var ROLL_T = 0.32, ROLL_V = 300, DASH_T = 0.2, DASH_V = 500, DODGE_CD = 0.45;
  var ATK_CD = 0.27, COMBO_WIN = 0.5;
  var CHARGE_NEED = 0.55;
  var HOOK_RANGE = 270, HOOK_SPEED = 1200, REEL = 340, SWING_ACC = 900;
  SS.PLAYER_CONST = { RUN: RUN, GRAV: GRAV, JUMP: JUMP, DASH_V: DASH_V, DASH_T: DASH_T, HOOK_RANGE: HOOK_RANGE };

  /* Animaciones de ataque (fotogramas clave). sw = ángulo del machete:
     0 abajo, π/2 al frente, π arriba, negativo hacia atrás. */
  var ATTACKS = {
    side1: { dur: 0.3, act: [0.04, 0.13], keys: [
      { t: 0, p: { aF: 2.9, eF: -0.5, sw: 3.6, lean: -0.12 } },
      { t: 0.06, p: { aF: 2.0, eF: -0.15, sw: 2.2, lean: 0.12 } },
      { t: 0.11, p: { aF: 1.25, eF: 0, sw: 1.2, lean: 0.24 } },
      { t: 0.2, p: { aF: 0.75, eF: 0.25, sw: 0.45, lean: 0.16 } },
      { t: 0.3, p: { aF: 0.6, eF: 0.3, sw: 0.5, lean: 0.1 } }] },
    side2: { dur: 0.3, act: [0.04, 0.13], keys: [
      { t: 0, p: { aF: 0.45, eF: 0.5, sw: 0.25, lean: 0.22 } },
      { t: 0.06, p: { aF: 1.25, eF: 0.15, sw: 1.35, lean: 0.2 } },
      { t: 0.11, p: { aF: 2.0, eF: -0.1, sw: 2.35, lean: 0.06 } },
      { t: 0.2, p: { aF: 2.35, eF: -0.25, sw: 2.95, lean: -0.04 } },
      { t: 0.3, p: { aF: 2.1, eF: -0.1, sw: 2.6, lean: 0 } }] },
    up: { dur: 0.3, act: [0.04, 0.13], keys: [
      { t: 0, p: { aF: 0.8, eF: 0.3, sw: 0.5, lean: 0.12, head: 0.1 } },
      { t: 0.06, p: { aF: 2.1, eF: 0, sw: 2.1, lean: -0.08, head: -0.25 } },
      { t: 0.11, p: { aF: 2.95, eF: -0.15, sw: 3.15, lean: -0.2, head: -0.35 } },
      { t: 0.2, p: { aF: 3.25, eF: -0.25, sw: 3.75, lean: -0.22, head: -0.3 } },
      { t: 0.3, p: { aF: 3.0, eF: -0.2, sw: 3.5, lean: -0.15, head: -0.2 } }] },
    down: { dur: 0.32, act: [0.06, 0.17], keys: [
      { t: 0, p: { aF: 3.0, eF: -0.35, sw: 3.35, lean: -0.15, tF: 1.25, kF: -1.9, tB: 0.95, kB: -1.7, crouch: 3 } },
      { t: 0.06, p: { aF: 1.9, eF: -0.1, sw: 1.7, lean: 0.25, tF: 1.3, kF: -2.0, tB: 1.0, kB: -1.8, crouch: 4 } },
      { t: 0.11, p: { aF: 0.35, eF: 0, sw: 0.02, lean: 0.48, tF: 1.35, kF: -2.1, tB: 1.05, kB: -1.9, crouch: 5 } },
      { t: 0.22, p: { aF: 0.25, eF: 0.05, sw: -0.04, lean: 0.42, tF: 1.2, kF: -1.9, tB: 0.9, kB: -1.7, crouch: 4 } },
      { t: 0.32, p: { aF: 0.5, eF: 0.1, sw: 0.3, lean: 0.25 } }] },
    charged: { dur: 0.38, act: [0.06, 0.2], keys: [
      { t: 0, p: { aF: -0.9, eF: 0.2, sw: -1.35, lean: -0.25, crouch: 3 } },
      { t: 0.07, p: { aF: 0.6, eF: 0.1, sw: 0.4, lean: 0.35, crouch: 4 } },
      { t: 0.13, p: { aF: 1.6, eF: 0, sw: 1.65, lean: 0.55, crouch: 4 } },
      { t: 0.24, p: { aF: 2.5, eF: -0.15, sw: 2.85, lean: 0.35, crouch: 2 } },
      { t: 0.38, p: { aF: 2.2, eF: -0.1, sw: 2.6, lean: 0.15 } }] }
  };
  SS.PLAYER_ATTACKS = ATTACKS;

  var Player = (SS.Player = function (x, y) {
    this.w = 14; this.h = 34;
    this.x = x; this.y = y; this.vx = 0; this.vy = 0; this.dir = 1;
    this.onGround = false; this.coyote = 0; this.jumpBuf = 0; this.jumping = false;
    this.airJumps = 0; this.airDash = true;
    this.state = "normal"; this.stateT = 0;
    this.atk = null; this.atkCd = 0; this.attackHold = 0; this.combo = 0; this.lastAtkT = 0;
    this.charge = 0; this.charging = false; this.chargeReady = false;
    this.dodgeCd = 0; this.dashing = false; this.dodgeFromGround = false;
    this.iframes = 0; this.stun = 0; this.flash = 0;
    this.hp = 5; this.maxHp = 5;
    this.runPhase = 0; this.anim = 0; this.landT = 0; this.skidT = 0; this.stepT = 0;
    this.trail = []; this.trailT = 0; this.swTrail = [];
    this.safe = { x: x, y: y }; this.safeT = 0;
    this.dropping = false; this.dropT = 0;
    this.deathT = 0; this.ragdoll = null;
    this.hook = null; this.hookCd = 0; this.hookTarget = null;
    this.drink = null; this.flaskMsgT = 0;
    this.P = SS.basePose();
    this.tip = { x: x, y: y };
    this.hood = [{ x: x, y: y }, { x: x, y: y }, { x: x, y: y }]; this.hoodV = { x: 0, y: 0 };
    this.skirt = [];
    for (var i = 0; i < 5; i++) this.skirt.push(new SS.Rope(x, y, 3, 5.6, { grav: 720, damp: 0.9, iter: 3 }));
    this.J = null;
  });

  Player.prototype.cx = function () { return this.x + this.w / 2; };
  Player.prototype.cy = function () { return this.y + this.h / 2; };
  Player.prototype.invulnerable = function () {
    return this.iframes > 0 || this.state === "dodge" || this.state === "dead" || this.state === "standdrink" || this.state === "sit";
  };

  Player.prototype.placeAt = function (x, y) {
    this.x = x; this.y = y; this.safe.x = x; this.safe.y = y;
    this.trail.length = 0; this.swTrail.length = 0;
    this.hook = null;
    this.J = null;
    this.resetCloth();
  };

  Player.prototype.resetCloth = function () {
    var cx = this.cx(), fy = this.y + this.h;
    for (var i = 0; i < this.skirt.length; i++) {
      var r = this.skirt[i];
      for (var k = 0; k < r.pts.length; k++) { var p = r.pts[k]; p.x = p.px = cx; p.y = p.py = fy - 16 + k * 4.6; }
    }
    for (var h = 0; h < 3; h++) { this.hood[h].x = cx; this.hood[h].y = fy - 40 - h * 5; }
  };

  Player.prototype.setState = function (s) { this.state = s; this.stateT = 0; };

  /* ================================================================ update */
  Player.prototype.update = function (dt, G) {
    var I = SS.input, room = G.room, ab = G.save.abilities;
    this.anim += dt;
    this.stateT += dt;
    if (this.atkCd > 0) this.atkCd -= dt;
    if (this.dodgeCd > 0) this.dodgeCd -= dt;
    if (this.hookCd > 0) this.hookCd -= dt;
    if (this.iframes > 0) this.iframes -= dt;
    if (this.stun > 0) this.stun -= dt;
    if (this.flash > 0) this.flash -= dt;
    if (this.landT > 0) this.landT -= dt;
    if (this.skidT > 0) this.skidT -= dt;
    if (this.flaskMsgT > 0) this.flaskMsgT -= dt;
    if (this.dropT > 0) { this.dropT -= dt; if (this.dropT <= 0) this.dropping = false; }

    if (this.state === "dead") {
      this.deathT += dt;
      if (this.ragdoll) this.ragdoll.update(dt, room);
      this.updateCloth(dt, G);
      return;
    }
    if (this.state === "sit") {
      this.vx = 0; this.vy = 0;
      if (this.stateT > 0.25 && !G.cinematic && SS.ui && !SS.ui.menuOpen() && (I.down.left || I.down.right || I.pressed.jump || I.pressed.attack || I.pressed.dodge || I.pressed.down)) {
        this.setState("normal");
        this.y -= 1;
        if (I.down.left) this.dir = -1; else if (I.down.right) this.dir = 1;
      }
      this.animate(dt, G);
      return;
    }
    if (this.state === "standdrink") {
      this.vx = 0; this.vy = 0;
      var tt = this.stateT;
      if (tt > 0.35 && !this.sfx1) { this.sfx1 = true; SS.audio.play("bottle"); }
      if (tt > 0.7 && !this.sfx2) { this.sfx2 = true; SS.audio.play("drink"); }
      if (tt > 0.75 && tt < 1.3 && Math.random() < 0.4) {
        G.particles.spawn("bubble", this.J ? this.J.head.x + this.dir * 4 : this.cx(), this.y + 4, SS.rand(-6, 6), SS.rand(-30, -14), 0.8, 1.5, "rgba(255,240,200,0.9)", {});
      }
      if (tt > 1.45 && !this.sfx3) { this.sfx3 = true; SS.audio.play("aah"); G.finishStand(); }
      this.animate(dt, G);
      return;
    }
    if (this.state === "hazard" || this.state === "frozen") {
      this.vx = 0;
      this.animate(dt, G);
      return;
    }
    if (this.state === "wake") {
      this.vx = 0;
      this.vy = Math.min(this.vy + GRAV * dt, MAXFALL);
      this.physics(dt, room, null);
      if (this.stateT > 2.1) this.setState("normal");
      this.animate(dt, G);
      return;
    }

    var mx = (I.down.right ? 1 : 0) - (I.down.left ? 1 : 0);

    // --- petaca (curarse caminando)
    if (I.pressed.heal) this.tryDrink(G);
    if (this.drink) {
      this.drink.t += dt;
      if (this.drink.t > 0.5 && !this.drink.done) {
        this.drink.done = true;
        var before = this.hp;
        this.hp = Math.min(this.maxHp, this.hp + SS.FLASK_HEAL);
        G.save.flask = Math.max(0, (G.save.flask || 0) - 1);
        G.persist();
        SS.audio.play("heal");
        G.particles.burst("glow", this.cx(), this.cy(), 12, 90, 0.7, 5, "230,240,255", { up: 40 });
        if (this.hp > before) G.particles.spawn("ring", this.cx(), this.cy(), 0, 0, 0.5, 30, "rgba(220,235,255,0.8)", {});
      }
      if (this.drink.t > 0.85) this.drink = null;
    }

    // --- gancho
    this.findHookTarget(G);
    if (I.pressed.hook) {
      if (!ab.hook) G.hint("hook", "Un ancla de hierro… Algo podría engancharse aquí. Dicen que el carcelero de la Perrera tenía un gancho.");
      else if (this.state === "swing") {
        // colgado: si hay otra argolla a tiro, se lanza a ella sin perder el impulso
        if (this.hookTarget) { this.releaseHook(G, false); this.hook = null; this.hookCd = 0; this.throwHook(G); }
        else this.releaseHook(G, false);
      } else if ((this.state === "normal") && this.hookCd <= 0 && (!this.hook || this.hook.phase === "back")) this.throwHook(G);
    }
    this.updateHook(dt, G);

    // --- esquiva / rodar / dash
    if (I.pressed.dodge && this.dodgeCd <= 0 && (this.state === "normal" || this.state === "swing") && this.stun <= 0) {
      if (this.state === "swing") this.releaseHook(G, false);
      if (this.onGround) this.startDodge(G, mx, false);
      else if (ab.dash && this.airDash) this.startDodge(G, mx, true);
      else if (!ab.dash) G.hint("dash", "En el aire necesitas el Dash. Dicen que duerme en la Hondonada del bosque.");
    }

    if (this.state === "dodge") {
      var dur = this.dashing ? DASH_T : ROLL_T;
      if (this.dashing) {
        this.vx = this.dir * DASH_V;
        this.vy = 0;
        this.trailT -= dt;
        if (this.trailT <= 0) {
          this.trailT = 0.03;
          this.trail.push({ J: this.J ? cloneJ(this.J) : null, a: 0.5, sw: this.P.sw, dir: this.dir });
        }
      } else {
        var k = this.stateT / ROLL_T;
        this.vx = this.dir * ROLL_V * (1 - k * 0.45);
        this.vy = Math.min(this.vy + GRAV * dt, MAXFALL);
        if (this.onGround && Math.random() < 0.3) G.dust(this.cx(), this.y + this.h, 1, -this.dir);
      }
      if (this.stateT >= dur) { this.setState("normal"); this.vx = this.dir * RUN * 0.8; if (this.dashing) this.iframes = Math.max(this.iframes, 0.05); }
    } else if (this.state === "cslash") {
      this.vx = SS.approach(this.vx, 0, 900 * dt);
      this.vy = Math.min(this.vy + GRAV * 0.6 * dt, MAXFALL);
      if (this.stateT > 0.38) this.setState("normal");
    } else if (this.state === "swing") {
      this.swingPhysics(dt, G, I, mx);
    } else {
      // --- movimiento horizontal
      if (this.stun > 0) {
        this.vx = SS.approach(this.vx, 0, 520 * dt);
      } else {
        var spd = RUN * (this.charging ? 0.45 : 1) * (this.drink ? 0.5 : 1);
        var acc = this.onGround ? (mx === 0 ? 2400 : 2000) : 1400;
        if (this.onGround && mx !== 0 && SS.sign(this.vx) === -mx && Math.abs(this.vx) > 110) { this.skidT = 0.14; if (Math.random() < 0.5) G.dust(this.cx(), this.y + this.h, 1, mx); }
        this.vx = SS.approach(this.vx, mx * spd, acc * dt);
        if (mx !== 0 && !(this.atk && this.atk.t < 0.12)) this.dir = mx;
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
    if (this.state !== "swing") this.physics(dt, room, G);

    if (room.touchesSpikes(this)) this.hitSpikes(G);

    // último suelo seguro (para volver tras pisar púas)
    if (this.onGround && this.state === "normal" && this.stun <= 0 && !room.onOneway(this) && this.isSafeSpot(room)) {
      this.safeT += dt;
      if (this.safeT > 0.25) { this.safe.x = this.x; this.safe.y = this.y; }
    } else this.safeT = 0;

    for (var i = this.trail.length - 1; i >= 0; i--) {
      this.trail[i].a -= dt * 2.4;
      if (this.trail[i].a <= 0) this.trail.splice(i, 1);
    }
    if (this.onGround) {
      this.runPhase += Math.abs(this.vx) * dt * 0.072;
      if (Math.abs(this.vx) > 60) {
        this.stepT -= dt;
        if (this.stepT <= 0) { this.stepT = 0.26; SS.audio.play("step"); }
      }
    }
    this.animate(dt, G);
  };

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
      if (!wasGround && prevVy > 200 && G) {
        this.landT = SS.clamp(prevVy / 600, 0.35, 1) * 0.16;
        SS.audio.play("land");
        G.dust(this.cx(), this.y + this.h, prevVy > 450 ? 7 : 4, 0);
      }
      this.onGround = true;
      this.vy = 0;
    } else {
      if (hy === -1) this.vy = Math.max(this.vy, 0);
      this.onGround = false;
    }
  };

  Player.prototype.startDodge = function (G, mx, air) {
    if (mx !== 0) this.dir = mx;
    this.dashing = !!air;
    this.dodgeFromGround = this.onGround;
    if (air) this.airDash = false;
    this.setState("dodge");
    this.dodgeCd = DODGE_CD;
    this.atk = null; this.charging = false; this.charge = 0; this.drink = null;
    if (air) this.vy = 0;
    SS.audio.play(air ? "dash" : "roll");
    G.dust(this.cx(), this.y + this.h, 6, -this.dir);
  };

  /* -------------------------------------------------------------- petaca */
  Player.prototype.tryDrink = function (G) {
    if (this.drink || this.state !== "normal" || this.atk || this.charging) return;
    if ((G.save.flask || 0) <= 0) {
      if (this.flaskMsgT <= 0) { this.flaskMsgT = 4; SS.ui.toast("La petaca está vacía. Rellénala en un puesto de cerveza."); }
      return;
    }
    if (this.hp >= this.maxHp) {
      if (this.flaskMsgT <= 0) { this.flaskMsgT = 3; SS.ui.toast("Ya tienes toda la vida. Guarda el trago."); }
      return;
    }
    this.drink = { t: 0, done: false };
    SS.audio.play("flask");
  };

  /* -------------------------------------------------------------- gancho */
  Player.prototype.handPos = function () {
    if (this.J) return { x: this.J.hB.x, y: this.J.hB.y };
    return { x: this.cx(), y: this.y + 12 };
  };

  Player.prototype.findHookTarget = function (G) {
    this.hookTarget = null;
    if (!G.save.abilities.hook || this.state === "dead") return;
    var objs = G.room.objects, best = null, bs = 1e9, cx = this.cx(), cy = this.y + 10;
    for (var i = 0; i < objs.length; i++) {
      var o = objs[i];
      if (o.kind !== "ring") continue;
      var dx = o.cx - cx, dy = o.cy - cy, d = Math.sqrt(dx * dx + dy * dy);
      if (d > HOOK_RANGE || d < 18) continue;
      if (this.hook && this.hook.ring === o) continue;
      var score = d - (dx * this.dir > 0 ? 70 : 0) - (dy < 0 ? 40 : 0);
      if (score < bs && SS.lineClear(G.room, cx, cy, o.cx, o.cy)) { bs = score; best = o; }
    }
    this.hookTarget = best;
  };

  Player.prototype.throwHook = function (G) {
    var h = this.handPos(), t = this.hookTarget;
    this.hookCd = 0.2;
    SS.audio.play("hook");
    if (t) {
      this.dir = t.cx >= this.cx() ? 1 : -1;
      this.hook = { phase: "fly", x: h.x, y: h.y, tx: t.cx, ty: t.cy, ring: t, t: 0 };
    } else {
      var ang = -0.85;
      this.hook = { phase: "miss", x: h.x, y: h.y, vx: Math.cos(ang) * HOOK_SPEED * 0.6 * this.dir, vy: Math.sin(ang) * HOOK_SPEED * 0.6, t: 0 };
    }
  };

  Player.prototype.updateHook = function (dt, G) {
    var hk = this.hook;
    if (!hk) return;
    hk.t += dt;
    var h = this.handPos();
    if (hk.phase === "fly") {
      var dx = hk.tx - hk.x, dy = hk.ty - hk.y, d = Math.sqrt(dx * dx + dy * dy);
      var step = HOOK_SPEED * dt;
      if (d <= step) {
        hk.x = hk.tx; hk.y = hk.ty;
        hk.phase = "latched";
        var L = SS.dist(this.cx(), this.y + 10, hk.x, hk.y);
        hk.len = L; hk.target = Math.max(34, L * 0.6);
        SS.audio.play("latch");
        G.particles.burst("spark", hk.x, hk.y, 8, 160, 0.3, 1.4, "#ffe8c0", {});
        if (this.state === "normal" || this.state === "dodge") {
          this.setState("swing");
          this.atk = null; this.charging = false; this.drink = null;
          this.onGround = false;
          this.airDash = true;
        }
      } else { hk.x += dx / d * step; hk.y += dy / d * step; }
    } else if (hk.phase === "miss") {
      if (hk.t < 0.2) { hk.x += hk.vx * dt; hk.y += hk.vy * dt; }
      else {
        var rx = h.x - hk.x, ry = h.y - hk.y, rd = Math.sqrt(rx * rx + ry * ry);
        if (rd < 14) { this.hook = null; return; }
        hk.x += rx / rd * HOOK_SPEED * dt; hk.y += ry / rd * HOOK_SPEED * dt;
      }
    } else if (hk.phase === "back") {
      var bx = h.x - hk.x, by = h.y - hk.y, bd = Math.sqrt(bx * bx + by * by);
      if (bd < 14) { this.hook = null; return; }
      hk.x += bx / bd * HOOK_SPEED * 1.2 * dt; hk.y += by / bd * HOOK_SPEED * 1.2 * dt;
    }
  };

  Player.prototype.swingPhysics = function (dt, G, I, mx) {
    var hk = this.hook, room = G.room;
    if (!hk || hk.phase !== "latched") { this.setState("normal"); return; }
    // recoger o soltar cadena
    if (I.down.up) hk.target = Math.max(26, hk.target - 170 * dt);
    if (I.down.down) hk.target = Math.min(HOOK_RANGE + 20, hk.target + 170 * dt);
    hk.len = SS.approach(hk.len, hk.target, REEL * dt);
    // gravedad e impulso lateral
    this.vy = Math.min(this.vy + GRAV * dt, 900);
    if (mx !== 0) { this.vx += mx * SWING_ACC * dt; this.dir = mx; }
    this.vx *= 1 - 0.25 * dt;
    // integra con colisiones
    var hx = room.moveX(this, this.vx * dt);
    if (hx) this.vx *= -0.2;
    var hy = room.moveY(this, this.vy * dt);
    if (hy === 1) { this.onGround = true; this.vy = 0; } else { this.onGround = false; if (hy === -1) this.vy = Math.max(0, this.vy); }
    // restricción de la cuerda (punto de agarre a la altura del pecho)
    var px = this.cx(), py = this.y + 10;
    var dx = px - hk.x, dy = py - hk.y, d = Math.sqrt(dx * dx + dy * dy) || 0.001;
    if (d > hk.len) {
      var nx = dx / d, ny = dy / d;
      var tx = hk.x + nx * hk.len, ty = hk.y + ny * hk.len;
      room.moveX(this, tx - px);
      var r = room.moveY(this, ty - py);
      if (r === 1) this.onGround = true;
      var vr = this.vx * nx + this.vy * ny;
      if (vr > 0) { this.vx -= vr * nx; this.vy -= vr * ny; }
    }
    if (Math.random() < 0.05 && Math.abs(this.vx) > 150) SS.audio.play("chain");
    // saltar suelta con impulso
    if (I.pressed.jump) this.releaseHook(G, true);
  };

  Player.prototype.releaseHook = function (G, jump) {
    if (this.hook) this.hook.phase = "back";
    if (this.state === "swing") this.setState("normal");
    this.hookCd = 0.15;
    if (jump) {
      this.vy = Math.min(this.vy, 0) - 330;
      this.vx *= 1.12;
      this.jumping = false;
      this.coyote = 0;
      SS.audio.play("jump");
    }
    this.airDash = true;
    this.airJumps = G.save.abilities.doublejump ? 1 : 0;
  };

  /* --------------------------------------------------------- combate */
  Player.prototype.updateCombat = function (dt, G, I, ab) {
    if (this.atk) {
      this.atk.t += dt;
      if (this.atk.t >= ATTACKS[this.atk.anim].dur) this.atk = null;
    }
    var canAct = (this.state === "normal" || this.state === "swing") && this.stun <= 0 && !this.drink;
    if (!canAct) {
      if (this.state !== "cslash") { this.charging = false; this.charge = 0; }
      if (!I.down.attack) this.attackHold = 0;
      return;
    }
    if (I.pressed.attack && this.atkCd <= 0) {
      var d = "side", anim;
      if (I.down.up) d = "up";
      else if (I.down.down && !this.onGround) d = "down";
      if (d === "side") {
        this.combo = (G.time - this.lastAtkT < COMBO_WIN) ? 1 - this.combo : 0;
        anim = this.combo ? "side2" : "side1";
      } else { anim = d; this.combo = 0; }
      this.lastAtkT = G.time;
      this.atk = { dir: d, anim: anim, t: 0, id: ++G.atkId, pogo: false };
      this.atkCd = ATK_CD;
      this.attackHold = 0;
      this.swTrail.length = 0;
      SS.audio.play(anim === "side2" || d === "up" ? "swing2" : "swing");
      if (d === "down") this.vy = Math.max(this.vy, 60);
    }
    var holding = false;
    if (ab.charge) {
      if (I.down.special) holding = true;
      else if (I.down.attack) { this.attackHold += dt; if (this.attackHold > 0.32) holding = true; }
    } else if (I.pressed.special) {
      G.hint("charge", "Aún no dominas esta técnica. Quizá el Verdugo la guarde…");
    }
    if (!I.down.attack) this.attackHold = 0;

    if (holding && this.state === "normal") {
      if (!this.charging) { this.charging = true; this.charge = 0; this.chargeReady = false; SS.audio.play("charge"); }
      this.charge += dt;
      if (Math.random() < 0.5) {
        var a = Math.random() * 6.283, r = 26;
        G.particles.spawn("glow", this.cx() + Math.cos(a) * r, this.cy() + Math.sin(a) * r,
          -Math.cos(a) * 70, -Math.sin(a) * 70, 0.35, 3, "255,210,170", {});
      }
      if (this.charge >= CHARGE_NEED && !this.chargeReady) {
        this.chargeReady = true;
        SS.audio.play("clank");
        G.particles.burst("glow", this.cx(), this.cy() - 6, 10, 90, 0.4, 5, "255,230,200", {});
      }
    } else if (this.charging) {
      if (this.charge >= CHARGE_NEED) this.chargedSlash(G);
      this.charging = false; this.charge = 0; this.chargeReady = false;
    }
  };

  Player.prototype.chargedSlash = function (G) {
    this.setState("cslash");
    this.vx = this.dir * 170;
    this.atk = { dir: "charged", anim: "charged", t: 0, id: ++G.atkId, pogo: false };
    this.atkCd = ATK_CD;
    this.swTrail.length = 0;
    SS.audio.play("cslash");
    G.shake = Math.max(G.shake, 5);
  };

  /** Caja de impacto del ataque actual (solo durante los fotogramas activos). */
  Player.prototype.attackBox = function () {
    var a = this.atk;
    if (!a) return null;
    var act = ATTACKS[a.anim].act;
    if (a.t < act[0] - 0.02 || a.t > act[1]) return null;
    var cx = this.cx();
    switch (a.dir) {
      case "up": return { x: cx - 18, y: this.y - 34, w: 36, h: 42 };
      case "down": return { x: cx - 16, y: this.y + this.h - 6, w: 32, h: 40 };
      case "charged": return { x: this.dir > 0 ? cx - 6 : cx - 86, y: this.y - 16, w: 92, h: 58 };
      default: return { x: this.dir > 0 ? cx + 2 : cx - 50, y: this.y - 2, w: 48, h: 34 };
    }
  };

  Player.prototype.damage = function (G) {
    var base = 2 + (G.save.lvlAtk || 0);
    return this.atk && this.atk.dir === "charged" ? base * 3 : base;
  };

  /** Rebote de la estocada hacia abajo y retroceso del tajo lateral. */
  Player.prototype.onHitTarget = function (G, kind) {
    var a = this.atk;
    if (!a) return;
    if (a.dir === "down" && !a.pogo) {
      a.pogo = true;
      this.vy = -440;
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
    if (this.state === "swing") this.releaseHook(G, false);
    this.vx = d * 240; this.vy = -300;
    if (this.state !== "normal") this.setState("normal");
    this.atk = null; this.charging = false; this.charge = 0; this.drink = null;
    G.hitstop = 0.1;
    G.shake = Math.max(G.shake, 7);
    SS.audio.play("hurt");
    SS.vibrate(70);
    G.particles.burst("ink", this.cx(), this.cy(), 12, 200, 0.6, 3.5, "#2a0507", { grav: 500 });
    G.particles.burst("spark", this.cx(), this.cy(), 8, 260, 0.3, 1.5, "#ffffff", {});
    if (this.hp <= 0) { this.hp = 0; this.die(G); }
    else if ((G.save.flask || 0) > 0 && this.hp <= this.maxHp - 2) {
      G.hint("flask", G.touchMode() ? "Toca «Petaca» para beber un trago y curarte mientras caminas." : "Pulsa U (o Q) para beber de la petaca y curarte mientras caminas.");
    }
    return true;
  };

  Player.prototype.hitSpikes = function (G) {
    if (this.state === "dead" || this.state === "hazard") return;
    if (this.iframes <= 0) {
      this.hp -= 1;
      SS.audio.play("hurt");
      SS.vibrate(70);
      G.shake = Math.max(G.shake, 6);
      G.particles.burst("ink", this.cx(), this.cy(), 12, 180, 0.6, 3.5, "#2a0507", { grav: 500 });
    }
    this.iframes = Math.max(this.iframes, 1.0);
    this.atk = null; this.charging = false; this.drink = null;
    if (this.hook) { this.hook = null; if (this.state === "swing") this.setState("normal"); }
    if (this.hp <= 0) { this.hp = 0; this.die(G); return; }
    G.hazardRespawn();
  };

  Player.prototype.die = function (G) {
    var J = this.J || SS.solveJoints(this.P, this.cx(), this.y + this.h, this.dir, 1);
    this.ragdoll = new SS.Ragdoll(cloneJ(J), this.vx * 0.5 + this.dir * -50, Math.min(this.vy, 0) * 0.3 - 110, this.dir * -90);
    this.setState("dead");
    this.deathT = 0;
    this.hook = null;
    this.atk = null; this.charging = false; this.drink = null;
    SS.audio.play("death");
    SS.vibrate([80, 60, 120]);
    G.onPlayerDeath();
  };

  function cloneJ(J) {
    var o = {};
    for (var k in J) if (J[k] && typeof J[k].x === "number") o[k] = { x: J[k].x, y: J[k].y };
    return o;
  }

  /* ========================================================= animación */
  Player.prototype.targetPose = function (G) {
    var P = SS.basePose(), t = this.anim, rate = 16, k;
    var st = this.state;
    if (st === "sit" || st === "standdrink") {
      P.crouch = 9; P.tF = 1.5; P.kF = -1.5; P.tB = 1.35; P.kB = -1.35; P.lean = -0.05;
      P.aF = 0.55; P.eF = 0.7; P.sw = 1.0; P.aB = 0.6; P.eB = 1.2;
      if (st === "standdrink") {
        var tt = this.stateT;
        var lift = SS.smooth((tt - 0.25) / 0.35) * (1 - SS.smooth((tt - 1.25) / 0.25));
        P.aB = SS.lerp(0.6, 2.6, lift); P.eB = SS.lerp(1.2, 1.9, lift);
        P.head = -0.45 * SS.smooth((tt - 0.6) / 0.3) * (1 - SS.smooth((tt - 1.25) / 0.25));
        P.lean = -0.12 * lift;
      } else {
        P.bob = Math.sin(t * 1.6) * 0.4;
      }
      rate = 10;
    } else if (st === "wake") {
      var w = this.stateT;
      var lie = { rot: -1.5, pivot: 2, crouch: 0, tF: 0.1, kF: -0.1, tB: -0.1, kB: 0, aF: 0.4, eF: 0.4, aB: -0.6, eB: 0.6, sw: 1.2, head: 0.3 };
      var kneel = { rot: 0, crouch: 8, tF: 1.5, kF: -2.4, tB: 0.2, kB: -1.9, aF: 0.9, eF: 0.4, aB: 1.3, eB: 0.9, sw: 0.7, lean: 0.35, head: 0.4 };
      if (w < 0.8) P = SS.lerpPose(P, lie, 1);
      else if (w < 1.5) P = SS.lerpPose(SS.lerpPose(SS.basePose(), lie, 1), kneel, SS.smooth((w - 0.8) / 0.7));
      else P = SS.lerpPose(SS.lerpPose(SS.basePose(), kneel, 1), SS.basePose(), SS.smooth((w - 1.5) / 0.5));
      rate = 30;
    } else if (st === "dodge") {
      if (this.dashing) {
        P.lean = 0.95; P.tF = -0.4; P.kF = -0.8; P.tB = -0.9; P.kB = -0.3; P.aF = 1.7; P.eF = 0; P.sw = 1.65; P.aB = -1.6; P.eB = 0.2; P.crouch = 2;
        rate = 30;
      } else {
        k = SS.clamp(this.stateT / ROLL_T, 0, 1);
        P.rot = Math.PI * 2 * SS.easeInOut(k); P.pivot = 9; P.crouch = 8;
        P.tF = 1.7; P.kF = -2.3; P.tB = 1.5; P.kB = -2.2; P.aF = 1.3; P.eF = 0.8; P.sw = 0.5; P.aB = 1.1; P.eB = 1; P.lean = 0.6;
        rate = 40;
      }
    } else if (st === "swing") {
      var hk = this.hook;
      var ang = hk ? Math.atan2((hk.x - this.cx()) * this.dir, this.y + 10 - hk.y) : 2.6;
      P.aB = ang - 0.05; P.eB = 0;
      var sv = SS.clamp(this.vx / 400, -1, 1) * this.dir;
      P.tF = 0.5 - sv * 0.6; P.kF = -0.9; P.tB = 0.1 - sv * 0.5; P.kB = -0.6;
      P.lean = -0.1 + sv * 0.2; P.aF = 1.2; P.eF = 0.2; P.sw = 1.3; P.head = -0.15;
      rate = 18;
    } else if (!this.onGround) {
      if (this.vy < -150) {
        P.tF = 1.05; P.kF = -1.5; P.tB = 0.15; P.kB = -0.55; P.aF = 1.5; P.eF = 0.1; P.aB = -1.3; P.eB = 0.3; P.sw = 1.6; P.lean = 0.1;
      } else if (this.vy < 120) {
        P.tF = 0.7; P.kF = -1.0; P.tB = -0.1; P.kB = -0.6; P.aF = 1.4; P.eF = 0.2; P.aB = -1.0; P.eB = 0.4; P.sw = 1.5; P.lean = 0.12;
      } else {
        P.tF = 0.3; P.kF = -0.35; P.tB = -0.35; P.kB = -0.45; P.aF = 1.6; P.eF = 0.1; P.aB = -1.5; P.eB = 0.2; P.sw = 1.7; P.lean = 0.05;
      }
      if (this.hook && this.hook.phase !== "latched") { P.aB = 2.4; P.eB = -0.2; }
      rate = 12;
    } else if (Math.abs(this.vx) > 18) {
      var ph = this.runPhase, s = Math.sin(ph), c = Math.cos(ph), sp = SS.clamp(Math.abs(this.vx) / RUN, 0, 1);
      P.tF = s * 0.85 * sp + 0.05; P.kF = -(Math.max(0, -c) * 1.35 + 0.12) * sp;
      P.tB = -s * 0.85 * sp + 0.05; P.kB = -(Math.max(0, c) * 1.35 + 0.12) * sp;
      P.aB = s * 0.75 * sp; P.eB = 0.6;
      P.aF = 0.55 - s * 0.3 * sp; P.eF = 0.5; P.sw = -0.35 + 0.15 * s;
      P.lean = 0.22 * sp; P.bob = -Math.abs(c) * 1.6 * sp;
      P.head = -0.05;
      if (this.skidT > 0) { P.lean = -0.3; P.tF = 0.6; P.kF = -0.2; P.tB = -0.5; P.kB = -0.3; P.crouch = 3; }
      rate = 22;
    } else {
      var br = Math.sin(t * 2.1);
      P.bob = br * 0.55; P.aF = 0.38 + br * 0.04; P.eF = 0.32; P.aB = -0.22 + br * 0.03; P.sw = 0.55 + br * 0.03;
      P.head = Math.sin(t * 0.37) > 0.92 ? 0.15 : 0;
      rate = 10;
    }
    if (this.landT > 0) { P.crouch += 6 * (this.landT / 0.16); P.tF += 0.4; P.kF -= 0.6; P.tB += 0.3; P.kB -= 0.6; P.lean += 0.1; }
    if (this.stun > 0) { P.lean = -0.35; P.head = -0.2; P.aB = -1.2; }
    // petaca: se lleva la mano a la boca y echa la cabeza atrás
    if (this.drink) {
      var dk = this.drink.t, up = SS.smooth(dk / 0.25) * (1 - SS.smooth((dk - 0.65) / 0.2));
      P.aB = SS.lerp(P.aB, 2.55, up); P.eB = SS.lerp(P.eB, 1.95, up); P.head = SS.lerp(P.head, -0.45, SS.smooth((dk - 0.2) / 0.2) * up);
      rate = Math.max(rate, 20);
    }
    // carga del golpe: machete atrás, cuerpo tenso
    if (this.charging) {
      var kc = Math.min(1, this.charge / CHARGE_NEED);
      P.aF = SS.lerp(P.aF, -0.9, kc); P.eF = 0.2; P.sw = SS.lerp(P.sw, -1.35, kc); P.lean = SS.lerp(P.lean, -0.25, kc);
      if (this.onGround) { P.tF = 0.5; P.kF = -0.7; P.tB = -0.5; P.kB = 0.25; P.crouch = 3 * kc; }
      rate = 18;
    }
    // ataques: fotogramas clave sobre la pose de movimiento
    if (this.atk) {
      var A = ATTACKS[this.atk.anim];
      P = SS.keyPose(P, A.keys, this.atk.t);
      rate = 38;
    }
    return { P: P, rate: rate };
  };

  Player.prototype.animate = function (dt, G) {
    if (this.state === "dead") return;
    var tp = this.targetPose(G);
    SS.blendPose(this.P, tp.P, SS.damp(tp.rate, dt));
    this.J = SS.solveJoints(this.P, this.cx(), this.y + this.h, this.dir, 1);
    this.updateCloth(dt, G);
    // estela del machete (para dibujar el arco del tajo)
    if (this.atk && this.tip) {
      var J = this.J, sw = this.P.sw, d = this.dir;
      var len = this.atk.dir === "charged" ? 24 : 19;
      var tipx = J.hF.x + Math.sin(sw) * d * len, tipy = J.hF.y + Math.cos(sw) * len;
      var midx = J.hF.x + Math.sin(sw) * d * len * 0.35, midy = J.hF.y + Math.cos(sw) * len * 0.35;
      this.swTrail.push({ tx: tipx, ty: tipy, mx: midx, my: midy, a: 1 });
      if (this.swTrail.length > 9) this.swTrail.shift();
    }
    for (var i = this.swTrail.length - 1; i >= 0; i--) {
      this.swTrail[i].a -= dt * 7;
      if (this.swTrail[i].a <= 0) this.swTrail.splice(i, 1);
    }
  };

  /** Faldón (tiras de tela con física) y punta de la capucha (resorte). */
  Player.prototype.updateCloth = function (dt, G) {
    var J = this.state === "dead" && this.ragdoll ? this.ragdoll.p : this.J;
    if (!J || !J.hip) return;
    var hip = J.hip, sh = J.sh || J.neck, i;
    var tdx = sh.x - hip.x, tdy = sh.y - hip.y, tl = Math.sqrt(tdx * tdx + tdy * tdy) || 1;
    var nx = -tdy / tl, ny = tdx / tl;
    var wind = -this.vx * 3.2 - this.dir * 20;
    for (i = 0; i < this.skirt.length; i++) {
      var r = this.skirt[i], off = (i - 2) * 2.7 * this.dir;
      r.pin(0, hip.x + nx * off - tdx / tl * 1, hip.y + ny * off - tdy / tl * 1);
      r.wind = wind + Math.sin(this.anim * 7 + i) * 80;
      r.update(dt, null);
      // las tiras siguen a la pierna que tienen delante o detrás
      var front = i >= 2, kn = front ? J.kF : J.kB, ft = front ? J.fF : J.fB;
      if (kn && ft) {
        var m = r.pts[1], e = r.pts[2], f = Math.abs(i - 2) * 0.12 + 0.18;
        m.x += (kn.x - m.x) * f; e.x += ((kn.x + ft.x) / 2 - e.x) * f * 0.8;
      }
    }
    // capucha: resorte que sigue la punta "ideal" con retraso
    var hd = J.head, nk = J.neck || J.sh;
    if (hd && nk) {
      var ha = Math.atan2(hd.x - nk.x, nk.y - hd.y), ca = Math.cos(ha), sa = Math.sin(ha);
      var rx = -3.5 * this.dir, ry = -15;
      var ix = hd.x + rx * ca - ry * sa, iy = hd.y + rx * sa + ry * ca;
      var tip = this.hood[2];
      var ax = (ix - tip.x) * 260 - this.hoodV.x * 14 - this.vx * 0.5, ay = (iy - tip.y) * 260 - this.hoodV.y * 14;
      this.hoodV.x += ax * dt; this.hoodV.y += ay * dt;
      tip.x += this.hoodV.x * dt; tip.y += this.hoodV.y * dt;
      var dd = SS.dist(tip.x, tip.y, ix, iy);
      if (dd > 7) { tip.x = ix + (tip.x - ix) / dd * 7; tip.y = iy + (tip.y - iy) / dd * 7; }
      this.hood[0].x = hd.x; this.hood[0].y = hd.y - 4;
      this.hood[1].x = (hd.x + tip.x) / 2 + (ix - tip.x) * 0.2; this.hood[1].y = (hd.y - 4 + tip.y) / 2;
    }
  };

  /* ============================================================= dibujo */
  Player.prototype.draw = function (ctx, G, time) {
    if (this.state === "hazard" && G.fade.a > 0.9) return;
    var i;
    // cadena del gancho
    if (this.hook) this.drawHook(ctx, time);
    // estelas del dash
    for (i = 0; i < this.trail.length; i++) {
      var tr = this.trail[i];
      if (!tr.J) continue;
      ctx.globalAlpha = tr.a * 0.45;
      SS.drawKnight(ctx, tr.J, { dir: tr.dir, sw: tr.sw, flash: true, noSword: false, eyes: false });
    }
    ctx.globalAlpha = 1;
    var alpha = 1;
    if (this.iframes > 0 && this.state !== "dead" && this.state !== "dodge") alpha = Math.floor(this.iframes * 14) % 2 ? 0.45 : 1;
    if (this.state === "dead") alpha = SS.clamp(1 - (this.deathT - 1.5) / 0.7, 0, 1);
    if (alpha <= 0) return;
    ctx.globalAlpha = alpha;

    var J = this.state === "dead" && this.ragdoll ? this.ragdoll.p : this.J;
    if (!J) J = this.J = SS.solveJoints(this.P, this.cx(), this.y + this.h, this.dir, 1);
    var sw = this.P.sw;
    if (this.state === "dead" && J.eF && J.hF) sw = Math.atan2((J.hF.x - J.eF.x) * this.dir, J.hF.y - J.eF.y);
    // halo tenue para separar la silueta del fondo
    SS.drawGlow(ctx, this.cx(), this.y + 14, 34, "255,170,140", 0.06 * alpha);
    var item = null, itemAng = 0;
    if (this.drink) { item = "flask"; itemAng = -0.4 - SS.smooth((this.drink.t - 0.2) / 0.25) * 1.6; }
    if (this.state === "standdrink" || this.state === "sit") {
      item = "bottle";
      itemAng = this.state === "standdrink" ? -0.2 - SS.smooth((this.stateT - 0.55) / 0.3) * 1.9 * (1 - SS.smooth((this.stateT - 1.25) / 0.25)) : 0.3;
    }
    var o = { dir: this.dir, sw: sw, flash: this.flash > 0, hood: this.hood, skirt: this.skirt.map(function (r) { return r.pts; }),
      item: item, itemAng: itemAng, swordLen: this.atk && this.atk.dir === "charged" ? 23 : 19 };
    // estela del tajo (detrás del cuerpo para no tapar la silueta)
    if (this.swTrail.length > 1) this.drawSlashTrail(ctx);
    var tip = SS.drawKnight(ctx, J, o);
    if (tip) this.tip = tip;
    if (this.charging) {
      var kc = Math.min(1, this.charge / CHARGE_NEED);
      SS.drawGlow(ctx, this.tip.x, this.tip.y, 8 + kc * 14 + (this.chargeReady ? Math.sin(time * 30) * 3 : 0), "255,220,180", 0.4 + kc * 0.5);
    }
    ctx.globalAlpha = 1;
  };

  /** Arco del tajo: cinta entre la punta y el centro de la hoja de los
      últimos fotogramas, así sigue exactamente el movimiento del machete. */
  Player.prototype.drawSlashTrail = function (ctx) {
    var tr = this.swTrail, charged = this.atk && this.atk.dir === "charged";
    ctx.globalCompositeOperation = "lighter";
    for (var i = 1; i < tr.length; i++) {
      var a = tr[i - 1], b = tr[i];
      var al = Math.min(a.a, b.a) * (i / tr.length);
      ctx.fillStyle = charged ? "rgba(255,210,170," + (al * 0.6).toFixed(3) + ")" : "rgba(240,236,228," + (al * 0.45).toFixed(3) + ")";
      ctx.beginPath();
      ctx.moveTo(a.tx, a.ty); ctx.lineTo(b.tx, b.ty); ctx.lineTo(b.mx, b.my); ctx.lineTo(a.mx, a.my);
      ctx.closePath();
      ctx.fill();
    }
    var last = tr[tr.length - 1];
    if (last.a > 0.5) SS.drawGlow(ctx, last.tx, last.ty, charged ? 16 : 9, charged ? "255,190,140" : "255,245,230", 0.35 * last.a);
    ctx.globalCompositeOperation = "source-over";
  };

  Player.prototype.drawHook = function (ctx, time) {
    var hk = this.hook, h = this.handPos();
    var dx = hk.x - h.x, dy = hk.y - h.y, d = Math.sqrt(dx * dx + dy * dy) || 1;
    var nx = -dy / d, ny = dx / d;
    var wave = hk.phase === "latched" ? 0 : (hk.phase === "fly" ? 4 * (1 - Math.min(1, hk.t * 5)) : 3);
    ctx.strokeStyle = "#3b3330";
    ctx.lineWidth = 1.6;
    ctx.lineCap = "round";
    ctx.beginPath();
    var n = Math.max(4, Math.floor(d / 6));
    for (var i = 0; i <= n; i++) {
      var t = i / n, w = Math.sin(t * Math.PI * 3 + time * 30) * wave * Math.sin(t * Math.PI);
      var sag = hk.phase === "latched" ? Math.sin(t * Math.PI) * Math.max(0, hk.len - d) * 0.5 : 0;
      var x = h.x + dx * t + nx * w, y = h.y + dy * t + ny * w + sag;
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.stroke();
    ctx.strokeStyle = "#8d8681";
    ctx.lineWidth = 0.7;
    ctx.stroke();
    // garfio
    var a = Math.atan2(dy, dx);
    ctx.save();
    ctx.translate(hk.x, hk.y);
    ctx.rotate(a);
    ctx.strokeStyle = "#bfc4c8"; ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(-4, 0); ctx.lineTo(2, 0);
    ctx.moveTo(2, 0); ctx.quadraticCurveTo(5, -4, 1, -6);
    ctx.moveTo(2, 0); ctx.quadraticCurveTo(5, 4, 1, 6);
    ctx.stroke();
    ctx.restore();
  };
})();
