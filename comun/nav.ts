/**
 * La barra de las herramientas del taller.
 *
 * Estaba escrita a mano en los tres `index.html`, y cada una tenia que saber de
 * las otras dos: anadir una cuarta obligaba a tocar los tres archivos y acordarse
 * de los tres. Ahora la lista esta en un sitio y cada pagina solo dice cual es
 * ella.
 *
 * Se pinta desde aqui y no desde el HTML porque los enlaces son relativos entre
 * hermanas, y eso es lo que hace que el sitio entero valga igual en
 * `unzak.github.io/taller/` que abriendo la build desde el disco. El hueco ya
 * esta en el HTML con su alto reservado —`min-height: var(--nav-h)` en la
 * piel—, asi que rellenarlo no mueve nada de sitio.
 */

export interface Tool {
  /** El id es tambien la carpeta, y por tanto el trozo de URL. */
  id: string;
  name: string;
  /** Los tres nombres enteros piden 480 px y un movil da 390. */
  short: string;
  /** Trazado del icono, sobre un `viewBox` de 24. */
  icon: string;
}

export const TOOLS: Tool[] = [
  {
    id: "news-maker",
    name: "News Maker",
    short: "News",
    icon: '<rect x="4" y="3" width="16" height="18" rx="2.5" /><path d="M8 8h8M8 12h8M8 16h5" />',
  },
  {
    id: "memegenerator",
    name: "Meme Generator",
    short: "Meme",
    icon:
      '<rect x="3" y="4.5" width="18" height="15" rx="2.5" />' +
      '<circle cx="8.6" cy="10" r="1.5" />' +
      '<path d="m4.5 17.5 4.4-4.4a1.8 1.8 0 0 1 2.6 0l5 5" />',
  },
  {
    id: "videomemegenerator",
    name: "Video Meme Generator",
    short: "Video",
    icon:
      '<rect x="3" y="4" width="18" height="16" rx="2.5" />' +
      '<path d="M3 9h18" /><path d="m7.6 4 2.4 5M13.1 4l2.4 5" />',
  },
  {
    id: "hilogenerator",
    name: "Hilo Generator",
    short: "Hilo",
    icon:
      '<rect x="8" y="3" width="12" height="15" rx="2.5" />' +
      '<path d="M4 7v11.5A2.5 2.5 0 0 0 6.5 21H16" /><path d="M11.5 13.5h5" />',
  },
];

/**
 * Rellena el `<nav class="tools">` de la pagina.
 *
 * `current` es el id de la herramienta abierta, que sale en la pastilla rosa y
 * no enlaza a ninguna parte; en la portada del taller no hay ninguna abierta,
 * asi que va `null` y entonces las tres cuelgan de la propia portada.
 */
export function nav(current: string | null): void {
  const host = document.querySelector<HTMLElement>("nav.tools");
  if (!host) return;

  const inner = document.createElement("div");
  inner.className = "tools-inner";

  for (const tool of TOOLS) {
    const open = tool.id === current;
    const a = document.createElement("a");
    a.className = open ? "tool is-current" : "tool";
    // Desde una herramienta se sale a la hermana subiendo un nivel; desde la
    // portada se baja a ella. Y la que ya esta abierta enlaza a si misma.
    a.href = open ? "./" : current ? `../${tool.id}/` : `./${tool.id}/`;
    a.setAttribute("aria-label", tool.name);
    if (open) a.setAttribute("aria-current", "page");
    a.innerHTML =
      `<svg viewBox="0 0 24 24" width="17" height="17" aria-hidden="true">${tool.icon}</svg>` +
      `<span class="tool-name"></span><span class="tool-name-short" aria-hidden="true"></span>`;
    // Los nombres por textContent y no en la plantilla: son datos, y asi no hay
    // forma de que un nombre con un `<` rompa el marcado.
    a.querySelector(".tool-name")!.textContent = tool.name;
    a.querySelector(".tool-name-short")!.textContent = tool.short;
    inner.append(a);
  }

  host.replaceChildren(inner);
}
