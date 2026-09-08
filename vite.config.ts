import { defineConfig } from "vite";

export default defineConfig({
  // Rutas relativas: la build vale igual en unzak.github.io/taller/<app>/ que
  // abriendo el HTML directamente desde el disco. Es lo que ya hacian las tres
  // por separado, y es lo que permite moverlas de sitio sin tocar nada.
  base: "./",

  // Un sitio de varias paginas, no una aplicacion: sin el respaldo a index.html
  // una ruta que no existe tiene que dar 404, no la portada.
  appType: "mpa",

  // No hay carpeta publica: cada herramienta sirve sus propios iconos desde su
  // `src/assets`, que es la unica forma de que tres favicones distintos convivan
  // en una sola build.
  publicDir: false,

  build: {
    // El overlay de news-maker pesa 4.219 bytes y tiene que quedar como archivo,
    // no incrustado en base64.
    assetsInlineLimit: 4096,
    rollupOptions: {
      input: {
        taller: "index.html",
        "news-maker": "news-maker/index.html",
        memegenerator: "memegenerator/index.html",
        videomemegenerator: "videomemegenerator/index.html",
      },
    },
  },

  worker: {
    // El worker de ffmpeg, en el video meme, se carga con `type: "module"`.
    format: "es",
  },
});
