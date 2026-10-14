/* =====================================================================
   Datos del mundo: zonas, historia, diálogos y textos.
   Las habitaciones están en js/rooms_data.js (generadas como mapas de
   texto). Leyenda de las baldosas:

     #  roca              =  plataforma (se atraviesa desde abajo)
     ^  púas              S  muro secreto (se rompe a golpes)
     D  puerta del jefe   G  portón sellado        @  argolla del gancho
     P  inicio            L  inscripción           N  ermitaño
     B  puesto de cerveza a  altar de habilidad     h  fragmento de alma
     r  reliquia          o  cristal de esencia     K  jefe
     c  alimaña  f  espectro  j  espadachín  s  escupidor  w  ahorcado
     b  pajarito  l  farol colgante  x barril  u vasija  k caja  t cruz
   ===================================================================== */
(function () {
  "use strict";
  var SS = window.SS;

  SS.ZONES = {
    refugio: {
      name: "Refugio de Ceniza", music: "refugio", seed: 1103, layers: "ruins", img: "fondo_refugio",
      edge: "borde_ceniza", rock: "roca_ceniza", plat: "c_losa_peq", surf: 22, edgeH: 80,
      sky: ["#141117", "#2b2224", "#4d3a35"],
      ground: "#0f0c0e", groundTop: "#7a675e", groundEdge: "#221b1d",
      platform: "#3a2f2e", platformTop: "#8a766a",
      fog: "120,96,88", particles: "ash", birds: true, birdColor: "rgba(26,20,22,0.8)",
      sun: "255,170,120", ray: "255,190,150", mapColor: "#c09a86", mapFill: "rgba(150,110,95,0.5)",
      bgTint: "rgba(20,10,10,0.35)", accent: "255,120,60"
    },
    bosque: {
      name: "Bosque Marchito", music: "bosque", seed: 2207, layers: "forest", img: "fondo_bosque",
      edge: "borde_bosque", rock: "roca_bosque", plat: "b_losa_media", surf: 9, edgeH: 83,
      sky: ["#0a1416", "#183230", "#3f665b"],
      ground: "#0a1210", groundTop: "#5f8f45", groundEdge: "#15241f",
      platform: "#1d332d", platformTop: "#6aa486",
      fog: "90,150,128", particles: "fireflies", birds: true, birdColor: "rgba(10,24,22,0.75)",
      sun: "200,255,210", ray: "210,255,200", mapColor: "#6fb592", mapFill: "rgba(80,150,120,0.5)",
      bgTint: "rgba(0,12,10,0.3)", accent: "190,255,150"
    }
  };

  SS.ZONE_ORDER = ["refugio", "bosque", "minas", "ciudad", "santuario"];
  SS.ZONE_FUTURE = { minas: "Minas del Silencio", ciudad: "Ciudad Hundida", santuario: "Santuario Vacío" };

  /* Historia: la introducción de una partida nueva (se dibuja en
     js/cinematic.js). Cada tarjeta muestra una escena y un texto. */
  SS.STORY = {
    princess: "la princesa",
    intro: [
      { scene: "reino", text: "Hubo un reino donde la ceniza aún no había caído." },
      { scene: "llama", text: "Su princesa custodiaba la llama del reino: mientras ardiera, nadie olvidaba quién era." },
      { scene: "rey", text: "Una noche llegó el Rey Vacío. Apagó la llama y arrastró a la princesa a lo más hondo de la tierra." },
      { scene: "caida", text: "Su guardián de capucha roja juró protegerla. Cayó defendiéndola." },
      { scene: "brasa", text: "Pero un juramento no muere con quien lo hace." },
      { scene: "despertar", text: "Despierta, guardián. Ella aún te espera en el Santuario Vacío." }
    ],
    afterCan: [
      "Al caer la bestia, una brisa tibia recorre la perrera. Por un instante oyes una voz conocida:",
      "«…sigues de pie. Lo sabía. Baja, guardián. Baja por el bosque. Yo seguiré cantando para que no te pierdas.»"
    ],
    afterVerdugo: [
      "El hacha del Verdugo se hunde en el musgo. La voz vuelve, más cerca:",
      "«Bajo las raíces hay minas. Bajo las minas, una ciudad. Y al final, el Santuario. Te estaré esperando.»"
    ]
  };

  /* Diálogos del ermitaño según el progreso. */
  SS.HERMIT = {
    first: [
      "Ah… otro que despierta. ¿Capucha roja? Entonces eres el guardián de la princesa. Creí que habías muerto.",
      "El Rey Vacío se la llevó hacia abajo, al Santuario Vacío. Desde entonces el reino se apaga, alma por alma.",
      "¿Ves ese puesto? Una botella fría y descansas: recuperas la vida, guardas tu viaje y mejoras con la esencia que juntes.",
      "Toma también esta petaca de plata. Un trago te cura mientras caminas. Se rellena en cada puesto.",
      "Si caes, dejarás una cruz con tu esencia donde caíste. Vuelve por ella antes de caer otra vez.",
      "Al este, cruzando el cementerio y la torre, la Perrera del Rey. La bestia de dos cabezas guarda el paso al bosque."
    ],
    again: [
      "La torre de las cadenas se sube con paciencia. No mires abajo.",
      "La bestia de la perrera guardaba el gancho del carcelero. Lo necesitarás para llegar al bosque."
    ],
    can: [
      "¡Venciste a la bestia! Con ese gancho alcanzarás las argollas del Mirador.",
      "El bosque te espera arriba. En su hondonada duerme una técnica olvidada: el Dash.",
      "Y cuidado con el Verdugo. Nadie que haya ido a su claro ha vuelto por otra cerveza."
    ],
    dash: [
      "Esa forma de moverte… recuperaste el Dash. Las púas de las raíces ya no te detendrán.",
      "Más allá espera el Verdugo. Mira su cadena: cuando gira, apártate."
    ],
    boss: [
      "Venciste al Verdugo. Siento que el reino respira un poco mejor.",
      "La princesa sigue abajo. La runa del portón te reconocerá cuando estés listo."
    ]
  };

  SS.RELICS = {
    "r2:18:5": "Espejo de ceniza",
    "r6:1:9": "Rosario de la capilla",
    "b2:30:4": "Pluma de cuervo hueco",
    "b12:28:10": "Corona de raíces"
  };
  SS.RELIC_TOTAL = 4;

  SS.ABILITIES = {
    dash: {
      name: "Dash", icon: "»",
      desc: "Pulsa Esquivar (Shift / K o el botón Esquiva) en el aire para lanzarte hacia delante. Te permite cruzar abismos."
    },
    hook: {
      name: "Gancho de cadena", icon: "⚓",
      desc: "Pulsa Gancho (I, F o clic derecho; en el celular, el botón Gancho) cerca de una argolla de hierro: te enganchas, te balanceas y trepas. Salta para soltarte con impulso."
    },
    charge: {
      name: "Golpe cargado", icon: "✦",
      desc: "Mantén Habilidad (L o el botón Hab.) o el ataque, y suelta cuando brille: un tajo devastador que hace el triple de daño."
    },
    doublejump: {
      name: "Doble salto", icon: "⇈",
      desc: "Salta otra vez en el aire. Se encuentra en las Minas del Silencio (próxima fase)."
    }
  };
  SS.ABILITY_ORDER = ["dash", "hook", "charge", "doublejump"];

  SS.BOSSES = {
    can: { name: "EL CAN BICÉFALO", sub: "Guardián de la Perrera", zone: "refugio", reward: "hook" },
    verdugo: { name: "EL VERDUGO", sub: "Señor del Claro", zone: "bosque", reward: "charge", art: "v_frente" }
  };

  SS.UPGRADE_COST = { hp: [100, 220, 360, 520], atk: [120, 260, 420, 600], flask: [150, 320] };
  SS.FLASK_HEAL = 2;
})();
