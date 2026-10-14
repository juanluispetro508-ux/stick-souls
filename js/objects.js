/* =====================================================================
   Dibujo de los objetos del escenario: puesto de cerveza (con tabernero),
   inscripciones, ermitaño, altar, reliquias, fragmentos, cristales,
   portón y argollas del gancho.
   ===================================================================== */
(function () {
  "use strict";
  var SS = window.SS, T = SS.T;
  var D = (SS.drawObject = {});

  /* Puesto de cerveza: mostrador de tablones, toldo de tela que ondea,
     barriles, botellas, farol, letrero y un tabernero encapuchado. */
  D.stand = function (ctx, o, t, G) {
    var cx = o.x + T / 2, by = o.y + T;
    var used = G.save.stand === G.room.id;
    var wood = "#2b1d14", woodL = "#4a3323", woodD = "#160e09";
    // postes
    ctx.fillStyle = woodD;
    ctx.fillRect(cx - 34, by - 62, 4, 62);
    ctx.fillRect(cx + 30, by - 62, 4, 62);
    // tabernero detrás del mostrador (limpia una jarra)
    var wipe = Math.sin(t * 2.2);
    ctx.fillStyle = "#120d0e";
    ctx.beginPath();
    ctx.moveTo(cx + 2, by - 20); ctx.quadraticCurveTo(cx + 3, by - 44, cx + 12, by - 47); ctx.quadraticCurveTo(cx + 21, by - 44, cx + 22, by - 20);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = "#3b2a22";
    ctx.beginPath(); ctx.moveTo(cx + 5, by - 40); ctx.quadraticCurveTo(cx + 12, by - 56, cx + 19, by - 40); ctx.closePath(); ctx.fill();
    ctx.fillStyle = "#e8d8b8"; ctx.fillRect(cx + 8 + 0.5, by - 43, 1.2, 1.2); ctx.fillRect(cx + 12 + 0.5, by - 43, 1.2, 1.2);
    ctx.strokeStyle = "#120d0e"; ctx.lineWidth = 2.2; ctx.lineCap = "round";
    ctx.beginPath(); ctx.moveTo(cx + 6, by - 34); ctx.lineTo(cx + 2 + wipe * 2, by - 28); ctx.moveTo(cx + 18, by - 34); ctx.lineTo(cx + 6 + wipe * 3, by - 27); ctx.stroke();
    ctx.fillStyle = "#8a6b3a"; ctx.fillRect(cx + 1 + wipe * 2, by - 31, 5, 6);
    ctx.fillStyle = "#e9dcc0"; ctx.fillRect(cx + 1 + wipe * 2, by - 31, 5, 1.6);
    // mostrador
    ctx.fillStyle = wood;
    ctx.fillRect(cx - 26, by - 22, 54, 22);
    ctx.fillStyle = woodL;
    ctx.fillRect(cx - 28, by - 24, 58, 4);
    ctx.strokeStyle = woodD; ctx.lineWidth = 1;
    ctx.beginPath();
    for (var p = 0; p < 4; p++) { ctx.moveTo(cx - 26, by - 18 + p * 5); ctx.lineTo(cx + 28, by - 18 + p * 5); }
    ctx.stroke();
    // botellas sobre el mostrador
    for (var b = 0; b < 4; b++) {
      var bx = cx - 20 + b * 6 + (b > 1 ? 18 : 0);
      ctx.fillStyle = b % 2 ? "#3c2610" : "#24361f";
      ctx.fillRect(bx, by - 31, 3.4, 7); ctx.fillRect(bx + 0.9, by - 34, 1.6, 3);
      ctx.fillStyle = "rgba(255,230,180,0.35)"; ctx.fillRect(bx + 0.6, by - 30, 0.7, 4);
    }
    // barriles al costado
    ctx.fillStyle = "#3a2719";
    ctx.beginPath(); ctx.ellipse(cx + 40, by - 9, 7, 9, 0, 0, 6.283); ctx.fill();
    ctx.beginPath(); ctx.ellipse(cx + 40, by - 24, 6, 7, 0, 0, 6.283); ctx.fill();
    ctx.strokeStyle = "#6d5a48"; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(cx + 33, by - 12); ctx.lineTo(cx + 47, by - 12); ctx.moveTo(cx + 33, by - 6); ctx.lineTo(cx + 47, by - 6); ctx.stroke();
    // banquito para sentarse
    ctx.fillStyle = woodL;
    ctx.fillRect(cx - 30, by - 13, 16, 3);
    ctx.fillStyle = woodD;
    ctx.fillRect(cx - 28, by - 10, 2, 10); ctx.fillRect(cx - 18, by - 10, 2, 10);
    // toldo de tela que ondea
    ctx.fillStyle = "#5a1a1c";
    ctx.beginPath();
    ctx.moveTo(cx - 40, by - 60); ctx.lineTo(cx + 40, by - 60); ctx.lineTo(cx + 44, by - 52);
    for (var w = 0; w <= 8; w++) {
      var wx = cx + 44 - w * 11, wy = by - 50 + Math.sin(t * 2.4 + w * 0.9) * 1.6 + (w % 2) * 3;
      ctx.lineTo(wx, wy);
    }
    ctx.lineTo(cx - 44, by - 52);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = "rgba(255,210,170,0.12)";
    for (var s = 0; s < 4; s++) ctx.fillRect(cx - 38 + s * 22, by - 60, 8, 8);
    // letrero colgante
    var sw = Math.sin(t * 1.3) * 0.06;
    ctx.save();
    ctx.translate(cx - 16, by - 50);
    ctx.rotate(sw);
    ctx.strokeStyle = woodD; ctx.lineWidth = 0.8;
    ctx.beginPath(); ctx.moveTo(-8, 0); ctx.lineTo(-8, 4); ctx.moveTo(8, 0); ctx.lineTo(8, 4); ctx.stroke();
    ctx.fillStyle = woodL; ctx.fillRect(-13, 4, 26, 9);
    ctx.fillStyle = "#f0d9a8";
    ctx.font = "italic 7px " + SS.FONT_T;
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText("Cerveza", 0, 8.8);
    ctx.restore();
    // farol del puesto
    var fl = 0.85 + Math.sin(t * 7) * 0.08 + Math.sin(t * 13) * 0.04;
    ctx.fillStyle = "#1a1412"; ctx.fillRect(cx + 22, by - 50, 6, 8);
    ctx.fillStyle = "#ffd28a"; ctx.fillRect(cx + 23.5, by - 48, 3, 4);
    SS.drawGlow(ctx, cx + 25, by - 46, (used ? 46 : 34) * fl, "255,180,110", used ? 0.6 : 0.45);
  };

  D.tablet = function (ctx, o, t, G) {
    var cx = o.x + T / 2, by = o.y + T, near = G.interact === o;
    ctx.fillStyle = "#1a1719";
    ctx.beginPath();
    ctx.moveTo(cx - 9, by); ctx.lineTo(cx - 9, by - 22); ctx.quadraticCurveTo(cx, by - 30, cx + 9, by - 22); ctx.lineTo(cx + 9, by);
    ctx.fill();
    ctx.strokeStyle = near ? "rgba(255,200,160,0.9)" : "rgba(255,200,160,0.25)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (var l = 0; l < 4; l++) { ctx.moveTo(cx - 5, by - 20 + l * 4); ctx.lineTo(cx + 5 - (l % 2) * 3, by - 20 + l * 4); }
    ctx.stroke();
    if (near) SS.drawGlow(ctx, cx, by - 16, 22, "255,200,150", 0.3);
  };

  D.npc = function (ctx, o, t) {
    var cx = o.x + T / 2, by = o.y + T;
    var sway = Math.sin(t * 1.2) * 0.04;
    var P = SS.basePose();
    P.crouch = 9; P.tF = 1.5; P.kF = -1.5; P.tB = 1.35; P.kB = -1.4; P.lean = 0.3 + sway; P.head = 0.3;
    P.aF = 0.9; P.eF = 0.9; P.aB = 0.4; P.eB = 0.8;
    var J = SS.solveJoints(P, cx - 4, by, -1, 1);
    SS.drawHusk(ctx, J, { dir: -1, flash: false, sword: 0, eyes: 0.4, rag: "#2a2126" });
    // capucha y bastón
    ctx.fillStyle = "#2a2126";
    ctx.beginPath();
    ctx.moveTo(J.head.x - 8, J.head.y + 9);
    ctx.quadraticCurveTo(J.head.x - 8, J.head.y - 10, J.head.x + 1, J.head.y - 9);
    ctx.quadraticCurveTo(J.head.x + 8, J.head.y - 4, J.head.x + 7, J.head.y + 9);
    ctx.fill();
    ctx.strokeStyle = "#2a1d14"; ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.moveTo(J.hF.x, J.hF.y - 4); ctx.lineTo(J.hF.x - 2, by); ctx.stroke();
    // fogata a su lado
    var f = 0.8 + Math.sin(t * 9) * 0.1 + Math.sin(t * 17) * 0.05;
    SS.drawGlow(ctx, cx - 20, by - 6, 30 * f, "255,160,90", 0.5);
    ctx.fillStyle = "#2a1a12"; ctx.fillRect(cx - 27, by - 3, 14, 3);
    ctx.fillStyle = "#ffb25a";
    ctx.beginPath(); ctx.moveTo(cx - 25, by - 3); ctx.quadraticCurveTo(cx - 20, by - 14 * f, cx - 15, by - 3); ctx.fill();
    ctx.fillStyle = "#ffe2a0";
    ctx.beginPath(); ctx.moveTo(cx - 22, by - 3); ctx.quadraticCurveTo(cx - 20, by - 8 * f, cx - 18, by - 3); ctx.fill();
    if (Math.random() < 0.1) SS.G.particles.spawn("ember", cx - 20 + SS.rand(-3, 3), by - 8, SS.rand(-8, 8), SS.rand(-40, -20), 1.2, 1.6, "255,160,80", {});
  };

  D.altar = function (ctx, o, t) {
    var cx = o.x + T / 2, by = o.y + T;
    ctx.fillStyle = "#1b1a1f";
    ctx.fillRect(cx - 10, by - 14, 20, 14);
    ctx.fillRect(cx - 13, by - 17, 26, 4);
    if (!o.taken) {
      var fy = by - 32 + Math.sin(t * 2) * 3;
      SS.drawGlow(ctx, cx, fy, 34, "170,220,255", 0.6);
      ctx.fillStyle = "#e8f6ff";
      ctx.beginPath(); ctx.arc(cx, fy, 4, 0, 6.283); ctx.fill();
      for (var k = 0; k < 3; k++) {
        var a = t * 2 + k * 2.09;
        ctx.fillRect(cx + Math.cos(a) * 11 - 1, fy + Math.sin(a) * 4 - 1, 2, 2);
      }
    }
  };

  D.relic = function (ctx, o, t) {
    var cx = o.x + T / 2, by = o.y + T, ry = by - 16 + Math.sin(t * 2.5) * 2.5;
    SS.drawGlow(ctx, cx, ry, 18, "255,210,120", 0.55);
    ctx.fillStyle = "#ffdf9a";
    ctx.beginPath(); ctx.moveTo(cx, ry - 6); ctx.lineTo(cx + 4, ry); ctx.lineTo(cx, ry + 6); ctx.lineTo(cx - 4, ry); ctx.closePath(); ctx.fill();
  };

  D.fragment = function (ctx, o, t) {
    var cx = o.x + T / 2, by = o.y + T, fy2 = by - 16 + Math.sin(t * 2) * 3, pul = 0.8 + Math.sin(t * 5) * 0.2;
    SS.drawGlow(ctx, cx, fy2, 26 * pul, "220,235,255", 0.6);
    ctx.fillStyle = "#ffffff";
    ctx.beginPath(); ctx.moveTo(cx, fy2 - 8); ctx.lineTo(cx + 5, fy2); ctx.lineTo(cx, fy2 + 8); ctx.lineTo(cx - 5, fy2); ctx.closePath(); ctx.fill();
  };

  D.deposit = function (ctx, o) {
    var cx = o.x + T / 2, by = o.y + T, fl = o.flash > 0, crack = 4 - o.hp;
    SS.drawGlow(ctx, cx, by - 10, 20, "255,190,120", 0.3);
    ctx.fillStyle = fl ? "#ffffff" : "#d9a77a";
    ctx.beginPath(); ctx.moveTo(cx - 9, by); ctx.lineTo(cx - 6, by - 16); ctx.lineTo(cx - 2, by); ctx.fill();
    ctx.beginPath(); ctx.moveTo(cx - 3, by); ctx.lineTo(cx + 1, by - 22 + crack * 2); ctx.lineTo(cx + 5, by); ctx.fill();
    ctx.beginPath(); ctx.moveTo(cx + 3, by); ctx.lineTo(cx + 8, by - 12); ctx.lineTo(cx + 10, by); ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,0.6)";
    ctx.fillRect(cx, by - 18 + crack * 2, 1, 8);
  };

  D.gate = function (ctx, o, t, G) {
    var gx = o.x + o.w / 2, gy = o.y + o.h / 2, open = G.save.bosses.verdugo;
    ctx.fillStyle = "#151a1d";
    ctx.fillRect(o.x - 6, o.y - 12, o.w + 6, o.h + 12);
    ctx.strokeStyle = open ? "rgba(255,200,150,0.9)" : "rgba(150,140,130,0.35)";
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(gx, gy, 16, 0, 6.283); ctx.stroke();
    ctx.beginPath(); ctx.arc(gx, gy, 9, 0, 6.283); ctx.moveTo(gx, gy - 16); ctx.lineTo(gx, gy + 16); ctx.moveTo(gx - 16, gy); ctx.lineTo(gx + 16, gy); ctx.stroke();
    if (open) SS.drawGlow(ctx, gx, gy, 44, "255,190,130", 0.35 + Math.sin(t * 2) * 0.08);
  };

  /* Argolla de hierro para el gancho: cuelga de una cadena corta y brilla
     cuando está al alcance. */
  D.ring = function (ctx, o, t, G) {
    var x = o.cx, y = o.cy, p = G.player;
    var target = p && p.hookTarget === o, has = G.save.abilities.hook;
    if (o.top !== null && o.top !== undefined && o.top < y - 6) {
      ctx.strokeStyle = "#2a2422"; ctx.lineWidth = 1.6;
      ctx.beginPath();
      for (var k = o.top; k < y - 7; k += 5) { ctx.moveTo(x - 1.2, k); ctx.lineTo(x + 1.2, k + 3.5); }
      ctx.stroke();
    }
    if (target) {
      var pul = 0.75 + Math.sin(t * 8) * 0.25;
      SS.drawGlow(ctx, x, y, 26 * pul, "255,210,150", 0.55);
      ctx.strokeStyle = "rgba(255,225,190," + (0.6 * pul).toFixed(2) + ")"; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.arc(x, y, 12 + Math.sin(t * 6) * 1.5, 0, 6.283); ctx.stroke();
    } else if (has) {
      SS.drawGlow(ctx, x, y, 14, "255,190,140", 0.15);
    }
    ctx.strokeStyle = "#0e0b0b"; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.arc(x, y, 6, 0, 6.283); ctx.stroke();
    ctx.strokeStyle = target ? "#e9d2b0" : "#8d8178"; ctx.lineWidth = 2.2;
    ctx.beginPath(); ctx.arc(x, y, 6, 0, 6.283); ctx.stroke();
    ctx.fillStyle = "#1a1514"; ctx.fillRect(x - 2.5, y - 9, 5, 3);
  };
})();
