/* =====================================================================
   Interfaz: menús (principal, pausa, opciones, controles, inventario),
   diálogos, banco con subida de nivel, avisos, títulos de zona,
   barra del jefe, mapa del mundo y HUD dibujado en el lienzo.
   ===================================================================== */
(function () {
  "use strict";
  var SS = window.SS, T = SS.T;
  var U = (SS.ui = { stack: [], dlg: null, bannerT: 0, toastQ: [], toastT: 0, mapReturn: null });
  var $ = function (id) { return document.getElementById(id); };
  var G;

  U.init = function () {
    G = SS.G;
    document.addEventListener("click", function (e) {
      var b = e.target.closest("[data-cmd]");
      if (!b || b.disabled) return;
      SS.audio.init();
      U.cmd(b.getAttribute("data-cmd"), b);
    });
    $("dialog").addEventListener("pointerdown", function () { U.advanceDialog(); });
    $("banner").addEventListener("pointerdown", function () { if (U.bannerT > 0.5) U.closeBanner(); });
    $("o-vol").addEventListener("input", function () {
      SS.options.volume = parseFloat(this.value);
      SS.audio.volume = SS.options.volume;
      SS.audio.applyVolume();
      SS.saveOptions();
    });
    $("o-mute").addEventListener("change", function () {
      SS.options.muted = this.checked; SS.audio.muted = this.checked; SS.audio.applyVolume(); SS.saveOptions();
    });
    $("o-vib").addEventListener("change", function () {
      SS.options.vibration = this.checked; SS.saveOptions(); SS.vibrate(30);
    });
  };

  /* ------------------------------------------------------- utilidades */
  U.show = function (id) { $(id).classList.add("show"); };
  U.hide = function (id) { $(id).classList.remove("show"); };
  U.hideAll = function () {
    var els = document.querySelectorAll("#ui .screen");
    for (var i = 0; i < els.length; i++) els[i].classList.remove("show");
    U.stack = [];
    U.hide("dialog"); U.hide("banner");
  };
  U.menuOpen = function () { return U.stack.length > 0; };
  U.focusFirst = function (id) {
    var el = $(id).querySelector("button:not([disabled]), input");
    if (el && SS.input.lastDevice === "kb") el.focus({ preventScroll: true });
  };
  U.push = function (id) {
    if (U.stack.length) U.hide(U.stack[U.stack.length - 1]);
    U.stack.push(id);
    U.show(id);
    U.focusFirst(id);
  };
  U.back = function () {
    if (!U.stack.length) return;
    if (G.state === "title" && U.stack.length === 1) return;
    var cur = U.stack.pop();
    U.hide(cur);
    SS.audio.play("uiback");
    SS.input.rebind = null;
    if (U.stack.length) {
      var prev = U.stack[U.stack.length - 1];
      if (prev === "m-pause") G.setState("pause");
      if (prev === "m-main") U.refreshMain();
      U.show(prev);
      U.focusFirst(prev);
    } else if (G.state !== "title") {
      U.resume();
    }
  };
  U.resume = function () {
    U.hideAll();
    G.setState("play");
  };

  /** Teclado dentro de los menús: flechas para moverse, Esc para volver. */
  U.onKey = function (e, acts) {
    if (!U.menuOpen()) return false;
    var code = e.code;
    if (code === "Escape") { e.preventDefault(); U.back(); return true; }
    if (code === "ArrowDown" || code === "ArrowUp" || code === "KeyS" || code === "KeyW") {
      var cur = $(U.stack[U.stack.length - 1]);
      var items = Array.prototype.slice.call(cur.querySelectorAll("button:not([disabled]), input"));
      if (!items.length) return true;
      var i = items.indexOf(document.activeElement);
      var dn = code === "ArrowDown" || code === "KeyS";
      i = i < 0 ? 0 : (i + (dn ? 1 : -1) + items.length) % items.length;
      items[i].focus({ preventScroll: true });
      e.preventDefault();
      return true;
    }
    if (code === "KeyM" && U.stack[U.stack.length - 1] === "m-map") { U.back(); return true; }
    return code === "Enter" || code === "Space";
  };

  /* --------------------------------------------------------- comandos */
  U.cmd = function (c, el) {
    SS.audio.play("ui");
    switch (c) {
      case "new":
        if (G.hasSave()) U.confirm("Ya existe una partida guardada. ¿Empezar de nuevo y borrarla?", function () { G.startNew(); });
        else G.startNew();
        break;
      case "continue": G.continueGame(); break;
      case "controls": U.renderControls(); U.push("m-controls"); break;
      case "options": U.renderOptions(); U.push("m-options"); break;
      case "back": U.back(); break;
      case "resume": U.resume(); break;
      case "pause": if (G.state === "play") U.openPause(); break;
      case "map":
        if (G.state === "play") U.openMap();
        else if (G.state === "pause") { U.mapReturn = "pause"; G.state = "map"; U.push("m-map"); U.drawMap(); }
        break;
      case "inventory": U.renderInventory(); U.push("m-inventory"); break;
      case "rebench":
        U.confirm("¿Volver al último banco? Tu esencia actual se conserva.", function () {
          U.hideAll(); G.setState("play");
          G.fadeTo(function () { G.respawn(); }, 3);
        });
        break;
      case "quit":
        U.confirm("¿Salir al menú principal? El progreso se guarda en los bancos.", function () { G.persist(); G.toTitle(); });
        break;
      case "confirm-yes": var fn = U.confirmFn; U.confirmFn = null; U.back(); if (fn) fn(); break;
      case "confirm-no": U.confirmFn = null; U.back(); break;
      case "delete":
        U.confirm("¿Borrar la partida guardada? Esta acción no se puede deshacer.", function () {
          G.deleteSave();
          if (G.state !== "title") G.toTitle(); else U.refreshMain();
          U.toast("Partida borrada.");
        });
        break;
      case "tsize":
        SS.options.touchSize = el.getAttribute("data-v"); SS.saveOptions(); G.resize(); U.renderOptions(); break;
      case "tmode":
        SS.options.touchMode = el.getAttribute("data-v"); SS.saveOptions(); G.resize(); U.renderOptions(); break;
      case "rebind": U.startRebind(el.getAttribute("data-a"), el); break;
      case "reset-keys":
        SS.input.keymap = SS.input.defaultKeymap(); SS.options.keymap = null; SS.saveOptions(); U.renderControls();
        break;
      case "up-hp": if (G.upgrade("hp")) U.renderBench(); break;
      case "up-atk": if (G.upgrade("atk")) U.renderBench(); break;
      case "bench-leave": U.resume(); if (G.player && G.player.state === "sit") G.player.setState("normal"); break;
      case "close-map": U.back(); break;
      case "end-continue": U.resume(); break;
      case "end-menu": G.toTitle(); break;
      case "end-new": U.confirm("¿Empezar una partida nueva? Se borrará la actual.", function () { G.startNew(); }); break;
    }
  };

  U.confirm = function (text, fn) {
    $("c-text").textContent = text;
    U.confirmFn = fn;
    U.push("m-confirm");
  };

  /* ----------------------------------------------------------- menús */
  U.refreshMain = function () {
    $("btn-continue").disabled = !G.hasSave();
  };
  U.showMain = function () {
    U.hideAll();
    U.refreshMain();
    U.stack = ["m-main"];
    U.show("m-main");
    U.focusFirst("m-main");
  };

  U.openPause = function () {
    if (G.state !== "play") return;
    G.setState("pause");
    U.stack = [];
    U.push("m-pause");
    SS.audio.play("ui");
  };

  U.openMap = function () {
    G.setState("map");
    U.mapReturn = "play";
    U.stack = [];
    U.push("m-map");
    U.drawMap();
  };
  U.mapTick = function () { U.drawMap(); };

  U.openBench = function () {
    G.setState("bench");
    U.stack = [];
    U.renderBench();
    U.push("m-bench");
  };

  U.renderBench = function () {
    var s = G.save, costs = SS.UPGRADE_COST;
    var hpC = costs.hp[s.lvlHp || 0], atC = costs.atk[s.lvlAtk || 0];
    var html = "<h2>Banco · " + G.room.def.name + "</h2>" +
      "<p class='muted'>Vida restaurada y partida guardada. Aquí reaparecerás si caes.</p>" +
      "<div class='stat-row'><span>Nivel <b>" + G.level() + "</b></span><span>Esencia <b class='ess'>" + s.essence + "</b></span></div>" +
      "<button data-cmd='up-hp'" + (hpC === undefined || s.essence < hpC ? " disabled" : "") + ">" +
      "<span class='bt'>Subir Vida</span><span class='bd'>" + G.maxHp() + " → " + (G.maxHp() + 1) + " almas</span>" +
      "<span class='bc'>" + (hpC === undefined ? "Máximo" : hpC + " esencia") + "</span></button>" +
      "<button data-cmd='up-atk'" + (atC === undefined || s.essence < atC ? " disabled" : "") + ">" +
      "<span class='bt'>Subir Ataque</span><span class='bd'>Daño " + (2 + (s.lvlAtk || 0)) + " → " + (3 + (s.lvlAtk || 0)) + "</span>" +
      "<span class='bc'>" + (atC === undefined ? "Máximo" : atC + " esencia") + "</span></button>" +
      "<button data-cmd='bench-leave' class='primary'>Levantarse</button>";
    $("m-bench").innerHTML = html;
    U.focusFirst("m-bench");
  };

  U.renderOptions = function () {
    var o = SS.options;
    $("o-vol").value = o.volume;
    $("o-mute").checked = o.muted;
    $("o-vib").checked = o.vibration;
    var b = document.querySelectorAll("#m-options [data-cmd='tsize']");
    for (var i = 0; i < b.length; i++) b[i].classList.toggle("on", b[i].getAttribute("data-v") === o.touchSize);
    b = document.querySelectorAll("#m-options [data-cmd='tmode']");
    for (i = 0; i < b.length; i++) b[i].classList.toggle("on", b[i].getAttribute("data-v") === o.touchMode);
    $("o-delete").disabled = !G.hasSave();
  };

  U.renderControls = function () {
    var I = SS.input, rows = "";
    I.ACTS.forEach(function (a) {
      var keys = (I.keymap[a] || []).map(function (k) { return "<kbd>" + I.keyName(k) + "</kbd>"; }).join(" ");
      rows += "<tr><td>" + I.LABELS[a] + "</td><td>" + keys + "</td><td><button class='mini' data-cmd='rebind' data-a='" + a + "'>Cambiar</button></td></tr>";
    });
    $("ctl-table").innerHTML = rows;
  };

  U.startRebind = function (act, btn) {
    btn.textContent = "Pulsa una tecla…";
    SS.input.rebind = function (code) {
      if (code !== "Escape") {
        var km = SS.input.keymap;
        for (var a in km) km[a] = km[a].filter(function (k) { return k !== code; });
        km[act] = [code].concat((km[act] || []).filter(function (k) { return k !== code; })).slice(0, 2);
        SS.options.keymap = JSON.parse(JSON.stringify(km));
        SS.saveOptions();
      }
      U.renderControls();
    };
  };

  U.renderInventory = function () {
    var s = G.save, html = "";
    html += "<div class='inv-grid'>" +
      "<div><span>Nivel</span><b>" + G.level() + "</b></div>" +
      "<div><span>Vida máxima</span><b>" + G.maxHp() + "</b></div>" +
      "<div><span>Daño</span><b>" + (2 + (s.lvlAtk || 0)) + "</b></div>" +
      "<div><span>Esencia</span><b class='ess'>" + s.essence + "</b></div></div>";
    html += "<h3>Habilidades</h3><ul class='inv-list'>";
    ["dash", "charge", "doublejump"].forEach(function (id) {
      var ab = SS.ABILITIES[id], got = s.abilities[id];
      html += "<li class='" + (got ? "got" : "lock") + "'><i>" + (got ? ab.icon : "?") + "</i><div><b>" + (got ? ab.name : "Habilidad desconocida") +
        "</b><small>" + (got ? ab.desc : "Sigue explorando para descubrirla.") + "</small></div></li>";
    });
    html += "</ul><h3>Exploración</h3><ul class='inv-list small'>";
    html += "<li><i>◆</i><div><b>Reliquias " + s.relics.length + " / " + SS.RELIC_TOTAL + "</b><small>" +
      (s.relics.length ? s.relics.map(function (k) { return SS.RELICS[k]; }).join(", ") : "Ocultas tras muros que suenan huecos…") + "</small></div></li>";
    html += "<li><i>✧</i><div><b>Fragmentos de alma: " + (s.fragments || 0) + "</b><small>Cada uno aumenta tu vida máxima.</small></div></li>";
    html += "<li><i>☠</i><div><b>El Verdugo: " + (s.bosses.verdugo ? "derrotado" : "sin derrotar") + "</b><small>Jefe del Bosque Marchito.</small></div></li>";
    html += "</ul><h3>Zonas</h3><ul class='zones'>";
    SS.ZONE_ORDER.forEach(function (z) {
      var known = SS.ZONES[z] && s.zones[z];
      var name = SS.ZONES[z] ? SS.ZONES[z].name : SS.ZONE_FUTURE[z];
      html += "<li class='" + (known ? "got" : "lock") + "'>" + (known ? "✓ " + name : "🔒 " + (SS.ZONES[z] ? "???" : name + " (próxima fase)")) + "</li>";
    });
    var mins = Math.floor(s.playTime / 60);
    html += "</ul><p class='muted center'>Tiempo de juego " + Math.floor(mins / 60) + "h " + (mins % 60) + "m · Caídas " + s.deaths + "</p>";
    $("inv-body").innerHTML = html;
  };

  U.showEnd = function () {
    var s = G.save, mins = Math.floor(s.playTime / 60);
    $("end-body").innerHTML =
      "<p>Venciste al Verdugo y la runa del portón te reconoce. Las Minas del Silencio, la Ciudad Hundida, la Sombra Gemela y el Rey Vacío te esperan en la siguiente fase.</p>" +
      "<div class='inv-grid'><div><span>Nivel</span><b>" + G.level() + "</b></div><div><span>Reliquias</span><b>" + s.relics.length + "/" + SS.RELIC_TOTAL + "</b></div>" +
      "<div><span>Caídas</span><b>" + s.deaths + "</b></div><div><span>Tiempo</span><b>" + Math.floor(mins / 60) + "h " + (mins % 60) + "m</b></div></div>";
    G.setState("end");
    U.stack = [];
    U.push("m-end");
  };

  /* -------------------------------------------------- diálogos y avisos */
  U.dialog = function (who, pages, onDone) {
    U.dlg = { pages: pages, i: 0, done: onDone, t: 0 };
    $("d-who").textContent = who;
    $("d-text").textContent = pages[0];
    U.show("dialog");
    G.setState("dialog");
  };
  U.advanceDialog = function () {
    var d = U.dlg;
    if (!d || d.t < 0.2) return;
    d.i++;
    d.t = 0;
    SS.audio.play("ui");
    if (d.i >= d.pages.length) {
      U.hide("dialog");
      U.dlg = null;
      G.setState("play");
      ["jump", "attack", "up", "special"].forEach(SS.input.consume);
      if (d.done) d.done();
      return;
    }
    $("d-text").textContent = d.pages[d.i];
  };

  U.banner = function (title, name, desc) {
    $("bn-title").textContent = title;
    $("bn-name").textContent = name;
    $("bn-desc").textContent = desc;
    U.bannerT = 0;
    U.show("banner");
    G.setState("banner");
  };
  U.closeBanner = function () {
    U.hide("banner");
    G.setState("play");
    ["jump", "attack", "up", "special"].forEach(SS.input.consume);
  };

  U.toast = function (text) {
    if (!text) return;
    U.toastQ.push(text);
  };

  U.areaTitle = function (zone, room) {
    var el = $("area-title");
    el.querySelector(".at-zone").textContent = zone;
    el.querySelector(".at-room").textContent = room;
    el.classList.remove("anim");
    void el.offsetWidth;
    el.classList.add("anim");
  };
  U.roomTitle = function (room) {
    var el = $("room-title");
    el.textContent = room;
    el.classList.remove("anim");
    void el.offsetWidth;
    el.classList.add("anim");
  };

  U.showBoss = function (boss) {
    U.boss = boss;
    U.bossLag = 1;
    $("bossbar").querySelector(".bb-name").textContent = boss.name;
    $("bossbar").classList.add("show");
  };
  U.hideBoss = function () { U.boss = null; $("bossbar").classList.remove("show"); };

  U.syncHudButtons = function () {
    document.body.classList.toggle("in-play", !!G && G.state === "play");
  };

  /** Lógica de interfaz por paso: diálogos, banners, avisos, barra del jefe. */
  U.step = function (dt) {
    var I = SS.input;
    if (G.state === "dialog" && U.dlg) {
      U.dlg.t += dt;
      if (I.pressed.jump || I.pressed.attack || I.pressed.up || I.pressed.special) U.advanceDialog();
    } else if (G.state === "banner") {
      U.bannerT += dt;
      if (U.bannerT > 0.6 && (I.pressed.jump || I.pressed.attack || I.pressed.up || I.pressed.special)) U.closeBanner();
    } else if (G.state === "map") {
      if (I.pressed.map) { I.consume("map"); U.back(); }
    }
    // avisos
    var tEl = $("toast");
    if (U.toastT > 0) {
      U.toastT -= dt;
      if (U.toastT <= 0) tEl.classList.remove("show");
    } else if (U.toastQ.length && G.state !== "title") {
      tEl.textContent = U.toastQ.shift();
      tEl.classList.add("show");
      U.toastT = 3.6;
    }
    // barra del jefe
    if (U.boss) {
      var k = Math.max(0, U.boss.hp / U.boss.maxHp);
      U.bossLag = U.bossLag > k ? Math.max(k, U.bossLag - dt * 0.35) : k;
      var bb = $("bossbar");
      bb.querySelector(".bb-fill").style.width = (k * 100).toFixed(1) + "%";
      bb.querySelector(".bb-lag").style.width = (U.bossLag * 100).toFixed(1) + "%";
      bb.classList.toggle("p2", U.boss.phase === 2);
    }
  };

  /* --------------------------------------------------------------- HUD */
  function soul(ctx, x, y, r, full, t) {
    ctx.beginPath();
    ctx.moveTo(x, y - r * 1.25); ctx.lineTo(x + r * 0.8, y); ctx.lineTo(x, y + r * 1.25); ctx.lineTo(x - r * 0.8, y);
    ctx.closePath();
    if (full) {
      SS.drawGlow(ctx, x, y, r * 2.4, "200,225,255", 0.35);
      ctx.fillStyle = "#f2f6ff";
      ctx.fill();
      ctx.fillStyle = "rgba(160,190,230,0.7)";
      ctx.beginPath(); ctx.moveTo(x, y - r * 1.25); ctx.lineTo(x + r * 0.8, y); ctx.lineTo(x, y); ctx.closePath(); ctx.fill();
    } else {
      ctx.fillStyle = "rgba(0,0,0,0.45)";
      ctx.fill();
      ctx.strokeStyle = "rgba(220,230,255,0.35)";
      ctx.lineWidth = 1.2;
      ctx.stroke();
    }
  }

  U.drawHUD = function (ctx, w, h, g) {
    if (!g.player) return;
    var s = g.uiScale, p = g.player, x = 22 * s, y = 22 * s, i;
    ctx.save();
    var hpShown = Math.max(0, p.hp);
    for (i = 0; i < p.maxHp; i++) soul(ctx, x + i * 19 * s, y, 7 * s, i < hpShown, g.time);
    // esencia
    var ey = y + 26 * s;
    SS.drawGlow(ctx, x, ey, 13 * s, "255,200,120", 0.7);
    ctx.fillStyle = "#fff1d0";
    ctx.beginPath(); ctx.arc(x, ey, 3.2 * s, 0, 6.283); ctx.fill();
    ctx.font = "600 " + Math.round(15 * s) + "px Georgia, serif";
    ctx.textBaseline = "middle";
    ctx.textAlign = "left";
    ctx.fillStyle = "rgba(0,0,0,0.6)";
    ctx.fillText(String(Math.max(0, Math.round(g.essDisplay))), x + 12 * s + 1, ey + 1);
    ctx.fillStyle = "#f3e6cf";
    ctx.fillText(String(Math.max(0, Math.round(g.essDisplay))), x + 12 * s, ey);
    // nivel y habilidades
    var ay = ey + 22 * s;
    ctx.font = "600 " + Math.round(11 * s) + "px Georgia, serif";
    ctx.fillStyle = "rgba(230,225,215,0.75)";
    ctx.fillText("Nv " + g.level(), x - 6 * s, ay);
    var ax = x + 30 * s;
    ["dash", "charge", "doublejump"].forEach(function (id) {
      if (!g.save.abilities[id]) return;
      var ab = SS.ABILITIES[id];
      ctx.strokeStyle = "rgba(200,225,255,0.5)";
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.arc(ax, ay, 8 * s, 0, 6.283); ctx.stroke();
      var ready = id !== "dash" || p.dodgeCd <= 0;
      ctx.fillStyle = ready ? "#dceaff" : "rgba(220,234,255,0.35)";
      ctx.textAlign = "center";
      ctx.fillText(ab.icon, ax, ay + 0.5);
      ctx.textAlign = "left";
      ax += 20 * s;
    });
    ctx.restore();
  };

  /* -------------------------------------------------------------- mapa */
  U.drawMap = function () {
    var cv = $("map-canvas"), box = cv.getBoundingClientRect();
    if (!box.width) return;
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var W = Math.round(box.width * dpr), H = Math.round(box.height * dpr);
    if (cv.width !== W || cv.height !== H) { cv.width = W; cv.height = H; }
    var c = cv.getContext("2d"), s = G.save, t = G.time;
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.clearRect(0, 0, W, H);
    var minX = 1e9, minY = 1e9, maxX = -1e9, maxY = -1e9, id, r;
    for (id in SS.ROOMS) {
      r = SS.ROOMS[id];
      minX = Math.min(minX, r.g[0]); minY = Math.min(minY, r.g[1]);
      maxX = Math.max(maxX, r.g[0] + r.rows[0].length); maxY = Math.max(maxY, r.g[1] + r.rows.length);
    }
    maxX += 14; // espacio para la flecha hacia las minas
    var pad = 24 * dpr;
    var sc = Math.min((W - pad * 2) / (maxX - minX), (H - pad * 2) / (maxY - minY));
    var ox = (W - (maxX - minX) * sc) / 2 - minX * sc, oy = (H - (maxY - minY) * sc) / 2 - minY * sc;
    var px = function (gx) { return ox + gx * sc; }, py = function (gy) { return oy + gy * sc; };
    var zoneCenters = {};

    for (id in SS.ROOMS) {
      if (!s.discovered[id]) continue;
      r = SS.ROOMS[id];
      var z = SS.ZONES[r.zone], rw = r.rows[0].length, rh = r.rows.length;
      var cur = G.room && G.room.id === id;
      c.fillStyle = "rgba(0,0,0,0.35)";
      c.fillRect(px(r.g[0]), py(r.g[1]), rw * sc, rh * sc);
      c.fillStyle = cur ? z.mapColor : z.mapFill.replace("0.30", "0.55").replace("0.28", "0.5");
      for (var ty = 0; ty < rh; ty++) {
        for (var tx = 0; tx < rw; tx++) {
          var ch = r.rows[ty][tx];
          if (ch === "#" || ch === "G") continue;
          if (ch === "S" && !s.collected[id + ":" + tx + ":" + ty]) continue;
          c.fillRect(px(r.g[0] + tx), py(r.g[1] + ty), sc + 0.6, sc + 0.6);
        }
      }
      c.strokeStyle = cur ? "rgba(255,255,255,0.9)" : "rgba(255,255,255,0.18)";
      c.lineWidth = cur ? 1.6 * dpr : 1 * dpr;
      c.strokeRect(px(r.g[0]) + 0.5, py(r.g[1]) + 0.5, rw * sc - 1, rh * sc - 1);
      var zc = zoneCenters[r.zone] || (zoneCenters[r.zone] = { x: 0, y: 1e9, n: 0, xs: 0 });
      zc.xs += r.g[0] + rw / 2; zc.n++; zc.y = Math.min(zc.y, r.g[1]);
      // iconos
      for (ty = 0; ty < rh; ty++) {
        for (tx = 0; tx < rw; tx++) {
          ch = r.rows[ty][tx];
          var ix = px(r.g[0] + tx + 0.5), iy = py(r.g[1] + ty + 0.5);
          if (ch === "B") { SS.drawGlow(c, ix, iy, 9 * dpr, "255,200,130", 0.9); c.fillStyle = "#ffe2b0"; c.fillRect(ix - 2 * dpr, iy - 2 * dpr, 4 * dpr, 4 * dpr); }
          if (ch === "K" && !s.bosses[r.boss]) { c.fillStyle = "#ff7a5a"; c.font = "bold " + (12 * dpr) + "px Georgia"; c.textAlign = "center"; c.textBaseline = "middle"; c.fillText("☠", ix, iy - 4 * dpr); }
          if (ch === "a" && !s.abilities[r.ability]) { SS.drawGlow(c, ix, iy, 8 * dpr, "170,220,255", 0.9); }
        }
      }
      // salidas hacia lugares sin descubrir
      r.exits.forEach(function (e) {
        if (s.discovered[e.to]) return;
        var exx, eyy, mid = (e.a + e.b + 1) / 2;
        if (e.side === "L") { exx = r.g[0] - 1.5; eyy = r.g[1] + mid; }
        else if (e.side === "R") { exx = r.g[0] + rw + 1.5; eyy = r.g[1] + mid; }
        else if (e.side === "U") { exx = r.g[0] + mid; eyy = r.g[1] - 1.5; }
        else { exx = r.g[0] + mid; eyy = r.g[1] + rh + 1.5; }
        if (r.rows[0].length && e.side === "R" && e.a === 4 && !s.collected[id + ":39:4"]) return; // secreto aún oculto
        c.fillStyle = "rgba(255,255,255,0.55)";
        c.font = "bold " + (11 * dpr) + "px Georgia";
        c.textAlign = "center"; c.textBaseline = "middle";
        c.fillText("?", px(exx), py(eyy));
      });
      if (id === "b5") {
        var gx = px(r.g[0] + rw + 2), gy = py(r.g[1] + 8);
        c.strokeStyle = "rgba(140,220,255,0.6)"; c.lineWidth = 1.5 * dpr;
        c.beginPath(); c.moveTo(gx, gy); c.lineTo(gx + 8 * sc, gy); c.lineTo(gx + 6 * sc, gy - 2 * sc); c.moveTo(gx + 8 * sc, gy); c.lineTo(gx + 6 * sc, gy + 2 * sc); c.stroke();
        c.fillStyle = "rgba(180,220,235,0.8)"; c.font = "italic " + (10 * dpr) + "px Georgia"; c.textAlign = "left";
        c.fillText("Minas del Silencio (próxima fase)", gx, gy - 4 * sc);
      }
    }
    // eco
    if (s.eco && s.discovered[s.eco.room]) {
      var er = SS.ROOMS[s.eco.room];
      var exs = px(er.g[0] + s.eco.x / T), eys = py(er.g[1] + s.eco.y / T);
      SS.drawGlow(c, exs, eys, 10 * dpr, "160,120,255", 0.9);
      c.fillStyle = "#d8c8ff"; c.fillRect(exs - 1.5 * dpr, eys - 1.5 * dpr, 3 * dpr, 3 * dpr);
    }
    // nombres de zona
    for (var zid in zoneCenters) {
      var zc2 = zoneCenters[zid];
      c.fillStyle = SS.ZONES[zid].mapColor;
      c.font = "600 " + (13 * dpr) + "px Georgia";
      c.textAlign = "center"; c.textBaseline = "bottom";
      c.fillText(SS.ZONES[zid].name.toUpperCase(), px(zc2.xs / zc2.n), py(zc2.y) - 6 * dpr);
    }
    // jugador
    if (G.room && G.player) {
      var rr = SS.ROOMS[G.room.id];
      var plx = px(rr.g[0] + G.player.cx() / T), ply = py(rr.g[1] + G.player.cy() / T);
      var pul = 0.6 + Math.sin(t * 6) * 0.4;
      SS.drawGlow(c, plx, ply, 14 * dpr, "160,235,255", pul);
      c.fillStyle = "#ffffff";
      c.beginPath(); c.arc(plx, ply, 3 * dpr, 0, 6.283); c.fill();
    }
    var room = G.room ? G.room.def.name + " · " + G.room.zone.name : "";
    $("map-where").textContent = room;
  };
})();
