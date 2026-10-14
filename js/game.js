/* =====================================================================
   STICK SOULS · bucle principal y reglas del juego.
   Estados: title, play, pause, map, dialog, bench, banner, end.
   Paso fijo de 1/60 s con acumulador (la velocidad no depende de los FPS).
   ===================================================================== */
(function () {
  "use strict";
  var SS = window.SS, T = SS.T;
  var SAVE_KEY = "stickSouls.save.v1", OPT_KEY = "stickSouls.opts.v1";

  var G = (SS.G = {
    state: "title", time: 0, hitstop: 0, shake: 0, slowmo: 0, atkId: 0, cinematic: false,
    fade: { a: 1, dir: -1, cb: null, speed: 2, hold: false },
    cam: { x: 0, y: 0 }, view: { w: 533, h: 300 }, uiScale: 1,
    enemies: [], projectiles: [], hazards: [], orbs: [], birds: [], ecos: [], timers: [],
    boss: null, room: null, player: null, save: null, particles: null,
    hints: {}, essDisplay: 0, areaShown: null, interact: null, transitioning: false,
    pendingDeath: false, deathTimer: 0, saveDirtyT: 0, essDirty: false
  });

  var canvas, ctx, dpr = 1, cssW = 1, cssH = 1, scale = 1, last = 0, acc = 0;

  SS.defaultOptions = function () {
    return { volume: 0.7, muted: false, vibration: true, touchSize: "M", touchMode: "auto", keymap: null };
  };
  SS.saveOptions = function () { SS.store.set(OPT_KEY, SS.options); };

  /* ------------------------------------------------------------ inicio */
  G.init = function () {
    SS.options = Object.assign(SS.defaultOptions(), SS.store.get(OPT_KEY, {}) || {});
    canvas = document.getElementById("game");
    ctx = canvas.getContext("2d");
    SS.input.init(SS.options.keymap ? JSON.parse(JSON.stringify(SS.options.keymap)) : null);
    SS.input.setupMouse(canvas);
    SS.input.setupTouch(document.getElementById("touch"));
    SS.audio.volume = SS.options.volume;
    SS.audio.muted = SS.options.muted;
    G.particles = new SS.Particles(520);
    G.titleRoom = new SS.Room("r1", G.newSave());
    SS.ui.init();
    window.addEventListener("resize", G.resize);
    window.addEventListener("orientationchange", function () { setTimeout(G.resize, 250); });
    G.resize();
    G.toTitle();
    requestAnimationFrame(frame);
    if ("serviceWorker" in navigator && location.protocol.indexOf("http") === 0) {
      navigator.serviceWorker.register("sw.js").catch(function () { /* sin caché offline */ });
    }
  };

  G.touchMode = function () {
    var m = SS.options.touchMode;
    return m === "on" || (m === "auto" && SS.isTouchDevice());
  };

  G.resize = function () {
    var touch = G.touchMode();
    var portrait = window.innerHeight > window.innerWidth;
    document.body.classList.toggle("touch", touch);
    document.body.classList.toggle("portrait", portrait && touch);
    document.body.setAttribute("data-tsize", SS.options.touchSize);
    var r = document.getElementById("stage").getBoundingClientRect();
    cssW = Math.max(1, r.width);
    cssH = Math.max(1, r.height);
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(cssW * dpr);
    canvas.height = Math.round(cssH * dpr);
    scale = Math.min(cssH / 300, cssW / (cssW < cssH ? 350 : 400));
    G.view.w = cssW / scale;
    G.view.h = cssH / scale;
    G.uiScale = SS.clamp(Math.min(cssW, cssH) / 420, 0.75, 1.45);
    requestAnimationFrame(function () { SS.input.refreshRects(); });
    if (G.room) G.snapCamera();
  };

  /* ----------------------------------------------------------- partida */
  G.newSave = function () {
    return {
      v: 1, room: "r1", bench: null, essence: 0, lvlHp: 0, lvlAtk: 0, fragments: 0, relics: [],
      abilities: { dash: false, charge: false, doublejump: false }, bosses: {}, discovered: {},
      collected: {}, eco: null, npcStage: 0, zones: {}, playTime: 0, deaths: 0, phaseEnd: false
    };
  };
  G.hasSave = function () { return !!SS.store.get(SAVE_KEY, null); };
  G.persist = function () { if (G.save) SS.store.set(SAVE_KEY, G.save); G.essDirty = false; };
  G.deleteSave = function () { SS.store.del(SAVE_KEY); };
  G.maxHp = function () { return 5 + (G.save.lvlHp || 0) + (G.save.fragments || 0); };
  G.level = function () { return 1 + (G.save.lvlHp || 0) + (G.save.lvlAtk || 0); };

  G.startNew = function () {
    G.save = G.newSave();
    G.persist();
    G.beginPlay(true);
  };

  G.continueGame = function () {
    var s = SS.store.get(SAVE_KEY, null);
    if (!s) return;
    G.save = Object.assign(G.newSave(), s);
    G.save.abilities = Object.assign({ dash: false, charge: false, doublejump: false }, s.abilities || {});
    G.beginPlay(false);
  };

  G.respawnPoint = function () {
    var s = G.save;
    if (s.bench && SS.ROOMS[s.bench]) return { room: s.bench, bench: true };
    return { room: "r1", start: true };
  };

  G.beginPlay = function (isNew) {
    G.player = new SS.Player(0, 0);
    G.player.maxHp = G.maxHp();
    G.player.hp = G.player.maxHp;
    G.essDisplay = G.save.essence;
    G.areaShown = null;
    G.timers.length = 0;
    G.hints = {};
    var sp = G.respawnPoint();
    G.loadRoom(sp.room, null, null, sp);
    if (isNew) G.player.setState("wake");
    else if (sp.bench) G.player.setState("sit");
    SS.ui.hideAll();
    G.setState("play");
    G.fade.a = 1; G.fade.dir = -1; G.fade.speed = 1.6; G.fade.cb = null; G.fade.hold = false;
    SS.audio.init();
    if (isNew) G.after(2.4, function () { G.hint("move", G.touchMode() ? "Usa ◀ ▶ para moverte y «Salto» para saltar." : "Muévete con A / D o las flechas. Salta con Espacio."); });
  };

  G.toTitle = function () {
    G.state = "title";
    G.room = null;
    G.boss = null;
    G.particles.clear();
    SS.BG.reset();
    G.cam.x = 0; G.cam.y = Math.max(0, G.titleRoom.ph - G.view.h);
    SS.ui.showMain();
    SS.ui.hideBoss();
    SS.audio.setZone("menu");
    G.fade.a = 1; G.fade.dir = -1; G.fade.speed = 1.2; G.fade.cb = null; G.fade.hold = false;
    document.body.classList.remove("playing");
    SS.input.touchActive = false;
  };

  G.setState = function (s) {
    G.state = s;
    var playing = s === "play";
    document.body.classList.toggle("playing", s !== "title");
    SS.input.touchActive = playing;
    if (!playing) SS.input.clear();
    SS.ui.syncHudButtons();
  };

  G.after = function (sec, fn) { G.timers.push({ t: sec, fn: fn }); };

  G.hint = function (id, text) {
    if (G.hints[id]) return;
    G.hints[id] = true;
    SS.ui.toast(text);
  };

  /* -------------------------------------------------------- habitaciones */
  G.loadRoom = function (id, at, side, spawn) {
    var room = (G.room = new SS.Room(id, G.save));
    G.enemies.length = 0; G.projectiles.length = 0; G.hazards.length = 0;
    G.orbs.length = 0; G.birds.length = 0; G.ecos.length = 0;
    G.boss = null;
    G.particles.clear();
    SS.BG.reset();
    SS.ui.hideBoss();
    G.spawnEnemies();
    if (room.def.boss && room.bossPos && !G.save.bosses[room.def.boss]) {
      G.boss = new SS.Verdugo(room.bossPos.x * T, room.bossPos.y * T);
    }
    if (G.save.eco && G.save.eco.room === id) G.ecos.push(new SS.Eco(G.save.eco.x, G.save.eco.y, G.save.eco.val));

    var p = G.player;
    if (at) {
      p.placeAt(at[0] * T + T / 2 - p.w / 2, (at[1] + 1) * T - p.h);
      if (side === "U") p.vy = -700;
    } else if (spawn && spawn.bench && room.bench) {
      p.placeAt(room.bench.x * T + T / 2 - p.w / 2, (room.bench.y + 1) * T - p.h);
      p.vx = 0; p.vy = 0;
    } else if (room.start) {
      p.placeAt(room.start.x * T + T / 2 - p.w / 2, (room.start.y + 1) * T - p.h);
      p.vx = 0; p.vy = 0;
    }
    var firstVisit = !G.save.discovered[id];
    G.save.discovered[id] = true;
    G.save.room = id;
    G.save.zones[room.zoneId] = true;
    if (G.areaShown !== room.zoneId) {
      G.areaShown = room.zoneId;
      SS.ui.areaTitle(room.zone.name, room.def.name);
    } else if (firstVisit) {
      SS.ui.roomTitle(room.def.name);
    }
    SS.audio.setZone(room.def.music || room.zone.music);
    G.snapCamera();
    G.persist();
  };

  G.spawnEnemies = function () {
    var room = G.room;
    G.enemies.length = 0;
    for (var i = 0; i < room.spawns.length; i++) {
      var sp = room.spawns[i];
      if (sp.type === "b") G.birds.push(new SS.Bird(sp.x, sp.y));
      else G.enemies.push(new SS.Enemy(sp.type, sp.x, sp.y));
    }
  };

  G.checkExits = function () {
    var p = G.player, room = G.room, cx = p.cx(), cy = p.cy(), side = null, n = 0;
    if (cx < 0) { side = "L"; n = Math.floor(cy / T); }
    else if (cx > room.pw) { side = "R"; n = Math.floor(cy / T); }
    else if (cy < 0) { side = "U"; n = Math.floor(cx / T); }
    else if (p.y > room.ph) { side = "D"; n = Math.floor(cx / T); }
    if (!side) return;
    var e = room.exitAt(side, n);
    if (!e) {
      var ex = room.def.exits;
      for (var i = 0; i < ex.length; i++) if (ex[i].side === side) { e = ex[i]; break; }
    }
    if (!e) {
      p.x = SS.clamp(p.x, 0, room.pw - p.w);
      p.y = SS.clamp(p.y, 0, room.ph - p.h);
      return;
    }
    G.transition(e, side);
  };

  G.transition = function (e, side) {
    G.transitioning = true;
    var p = G.player, vx = p.vx, vy = p.vy;
    G.fadeTo(function () {
      G.loadRoom(e.to, e.at, side);
      p.vx = vx;
      if (side === "L" || side === "R") p.vy = Math.min(vy, 0) * 0.6;
      if (side === "D") p.vy = Math.max(vy, 60);
      G.transitioning = false;
    }, 6);
  };

  G.fadeTo = function (cb, speed) {
    G.fade.dir = 1; G.fade.cb = cb; G.fade.speed = speed || 5; G.fade.hold = false;
  };

  function updateFade(dt) {
    var f = G.fade;
    if (f.dir === 1) {
      f.a += dt * f.speed;
      if (f.a >= 1) {
        f.a = 1;
        var cb = f.cb; f.cb = null; f.dir = -1;
        if (cb) cb();
      }
    } else if (f.dir === -1 && !f.hold) {
      f.a -= dt * f.speed * 0.85;
      if (f.a <= 0) { f.a = 0; f.dir = 0; }
    }
  }

  /* ------------------------------------------------------------- cámara */
  G.cameraTarget = function () {
    var p = G.player, v = G.view;
    var tx = p.cx() + p.dir * 36 - v.w / 2;
    var ty = p.cy() - v.h * 0.56;
    var b = G.boss;
    if (b && b.state !== "dormant" && b.state !== "dying") tx = (p.cx() * 0.6 + b.cx() * 0.4) - v.w / 2;
    return { x: tx, y: ty };
  };
  G.clampCamera = function () {
    var r = G.room, v = G.view;
    G.cam.x = r.pw <= v.w ? (r.pw - v.w) / 2 : SS.clamp(G.cam.x, 0, r.pw - v.w);
    G.cam.y = r.ph <= v.h ? (r.ph - v.h) / 2 : SS.clamp(G.cam.y, 0, r.ph - v.h);
  };
  G.snapCamera = function () {
    if (!G.room || !G.player) return;
    var t = G.cameraTarget();
    G.cam.x = t.x; G.cam.y = t.y;
    G.clampCamera();
  };
  G.updateCamera = function (dt) {
    var t = G.cameraTarget();
    G.cam.x += (t.x - G.cam.x) * (1 - Math.exp(-dt * 7));
    G.cam.y += (t.y - G.cam.y) * (1 - Math.exp(-dt * 6));
    G.clampCamera();
  };

  /* ---------------------------------------------------------- esencia */
  G.spawnEssence = function (x, y, total) {
    while (total > 0) {
      var v = total > 12 ? 4 : total > 5 ? 2 : 1;
      v = Math.min(v, total);
      G.orbs.push(new SS.Orb(x, y, v));
      total -= v;
    }
  };
  G.addEssence = function (v) { G.save.essence += v; G.essDirty = true; };

  /* ----------------------------------------------------- muerte y eco */
  G.onPlayerDeath = function () {
    var s = G.save, p = G.player;
    s.deaths++;
    G.lostEssence = s.essence;
    if (s.essence > 0) {
      s.eco = { room: G.room.id, x: p.safe.x + p.w / 2, y: p.safe.y + p.h / 2 - 6, val: s.essence };
      s.essence = 0;
    }
    G.persist();
    G.pendingDeath = true;
    G.deathTimer = 1.5;
    G.hazards.length = 0;
  };

  G.respawn = function () {
    var p = G.player;
    p.setState("normal");
    p.maxHp = G.maxHp();
    p.hp = p.maxHp;
    p.iframes = 0; p.vx = 0; p.vy = 0; p.atk = null;
    G.essDisplay = G.save.essence;
    var sp = G.respawnPoint();
    G.loadRoom(sp.room, null, null, sp);
    if (sp.bench) p.setState("sit");
    if (G.lostEssence > 0) G.after(1.2, function () { SS.ui.toast("Tu esencia quedó como un eco donde caíste. Ve por ella."); });
  };

  G.recoverEco = function (eco) {
    G.addEssence(eco.val);
    G.save.eco = null;
    G.persist();
    SS.audio.play("eco");
    G.particles.burst("glow", eco.x, eco.y, 18, 160, 0.8, 6, "190,160,255", {});
    SS.ui.toast("Recuperaste " + eco.val + " de esencia.");
  };

  G.hazardRespawn = function () {
    var p = G.player;
    p.setState("hazard");
    p.vx = 0; p.vy = 0;
    G.fadeTo(function () {
      p.placeAt(p.safe.x, p.safe.y);
      p.setState("normal");
      p.vx = 0; p.vy = 0;
      G.snapCamera();
    }, 5);
  };

  /* ------------------------------------------------------------ jefe */
  G.startBoss = function () {
    G.room.doorsClosed = true;
    SS.audio.play("door");
    G.shake = Math.max(G.shake, 5);
    G.boss.start(G);
    SS.audio.setZone("boss");
    SS.ui.showBoss(G.boss);
  };

  G.onBossDefeated = function (boss) {
    G.save.bosses.verdugo = true;
    G.room.doorsClosed = false;
    SS.audio.play("door");
    G.spawnEssence(boss.cx(), boss.cy(), 150);
    G.particles.burst("glow", boss.cx(), boss.cy(), 30, 220, 1.2, 8, "255,200,140", {});
    G.particles.spawn("ring", boss.cx(), boss.cy(), 0, 0, 0.8, 120, "rgba(255,230,190,0.9)", {});
    SS.ui.hideBoss();
    SS.audio.setZone(G.room.def.music || G.room.zone.music);
    G.boss = null;
    G.persist();
    G.after(1.6, function () {
      SS.audio.play("victory");
      G.obtainAbility("charge", "Has vencido al Verdugo");
    });
  };

  /* ------------------------------------------------- objetos e interacción */
  G.obtainAbility = function (id, title) {
    G.save.abilities[id] = true;
    G.persist();
    SS.audio.play("ability");
    var p = G.player;
    G.particles.burst("glow", p.cx(), p.cy(), 24, 180, 1, 6, "200,240,255", {});
    var ab = SS.ABILITIES[id];
    SS.ui.banner(title || "Habilidad obtenida", ab.icon + "  " + ab.name, ab.desc);
  };

  G.restAtBench = function (o) {
    var p = G.player;
    p.placeAt(o.x + T / 2 - p.w / 2, o.y + T - p.h);
    p.setState("sit");
    p.dir = 1;
    p.maxHp = G.maxHp();
    p.hp = p.maxHp;
    G.save.bench = G.room.id;
    G.spawnEnemies();
    G.persist();
    SS.audio.play("bench");
    G.particles.burst("glow", o.x + T / 2, o.y + 10, 14, 80, 1.2, 5, "255,210,150", { up: 40 });
    SS.ui.openBench();
  };

  G.upgrade = function (kind) {
    var key = kind === "hp" ? "lvlHp" : "lvlAtk";
    var lvl = G.save[key] || 0;
    var cost = SS.UPGRADE_COST[kind][lvl];
    if (cost === undefined || G.save.essence < cost) return false;
    G.save.essence -= cost;
    G.save[key] = lvl + 1;
    if (kind === "hp") { G.player.maxHp = G.maxHp(); G.player.hp = G.player.maxHp; }
    G.essDisplay = G.save.essence;
    G.persist();
    SS.audio.play("levelup");
    G.particles.burst("glow", G.player.cx(), G.player.cy(), 20, 140, 1, 6, kind === "hp" ? "255,220,230" : "255,200,140", { up: 60 });
    return true;
  };

  G.updateInteract = function () {
    var p = G.player, objs = G.room.objects, i, o;
    G.interact = null;
    for (i = objs.length - 1; i >= 0; i--) {
      o = objs[i];
      if (o.kind === "relic" || o.kind === "fragment") {
        if (p.state !== "dead" && SS.overlap(o.x + 6, o.y + 4, T - 12, T - 4, p.x, p.y, p.w, p.h)) G.collect(o, i);
      }
    }
    if (p.state !== "normal" || !p.onGround) return;
    var best = null, bd = 1e9;
    for (i = 0; i < objs.length; i++) {
      o = objs[i];
      if (["bench", "tablet", "npc", "altar", "gate"].indexOf(o.kind) < 0) continue;
      if (o.kind === "altar" && o.taken) continue;
      var ox = o.kind === "gate" ? o.x : o.x + T / 2;
      var range = o.kind === "gate" ? 44 : 26;
      var dx = Math.abs(p.cx() - ox);
      var oy = o.kind === "gate" ? o.y + o.h : o.y + T;
      if (dx < range && Math.abs(p.y + p.h - oy) < 40 && dx < bd) { best = o; bd = dx; }
    }
    G.interact = best;
    if (best && SS.input.pressed.up && !SS.input.down.attack) {
      SS.input.consume("up");
      G.doInteract(best);
    }
  };

  G.doInteract = function (o) {
    var s = G.save;
    switch (o.kind) {
      case "bench": G.restAtBench(o); break;
      case "tablet": if (o.lore) SS.ui.dialog(o.lore.who, o.lore.pages); break;
      case "npc":
        var pages = s.bosses.verdugo ? SS.HERMIT.boss : s.abilities.dash ? SS.HERMIT.dash : s.npcStage > 0 ? SS.HERMIT.again : SS.HERMIT.first;
        s.npcStage = 1;
        G.persist();
        SS.ui.dialog("Ermitaño Gris", pages);
        break;
      case "altar":
        o.taken = true;
        G.obtainAbility(o.ability, "Técnica olvidada recuperada");
        break;
      case "gate":
        if (s.bosses.verdugo) {
          SS.audio.play("secret");
          SS.ui.dialog("Portón sellado", [
            "La runa del portón brilla al reconocerte. Más allá, una escalera desciende hacia las Minas del Silencio.",
            "Aquí termina la primera fase de Stick Souls. Las Minas, la Ciudad Hundida y el Santuario Vacío llegarán en la siguiente."
          ], function () { s.phaseEnd = true; G.persist(); SS.ui.showEnd(); });
        } else {
          SS.ui.dialog("Portón sellado", ["La puerta no responde. Una runa apagada espera algo."]);
        }
        break;
    }
  };

  G.collect = function (o, idx) {
    var s = G.save, p = G.player;
    s.collected[o.key] = 1;
    G.room.objects.splice(idx, 1);
    G.particles.burst("glow", o.x + T / 2, o.y + T / 2, 16, 140, 0.9, 6, o.kind === "relic" ? "255,215,120" : "230,240,255", {});
    if (o.kind === "relic") {
      if (s.relics.indexOf(o.key) < 0) s.relics.push(o.key);
      SS.audio.play("secret");
      SS.ui.toast("Reliquia encontrada: " + (SS.RELICS[o.key] || "Reliquia") + " (" + s.relics.length + "/" + SS.RELIC_TOTAL + ")");
      G.persist();
    } else {
      s.fragments = (s.fragments || 0) + 1;
      p.maxHp = G.maxHp();
      p.hp = p.maxHp;
      G.persist();
      SS.audio.play("ability");
      SS.ui.banner("Fragmento de alma", "✧  Vida máxima: " + p.maxHp, "Un trozo de alma perdida se une a la tuya. Tu vida máxima aumenta y se restaura por completo.");
    }
  };

  /* ------------------------------------------------------------ combate */
  G.resolveCombat = function () {
    var p = G.player, box = p.attackBox();
    if (!box) return;
    var a = p.atk, dmg = p.damage(G), hitAny = false, i;

    for (i = 0; i < G.enemies.length; i++) {
      var e = G.enemies[i];
      if (e.dead || e.lastHit === a.id) continue;
      if (SS.boxHit(box, e)) {
        e.lastHit = a.id;
        e.hit(G, dmg, p.cx(), a.dir);
        hitAny = true;
      }
    }
    var b = G.boss;
    if (b && b.lastHit !== a.id && SS.overlap(box.x, box.y, box.w, box.h, b.x + 6, b.y, b.w - 12, b.h)) {
      b.lastHit = a.id;
      if (b.hit(G, dmg)) { hitAny = true; G.shake = Math.max(G.shake, 3); }
    }
    var objs = G.room.objects;
    for (i = objs.length - 1; i >= 0; i--) {
      var o = objs[i];
      if (o.kind !== "deposit" || o.lastHit === a.id) continue;
      if (SS.overlap(box.x, box.y, box.w, box.h, o.x + 4, o.y + 6, T - 8, T - 6)) {
        o.lastHit = a.id;
        o.hp--;
        o.flash = 0.12;
        hitAny = true;
        SS.audio.play("clank");
        G.spawnEssence(o.x + T / 2, o.y + 8, 4);
        G.particles.burst("shard", o.x + T / 2, o.y + 14, 6, 160, 0.6, 4, "#bfe8e0", { grav: 700, collide: true });
        if (o.hp <= 0) {
          SS.audio.play("break");
          G.spawnEssence(o.x + T / 2, o.y + 8, 10);
          G.save.collected[o.key] = 1;
          objs.splice(i, 1);
          G.particles.burst("shard", o.x + T / 2, o.y + 14, 12, 220, 0.9, 5, "#d6fff6", { grav: 800, collide: true });
        }
      }
    }
    for (i = 0; i < G.projectiles.length; i++) {
      var pr = G.projectiles[i];
      if (!pr.dead && SS.overlap(box.x, box.y, box.w, box.h, pr.x - 5, pr.y - 5, 10, 10)) {
        pr.dead = true;
        SS.audio.play("clank");
        G.particles.burst("spark", pr.x, pr.y, 8, 200, 0.3, 1.4, "#e0ffd0", {});
      }
    }
    // muros secretos y púas (rebote)
    var room = G.room;
    var tx0 = Math.floor(box.x / T), tx1 = Math.floor((box.x + box.w) / T);
    var ty0 = Math.floor(box.y / T), ty1 = Math.floor((box.y + box.h) / T);
    var hitSecret = false, hitSpike = false;
    for (var ty = ty0; ty <= ty1; ty++) {
      for (var tx = tx0; tx <= tx1; tx++) {
        var c = room.tile(tx, ty);
        if (c === "S" && !hitSecret && a.secret !== true) { hitSecret = true; a.secret = true;
          var broke = room.hitSecret(tx, ty, G);
          SS.audio.play(broke ? "secret" : "clank");
          G.particles.burst("dot", tx * T + T / 2, ty * T + T / 2, 6, 120, 0.4, 2.5, room.zone.groundTop, { grav: 600 });
          G.shake = Math.max(G.shake, broke ? 6 : 2);
          if (broke) SS.ui.toast("¡Un pasadizo oculto!");
        }
        if (c === "^" && a.dir === "down") hitSpike = true;
      }
    }
    if (hitSpike && !a.pogo) { SS.audio.play("clank"); p.onHitTarget(G, "spike"); }
    if (hitAny) {
      SS.audio.play("hit");
      G.hitstop = Math.max(G.hitstop, a.dir === "charged" ? 0.08 : 0.045);
      p.onHitTarget(G);
    }
  };

  /* ---------------------------------------------------------- bucle */
  function frame(ts) {
    var dt = last ? Math.min(0.1, (ts - last) / 1000) : SS.STEP;
    last = ts;
    acc += dt;
    var steps = 0;
    while (acc >= SS.STEP && steps < 6) { step(SS.STEP); acc -= SS.STEP; steps++; }
    if (steps >= 6) acc = 0;
    render();
    requestAnimationFrame(frame);
  }
  G._step = function (n) { for (var i = 0; i < (n || 1); i++) step(SS.STEP); render(); };

  function step(dt) {
    SS.input.poll();
    G.time += dt;
    var I = SS.input;
    SS.ui.step(dt);
    if (G.state === "play") {
      if (I.pressed.pause) { SS.input.consume("pause"); SS.ui.openPause(); return; }
      if (I.pressed.map) { SS.input.consume("map"); SS.ui.openMap(); return; }
    }
    updateFade(dt);
    if (G.state === "play") updatePlay(dt);
    else if (G.state === "title") updateTitle(dt);
    else if (G.state === "map") SS.ui.mapTick(dt);
  }

  function updateTitle(dt) {
    G.cam.x += dt * 14;
    var r = G.titleRoom;
    var maxX = Math.max(0, r.pw - G.view.w);
    if (G.cam.x > maxX) G.cam.x = 0;
    G.cam.y = Math.max(0, r.ph - G.view.h);
    G.particles.update(dt, r, G.time);
    SS.BG.update(dt, r.zone, G.view.w, G.view.h);
    SS.BG.ambient(dt, r, G.particles, G.cam.x, G.cam.y, G.view.w, G.view.h);
  }

  function updatePlay(dt) {
    var i;
    for (i = G.timers.length - 1; i >= 0; i--) {
      G.timers[i].t -= dt;
      if (G.timers[i].t <= 0) { var fn = G.timers[i].fn; G.timers.splice(i, 1); fn(); if (G.state !== "play") return; }
    }
    if (G.fade.dir === 1 || G.fade.hold) return;
    if (G.hitstop > 0) { G.hitstop -= dt; return; }
    var sdt = dt;
    if (G.slowmo > 0) { G.slowmo -= dt; sdt = dt * 0.35; }
    G.save.playTime += dt;
    var p = G.player;

    p.update(sdt, G);
    if (G.boss) {
      if (G.boss.state === "dormant" && p.x > G.room.def.bossTrigger * T && p.state !== "dead") G.startBoss();
      if (G.boss) G.boss.update(sdt, G);
    }
    for (i = G.enemies.length - 1; i >= 0; i--) { G.enemies[i].update(sdt, G); if (G.enemies[i].dead) G.enemies.splice(i, 1); }
    for (i = G.projectiles.length - 1; i >= 0; i--) { G.projectiles[i].update(sdt, G); if (G.projectiles[i].dead) G.projectiles.splice(i, 1); }
    for (i = G.hazards.length - 1; i >= 0; i--) { G.hazards[i].update(sdt, G); if (G.hazards[i] && G.hazards[i].dead) G.hazards.splice(i, 1); }
    for (i = G.orbs.length - 1; i >= 0; i--) { G.orbs[i].update(sdt, G); if (G.orbs[i].dead) G.orbs.splice(i, 1); }
    for (i = G.birds.length - 1; i >= 0; i--) { G.birds[i].update(sdt, G); if (G.birds[i].dead) G.birds.splice(i, 1); }
    for (i = G.ecos.length - 1; i >= 0; i--) { G.ecos[i].update(sdt, G); if (G.ecos[i].dead) G.ecos.splice(i, 1); }
    G.resolveCombat();
    var objs = G.room.objects;
    for (i = 0; i < objs.length; i++) { objs[i].t += sdt; if (objs[i].flash > 0) objs[i].flash -= sdt; }

    G.particles.update(sdt, G.room, G.time);
    SS.BG.update(sdt, G.room.zone, G.view.w, G.view.h);
    SS.BG.ambient(sdt, G.room, G.particles, G.cam.x, G.cam.y, G.view.w, G.view.h);
    G.updateCamera(sdt);
    G.updateInteract();
    if (!G.transitioning && p.state !== "dead" && p.state !== "hazard") G.checkExits();
    if (G.shake > 0) G.shake = Math.max(0, G.shake - dt * 22);

    if (G.pendingDeath) {
      G.deathTimer -= dt;
      if (G.deathTimer <= 0) {
        G.pendingDeath = false;
        G.fadeTo(function () { G.respawn(); }, 1.6);
      }
    }
    // contador de esencia con animación
    var diff = G.save.essence - G.essDisplay;
    if (diff !== 0) G.essDisplay += Math.sign(diff) * Math.max(1, Math.floor(Math.abs(diff) * 0.15));
    if (G.essDirty) { G.saveDirtyT += dt; if (G.saveDirtyT > 2) { G.saveDirtyT = 0; G.persist(); } }
  }

  /* ------------------------------------------------------------- dibujo */
  function render() {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = "#050507";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    var s = scale * dpr;
    if (G.state === "title" || !G.room) renderTitle(s);
    else renderWorld(s);
    if (G.fade.a > 0) {
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.fillStyle = "rgba(0,0,0," + Math.min(1, G.fade.a).toFixed(3) + ")";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
  }

  function renderTitle(s) {
    var r = G.titleRoom, v = G.view;
    ctx.setTransform(s, 0, 0, s, 0, 0);
    SS.BG.draw(ctx, r, G.cam.x, G.cam.y, v.w, v.h, G.time);
    ctx.setTransform(s, 0, 0, s, -G.cam.x * s, -G.cam.y * s);
    r.draw(ctx, G.cam.x, G.cam.y, G.cam.x + v.w, G.cam.y + v.h, G.time);
    G.particles.draw(ctx, G.cam.x, G.cam.y, G.cam.x + v.w, G.cam.y + v.h, G.time);
    ctx.setTransform(s, 0, 0, s, 0, 0);
    SS.BG.drawOverlay(ctx, r, v.w, v.h, v.w / 2, v.h / 2);
  }

  function renderWorld(s) {
    var room = G.room, cam = G.cam, v = G.view, i;
    var sx = G.shake > 0 ? (Math.random() - 0.5) * G.shake : 0;
    var sy = G.shake > 0 ? (Math.random() - 0.5) * G.shake : 0;
    ctx.setTransform(s, 0, 0, s, 0, 0);
    SS.BG.draw(ctx, room, cam.x, cam.y, v.w, v.h, G.time);
    ctx.setTransform(s, 0, 0, s, (-cam.x + sx) * s, (-cam.y + sy) * s);
    var x0 = cam.x, y0 = cam.y, x1 = cam.x + v.w, y1 = cam.y + v.h;
    G.drawObjects(ctx, true);
    room.draw(ctx, x0, y0, x1, y1, G.time);
    G.drawObjects(ctx, false);
    for (i = 0; i < G.birds.length; i++) G.birds[i].draw(ctx, G.time);
    for (i = 0; i < G.ecos.length; i++) G.ecos[i].draw(ctx, G.time);
    for (i = 0; i < G.enemies.length; i++) G.enemies[i].draw(ctx, G.time);
    if (G.boss) G.boss.draw(ctx, G, G.time);
    G.player.draw(ctx, G, G.time);
    for (i = 0; i < G.hazards.length; i++) G.hazards[i].draw(ctx, G, G.time);
    for (i = 0; i < G.projectiles.length; i++) G.projectiles[i].draw(ctx, G.time);
    for (i = 0; i < G.orbs.length; i++) G.orbs[i].draw(ctx, G.time);
    G.particles.draw(ctx, x0, y0, x1, y1, G.time);
    G.drawPrompt(ctx);
    ctx.setTransform(s, 0, 0, s, 0, 0);
    SS.BG.drawOverlay(ctx, room, v.w, v.h, G.player.cx() - cam.x, G.player.cy() - cam.y);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    SS.ui.drawHUD(ctx, cssW, cssH, G);
  }

  /** Objetos del escenario. "behind" = lo que va detrás del terreno. */
  G.drawObjects = function (ctx, behind) {
    var objs = G.room.objects, t = G.time, s = G.save;
    for (var i = 0; i < objs.length; i++) {
      var o = objs[i], x = o.x, y = o.y, cx = x + T / 2, by = y + T;
      if (behind !== (o.kind === "gate")) continue;
      switch (o.kind) {
        case "bench": {
          var lit = s.bench === G.room.id;
          ctx.fillStyle = "#1c1718";
          ctx.fillRect(cx - 15, by - 11, 30, 4);
          ctx.fillRect(cx - 13, by - 7, 3, 7);
          ctx.fillRect(cx + 10, by - 7, 3, 7);
          ctx.fillRect(cx - 15, by - 20, 3, 10);
          ctx.fillStyle = "#3c3233";
          ctx.fillRect(cx - 15, by - 11, 30, 1.5);
          // farol
          ctx.strokeStyle = "#1c1718"; ctx.lineWidth = 1.5;
          ctx.beginPath(); ctx.moveTo(cx + 20, by); ctx.lineTo(cx + 20, by - 30); ctx.lineTo(cx + 15, by - 30); ctx.stroke();
          ctx.fillStyle = "#1c1718"; ctx.fillRect(cx + 12, by - 30, 6, 7);
          SS.drawGlow(ctx, cx + 15, by - 26, lit ? 34 : 18, "255,200,130", lit ? 0.55 + Math.sin(t * 3) * 0.05 : 0.25);
          ctx.fillStyle = lit ? "#ffe2b0" : "#a07a50";
          ctx.fillRect(cx + 13.5, by - 28, 3, 3);
          break;
        }
        case "tablet": {
          var near = G.interact === o;
          ctx.fillStyle = "#1a1719";
          ctx.beginPath();
          ctx.moveTo(cx - 9, by); ctx.lineTo(cx - 9, by - 22); ctx.quadraticCurveTo(cx, by - 30, cx + 9, by - 22); ctx.lineTo(cx + 9, by);
          ctx.fill();
          ctx.strokeStyle = near ? "rgba(170,230,255,0.9)" : "rgba(170,230,255,0.25)";
          ctx.lineWidth = 1;
          ctx.beginPath();
          for (var l = 0; l < 4; l++) { ctx.moveTo(cx - 5, by - 20 + l * 4); ctx.lineTo(cx + 5 - (l % 2) * 3, by - 20 + l * 4); }
          ctx.stroke();
          if (near) SS.drawGlow(ctx, cx, by - 16, 22, "160,220,255", 0.3);
          break;
        }
        case "npc": {
          var sway = Math.sin(t * 1.2) * 0.5;
          var P = { lean: -1 + sway, bob: 8, tF: 1.45, sF: -1.5, tB: 1.3, sB: -1.4, aF: 0.9, fF: 0.9, aB: 0.3, fB: 0.8, rot: 0 };
          var parts = SS.drawStickFigure(ctx, cx - 7 - 4, by - 34, 14, 34, -1, P, "#0a080b", 1);
          ctx.fillStyle = "#2a2126";
          ctx.beginPath();
          ctx.moveTo(parts.head.x - 8, parts.head.y + 9);
          ctx.quadraticCurveTo(parts.head.x - 8, parts.head.y - 10, parts.head.x + 1, parts.head.y - 9);
          ctx.quadraticCurveTo(parts.head.x + 8, parts.head.y - 4, parts.head.x + 7, parts.head.y + 9);
          ctx.fill();
          ctx.strokeStyle = "#0a080b"; ctx.lineWidth = 1.6;
          ctx.beginPath(); ctx.moveTo(parts.hand.x, parts.hand.y); ctx.lineTo(parts.hand.x - 2, by); ctx.stroke();
          SS.drawGlow(ctx, cx - 18, by - 6, 26, "255,190,120", 0.45 + Math.sin(t * 4) * 0.05);
          ctx.fillStyle = "#3a2c22"; ctx.fillRect(cx - 21, by - 9, 6, 9);
          ctx.fillStyle = "#ffd59a"; ctx.fillRect(cx - 19.5, by - 7, 3, 4);
          ctx.fillStyle = "#e9f4ff";
          ctx.fillRect(parts.head.x - 3, parts.head.y - 1, 1.5, 1.5);
          break;
        }
        case "altar": {
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
          break;
        }
        case "relic": {
          var ry = by - 16 + Math.sin(t * 2.5) * 2.5;
          SS.drawGlow(ctx, cx, ry, 18, "255,210,120", 0.55);
          ctx.fillStyle = "#ffdf9a";
          ctx.beginPath(); ctx.moveTo(cx, ry - 6); ctx.lineTo(cx + 4, ry); ctx.lineTo(cx, ry + 6); ctx.lineTo(cx - 4, ry); ctx.closePath(); ctx.fill();
          break;
        }
        case "fragment": {
          var fy2 = by - 16 + Math.sin(t * 2) * 3, pul = 0.8 + Math.sin(t * 5) * 0.2;
          SS.drawGlow(ctx, cx, fy2, 26 * pul, "220,235,255", 0.6);
          ctx.fillStyle = "#ffffff";
          ctx.beginPath(); ctx.moveTo(cx, fy2 - 8); ctx.lineTo(cx + 5, fy2); ctx.lineTo(cx, fy2 + 8); ctx.lineTo(cx - 5, fy2); ctx.closePath(); ctx.fill();
          break;
        }
        case "deposit": {
          var fl = o.flash > 0;
          var crack = 4 - o.hp;
          SS.drawGlow(ctx, cx, by - 10, 20, "160,240,220", 0.3);
          ctx.fillStyle = fl ? "#ffffff" : "#9fd9cf";
          ctx.beginPath(); ctx.moveTo(cx - 9, by); ctx.lineTo(cx - 6, by - 16); ctx.lineTo(cx - 2, by); ctx.fill();
          ctx.beginPath(); ctx.moveTo(cx - 3, by); ctx.lineTo(cx + 1, by - 22 + crack * 2); ctx.lineTo(cx + 5, by); ctx.fill();
          ctx.beginPath(); ctx.moveTo(cx + 3, by); ctx.lineTo(cx + 8, by - 12); ctx.lineTo(cx + 10, by); ctx.fill();
          ctx.fillStyle = "rgba(255,255,255,0.6)";
          ctx.fillRect(cx, by - 18 + crack * 2, 1, 8);
          break;
        }
        case "gate": {
          var gx = o.x + o.w / 2, gy = o.y + o.h / 2, open = s.bosses.verdugo;
          ctx.fillStyle = "#151a1d";
          ctx.fillRect(o.x - 6, o.y - 12, o.w + 6, o.h + 12);
          ctx.strokeStyle = open ? "rgba(140,230,255,0.9)" : "rgba(120,150,160,0.35)";
          ctx.lineWidth = 2;
          ctx.beginPath(); ctx.arc(gx, gy, 16, 0, 6.283); ctx.stroke();
          ctx.beginPath(); ctx.arc(gx, gy, 9, 0, 6.283); ctx.moveTo(gx, gy - 16); ctx.lineTo(gx, gy + 16); ctx.moveTo(gx - 16, gy); ctx.lineTo(gx + 16, gy); ctx.stroke();
          if (open) SS.drawGlow(ctx, gx, gy, 44, "120,220,255", 0.35 + Math.sin(t * 2) * 0.08);
          break;
        }
      }
    }
  };

  G.drawPrompt = function (ctx) {
    var o = G.interact;
    if (!o || G.state !== "play") return;
    var labels = { bench: "Descansar", tablet: "Leer", npc: "Hablar", altar: "Tomar", gate: "Examinar" };
    var x = o.kind === "gate" ? o.x - 10 : o.x + T / 2;
    var y = (o.kind === "gate" ? o.y : o.y) - 14 + Math.sin(G.time * 4) * 2;
    var key = G.touchMode() ? "▲" : SS.input.keyName(SS.input.keymap.up[0]);
    var txt = key + "  " + labels[o.kind];
    ctx.font = "600 9px Georgia, serif";
    var w = ctx.measureText(txt).width + 12;
    ctx.fillStyle = "rgba(8,8,12,0.75)";
    ctx.fillRect(x - w / 2, y - 9, w, 14);
    ctx.strokeStyle = "rgba(200,225,255,0.35)";
    ctx.lineWidth = 0.8;
    ctx.strokeRect(x - w / 2, y - 9, w, 14);
    ctx.fillStyle = "#e9f2ff";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(txt, x, y - 2);
  };

  G.dust = function (x, y, n, dir) {
    for (var i = 0; i < n; i++) {
      G.particles.spawn("dot", x + SS.rand(-5, 5), y - 1, (dir || SS.rand(-1, 1)) * SS.rand(20, 70), SS.rand(-50, -10),
        SS.rand(0.3, 0.6), SS.rand(2, 3.5), "rgba(170,160,150,0.6)", { drag: 2 });
    }
  };

  G.autoPause = function () {
    if (G.state === "play") SS.ui.openPause();
  };

  window.addEventListener("load", G.init);
})();
