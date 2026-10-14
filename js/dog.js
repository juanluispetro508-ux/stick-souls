/* =====================================================================
   JEFE DEL REFUGIO · EL CAN BICÉFALO
   Perro gigante de dos cabezas, sarnoso, con collares de púas y cadenas
   rotas (con física). Cada cabeza se mueve por su cuenta.
   Ataques anunciados:
   - Embestida con mordida: baja el pecho, gruñe y se lanza al frente.
   - Aliento de brasas: una cabeza se alza (ojos encendidos) y escupe
     brasas en abanico hacia abajo.
   - Salto: se agacha, salta hacia ti (sombra) y al caer lanza ondas.
   - Aullido (fase 2): ambas cabezas aúllan y llueven brasas del techo.
   Fase 2 (mitad de vida): grietas de fuego, más rápido, combos.
   ===================================================================== */
(function () {
  "use strict";
  var SS = window.SS, T = SS.T;
  var GRAV = 1500;

  var Can = (SS.Can = function (tx, ty) {
    this.w = 92; this.h = 50;
    this.x = tx + T / 2 - this.w / 2;
    this.y = ty + T - this.h;
    this.vx = 0; this.vy = 0; this.dir = -1;
    this.maxHp = 62; this.hp = this.maxHp;
    this.state = "dormant"; this.stateT = 0; this.t = 0; this.anim = 0;
    this.phase = 1; this.flash = 0; this.lastHit = -1;
    this.onGround = false; this.history = [];
    this.id = "can";
    this.name = SS.BOSSES.can.name;
    this.dead = false; this.deathT = 0; this.leapTarget = 0;
    this.gait = 0; this.breathHead = 0; this.combo = 0; this.shotT = 0;
    this.crouch = 4; this.tilt = 0;
    // cabezas: ángulo del cuello, apertura de mandíbula y alzado
    this.heads = [
      { ang: -0.2, jaw: 0, lift: 0, ph: 0, x: 0, y: 0, eye: 0.6 },
      { ang: 0.1, jaw: 0, lift: 0, ph: 2.1, x: 0, y: 0, eye: 0.6 }
    ];
    this.tail = new SS.Rope(this.cx(), this.y + 10, 7, 5, { grav: 300, damp: 0.93 });
    this.chains = [new SS.Rope(this.cx(), this.y, 6, 4.5, { grav: 900, damp: 0.985 }), new SS.Rope(this.cx(), this.y, 5, 4.5, { grav: 900, damp: 0.985 })];
  });

  Can.prototype.cx = function () { return this.x + this.w / 2; };
  Can.prototype.cy = function () { return this.y + this.h / 2; };
  Can.prototype.setState = function (s) { this.state = s; this.stateT = 0; };
  Can.prototype.k = function () { return this.phase === 2 ? 0.74 : 1; };

  Can.prototype.start = function (G) {
    this.setState("intro");
    SS.audio.play("growl");
    G.shake = Math.max(G.shake, 6);
  };

  Can.prototype.choose = function (G) {
    var p = G.player, dist = Math.abs(p.cx() - this.cx());
    var opts;
    if (dist > 200) opts = [["pounce", 4], ["breath", 4], ["lunge", 3]];
    else if (dist > 90) opts = [["lunge", 4], ["breath", 3], ["pounce", 2]];
    else opts = [["lunge", 5], ["pounce", 3], ["breath", 1]];
    if (this.phase === 2) opts.push(["howl", 2]);
    var h = this.history;
    opts = opts.filter(function (o) { return !(h.length >= 2 && h[h.length - 1] === o[0] && h[h.length - 2] === o[0]); });
    var total = 0, i;
    for (i = 0; i < opts.length; i++) total += opts[i][1];
    var r = Math.random() * total, pick = opts[0][0];
    for (i = 0; i < opts.length; i++) { r -= opts[i][1]; if (r <= 0) { pick = opts[i][0]; break; } }
    h.push(pick); if (h.length > 4) h.shift();
    this.dir = p.cx() > this.cx() ? 1 : -1;
    switch (pick) {
      case "lunge": this.combo = this.phase === 2 && Math.random() < 0.5 ? 1 : 0; this.setState("biteWind"); SS.audio.play("growl"); break;
      case "breath": this.breathHead = 1 - this.breathHead; this.setState("breathWind"); break;
      case "pounce": this.setState("pounceWind"); break;
      case "howl": this.setState("howl"); SS.audio.play("howl"); break;
    }
  };

  Can.prototype.update = function (dt, G) {
    var room = G.room, p = G.player, k = this.k();
    this.t += dt; this.stateT += dt; this.anim += dt;
    if (this.flash > 0) this.flash -= dt;
    var st = this.state;
    switch (st) {
      case "dormant": this.vx = 0; break;
      case "intro":
        this.vx = 0;
        this.dir = p.cx() > this.cx() ? 1 : -1;
        if (this.stateT > 1.0 && !this.howled) { this.howled = true; SS.audio.play("howl"); G.shake = Math.max(G.shake, 8); }
        if (this.stateT > 2.4) this.setState("idle");
        break;
      case "idle":
        this.dir = p.cx() > this.cx() ? 1 : -1;
        var want = Math.abs(p.cx() - this.cx()) > 220 ? this.dir * 60 : Math.abs(p.cx() - this.cx()) < 70 ? -this.dir * 40 : 0;
        this.vx = SS.approach(this.vx, want, 400 * dt);
        if (this.stateT > (this.phase === 2 ? 0.45 : 0.85) && p.state !== "dead") this.choose(G);
        break;
      case "biteWind":
        this.vx = SS.approach(this.vx, 0, 900 * dt);
        if (this.stateT < 0.2) this.dir = p.cx() > this.cx() ? 1 : -1;
        if (this.stateT > 0.58 * k) { this.setState("lunge"); SS.audio.play("bark"); }
        break;
      case "lunge":
        this.vx = this.dir * (this.phase === 2 ? 470 : 410);
        if (Math.random() < 0.6) G.dust(this.cx() - this.dir * 30, this.y + this.h, 1, -this.dir);
        if (this.stateT > 0.32 && !this.snapped) { this.snapped = true; SS.audio.play("bark"); }
        if (this.stateT > 0.48) {
          this.snapped = false;
          if (this.combo > 0) { this.combo--; this.dir = p.cx() > this.cx() ? 1 : -1; this.setState("biteWind"); this.stateT = 0.3; }
          else this.setState("recover");
        }
        break;
      case "breathWind":
        this.vx = SS.approach(this.vx, 0, 900 * dt);
        this.dir = p.cx() > this.cx() ? 1 : -1;
        if (Math.random() < 0.5) {
          var hm = this.heads[this.breathHead];
          G.particles.spawn("ember", hm.x + SS.rand(-3, 3), hm.y + SS.rand(-3, 3), SS.rand(-20, 20), SS.rand(-40, -10), 0.5, 2, "255,150,60", {});
        }
        if (this.stateT > 0.62 * k) { this.setState("breath"); SS.audio.play("flame"); this.shotT = 0; }
        break;
      case "breath":
        this.vx = 0;
        this.shotT -= dt;
        if (this.shotT <= 0) {
          this.shotT = this.phase === 2 ? 0.055 : 0.075;
          var h = this.heads[this.breathHead];
          var a = 0.35 + this.stateT / 0.9 * 0.9;   // el abanico baja poco a poco
          var spd = 240 + Math.random() * 60;
          var pr = new SS.Projectile(h.x + this.dir * 4, h.y + 3, Math.cos(a) * spd * this.dir, Math.sin(a) * spd - 60, "ember");
          pr.grav = 260; pr.life = 2.2;
          G.projectiles.push(pr);
          G.particles.spawn("glow", h.x + this.dir * 6, h.y + 3, this.dir * 60, 10, 0.25, 9, "255,150,60", {});
        }
        if (this.stateT > 0.9) this.setState("recover");
        break;
      case "pounceWind":
        this.vx = SS.approach(this.vx, 0, 900 * dt);
        this.dir = p.cx() > this.cx() ? 1 : -1;
        if (this.stateT > 0.48 * k) {
          this.setState("pounce");
          var air = 0.78;
          this.leapTarget = SS.clamp(p.cx(), 4 * T + this.w / 2, (room.w - 4) * T - this.w / 2);
          this.vy = -(GRAV * air / 2);
          this.vx = SS.clamp((this.leapTarget - this.cx()) / air, -440, 440);
          this.onGround = false;
          SS.audio.play("bark");
        }
        break;
      case "pounce":
        if (this.onGround && this.stateT > 0.15) {
          this.setState("recover");
          this.vx = 0;
          SS.audio.play("slam");
          G.shake = Math.max(G.shake, 8);
          var gy = this.y + this.h;
          G.particles.burst("ember", this.cx(), gy - 4, 16, 200, 0.8, 2.4, "255,140,60", { grav: 300, up: 80 });
          G.hazards.push(new SS.Shockwave(this.x - 4, gy, -1, this.phase === 2 ? 320 : 260, "255,120,50"));
          G.hazards.push(new SS.Shockwave(this.x + this.w + 4, gy, 1, this.phase === 2 ? 320 : 260, "255,120,50"));
        }
        break;
      case "howl":
        this.vx = 0;
        if (this.stateT > 0.7 && !this.rained) {
          this.rained = true;
          G.shake = Math.max(G.shake, 7);
          for (var i = 0; i < 5; i++) {
            var rx = SS.clamp(p.cx() + (i - 2) * 46 + SS.rand(-12, 12), 4 * T, (room.w - 4) * T);
            G.hazards.push(new SS.Rock(rx, 3 * T, i * 0.18, true));
          }
        }
        if (this.stateT > 1.3) { this.rained = false; this.setState("recover"); }
        break;
      case "recover":
        this.vx = SS.approach(this.vx, 0, 900 * dt);
        if (this.stateT > 0.6 * k) this.setState("idle");
        break;
      case "enrage":
        this.vx = 0;
        if (Math.random() < 0.6) G.particles.spawn("ember", this.cx() + SS.rand(-40, 40), this.y + SS.rand(0, 40), 0, -60, 0.8, 2.5, "255,110,40", {});
        if (this.stateT > 1.5) this.setState("idle");
        break;
      case "dying":
        this.vx = 0;
        this.deathT += dt;
        if (Math.random() < 0.5) G.particles.burst("ember", this.cx() + SS.rand(-40, 40), this.cy() + SS.rand(-20, 20), 2, 120, 0.9, 2.5, "255,140,60", { grav: -40 });
        if (Math.random() < 0.3) G.particles.burst("ink", this.cx() + SS.rand(-30, 30), this.cy(), 3, 140, 0.7, 4, "#0b0709", { grav: 300 });
        if (this.deathT > 2.6 && !this.dead) { this.dead = true; G.onBossDefeated(this); }
        break;
    }

    if (st !== "dormant") {
      this.vy = Math.min(this.vy + GRAV * dt, 900);
      var hx = room.moveX(this, this.vx * dt);
      if (hx !== 0 && st === "lunge") { this.setState("recover"); G.shake = Math.max(G.shake, 6); SS.audio.play("slam"); }
      var hy = room.moveY(this, this.vy * dt);
      if (hy === 1) { this.onGround = true; this.vy = 0; } else { this.onGround = false; if (hy === -1) this.vy = 0; }
    }
    this.animate(dt, G);

    // daño
    var active = st !== "dormant" && st !== "intro" && st !== "dying";
    if (active && !p.invulnerable()) {
      if (SS.overlap(this.x + 10, this.y + 10, this.w - 20, this.h - 10, p.x, p.y, p.w, p.h)) p.hurt(G, 1, this.cx());
      else {
        for (var hI = 0; hI < 2; hI++) {
          var hh = this.heads[hI];
          if (SS.overlap(hh.x - 10, hh.y - 8, 20, 16, p.x, p.y, p.w, p.h)) { p.hurt(G, st === "lunge" ? 2 : 1, hh.x); break; }
        }
      }
    }
    if (this.phase === 1 && this.hp <= this.maxHp / 2 && st !== "dying") {
      this.phase = 2;
      this.setState("enrage");
      SS.audio.play("howl");
      G.shake = Math.max(G.shake, 10);
      G.particles.spawn("ring", this.cx(), this.cy(), 0, 0, 0.6, 100, "rgba(255,110,50,0.8)", {});
      this.chains.forEach(function (c) { c.pts.length = Math.max(3, c.pts.length - 2); });
    }
  };

  /** Cajas donde se le puede golpear: cuerpo y cabezas. */
  Can.prototype.hitBoxes = function () {
    var b = [{ x: this.x + 6, y: this.y + 4, w: this.w - 12, h: this.h - 4 }];
    for (var i = 0; i < 2; i++) b.push({ x: this.heads[i].x - 11, y: this.heads[i].y - 9, w: 22, h: 18 });
    return b;
  };

  Can.prototype.hit = function (G, dmg) {
    if (this.state === "dormant" || this.state === "dying" || this.state === "intro") return false;
    this.hp -= dmg;
    this.flash = 0.1;
    G.particles.burst("spark", this.cx() + SS.rand(-20, 20), this.cy() + SS.rand(-10, 10), 8, 260, 0.3, 1.6, "#ffffff", {});
    G.particles.burst("ink", this.cx(), this.cy(), 5, 160, 0.5, 3, "#2a0507", { grav: 400 });
    if (this.hp <= 0) {
      this.hp = 0;
      this.setState("dying");
      this.deathT = 0;
      G.hazards.length = 0;
      G.projectiles.length = 0;
      G.slowmo = 0.9;
      SS.audio.play("howl");
      G.shake = 12;
    }
    return true;
  };

  /* -------------------------------------------------------- animación */
  Can.prototype.animate = function (dt, G) {
    var st = this.state, t = this.anim, d = this.dir, i;
    var moving = Math.abs(this.vx) > 10 && this.onGround;
    this.gait += Math.abs(this.vx) * dt * 0.06;
    var crouch = 4, tilt = 0;
    var tgt = [{ ang: -0.15, jaw: 0.08, lift: 0 }, { ang: 0.12, jaw: 0.08, lift: 0 }];
    switch (st) {
      case "dormant": crouch = 18; tgt[0] = { ang: 0.9, jaw: 0, lift: -4 }; tgt[1] = { ang: 1.0, jaw: 0, lift: -4 }; break;
      case "intro": {
        var kk = SS.smooth(this.stateT / 1.0);
        crouch = SS.lerp(18, 4, kk);
        var how = this.stateT > 1.0 && this.stateT < 2.0;
        tgt[0] = { ang: how ? -1.2 : SS.lerp(0.9, -0.2, kk), jaw: how ? 0.7 : 0.1, lift: how ? 8 : 0 };
        tgt[1] = { ang: how ? -1.0 : SS.lerp(1.0, 0.1, kk), jaw: how ? 0.6 : 0.1, lift: how ? 6 : 0 };
        break;
      }
      case "biteWind": crouch = 11; tilt = 0.14; tgt[0] = { ang: -0.5, jaw: 0.35, lift: -2 }; tgt[1] = { ang: -0.3, jaw: 0.4, lift: -3 }; break;
      case "lunge": {
        crouch = 6; tilt = 0.08;
        var snap = Math.sin(this.stateT * 30) > 0 ? 0.75 : 0.05;
        tgt[0] = { ang: 0.15, jaw: snap, lift: 6 }; tgt[1] = { ang: 0.35, jaw: 0.8 - snap, lift: 5 };
        break;
      }
      case "breathWind": {
        var bh = this.breathHead;
        tgt[bh] = { ang: -1.0, jaw: 0.25, lift: 6 }; tgt[1 - bh] = { ang: 0.2, jaw: 0.15, lift: -2 }; crouch = 2;
        break;
      }
      case "breath": {
        var b2 = this.breathHead, sweep = this.stateT / 0.9;
        tgt[b2] = { ang: SS.lerp(-0.4, 0.7, sweep), jaw: 0.9, lift: 4 }; tgt[1 - b2] = { ang: 0.25, jaw: 0.2, lift: -2 }; crouch = 4;
        break;
      }
      case "pounceWind": crouch = 16; tilt = 0.1; tgt[0] = { ang: -0.2, jaw: 0.3, lift: -3 }; tgt[1] = { ang: 0, jaw: 0.3, lift: -3 }; break;
      case "pounce": crouch = 0; tilt = this.vy < 0 ? -0.18 : 0.15; tgt[0] = { ang: 0.1, jaw: 0.6, lift: 6 }; tgt[1] = { ang: 0.3, jaw: 0.7, lift: 5 }; break;
      case "howl": crouch = 3; tilt = -0.06; tgt[0] = { ang: -1.3, jaw: 0.75, lift: 9 }; tgt[1] = { ang: -1.1, jaw: 0.7, lift: 8 }; break;
      case "recover": crouch = 8; tgt[0] = { ang: 0.3, jaw: 0.4, lift: -3 }; tgt[1] = { ang: 0.5, jaw: 0.45, lift: -4 }; break;
      case "enrage": crouch = 6; tgt[0] = { ang: -0.9 + Math.sin(t * 20) * 0.1, jaw: 0.8, lift: 6 }; tgt[1] = { ang: -0.7 + Math.cos(t * 20) * 0.1, jaw: 0.8, lift: 6 }; break;
      case "dying": crouch = SS.lerp(4, 22, SS.smooth(this.deathT / 1.6)); tgt[0] = { ang: 1.0, jaw: 0.5, lift: -6 }; tgt[1] = { ang: 1.2, jaw: 0.3, lift: -6 }; break;
      default:
        tgt[0].ang += Math.sin(t * 1.7) * 0.15; tgt[1].ang += Math.sin(t * 1.4 + 2) * 0.15;
        tgt[0].jaw = 0.1 + Math.max(0, Math.sin(t * 2.3)) * 0.2; tgt[1].jaw = 0.1 + Math.max(0, Math.sin(t * 2.0 + 1)) * 0.2;
    }
    var kb = SS.damp(st === "lunge" || st === "breath" ? 30 : 10, dt);
    this.crouch += (crouch - this.crouch) * SS.damp(10, dt);
    this.tilt += (tilt - this.tilt) * SS.damp(10, dt);
    var body = this.bodyPts();
    for (i = 0; i < 2; i++) {
      var H = this.heads[i];
      H.ang += (tgt[i].ang - H.ang) * kb;
      H.jaw += (tgt[i].jaw - H.jaw) * kb;
      H.lift += (tgt[i].lift - H.lift) * kb;
      var base = { x: body.sh.x + d * (i ? 6 : -2), y: body.sh.y - 6 + (i ? 3 : 0) };
      var neckL = 26 + H.lift;
      var a = H.ang - 0.55 + (i ? 0.25 : 0);
      H.bx = base.x; H.by = base.y;
      H.x = base.x + Math.cos(a) * neckL * d;
      H.y = base.y + Math.sin(a) * neckL + Math.sin(t * 2 + H.ph) * (moving ? 2 : 1);
      H.eye = st === "breathWind" && i === this.breathHead ? 1 : this.phase === 2 ? 0.9 : 0.6;
    }
    // cola y cadenas con física
    this.tail.pin(0, body.hip.x - d * 8, body.hip.y - 4);
    this.tail.wind = -this.vx * 3 + Math.sin(t * 4) * 150 * (st === "idle" ? 1 : 0.3) - d * 120;
    this.tail.update(dt, null);
    for (i = 0; i < 2; i++) {
      var hh = this.heads[i];
      this.chains[i].moveTo(0, (hh.bx + hh.x) / 2, (hh.by + hh.y) / 2 + 3);
      this.chains[i].update(dt, G.room);
    }
  };

  /** Puntos del cuerpo: cadera, hombros y patas. */
  Can.prototype.bodyPts = function () {
    var d = this.dir, cx = this.cx(), fy = this.y + this.h, cr = this.crouch;
    var hip = { x: cx - d * 30, y: fy - 32 + cr * 0.7 + Math.sin(this.tilt) * 30 * d * d };
    var sh = { x: cx + d * 22, y: fy - 38 + cr - Math.sin(this.tilt) * 20 };
    return { hip: hip, sh: sh };
  };

  /* ---------------------------------------------------------- dibujo */
  Can.prototype.draw = function (ctx, G, time) {
    var fl = this.flash > 0, d = this.dir, st = this.state, i;
    if (st === "dying" && this.deathT > 2.2) ctx.globalAlpha = Math.max(0, 1 - (this.deathT - 2.2) / 0.4);
    var fur = fl ? "#fff" : "#151012", furL = fl ? "#fff" : "#2b2022", bone = fl ? "#fff" : "#8d7f70";
    var B = this.bodyPts(), fy = this.y + this.h;
    ctx.lineCap = "round"; ctx.lineJoin = "round";
    if (st === "pounce") {
      ctx.fillStyle = "rgba(0,0,0,0.35)";
      ctx.beginPath(); ctx.ellipse(this.leapTarget, G.room.ph - 2 * T, 46, 6, 0, 0, 6.283); ctx.fill();
    }
    // patas: pares desfasados; se doblan al agacharse
    var moving = Math.abs(this.vx) > 10 && this.onGround;
    var legs = [
      { hx: B.hip.x - d * 4, hy: B.hip.y + 6, ph: 0, back: true },
      { hx: B.sh.x - d * 6, hy: B.sh.y + 8, ph: Math.PI, back: true },
      { hx: B.hip.x + d * 4, hy: B.hip.y + 6, ph: Math.PI * 0.5, back: false },
      { hx: B.sh.x + d * 2, hy: B.sh.y + 8, ph: Math.PI * 1.5, back: false }
    ];
    var drawLeg = function (L) {
      var sw = moving ? Math.sin(this.gait + L.ph) * 9 : 0, lift = moving ? Math.max(0, Math.cos(this.gait + L.ph)) * 5 : 0;
      if (st === "pounce") sw = (L.hx > this.cx() ? 1 : -1) * 10 * d;
      var footX = L.hx + sw * d, footY = fy - lift;
      var dx = footX - L.hx, dy = footY - L.hy, len = Math.sqrt(dx * dx + dy * dy);
      var kneeOff = Math.sqrt(Math.max(0, 15 * 15 - (len / 2) * (len / 2)));
      var mx = (L.hx + footX) / 2, my = (L.hy + footY) / 2;
      var nx = -dy / (len || 1), ny = dx / (len || 1);
      var bend = L.hx < this.cx() === (d > 0) ? -1 : 1;  // patas traseras doblan al revés
      var kx = mx + nx * kneeOff * bend * d, ky = my + ny * kneeOff * bend * d;
      ctx.strokeStyle = L.back ? (fl ? "#fff" : "#0d0a0b") : fur;
      ctx.lineWidth = L.back ? 6 : 7;
      ctx.beginPath(); ctx.moveTo(L.hx, L.hy); ctx.lineTo(kx, ky); ctx.lineTo(footX, footY); ctx.stroke();
      ctx.fillStyle = ctx.strokeStyle;
      ctx.beginPath(); ctx.ellipse(footX + d * 3, footY - 1.5, 5.5, 2.6, 0, 0, 6.283); ctx.fill();
      if (!L.back && !fl) {
        ctx.strokeStyle = "#c9bca8"; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(footX + d * 7, footY - 1); ctx.lineTo(footX + d * 9, footY); ctx.moveTo(footX + d * 6, footY - 3); ctx.lineTo(footX + d * 9, footY - 2); ctx.stroke();
      }
    }.bind(this);
    drawLeg(legs[0]); drawLeg(legs[1]);
    // cola
    this.tail.draw(ctx, fur, 5, false);
    // cuerpo peludo con lomo erizado
    var hip = B.hip, sh = B.sh;
    ctx.fillStyle = fur;
    ctx.beginPath();
    ctx.moveTo(hip.x - d * 14, hip.y + 4);
    var n = 12;
    for (i = 0; i <= n; i++) {
      var tt = i / n;
      var x = SS.lerp(hip.x - d * 12, sh.x + d * 10, tt);
      var y = SS.lerp(hip.y - 12, sh.y - 16, tt) - Math.sin(tt * Math.PI) * 6;
      var spike = (i % 2 ? 6 : 0) + Math.sin(time * 3 + i) * 0.6;
      ctx.lineTo(x - d * 2, y - spike);
    }
    ctx.lineTo(sh.x + d * 16, sh.y - 4);
    ctx.lineTo(sh.x + d * 12, sh.y + 12);
    for (i = n; i >= 0; i--) {
      var t2 = i / n;
      var bx = SS.lerp(hip.x - d * 10, sh.x + d * 8, t2), byy = SS.lerp(hip.y + 10, sh.y + 14, t2) + Math.sin(t2 * Math.PI) * -4;
      ctx.lineTo(bx, byy + (i % 2 ? 3 : 0));
    }
    ctx.closePath();
    ctx.fill();
    // costillas marcadas y grietas de fuego (fase 2)
    if (!fl) {
      ctx.strokeStyle = furL; ctx.lineWidth = 1.4;
      ctx.beginPath();
      for (i = 0; i < 5; i++) {
        var rx = SS.lerp(hip.x, sh.x, 0.4 + i * 0.1), ry = SS.lerp(hip.y, sh.y, 0.4 + i * 0.1);
        ctx.moveTo(rx - d * 2, ry - 6); ctx.quadraticCurveTo(rx + d * 2, ry + 2, rx, ry + 9);
      }
      ctx.stroke();
      if (this.phase === 2 || st === "enrage") {
        var glowA = 0.5 + Math.sin(time * 8) * 0.2;
        ctx.strokeStyle = "rgba(255,120,40," + glowA.toFixed(2) + ")"; ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(hip.x, hip.y - 6); ctx.lineTo(hip.x + d * 10, hip.y); ctx.lineTo(hip.x + d * 16, hip.y - 8);
        ctx.moveTo(sh.x - d * 10, sh.y - 6); ctx.lineTo(sh.x - d * 4, sh.y + 4); ctx.lineTo(sh.x + d * 4, sh.y);
        ctx.stroke();
        SS.drawGlow(ctx, (hip.x + sh.x) / 2, (hip.y + sh.y) / 2, 40, "255,100,40", 0.15);
      }
    }
    // cuellos, collares, cadenas y cabezas (la de atrás primero)
    var order = d > 0 ? [0, 1] : [0, 1];
    for (var o = 0; o < 2; o++) {
      var H = this.heads[order[o]];
      ctx.strokeStyle = o === 0 ? (fl ? "#fff" : "#100c0d") : fur; ctx.lineWidth = 11;
      ctx.beginPath(); ctx.moveTo(H.bx, H.by); ctx.quadraticCurveTo((H.bx + H.x) / 2, Math.min(H.by, H.y) - 6, H.x, H.y); ctx.stroke();
      // collar de púas
      var cxl = (H.bx + H.x) / 2, cyl = (H.by + H.y) / 2 + 1;
      ctx.strokeStyle = fl ? "#fff" : "#3a2f2a"; ctx.lineWidth = 3.2;
      ctx.beginPath(); ctx.ellipse(cxl, cyl, 3, 7, 0.3 * d, 0, 6.283); ctx.stroke();
      ctx.fillStyle = fl ? "#fff" : "#a9a19a";
      for (var s = 0; s < 3; s++) { ctx.beginPath(); ctx.moveTo(cxl - 2, cyl - 5 + s * 4); ctx.lineTo(cxl - d * 6, cyl - 6 + s * 4); ctx.lineTo(cxl, cyl - 3 + s * 4); ctx.fill(); }
      this.chains[order[o]].draw(ctx, fl ? "#fff" : "#2f2a28", 2.6, true);
      drawHead(ctx, H, d, fl, fur, bone, time, this.phase);
    }
    drawLeg(legs[2]); drawLeg(legs[3]);
    if (st === "breathWind") {
      var hb = this.heads[this.breathHead];
      SS.drawGlow(ctx, hb.x + d * 8, hb.y + 2, 10 + this.stateT * 20, "255,150,60", 0.6);
    }
    ctx.globalAlpha = 1;
  };

  function drawHead(ctx, H, d, fl, fur, bone, time, phase) {
    var a = H.ang;
    ctx.save();
    ctx.translate(H.x, H.y);
    ctx.scale(d * 1.3, 1.3);
    ctx.rotate(a * 0.6);
    // cráneo alargado
    ctx.fillStyle = fur;
    ctx.beginPath();
    ctx.moveTo(-8, -6); ctx.quadraticCurveTo(0, -11, 8, -6); ctx.lineTo(18, -2); ctx.lineTo(19, 1); ctx.lineTo(4, 3); ctx.lineTo(-7, 5);
    ctx.closePath(); ctx.fill();
    // orejas hacia atrás
    ctx.beginPath(); ctx.moveTo(-5, -7); ctx.lineTo(-14, -14); ctx.lineTo(-2, -9); ctx.fill();
    ctx.beginPath(); ctx.moveTo(-1, -9); ctx.lineTo(-8, -17); ctx.lineTo(2, -9); ctx.fill();
    // mandíbula que se abre
    ctx.save();
    ctx.translate(-2, 3);
    ctx.rotate(H.jaw * 0.7);
    ctx.fillStyle = fur;
    ctx.beginPath(); ctx.moveTo(0, -1); ctx.lineTo(18, 0); ctx.lineTo(16, 3); ctx.lineTo(0, 4); ctx.closePath(); ctx.fill();
    ctx.fillStyle = fl ? "#fff" : "#d9cdb8";
    for (var i = 0; i < 4; i++) { ctx.beginPath(); ctx.moveTo(5 + i * 3.4, -0.5); ctx.lineTo(6.2 + i * 3.4, -3); ctx.lineTo(7.4 + i * 3.4, -0.5); ctx.fill(); }
    ctx.restore();
    ctx.fillStyle = fl ? "#fff" : "#d9cdb8";
    for (var j = 0; j < 4; j++) { ctx.beginPath(); ctx.moveTo(6 + j * 3.2, 2); ctx.lineTo(7.2 + j * 3.2, 5 + H.jaw * 2); ctx.lineTo(8.4 + j * 3.2, 2); ctx.fill(); }
    if (H.jaw > 0.4 && !fl) {
      SS.drawGlow(ctx, 10, 4, 10, "255,120,50", (H.jaw - 0.3) * 0.7);
    }
    // hocico y ojos de brasa
    ctx.fillStyle = "#050404"; ctx.beginPath(); ctx.arc(18.5, -1, 1.4, 0, 6.283); ctx.fill();
    var ec = phase === 2 ? "255,70,30" : "255,150,60";
    SS.drawGlow(ctx, 4, -4, 7, ec, H.eye);
    ctx.fillStyle = phase === 2 ? "#ff7a50" : "#ffc070";
    ctx.beginPath(); ctx.ellipse(4, -4, 2, 1.1, -0.2, 0, 6.283); ctx.fill();
    ctx.fillStyle = "#1a0a06"; ctx.fillRect(4.5, -4.6, 0.8, 1.2);
    ctx.restore();
  }
})();
