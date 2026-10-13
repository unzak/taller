/**
 * La portada del taller. Existe porque el sitio ya no es una herramienta sino
 * tres: `unzak.github.io/taller/` tiene que llevar a alguna parte, y lo que
 * tiene que hacer es dejarte elegir.
 *
 * Las fichas salen de la misma lista que la barra de arriba, asi que anadir una
 * cuarta herramienta sigue siendo tocar `TOOLS` y nada mas.
 */
import { nav, TOOLS } from "./nav.js";
import "./portada.css";

/** Lo que hace cada una, que el nombre solo no lo dice. */
const QUE_HACE: Record<string, string> = {
  "news-maker": "El titular de Cabronazi sobre la foto, con el filete y el logo de la vertical.",
  memegenerator: "La banda con el texto arriba y la foto debajo. Sin plantilla fija.",
  videomemegenerator: "La plantilla del PSD sobre un vídeo vertical, montado en MP4 aquí mismo.",
  hilogenerator: "El carrusel entero: la portada y sus slides, con imagen o con vídeo.",
};

nav(null);

const fichas = document.getElementById("fichas");
if (fichas) {
  for (const tool of TOOLS) {
    const a = document.createElement("a");
    a.className = "ficha";
    a.href = `./${tool.id}/`;
    a.innerHTML = `<svg viewBox="0 0 24 24" width="26" height="26" aria-hidden="true">${tool.icon}</svg>`;
    const h = document.createElement("h2");
    h.textContent = tool.name;
    const p = document.createElement("p");
    p.textContent = QUE_HACE[tool.id] ?? "";
    a.append(h, p);
    fichas.append(a);
  }
}
