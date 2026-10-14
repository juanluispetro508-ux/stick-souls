# Stick Souls — versión 2

Metroidvania 2D oscuro. Eres el **guardián de capucha roja**: cayó defendiendo a la princesa y despierta entre cenizas. El Rey Vacío se la llevó a lo más hondo de la tierra, y tú bajas a buscarla.

Arte de fondos, bloques de piedra y musgo, caballero y Verdugo: **diseños de Juan** (hoja de concepto). Lo demás se dibuja con código. La música y los sonidos se generan en el navegador. No hay imágenes ni sonidos de otros juegos.

## Novedades de esta versión

- **24 salas**: 12 en el Refugio de Ceniza y 12 en el Bosque Marchito, con salas grandes de saltos (Torre de las Cadenas, Puente de Brasas, Copas Colgantes, Árbol Hueco) y rincones secretos.
- **Gancho de cadena** (se gana al vencer al Can Bicéfalo): se lanza a las argollas de hierro, te balanceas, trepas y saltas con impulso. Colgado, puedes lanzarlo a la siguiente argolla.
- **Animaciones fluidas**: la pose se mezcla siempre, sin saltos. Cada ataque es una animación propia: tajo de ida y tajo de vuelta, tajo hacia arriba, estocada desde arriba (con rebote) y golpe cargado. El machete deja una estela que sigue su recorrido real.
- **Nuevo jefe: El Can Bicéfalo** (Refugio): embestida con mordida, aliento de brasas, salto con ondas y aullido que hace llover brasas.
- **El Verdugo rediseñado** según el dibujo: capucha negra, barriga, faldón rojo, hacha de carnicero y bola con cadena (física real) que gira y lanza.
- **Enemigos nuevos**: el espadachín desenvaina, acecha, tira tajos y salta con estocada; los espectros chillan y se lanzan atravesando muros; el ahorcado cae de su soga si pasas debajo; alimañas y escupidores de brasas o esporas.
- **Física**: faldón y capucha con tela, cadenas y faroles que se mecen y se empujan, barriles y vasijas que ruedan y se rompen, hierba que se aparta, cadáveres que caen como muñecos de trapo.
- **Música suave de clarinete distinta por zona** (menú, introducción, refugio, bosque, cueva, taberna y jefes).
- **Letra cursiva** (IM Fell English y Cormorant Garamond, licencia libre OFL, incluidas).
- **Historia**: introducción animada al empezar una partida nueva y voces de la princesa tras cada jefe. La princesa es una silueta provisional hasta tener su diseño.
- **Fondos vivos**: rayos de sol que se mueven y respiran, motas de polvo que brillan en la luz, niebla que avanza, brasas, luciérnagas, hojas que caen, aves y cadenas o ramas en primer plano.
- **Puestos de cerveza** en lugar de bancos: el caballero se sienta, se toma una botella y se cura (también guarda la partida, rellena la petaca y permite subir de nivel).
- **Petaca plateada**: un trago cura 2 almas mientras caminas. Se rellena en los puestos y se puede agrandar.
- **Al morir queda una cruz** de madera con un jirón rojo donde caíste; tócala para recuperar tu esencia.

## Cómo jugar

- **En el computador:** abre `index.html` (Chrome, Edge o Firefox).
- **En el celular o con enlace:** publícalo en Vercel y ábrelo desde el navegador; se puede instalar como app.

### Controles (PC, reasignables en *Controles*)

| Acción | Teclas |
|---|---|
| Moverse | A / D o flechas |
| Saltar (mantén para más altura) | Espacio |
| Atacar | J o clic izquierdo (con W: tajo arriba; en el aire con S: estocada abajo) |
| Rodar / Dash en el aire | Shift o K |
| Golpe cargado (mantener y soltar) | L |
| Gancho | I, F o clic derecho |
| Beber de la petaca | U o Q |
| Interactuar (puesto, inscripciones, ermitaño) | W o flecha arriba |
| Bajar de una plataforma | S + Espacio |
| Mapa | M o Tab (arrastra para moverlo, rueda para acercar) |
| Pausa | Esc |

En el celular aparecen botones táctiles, incluidos **Gancho** y **Petaca**.

> La partida guardada de la versión anterior no se usa (el mundo cambió por completo): empieza una **Nueva partida**.

## Arquitectura

Sin librerías. Scripts clásicos, así funciona abriendo `index.html` directamente.

```
index.html          Página, menús y botones táctiles
style.css           Estilos y fuentes
assets/arte/        Fondos, bordes de piedra/musgo, plataformas, decoración y retratos (de la hoja de Juan)
assets/fuentes/     Fuentes cursivas (OFL) y sus licencias
js/core.js          Utilidades, brillos, carga de imágenes, guardado
js/audio.js         Efectos y música de clarinete por zona (Web Audio)
js/input.js         Teclado, ratón y multitoque
js/rooms.js         Zonas, historia, diálogos, habilidades y jefes
js/rooms_data.js    Las 24 salas (mapas de texto y posición en el mapa)
js/physics.js       Cuerdas y cadenas, muñecos de trapo, objetos rompibles
js/world.js         Colisiones, texturas del terreno, decoración y faroles
js/particles.js     Partículas (brasas, hojas, motas, espectros…)
js/bg.js            Fondos pintados, rayos, niebla, primer plano
js/skeleton.js      Esqueleto, mezcla de poses y dibujo del caballero
js/player.js        Caballero: movimiento, ataques, gancho, petaca, muerte
js/enemies.js       Enemigos, proyectiles, esencia, aves, cruz
js/boss.js          El Verdugo, ondas y rocas
js/dog.js           El Can Bicéfalo
js/objects.js       Puesto de cerveza, ermitaño, argollas, altares…
js/cinematic.js     Introducción animada
js/ui.js            Menús, puesto, mapa, inventario y HUD
js/game.js          Bucle (1/60 s), salas, cámara, reglas
```

## Publicar (GitHub + Vercel)

Sitio estático: sube **el contenido** de la carpeta al repositorio (que `index.html` quede en la raíz, junto a `js/` y `assets/`) y Vercel lo publica solo (Framework Preset: **Other**). Si ya estaba publicado, basta con reemplazar los archivos y hacer *commit*.

## Pruebas realizadas

En Chromium sin ventana: arranque sin errores, introducción completa y botón de saltar, despertar, todas las animaciones del caballero, cada sala dibujada, **recorrido de las 24 salas con la física real del juego** (un buscador automático prueba saltos, dash y cadenas de gancho desde cada punto alcanzable: todas las salidas, reliquias, fragmentos y altares se alcanzan con las habilidades que corresponden, y las zonas bloqueadas siguen bloqueadas sin ellas, también en el camino de vuelta), ciclo completo de ambos jefes (todos sus ataques, fase 2, derrota, recompensa y diálogo), enemigos en todos sus estados, puesto de cerveza (beber, subir de nivel, levantarse), petaca, muerte con cruz y recuperación, púas, muro secreto, barriles, altar, portón final, ermitaño, mapa, inventario, música de cada zona y botones táctiles en vertical y horizontal sin solaparse.

**No se probó en teléfonos reales**: la sensación del gancho y de los controles táctiles y el rendimiento en equipos modestos deben confirmarse jugando.
