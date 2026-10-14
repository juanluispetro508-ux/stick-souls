# Stick Souls — Fase 1

Metroidvania 2D de acción con stickmans, inspirado en el género de Hollow Knight pero con mundo, personajes, enemigos, historia y arte propios (todo se dibuja con código; no hay imágenes ni sonidos de otros juegos).

Despiertas en un reino subterráneo sin alma. Explora el **Refugio de Ceniza** y el **Bosque Marchito**, recupera técnicas olvidadas, sube de nivel en los bancos y enfréntate a **El Verdugo**.

## Cómo jugar

- **En el computador:** abre `index.html` con doble clic (Chrome, Edge o Firefox). No necesita instalación ni Internet.
- **En el celular o con enlace:** publícalo en Vercel (ver abajo) y ábrelo desde el navegador. Se puede instalar como app: menú del navegador → *Agregar a pantalla principal* / *Instalar app*.

### Controles (PC, reasignables en *Controles*)

| Acción | Teclas |
|---|---|
| Moverse | A / D o flechas |
| Saltar (mantén para más altura) | Espacio |
| Atacar | J o clic izquierdo (con W / S: golpe arriba / abajo) |
| Esquivar / Dash | Shift o K |
| Habilidad: golpe cargado (mantener y soltar) | L |
| Interactuar (bancos, inscripciones, ermitaño) | W o flecha arriba |
| Bajar de una plataforma | S + Espacio |
| Mapa | M o Tab |
| Pausa | Esc |

### Controles (celular)

Botones táctiles automáticos: ◀ ▶ moverse, ▲ interactuar / golpe arriba, ▼ golpe abajo en el aire, **Salto**, **Ataque**, **Esquiva** y **Hab.** Admiten varios dedos a la vez y deslizar entre botones. En vertical los botones van debajo del juego; en horizontal, a los lados. Tamaño y visibilidad en *Opciones*.

## Lo que incluye esta fase

- 9 habitaciones conectadas en 2 zonas, con transiciones, salidas reconocibles y regreso a zonas anteriores.
- Movimiento con gravedad, salto variable, tiempo de gracia (coyote) y búfer de salto, colisiones sólidas y plataformas atravesables.
- Ataque lateral, hacia arriba y hacia abajo (rebote sobre enemigos y púas), esquiva con invulnerabilidad y recarga.
- Habilidades desbloqueables: **Dash** (en la Hondonada, permite cruzar el foso de las Raíces Altas) y **Golpe cargado** (al vencer al Verdugo). El **Doble salto** ya está programado y se obtendrá en las Minas (fase 2).
- Enemigos: rastrero, polilla de ceniza, saltador y escupidor, con IA propia, retroceso e invulnerabilidad breve.
- Jefe **El Verdugo**: hachazo con onda de choque, embestida contra la pared, salto aplastante con sombra de aviso, ventanas de vulnerabilidad y segunda fase más rápida con rocas que caen.
- Esencia que sueltan las criaturas; al morir queda como **eco** donde caíste y puedes recuperarla.
- **Bancos**: recuperan la vida, guardan la partida y permiten **subir de nivel** (vida y ataque) con esencia.
- Coleccionables ocultos: 2 reliquias, 1 fragmento de alma, muros secretos.
- **Mapa** que se dibuja con la forma real de las salas descubiertas, con bancos, jefe, eco y salidas sin explorar.
- Inventario, opciones (volumen, silencio, vibración, tamaño de botones), controles reasignables, pausa, menú principal y pantalla de fin de fase.
- Fondos con varias capas difuminadas y paralaje, bandadas de aves, pajaritos que huyen al acercarte, ceniza, luciérnagas, rayos de luz, niebla y viñeta.
- Sonido generado con Web Audio API y ambiente distinto por zona.
- Guardado automático en el navegador (localStorage).

## Arquitectura

Sin librerías ni archivos externos. Scripts clásicos (no módulos) para que funcione abriendo `index.html` directamente.

```
index.html      Página, menús y botones táctiles
style.css       Estilos
manifest.json   Datos para instalar como app
sw.js           Caché para jugar sin conexión cuando se publica (no se usa al abrir el archivo)
assets/         Íconos
js/core.js      Utilidades, azar con semilla, brillos precalculados, almacenamiento
js/audio.js     Efectos y ambiente sintetizados (Web Audio API)
js/input.js     Teclado reasignable, ratón y multitoque
js/rooms.js     Zonas, habitaciones (mapas de texto), diálogos y textos
js/world.js     Habitaciones: colisiones por ejes, púas, muros secretos, dibujo del terreno
js/particles.js Partículas con depósito fijo (sin crear objetos por fotograma)
js/bg.js        Fondos difuminados con paralaje, aves, luz, niebla, ambiente
js/player.js    Stickman: física, combate, animación procedural y bufanda
js/enemies.js   Enemigos, proyectiles, esencia, pajaritos y eco
js/boss.js      El Verdugo, ondas de choque y rocas
js/ui.js        Menús, diálogos, banco, mapa, inventario y HUD
js/game.js      Bucle con paso fijo (1/60 s) y delta time, estados, cámara, reglas
```

## Publicar con enlace (GitHub + Vercel)

Es un sitio estático: **no necesita base de datos ni variables**.

1. En GitHub crea un repositorio nuevo (por ejemplo `stick-souls`) y sube **el contenido** de esta carpeta (que `index.html` quede en la raíz).
2. En Vercel: *Add New → Project → Import* el repositorio. En *Framework Preset* elige **Other**. Pulsa *Deploy*.
3. Comparte el enlace de *Domains* (por ejemplo `stick-souls.vercel.app`).

## Pruebas realizadas

Probado en Chromium sin ventana (escritorio 1280×720 y emulación de celular 390×844 vertical y 844×390 horizontal con toques simulados):
arranque sin errores, movimiento, salto completo (≈3 baldosas) y corto, colisiones, combate y muerte de enemigos, recogida de esencia, púas y regreso al suelo seguro, muro secreto y reliquia, foso que solo se cruza con dash, todas las salidas sin aparecer dentro de la roca, ciclo completo del Verdugo (intro, salto, embestida, aturdimiento, hachazo, fase 2, derrota, habilidad y puertas), banco y subida de nivel, diálogo, muerte con eco y recuperación, mapa, pausa, inventario, reasignación de teclas, guardado al recargar, multitoque (moverse y atacar a la vez), deslizar entre botones y salto táctil mantenido.

**No se probó en teléfonos reales**: la sensación de los controles táctiles y el rendimiento en equipos modestos deben confirmarse jugando.

## Próximas fases

Minas del Silencio (doble salto, trampas), Ciudad Hundida (La Sombra Gemela) y Santuario Vacío (El Rey Vacío y pantalla de victoria final).
