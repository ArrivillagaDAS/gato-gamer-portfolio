# Gato gamer portfolio

Portafolio web interactivo en 3D. El visitante personaliza un gato y explora con él una habitación gamer: escala muebles, tira objetos con la cabeza, juega en una máquina arcade, elige música en una rockola y cava un túnel en el arenero que lleva a un jardín-laberinto.

**Sitio publicado:** https://arrivillagadas.github.io/gato-gamer-portfolio/

Todo corre en el navegador con Three.js y Rapier. No usa modelos de pago ni modelado manual: los modelos vienen de paquetes gratuitos (CC0 y CC BY) y el resto se construye con geometrías primitivas, texturas de canvas y Web Audio.

## Funcionalidades

- **Personalización inicial**: cinco colores de pelaje, audífonos RGB y collar LED. La elección se guarda en el navegador.
- **Habitación completa**: escritorio con tres monitores, paneles hexagonales LED, torre de PC, cama, sofá, TV, mini nevera, ventana con vista a la ciudad, guirnaldas de luces y plantas.
- **Física con Rapier**: controlador de personaje cinemático, colisiones con la forma real de los muebles, objetos que se pueden empujar y tirar (taza, libros, estambres, cajas, oso de peluche).
- **Cámara orbital**: se gira arrastrando con el mouse o con un dedo, con zoom y sin atravesar paredes.
- **Objetos interactivos**: rascador escalable, pecera con peces que reaccionan al gato y puntero láser que se puede atrapar.
- **Arcade "No toques las paredes"**: minijuego de tres niveles en el que el mismo gato, visto desde arriba, sigue al cursor.
- **Rockola**: cuatro pistas generadas en vivo con Web Audio (lo-fi, chiptune, synthwave y bossa). Las luces de la habitación laten con la música.
- **Jardín-laberinto**: se entra cavando en el arenero. Tiene césped, setos, flores, árboles, mariposas y siete pescados dorados que recolectar.

## Controles

| Acción | Teclado y mouse | Táctil |
|---|---|---|
| Moverse | `WASD` o flechas | Joystick |
| Correr | `Shift` | Joystick al máximo |
| Saltar | `Espacio` | Botón de salto |
| Cabezazo / interactuar | `E` | Botón de huella |
| Girar la cámara | Arrastrar con clic izquierdo | Deslizar un dedo |
| Zoom | Rueda | Pellizcar |
| Volver a la personalización | `Esc` o "Editar gato" | "Editar gato" |

## Tecnologías

- [Three.js](https://threejs.org/) 0.170 para el render
- [Rapier](https://rapier.rs/) 0.14 (`@dimforge/rapier3d-compat`) para la física
- [Vite](https://vitejs.dev/) 5 para desarrollo y build
- Web Audio API para la música

## Desarrollo

Requiere Node.js 18 o superior.

```bash
npm install
npm run dev
```

El servidor de desarrollo queda en `http://localhost:5174`.

```bash
npm run build
npm run preview
```

### Despliegue

Cada push a `main` compila el proyecto y lo publica en GitHub Pages con el workflow `.github/workflows/deploy.yml`. En el build, Vite usa la ruta base `/gato-gamer-portfolio/`.

### Flujo de ramas

- `main`: versión publicada.
- `dev`: integración.
- `feature/<nombre>`: cada funcionalidad nueva sale de `dev` y vuelve a `dev` con un merge sin fast-forward.

Los commits siguen [Conventional Commits](https://www.conventionalcommits.org/).

### Herramientas de modelos

La carpeta `tools/` contiene scripts para inspeccionar archivos `.glb` (triángulos, materiales, huesos y animaciones) y para mantener `public/models/manifest.json`.

```bash
cd tools
npm install
node inspect.mjs ../public/models/characters/cat.glb
```

`viewer.html` es un visor de todos los modelos del manifiesto, y `gato-gamer.html` es la demo original del gato personalizable.

## Estructura

```
public/models/       Modelos .glb, manifest.json y CREDITS.md
src/
  audio/             Música generada con Web Audio
  camera/            Cámara orbital que sigue al gato
  cat/               Gato personalizable (pelaje y accesorios)
  input/             Teclado y controles táctiles
  minigame/          Minijuego del arcade
  physics/           Envoltura de Rapier
  player/            Controlador del personaje
  ui/                Personalización, HUD y menú de la rockola
  world/             Habitación, objetos procedurales y laberinto
  main.js            Escenas, zonas, transiciones y bucle principal
tools/               Scripts de inspección de modelos
```

## Créditos de modelos

El detalle por archivo está en [`public/models/CREDITS.md`](public/models/CREDITS.md).

- **Gato**: [Quaternius](https://poly.pizza/m/qKICY6xla2), CC0.
- **Muebles y objetos**: [Kenney Furniture Kit](https://kenney.nl/assets/furniture-kit), CC0.
- **Repisas**: [KayKit Furniture Bits](https://kaylousberg.itch.io/furniture-bits) de Kay Lousberg, CC0.
- **Taza**: [MilkAndBanana](https://poly.pizza/m/54cOZNS04L), CC0.
- **Torre de PC**: "Gaming Computer" de [Alex Safayan](https://poly.pizza/m/5cN7W4ufoII), CC BY 3.0.
- **Mando de consola**: "Low Poly Controller" de [Ginsta](https://poly.pizza/m/fCyA3Ug79X), CC BY 3.0.
- **Audífonos**: "Headphones" de [Ginsta](https://poly.pizza/m/VLB0kuGDoP), CC BY 3.0.

Los modelos con licencia CC BY 3.0 requieren atribución visible en el sitio publicado. Por eso el sitio incluye una ventana de créditos, accesible desde la pantalla de personalización y desde el botón "Créditos" dentro del cuarto.
