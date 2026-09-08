import { defineConfig } from "vite";

export default defineConfig({
  // Rutas relativas: la build vale igual en unzak.github.io/videomemegenerator/
  // que abriendo el HTML directamente desde el disco.
  base: "./",
  worker: {
    // El worker de ffmpeg se carga con `type: "module"`, asi que Vite tiene
    // que empaquetarlo como modulo y no como script clasico.
    format: "es",
  },
});
