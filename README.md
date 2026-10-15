# taller

El **Taller Cabronazi**: las cuatro herramientas de la casa en un repositorio.

- [**news-maker**](news-maker/README.md) — el titular de Cabronazi sobre la foto,
  1080 × 1350, clavado sobre su PSD.
- [**memegenerator**](memegenerator/README.md) — la banda con el texto arriba y la
  foto debajo, sin plantilla fija.
- [**videomemegenerator**](videomemegenerator/README.md) — la plantilla del PSD
  sobre un vídeo vertical, montado en MP4 en el propio navegador.
- [**hilogenerator**](hilogenerator/README.md) — el carrusel entero: una portada
  y sus slides, cada una con su imagen o su vídeo, a 1080 × 1350.

**Todo ocurre en el navegador.** No hay servidor y no hay nada que instalar para
usarlas: la página publicada funciona sola, y nada de lo que se suelta ahí sale
del equipo.

## Por qué están juntas

Estaban en tres repositorios, y de los últimos ocho commits de cada uno, **cinco
eran el mismo cambio hecho tres veces**: el aire del panel Pulso Viral, la barra
de las tres herramientas, la vista previa flotante del móvil, la revisión
ortográfica, los faviconos. El menú era el caso claro: cada herramienta tenía que
saber de las otras dos, así que añadir una cuarta significaba tocar tres
repositorios y acordarse de los tres.

Lo que **no** se ha unificado es el producto. `format.ts` y `render.ts` de cada
una comparten entre un 26 % y un 49 % de líneas, y las diferencias son
justamente lo que las distingue: cada una reproduce un PSD distinto. Fundirlas
daría un renderizador gobernado por configuración, que es peor que tener tres
claros. Son tres proyectos que comparten piel, no una librería con tres pieles.

## Qué comparten

| Archivo | Qué hay dentro |
| --- | --- |
| `comun/piel.css` | Lo que era **byte a byte igual** en las tres hojas: la paleta del panel Pulso Viral, la barra de herramientas, la cabecera, los paneles, los campos y el cuadro de la revisión. |
| `comun/nav.ts` | La lista de herramientas y el menú que las enlaza. Añadir otra es tocar `TOOLS` y nada más: así entró el hilo. |
| `comun/historial.ts` · `historial.css` | El historial: cada herramienta guarda sola lo que se está haciendo, en el propio navegador (IndexedDB), con sus imágenes y vídeos. Volver atrás o recargar lo recupera, y debajo de cada una quedan los 10 últimos trabajos para abrirlos o borrarlos. Nada sale del equipo. |
| `comun/encode.ts` | El motor de vídeo, ffmpeg en WebAssembly. Lo usan el vídeo meme y el hilo, cada uno con su lienzo. |
| `comun/spell.ts` | La consulta a LanguageTool, que estaba idéntica en los tres repositorios. |
| `comun/portada.ts` · `portada.css` · `favicon.svg` | La portada del taller, que es lo que hay en la raíz del sitio. |

Lo que se había desviado —el tamaño de los cuadraditos de color, el ancho del
selector, la cama de la vista previa reducida— **se queda en la hoja de cada
herramienta**. Sus diferencias pueden ser deliberadas y no es una unificación de
carpetas lo que decide cambiarlas. Cada `src/style.css` carga la piel primero y
pisa lo que necesita, así que se ve de un vistazo qué se está apartando de la
casa.

La paleta tampoco se ha tocado: news-maker tiene la de las verticales
(Cabropeludos, Cabrogamer, Cabrodeportes, Cabromotor) y las otras dos una más
corta. Unificarlas cambia qué colores ofrece cada una, y eso es una decisión de
producto, no un refactor.

## Requisitos

- Node.js >= 20

```bash
npm install
```

## Desarrollo

```bash
npm run dev
```

Un solo servidor sirve las cinco páginas: la portada en `/` y cada herramienta
en `/news-maker/`, `/memegenerator/`, `/videomemegenerator/` y `/hilogenerator/`.

## Publicar

```bash
npm run build
```

Vite las monta como un sitio de varias páginas —una entrada por `index.html`— y
la salida conserva las carpetas: `dist/news-maker/index.html` y compañía. Con
`base: "./"` las rutas son relativas, así que la build vale igual en
`unzak.github.io/taller/` que abriendo el HTML desde el disco. Es lo que hacía
cada una por separado, y es lo que ha permitido moverlas de sitio sin tocar la
configuración.

Los trozos comunes salen **una sola vez**: `nav` y `spell` quedan en su propio
fragmento y todas lo comparten. Y ffmpeg sigue estando solo en las dos que
montan vídeo, que son las únicas que lo importan.

El workflow de `.github/workflows` despliega a Pages en cada push a `main`.

## Estructura

```
comun/                 la piel, el menú, LanguageTool y la portada
news-maker/            index.html · src/{format,render,main}.ts · src/assets/
memegenerator/         idem
videomemegenerator/    idem; el motor de vídeo está en comun/encode.ts
hilogenerator/         idem
index.html             la portada del taller
```

La historia de las tres viene entera: se importaron con `git subtree` y los 71
commits siguen aquí. Pero **`git log news-maker/` no los enseña**: los commits
originales tocaban `src/main.ts`, no `news-maker/src/main.ts`, y el filtro por
ruta no cruza ese salto. Para leer lo de antes de la mudanza hay que ir al
segundo padre del commit que la importó:

```bash
git log --oneline --grep="Add 'news-maker/'"
git log --oneline <ese-hash>^2
```

## Parientes

- [noticias-virales](https://github.com/unzak/noticias-virales) — el panel Pulso
  Viral, de donde sale la piel. Es Python con un panel estático, otro animal, y
  por eso se queda fuera.
