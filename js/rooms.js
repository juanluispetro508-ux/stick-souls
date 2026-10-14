/* =====================================================================
   Datos del mundo: zonas y habitaciones (mapas de baldosas en texto).

   Leyenda:  #  roca sólida          =  plataforma (se atraviesa desde abajo)
             ^  púas                 S  muro secreto (se rompe a golpes)
             D  puerta del jefe      G  portón sellado
             P  inicio               L  inscripción          N  ermitaño
             B  banco                a  altar de habilidad    h  fragmento de alma
             r  reliquia             o  cristal de esencia    K  jefe
             c  rastrero  f  polilla  j  saltador  s  escupidor  b  pajarito

   "g" es la posición de la habitación en el mapa del mundo (en baldosas)
   y "exits" indica a dónde lleva cada borde abierto:
   side L/R (filas a..b) o U/D (columnas a..b) → habitación "to", aparición "at".
   ===================================================================== */
(function () {
  "use strict";
  var SS = window.SS;

  SS.ZONES = {
    refugio: {
      name: "Refugio de Ceniza", music: "refugio", seed: 1103, layers: "ruins",
      sky: ["#141117", "#33292b", "#6e544a"],
      bg: ["#5d4a47", "#3b2f31", "#251d20"],
      ground: "#110e11", groundTop: "#7a675e", groundEdge: "#2a2224",
      platform: "#3a2f2e", platformTop: "#8a766a",
      fog: "120,96,88", particles: "ash", birds: true, birdColor: "rgba(30,22,26,0.75)",
      sun: "255,186,140", mapColor: "#a08b80", mapFill: "rgba(120,100,92,0.30)"
    },
    bosque: {
      name: "Bosque Marchito", music: "bosque", seed: 2207, layers: "forest",
      sky: ["#0a1416", "#183230", "#3f665b"],
      bg: ["#2e5850", "#1b3632", "#10211e"],
      ground: "#0b1513", groundTop: "#4d8a6f", groundEdge: "#16302a",
      platform: "#1d332d", platformTop: "#6aa486",
      fog: "90,150,128", particles: "fireflies", birds: true, birdColor: "rgba(10,24,22,0.7)",
      sun: "190,255,220", mapColor: "#5fa58a", mapFill: "rgba(70,140,115,0.28)"
    }
  };

  SS.ZONE_ORDER = ["refugio", "bosque", "minas", "ciudad", "santuario"];
  SS.ZONE_FUTURE = { minas: "Minas del Silencio", ciudad: "Ciudad Hundida", santuario: "Santuario Vacío" };

  SS.ROOMS = {
    r1: {
      zone: "refugio", name: "Despertar", g: [0, 0],
      rows: [
        "############################",
        "##########.....#############",
        "#####...............########",
        "###.......................##",
        "##.........................#",
        "#..........................#",
        "#..........................#",
        "#...........................",
        "#..............##...........",
        "#..P.....L.....##...b.......",
        "############################",
        "############################"
      ],
      exits: [{ side: "R", a: 7, b: 9, to: "r2", at: [1, 11] }],
      lore: [{
        who: "Inscripción gastada",
        pages: [
          "«Despiertas entre cenizas. No recuerdas tu nombre: solo el peso de una espada y un vacío donde antes había un alma.»",
          "Muévete con A / D o las flechas. Salta con Espacio: mantenlo pulsado para llegar más alto. En el celular usa los botones de la pantalla."
        ]
      }]
    },

    r2: {
      zone: "refugio", name: "Sendero de Ceniza", g: [28, -2],
      rows: [
        "########################################",
        "########################################",
        "########################################",
        "#################......#################",
        "#################......SS..............#",
        "#################.r....SS..............#",
        "#####################################..#",
        "#......................................#",
        "#....................................==#",
        "........................................",
        ".................===.............==.....",
        "....L.....c.....^^^^^^^.....c...........",
        "########################################",
        "########################################"
      ],
      exits: [
        { side: "L", a: 9, b: 11, to: "r1", at: [26, 9] },
        { side: "R", a: 9, b: 11, to: "r3", at: [1, 9] }
      ],
      lore: [{
        who: "Inscripción",
        pages: [
          "«Los que perdieron su alma todavía caminan. No sienten dolor, pero sí miedo a la luz de una espada.»",
          "Ataca con J o con clic. Mantén arriba (W) o abajo (S) para golpear en esa dirección. En el aire, el golpe hacia abajo te impulsa sobre enemigos y púas.",
          "Esquiva con Shift o K: durante la esquiva nada puede herirte. Algunos muros suenan huecos… golpéalos."
        ]
      }]
    },

    r3: {
      zone: "refugio", name: "El Refugio", g: [68, 0],
      rows: [
        "########################",
        "########################",
        "#####..............#####",
        "###..................###",
        "##....................##",
        "#......................#",
        "#......................#",
        "........................",
        "........................",
        "......N....B.......b....",
        "########################",
        "########################"
      ],
      exits: [
        { side: "L", a: 7, b: 9, to: "r2", at: [38, 11] },
        { side: "R", a: 7, b: 9, to: "b1", at: [1, 11] }
      ]
    },

    b1: {
      zone: "bosque", name: "Linde del Bosque", g: [92, -2],
      rows: [
        "############################################",
        "############################################",
        "############################################",
        "#..........................................#",
        "#..........................................#",
        "#.................o........................#",
        "#...........f....===.......................#",
        "#...............................f..........#",
        "#.....................===..................#",
        "............................................",
        ".....................####...................",
        ".....c..b.......c....####.........o..b...c..",
        "##############################...###########",
        "##############################...###########"
      ],
      exits: [
        { side: "L", a: 9, b: 11, to: "r3", at: [22, 9] },
        { side: "R", a: 9, b: 11, to: "b2", at: [1, 19] },
        { side: "D", a: 30, b: 32, to: "b4", at: [5, 1] }
      ]
    },

    b4: {
      zone: "bosque", name: "La Hondonada", g: [118, 12], dark: true, music: "cueva", ability: "dash",
      rows: [
        "####...#############################",
        "####...#############################",
        "#.....==...........................#",
        "#..................................#",
        "#.==...............................#",
        "#..................................#",
        "#....===...........................#",
        "#..................................#",
        "#===...............................#",
        "#.........^^^...s.....c...o.....a..#",
        "####################################",
        "####################################"
      ],
      exits: [{ side: "U", a: 4, b: 6, to: "b1", at: [31, 12], boost: true }]
    },

    b2: {
      zone: "bosque", name: "Raíces Altas", g: [136, -10],
      rows: [
        "########################################",
        "########################################",
        "#......................................#",
        "#......................................#",
        "#......................................S",
        "#.............................r........S",
        "#.........................##############",
        "#......................................#",
        "#....................===...............#",
        "#.............................f........#",
        "#...............===....................#",
        "#......................................#",
        "#..........===.........................#",
        "#.....................f................#",
        "#......===.............................#",
        "#......................................#",
        "#..........===.........................#",
        "........................................",
        "......===...............................",
        "..............j.....c......^^^^^...b....",
        "########################################",
        "########################################"
      ],
      exits: [
        { side: "L", a: 17, b: 19, to: "b1", at: [42, 11] },
        { side: "R", a: 17, b: 19, to: "b3", at: [1, 9] },
        { side: "R", a: 4, b: 5, to: "b6", at: [1, 6] }
      ]
    },

    b6: {
      zone: "bosque", name: "Hueco Secreto", g: [176, -11],
      rows: [
        "################",
        "################",
        "#..............#",
        "#..............#",
        "#..............#",
        "...............#",
        ".....o.....h...#",
        "################",
        "################",
        "################"
      ],
      exits: [{ side: "L", a: 5, b: 6, to: "b2", at: [38, 5] }]
    },

    b3: {
      zone: "bosque", name: "Claro del Verdugo", g: [176, 0], boss: "verdugo", bossTrigger: 5,
      rows: [
        "##############################",
        "##############################",
        "######..................######",
        "##D........................D##",
        "#.D........................D.#",
        "#.D........................D.#",
        "#.D........................D.#",
        "..D........................D..",
        "..D........................D..",
        "..D................K.......D..",
        "##############################",
        "##############################"
      ],
      exits: [
        { side: "L", a: 7, b: 9, to: "b2", at: [38, 19] },
        { side: "R", a: 7, b: 9, to: "b5", at: [1, 9] }
      ]
    },

    b5: {
      zone: "bosque", name: "Altar Marchito", g: [206, 0],
      rows: [
        "######################",
        "######################",
        "#####............#####",
        "###................###",
        "##..................##",
        "#....................#",
        "#....................#",
        "...................GG#",
        "...................GG#",
        "....L.....B........GG#",
        "######################",
        "######################"
      ],
      exits: [{ side: "L", a: 7, b: 9, to: "b3", at: [28, 9] }],
      lore: [{
        who: "Piedra del altar",
        pages: [
          "«Bajo el bosque descienden las Minas del Silencio. Allí el eco del Rey Vacío todavía respira.»",
          "«Solo quien haya vencido al Verdugo será reconocido por la runa del portón.»"
        ]
      }]
    }
  };

  /* Diálogos del ermitaño según el progreso. */
  SS.HERMIT = {
    first: [
      "Ah… otro que despierta. Hacía tiempo que nadie caminaba por el Refugio de Ceniza.",
      "El Rey Vacío arrancó el alma de este reino. Lo que ves vagando son cáscaras sin recuerdo.",
      "Descansa en ese banco cuando lo necesites: recuperarás tu vida y tu viaje quedará grabado.",
      "La esencia que sueltan las criaturas es lo único que queda de sus almas. Llévala a un banco y sube de nivel.",
      "Si caes, tu esencia se quedará donde caíste, como un eco. Vuelve por ella antes de caer otra vez.",
      "Al este está el Bosque Marchito. En su hondonada duerme una técnica olvidada… y el Verdugo vigila el claro."
    ],
    again: [
      "La hondonada está bajo el bosque. Busca el hueco en el suelo.",
      "Sin la técnica olvidada no cruzarás las púas de las raíces."
    ],
    dash: [
      "Esa forma de moverte… recuperaste el Dash. Las púas de las raíces ya no te detendrán.",
      "Más allá espera el Verdugo. Observa sus brazos antes de cada golpe."
    ],
    boss: [
      "Venciste al Verdugo. Siento que el reino respira un poco mejor.",
      "La runa del portón te reconocerá. Las Minas del Silencio esperan… cuando estés listo."
    ]
  };

  SS.RELICS = {
    "r2:18:5": "Espejo de ceniza",
    "b2:30:5": "Pluma de cuervo hueco"
  };
  SS.RELIC_TOTAL = 2;

  SS.ABILITIES = {
    dash: {
      name: "Dash", icon: "»",
      desc: "Pulsa Esquivar (Shift / K o el botón Esquiva) para lanzarte hacia delante, también en el aire. Te permite cruzar abismos."
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

  SS.UPGRADE_COST = { hp: [100, 220, 360, 520], atk: [120, 260, 420, 600] };
})();
