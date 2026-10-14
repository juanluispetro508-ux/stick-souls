/* =====================================================================
   Introducción animada de la historia (partida nueva).
   Seis escenas dibujadas con código y las pinturas de las zonas:
   el reino, la llama de la princesa, el Rey Vacío, la caída del
   guardián, la brasa y el despertar. Se puede pasar escena a escena
   (tocar / Saltar / Enter) o saltar toda la introducción.
   ===================================================================== */
(function () {
  "use strict";
  var SS = window.SS;
  var DUR = 5.2;

  var C = (SS.cine = { active: false, i: 0, t: 0, cards: null, onDone: null, embers: [] });

  C.start = function (onDone) {
    C.cards = SS.STORY.intro;
    C.i = 0; C.t = 0; C.active = true; C.onDone = onDone; C.embers = [];
    C.pose = SS.basePose();
    SS.audio.setZone("intro");
    document.body.classList.add("cine");
  };

  C.next = function () {
    if (!C.active || C.t < 0.6) return;
    C.i++; C.t = 0;
    if (C.i >= C.cards.length) C.finish();
  };
  C.finish = function () {
    if (!C.active) return;
    C.active = false;
    document.body.classList.remove("cine");
    var fn = C.onDone; C.onDone = null;
    if (fn) fn();
  };

  C.update = function (dt) {
    if (!C.active) return;
    C.t += dt;
    var I = SS.input;
    if (I.pressed.jump || I.pressed.attack || I.pressed.up) C.next();
    if (I.pressed.pause) C.finish();
    if (C.t > DUR) { C.i++; C.t = 0; if (C.i >= C.cards.length) { C.finish(); return; } }
    // brasas y ceniza de la escena
    if (Math.random() < 0.14) C.embers.push({ x: Math.random(), y: 1.05, vx: (Math.random() - 0.5) * 0.02, vy: -0.03 - Math.random() * 0.05, life: 4 + Math.random() * 3, s: 1 + Math.random() * 1.6 });
    for (var i = C.embers.length - 1; i >= 0; i--) {
      var e = C.embers[i];
      e.x += e.vx * dt + Math.sin(C.t + i) * 0.002; e.y += e.vy * dt; e.life -= dt;
      if (e.life <= 0) C.embers.splice(i, 1);
    }
  };

  function cover(ctx, im, vw, vh, zoom, panX, panY, alpha) {
    if (!im) return;
    var sc = Math.max(vw / im.width, vh / im.height) * zoom;
    var w = im.width * sc, h = im.height * sc;
    ctx.globalAlpha = alpha;
    ctx.drawImage(im, (vw - w) * (0.5 + panX), (vh - h) * (0.5 + panY), w, h);
    ctx.globalAlpha = 1;
  }

  function princess(ctx, x, y, s, glow, time, alpha) {
    // silueta provisional (el diseño final lo enviará Juan): vestido largo, velo y corona
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(x, y);
    ctx.scale(s, s);
    SS.drawGlow(ctx, 0, -40, 70, "255,220,170", 0.25 * glow);
    ctx.fillStyle = "#0e0b0d";
    ctx.beginPath();
    ctx.moveTo(-6, -46); ctx.quadraticCurveTo(-9, -30, -18, 0); ctx.lineTo(18, 0); ctx.quadraticCurveTo(9, -30, 6, -46);
    ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.arc(0, -52, 5.5, 0, 6.283); ctx.fill();
    // velo que se mece
    ctx.beginPath();
    ctx.moveTo(-4, -57); ctx.quadraticCurveTo(-14 + Math.sin(time * 1.5) * 2, -40, -12 + Math.sin(time * 1.2) * 3, -22); ctx.lineTo(-6, -40); ctx.closePath(); ctx.fill();
    // corona
    ctx.fillStyle = "#d9b46a";
    ctx.beginPath(); ctx.moveTo(-4.5, -57); ctx.lineTo(-3.5, -61); ctx.lineTo(-1.5, -58); ctx.lineTo(0, -62); ctx.lineTo(1.5, -58); ctx.lineTo(3.5, -61); ctx.lineTo(4.5, -57); ctx.closePath(); ctx.fill();
    // brazos sosteniendo la llama
    ctx.strokeStyle = "#0e0b0d"; ctx.lineWidth = 2.4; ctx.lineCap = "round";
    ctx.beginPath(); ctx.moveTo(-5, -42); ctx.lineTo(-2, -33); ctx.lineTo(4, -34); ctx.moveTo(5, -42); ctx.lineTo(6, -34); ctx.stroke();
    if (glow > 0) {
      var f = 0.85 + Math.sin(time * 9) * 0.1;
      SS.drawGlow(ctx, 5, -40, 22 * f, "255,190,110", 0.9 * glow);
      ctx.fillStyle = "rgba(255,236,190," + glow.toFixed(2) + ")";
      ctx.beginPath(); ctx.ellipse(5, -39, 2.2 * f, 4.5 * f, 0, 0, 6.283); ctx.fill();
    }
    ctx.restore();
  }

  function castle(ctx, x, y, s, time, lit) {
    ctx.save();
    ctx.translate(x, y); ctx.scale(s, s);
    ctx.fillStyle = "#0d0a0c";
    ctx.beginPath();
    ctx.moveTo(-120, 0); ctx.lineTo(-120, -40); ctx.lineTo(-90, -40); ctx.lineTo(-90, -80); ctx.lineTo(-84, -96); ctx.lineTo(-78, -80);
    ctx.lineTo(-78, -50); ctx.lineTo(-40, -50); ctx.lineTo(-40, -110); ctx.lineTo(-30, -140); ctx.lineTo(-20, -110); ctx.lineTo(-20, -60);
    ctx.lineTo(20, -60); ctx.lineTo(20, -95); ctx.lineTo(28, -118); ctx.lineTo(36, -95); ctx.lineTo(36, -45); ctx.lineTo(80, -45);
    ctx.lineTo(80, -70); ctx.lineTo(86, -84); ctx.lineTo(92, -70); ctx.lineTo(92, -35); ctx.lineTo(130, -35); ctx.lineTo(130, 0);
    ctx.closePath(); ctx.fill();
    if (lit > 0) {
      ctx.fillStyle = "rgba(255,200,120," + (0.8 * lit).toFixed(2) + ")";
      [[-84, -70], [-30, -95], [-30, -80], [28, -85], [86, -60], [-60, -38], [50, -32]].forEach(function (w, i) {
        var fl = 0.7 + Math.sin(time * 3 + i) * 0.3;
        ctx.globalAlpha = fl * lit;
        ctx.fillRect(w[0] - 1.5, w[1] - 3, 3, 5);
      });
      ctx.globalAlpha = 1;
    }
    ctx.restore();
  }

  C.draw = function (ctx, vw, vh, time) {
    if (!C.active) return;
    var card = C.cards[Math.min(C.i, C.cards.length - 1)];
    var t = C.t, k = t / DUR, sc = card.scene;
    var fadeIn = SS.smooth(t / 0.8), fadeOut = 1 - SS.smooth((t - (DUR - 0.7)) / 0.7);
    var vis = fadeIn * fadeOut;
    ctx.fillStyle = "#050405";
    ctx.fillRect(0, 0, vw, vh);
    var bosque = SS.img("fondo_bosque"), refugio = SS.img("fondo_refugio");
    var gy = vh * 0.82;

    if (sc === "reino") {
      var sky = ctx.createLinearGradient(0, 0, 0, vh);
      sky.addColorStop(0, "#1e2a3a"); sky.addColorStop(0.6, "#6a4f4a"); sky.addColorStop(1, "#c08860");
      ctx.globalAlpha = vis; ctx.fillStyle = sky; ctx.fillRect(0, 0, vw, vh); ctx.globalAlpha = 1;
      SS.drawGlow(ctx, vw * 0.62, vh * 0.55, vh * 0.7, "255,190,120", 0.35 * vis);
      castle(ctx, vw * 0.55 - k * 20, gy, vh / 300 * 0.95, time, vis);
      ctx.globalAlpha = vis;
      ctx.fillStyle = "#0a0809"; ctx.fillRect(0, gy, vw, vh - gy);
      ctx.globalAlpha = 1;
      ctx.strokeStyle = "rgba(20,14,16," + vis.toFixed(2) + ")"; ctx.lineWidth = 1.4;
      for (var b = 0; b < 5; b++) SS.drawBird(ctx, vw * (0.15 + k * 0.4) + b * 16, vh * 0.25 + Math.sin(b) * 8, 5, Math.sin(time * 9 + b) * 0.8);
    } else if (sc === "llama") {
      cover(ctx, refugio, vw, vh, 1.25, -0.15 + k * 0.1, 0, 0.35 * vis);
      ctx.fillStyle = "rgba(10,6,8," + (0.5 * vis).toFixed(2) + ")"; ctx.fillRect(0, 0, vw, vh);
      SS.drawGlow(ctx, vw / 2, gy - 50, vh * 0.6, "255,170,100", 0.25 * vis);
      princess(ctx, vw / 2, gy, vh / 300 * 1.3, 1, time, vis);
    } else if (sc === "rey") {
      cover(ctx, refugio, vw, vh, 1.3, 0.1 - k * 0.15, 0.1, 0.25 * vis);
      ctx.fillStyle = "rgba(0,0,0," + (0.55 * vis).toFixed(2) + ")"; ctx.fillRect(0, 0, vw, vh);
      var fall = SS.smooth((t - 1.4) / 2.5);
      // el Rey Vacío: una sombra enorme con corona de púas y ojos vacíos
      ctx.save();
      ctx.globalAlpha = vis * SS.smooth(t / 1.5);
      var kx = vw * 0.68, ky = gy + 10, ks = vh / 300;
      ctx.fillStyle = "#020102";
      ctx.beginPath();
      ctx.moveTo(kx - 90 * ks, ky); ctx.quadraticCurveTo(kx - 70 * ks, ky - 140 * ks, kx - 20 * ks, ky - 180 * ks);
      ctx.lineTo(kx - 16 * ks, ky - 200 * ks); ctx.lineTo(kx - 8 * ks, ky - 186 * ks); ctx.lineTo(kx, ky - 210 * ks); ctx.lineTo(kx + 8 * ks, ky - 186 * ks);
      ctx.lineTo(kx + 16 * ks, ky - 200 * ks); ctx.lineTo(kx + 20 * ks, ky - 180 * ks);
      ctx.quadraticCurveTo(kx + 70 * ks, ky - 140 * ks, kx + 90 * ks, ky);
      ctx.closePath(); ctx.fill();
      ctx.fillStyle = "#e9eef5";
      ctx.beginPath(); ctx.ellipse(kx - 8 * ks, ky - 160 * ks, 3 * ks, 1.6 * ks, 0, 0, 6.283); ctx.ellipse(kx + 8 * ks, ky - 160 * ks, 3 * ks, 1.6 * ks, 0, 0, 6.283); ctx.fill();
      SS.drawGlow(ctx, kx, ky - 160 * ks, 26 * ks, "200,220,255", 0.4);
      ctx.restore();
      // la princesa se hunde en la oscuridad y su llama se apaga
      princess(ctx, vw * 0.36 + fall * vw * 0.18, gy + fall * 60, vh / 300 * 1.1, Math.max(0, 1 - fall * 1.6), time, vis * (1 - fall * 0.8));
      if (fall > 0.3 && fall < 0.9) SS.drawGlow(ctx, vw * 0.4 + fall * vw * 0.18, gy - 40, 30, "120,120,130", 0.3 * vis);
    } else if (sc === "caida") {
      cover(ctx, refugio, vw, vh, 1.2, 0.2 - k * 0.1, 0, 0.55 * vis);
      ctx.fillStyle = "rgba(20,4,4," + (0.35 * vis).toFixed(2) + ")"; ctx.fillRect(0, 0, vw, vh);
      var fk = SS.smooth((t - 1.2) / 1.6);
      var P = SS.basePose();
      var stand = { aF: 1.5, eF: 0, sw: 1.6, lean: 0.25, tF: 0.6, kF: -0.4, tB: -0.6, kB: 0.1 };
      var kneel = { crouch: 8, tF: 1.5, kF: -2.4, tB: 0.2, kB: -1.9, aF: 0.3, eF: 0.4, sw: 0.1, lean: 0.55, head: 0.6, aB: 0.4, eB: 0.6 };
      var down = { rot: 1.45, pivot: 2, crouch: 0, tF: 0.2, kF: -0.3, tB: -0.1, kB: 0, aF: 2.2, eF: 0.2, sw: 2.6, aB: 1.6, head: 0.3 };
      var A = SS.lerpPose(P, stand, 1), Bp = SS.lerpPose(P, kneel, 1), Cp = SS.lerpPose(P, down, 1);
      var pose = fk < 0.5 ? SS.lerpPose(A, Bp, SS.smooth(fk * 2)) : SS.lerpPose(Bp, Cp, SS.smooth((fk - 0.5) * 2));
      var s = vh / 300 * 1.9, x = vw * 0.45, y = gy;
      ctx.save();
      ctx.globalAlpha = vis;
      ctx.translate(x, y); ctx.scale(s, s);
      var J = SS.solveJoints(pose, 0, 0, 1, 1);
      SS.drawKnight(ctx, J, { dir: 1, sw: pose.sw, hood: null, skirt: null });
      ctx.restore();
      if (t > 1.0 && t < 1.6) { ctx.fillStyle = "rgba(255,255,255," + (0.25 * (1 - (t - 1) / 0.6)).toFixed(2) + ")"; ctx.fillRect(0, 0, vw, vh); }
    } else if (sc === "brasa") {
      ctx.fillStyle = "#070506"; ctx.fillRect(0, 0, vw, vh);
      cover(ctx, refugio, vw, vh, 1.4, 0, 0.3, 0.2 * vis);
      var s2 = vh / 300 * 1.9;
      ctx.save(); ctx.globalAlpha = vis;
      ctx.translate(vw * 0.48, gy); ctx.scale(s2, s2);
      var lie = SS.lerpPose(SS.basePose(), { rot: 1.5, pivot: 2, tF: 0.1, kF: -0.1, aF: 0.4, eF: 0.4, sw: 1.2, head: 0.3 }, 1);
      SS.drawKnight(ctx, SS.solveJoints(lie, 0, 0, 1, 1), { dir: 1, sw: lie.sw, eyes: false });
      ctx.restore();
      var pulse = 0.5 + 0.5 * Math.sin(time * 2.4);
      SS.drawGlow(ctx, vw * 0.48, gy - 10 * s2 / 1.9, (20 + pulse * 20) * SS.smooth(t / 2), "255,140,60", 0.8 * vis);
      ctx.fillStyle = "rgba(160,150,140," + (0.5 * vis).toFixed(2) + ")";
      for (var a2 = 0; a2 < 40; a2++) ctx.fillRect((a2 * 97 + time * 8) % vw, ((a2 * 53) + time * 20 * (0.5 + (a2 % 3) * 0.3)) % vh, 1.5, 1);
    } else {
      cover(ctx, refugio, vw, vh, 1.08 + k * 0.05, 0, 0, vis);
      ctx.fillStyle = "rgba(0,0,0," + (0.35 * vis).toFixed(2) + ")"; ctx.fillRect(0, 0, vw, vh);
      var kn = SS.img("k_frente");
      if (kn) {
        var h = vh * 0.62, w = kn.width / kn.height * h;
        ctx.globalAlpha = vis * SS.smooth((t - 0.6) / 1.4);
        ctx.drawImage(kn, vw * 0.5 - w / 2, vh * 0.92 - h, w, h);
        ctx.globalAlpha = 1;
      }
    }
    // brasas flotando por toda la escena
    for (var i = 0; i < C.embers.length; i++) {
      var e = C.embers[i];
      SS.drawGlow(ctx, e.x * vw, e.y * vh, e.s * 4, "255,140,60", 0.5 * Math.min(1, e.life));
    }
    // viñeta
    var vg = ctx.createRadialGradient(vw / 2, vh / 2, Math.min(vw, vh) * 0.3, vw / 2, vh / 2, Math.max(vw, vh) * 0.7);
    vg.addColorStop(0, "rgba(0,0,0,0)"); vg.addColorStop(1, "rgba(0,0,0,0.75)");
    ctx.fillStyle = vg; ctx.fillRect(0, 0, vw, vh);
    // texto en cursiva
    var ta = SS.smooth((t - 0.5) / 0.9) * fadeOut;
    ctx.globalAlpha = ta;
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    var fs = Math.max(11, Math.min(17, vw / 30));
    ctx.font = "italic " + fs + "px " + SS.FONT_T;
    var lines = wrap(ctx, card.text, vw * 0.84);
    for (var l = 0; l < lines.length; l++) {
      var ly = vh * 0.17 + l * fs * 1.35;
      ctx.fillStyle = "rgba(0,0,0,0.7)";
      ctx.fillText(lines[l], vw / 2 + 1, ly + 1);
      ctx.fillStyle = "#f1e6d4";
      ctx.fillText(lines[l], vw / 2, ly);
    }
    ctx.globalAlpha = 1;
    // progreso
    for (var p = 0; p < C.cards.length; p++) {
      ctx.fillStyle = p <= C.i ? "rgba(240,220,190,0.8)" : "rgba(240,220,190,0.2)";
      ctx.beginPath(); ctx.arc(vw / 2 + (p - (C.cards.length - 1) / 2) * 9, vh - 10, 1.8, 0, 6.283); ctx.fill();
    }
  };

  function wrap(ctx, text, maxW) {
    var words = text.split(" "), lines = [], cur = "";
    for (var i = 0; i < words.length; i++) {
      var test = cur ? cur + " " + words[i] : words[i];
      if (ctx.measureText(test).width > maxW && cur) { lines.push(cur); cur = words[i]; }
      else cur = test;
    }
    if (cur) lines.push(cur);
    return lines;
  }
  SS.wrapText = wrap;
})();
