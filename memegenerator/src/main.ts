import {
  CANVAS_W,
  COLOR_BAND,
  COLOR_HIGHLIGHT,
  COLOR_TEXT,
  COLORS,
  FONT,
  FONT_SIZE,
  FONT_SIZE_MAX,
  FONT_SIZE_MIN,
  ZOOM_MAX,
  ZOOM_MIN,
} from "./format.js";
import {
  clampPhotoOffset,
  computeLayout,
  render,
  type PhotoTransform,
  type RenderOptions,
} from "./render.js";
import { applyFixes, check, type Issue } from "./spell.js";
import "./style.css";

function need<T extends Element>(id: string): T {
  const el = document.getElementById(id);
  if (!el) throw new Error(`Falta el elemento #${id} en el HTML`);
  return el as unknown as T;
}

const textEl = need<HTMLTextAreaElement>("text");
const alignEl = need<HTMLSelectElement>("align");
const sizeEl = need<HTMLInputElement>("size");
const sizeValueEl = need<HTMLSpanElement>("size-value");
const stageEl = need<HTMLDivElement>("stage");
const hintEl = need<HTMLDivElement>("hint");
const fileEl = need<HTMLInputElement>("file");
const pickEl = need<HTMLButtonElement>("pick");
const fileNameEl = need<HTMLParagraphElement>("file-name");
const zoomEl = need<HTMLInputElement>("zoom");
const bandEl = need<HTMLInputElement>("color-band");
const textColorEl = need<HTMLInputElement>("color-text");
const highlightEl = need<HTMLInputElement>("color-highlight");
const generateEl = need<HTMLButtonElement>("generate");
const statusEl = need<HTMLParagraphElement>("status");
const previewEl = need<HTMLCanvasElement>("preview");
const previewInfoEl = need<HTMLParagraphElement>("preview-info");
const outputEl = need<HTMLElement>("output");
const resultEl = need<HTMLCanvasElement>("result");
const resultInfoEl = need<HTMLParagraphElement>("result-info");
const reviewEl = need<HTMLDivElement>("review");
const reviewTitleEl = need<HTMLParagraphElement>("review-title");
const reviewListEl = need<HTMLUListElement>("review-list");
const reviewFixEl = need<HTMLDivElement>("review-fix");
const reviewProposalEl = need<HTMLParagraphElement>("review-proposal");
const fixEl = need<HTMLButtonElement>("fix");
const downloadEl = need<HTMLButtonElement>("download");
const previewPanelEl = need<HTMLElement>("preview-panel");
const miniEl = need<HTMLDivElement>("mini");
const miniCanvasEl = need<HTMLCanvasElement>("mini-canvas");
const miniCloseEl = need<HTMLButtonElement>("mini-close");

function context(canvas: HTMLCanvasElement): CanvasRenderingContext2D {
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Este navegador no soporta canvas 2D");
  return ctx;
}

const previewCtx = context(previewEl);
const resultCtx = context(resultEl);
const miniCtx = context(miniCanvasEl);

interface State {
  photo: HTMLImageElement | null;
  photoSize: { width: number; height: number } | null;
  photoName: string;
  transform: PhotoTransform;
}

const state: State = {
  photo: null,
  photoSize: null,
  photoName: "",
  transform: { zoom: 1, offsetX: 0, offsetY: 0 },
};

function options(): RenderOptions {
  return {
    photo: state.photo,
    photoSize: state.photoSize,
    transform: state.transform,
    text: textEl.value,
    align: alignEl.value === "left" ? "left" : "center",
    font: FONT,
    fontSize: Number(sizeEl.value),
    colorBand: bandEl.value,
    colorText: textColorEl.value,
    colorHighlight: highlightEl.value,
  };
}

function setStatus(message: string, kind: "" | "error" = ""): void {
  statusEl.textContent = message;
  statusEl.className = kind === "error" ? "status error" : "status";
}

// --- Tipografia ------------------------------------------------------------

/**
 * Espera a que cargue SF Pro antes de medir. Sin esto, la primera pasada mide
 * con la de respaldo y el texto sale con un ajuste que no corresponde.
 */
async function ensureFont(): Promise<void> {
  try {
    await document.fonts.load(`${FONT.weight} 64px ${FONT.stack}`);
    await document.fonts.ready;
  } catch {
    setStatus("No se pudo cargar SF Pro; se usará una de respaldo.", "error");
  }
}

// --- Colores ---------------------------------------------------------------

// Cada selector lleva su fila de muestras con la paleta de la casa, ademas del
// color libre del propio input.
for (const row of document.querySelectorAll<HTMLDivElement>(".swatches")) {
  const target = need<HTMLInputElement>(row.dataset.for ?? "");
  for (const { label, hex } of COLORS) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "swatch";
    btn.style.background = hex;
    btn.title = `${label} · ${hex}`;
    btn.addEventListener("click", () => {
      target.value = hex;
      draw();
    });
    row.append(btn);
  }
}

// --- Imagen ----------------------------------------------------------------

/**
 * Carga por evento y no con `img.decode()`: la promesa de decode se queda
 * colgada con blob URLs en algunos navegadores, y entonces la foto no aparece
 * sin dar ni un error.
 */
function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`No se pudo cargar la imagen: ${src}`));
    img.src = src;
  });
}

async function loadFile(file: File): Promise<void> {
  if (!file.type.startsWith("image/")) {
    setStatus("Ese archivo no es una imagen.", "error");
    return;
  }
  const url = URL.createObjectURL(file);
  try {
    const img = await loadImage(url);
    state.photo = img;
    state.photoSize = { width: img.naturalWidth, height: img.naturalHeight };
    state.photoName = file.name;
    state.transform = { zoom: 1, offsetX: 0, offsetY: 0 };
    zoomEl.value = "1";
    fileNameEl.textContent = `${file.name} · ${img.naturalWidth} × ${img.naturalHeight}`;
    if (img.naturalWidth < CANVAS_W) {
      setStatus(
        `Aviso: la foto tiene ${img.naturalWidth} px de ancho y el formato pide ${CANVAS_W}. Se verá pixelada.`,
        "error",
      );
    } else {
      setStatus("Listo para generar.");
    }
    draw();
  } catch {
    URL.revokeObjectURL(url);
    setStatus("No se pudo abrir la imagen.", "error");
  }
}

pickEl.addEventListener("click", () => fileEl.click());
fileEl.addEventListener("change", () => {
  const file = fileEl.files?.[0];
  if (file) void loadFile(file);
});

// Mientras no haya foto, la previa entera es el sitio donde soltarla.
stageEl.addEventListener("click", () => {
  if (!state.photo) fileEl.click();
});

/**
 * Soltar vale en cualquier parte de la pagina, no solo sobre la previa: si no
 * se corta el evento, el navegador se va a abrir el fichero y se pierde todo.
 * El resalte se quita con un temporizador en vez de con `dragleave`, que salta
 * sin parar al pasar por encima de los hijos.
 */
let overTimer = 0;
window.addEventListener("dragover", (e) => {
  e.preventDefault();
  stageEl.classList.add("over");
  clearTimeout(overTimer);
  overTimer = window.setTimeout(() => stageEl.classList.remove("over"), 150);
});

window.addEventListener("drop", (e) => {
  e.preventDefault();
  clearTimeout(overTimer);
  stageEl.classList.remove("over");
  const file = e.dataTransfer?.files?.[0];
  if (file) void loadFile(file);
});

// Pegar con Ctrl+V en cualquier parte: es lo mas rapido cuando la foto viene
// de una captura o de otra pestaña. Aqui la imagen llega con el evento, sin
// pedir permiso a nadie.
window.addEventListener("paste", (e) => {
  const file = e.clipboardData?.files?.[0];
  if (file) void loadFile(file);
});

// --- Encuadre --------------------------------------------------------------

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/** Del espacio de pantalla al del lienzo: la previa va escalada. */
function canvasScale(): number {
  return previewEl.width / previewEl.getBoundingClientRect().width;
}

/** Recorta el encuadre despues de cada gesto, para no dejarlo nunca invalido. */
function clampOffset(): void {
  if (!state.photoSize) return;
  const layout = computeLayout(previewCtx, options());
  clampPhotoOffset(state.photoSize, layout.photoArea, state.transform);
}

/** Del espacio de pantalla al del lienzo. */
function toCanvas(clientX: number, clientY: number): { x: number; y: number } {
  const rect = previewEl.getBoundingClientRect();
  const s = canvasScale();
  return { x: (clientX - rect.left) * s, y: (clientY - rect.top) * s };
}

type Target = "band" | "photo";

/** Que hay bajo el puntero. Decide a que afecta cada gesto. */
function targetAt(clientX: number, clientY: number): Target | null {
  const layout = computeLayout(previewCtx, options());
  const p = toCanvas(clientX, clientY);
  if (layout.bandH > 0 && p.y >= 0 && p.y < layout.bandH) return "band";
  return state.photo ? "photo" : null;
}

function setFontSize(size: number): void {
  sizeEl.value = String(Math.round(clamp(size, FONT_SIZE_MIN, FONT_SIZE_MAX)));
  draw();
}

function setZoom(zoom: number): void {
  state.transform.zoom = clamp(zoom, ZOOM_MIN, ZOOM_MAX);
  zoomEl.value = String(state.transform.zoom);
  clampOffset();
  draw();
}

zoomEl.addEventListener("input", () => setZoom(Number(zoomEl.value)));

const pointers = new Map<number, { x: number; y: number }>();
let lastX = 0;
let lastY = 0;
/** A que afecta el gesto en curso: al rotulo o a la foto. */
let target: Target | null = null;
/** Medidas con las que arranco el pellizco en curso. */
let pinch: { dist: number; zoom: number; fontSize: number } | null = null;

/** Distancia y punto medio entre los dos primeros dedos. */
function pinchGeometry(): { dist: number; mx: number; my: number } | null {
  const [a, b] = [...pointers.values()];
  if (!a || !b) return null;
  return {
    dist: Math.hypot(a.x - b.x, a.y - b.y),
    mx: (a.x + b.x) / 2,
    my: (a.y + b.y) / 2,
  };
}

previewEl.addEventListener("pointerdown", (e) => {
  pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

  if (pointers.size >= 2) {
    const g = pinchGeometry();
    if (!g) return;
    // El destino lo decide el punto medio: pellizcar sobre el rotulo cambia el
    // cuerpo de la letra, y en la foto hace zoom de la foto.
    target = targetAt(g.mx, g.my);
    if (!target) return;
    pinch = { dist: g.dist, zoom: state.transform.zoom, fontSize: Number(sizeEl.value) };
    lastX = g.mx;
    lastY = g.my;
    return;
  }

  target = targetAt(e.clientX, e.clientY);
  if (!target) return;
  lastX = e.clientX;
  lastY = e.clientY;
  previewEl.setPointerCapture(e.pointerId);
});

previewEl.addEventListener("pointermove", (e) => {
  if (pointers.has(e.pointerId)) {
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
  }
  if (!target) return;

  const s = canvasScale();

  if (pinch && pointers.size >= 2) {
    const g = pinchGeometry();
    if (!g || pinch.dist === 0) return;
    const ratio = g.dist / pinch.dist;
    if (target === "band") {
      setFontSize(pinch.fontSize * ratio);
    } else {
      state.transform.zoom = clamp(pinch.zoom * ratio, ZOOM_MIN, ZOOM_MAX);
      zoomEl.value = String(state.transform.zoom);
      // El punto medio tambien arrastra, que es lo que espera el dedo: se
      // coloca y se dimensiona en un solo gesto.
      state.transform.offsetX += (g.mx - lastX) * s;
      state.transform.offsetY += (g.my - lastY) * s;
      draw();
    }
    lastX = g.mx;
    lastY = g.my;
    return;
  }

  // Arrastrar solo mueve la foto: el rotulo va siempre centrado en su banda.
  if (target === "photo") {
    state.transform.offsetX += (e.clientX - lastX) * s;
    state.transform.offsetY += (e.clientY - lastY) * s;
    lastX = e.clientX;
    lastY = e.clientY;
    draw();
  }
});

for (const type of ["pointerup", "pointercancel"] as const) {
  previewEl.addEventListener(type, (e) => {
    pointers.delete(e.pointerId);
    pinch = null;
    if (pointers.size === 1) {
      // Al levantar un dedo, seguir arrastrando con el que queda en vez de dar
      // un salto la proxima vez que se mueva.
      const [p] = [...pointers.values()];
      if (p) {
        lastX = p.x;
        lastY = p.y;
      }
    } else if (pointers.size === 0) {
      target = null;
    }
  });
}

/**
 * Suavidad de la rueda. Una muesca tipica manda deltaY 100, asi que con 2000
 * sale un ~5% por muesca. Cuanto mas alto, mas progresivo.
 */
const WHEEL_DIVISOR = 2000;
/** Tope por evento, para que un golpe fuerte de rueda no pegue un salto. */
const WHEEL_MAX_DELTA = 120;

/** Rueda del raton: actua sobre lo que haya bajo el cursor. */
previewEl.addEventListener(
  "wheel",
  (e) => {
    const hit = targetAt(e.clientX, e.clientY);
    if (!hit) return;
    e.preventDefault();
    // deltaMode: 0 = px, 1 = lineas (Firefox), 2 = paginas.
    const unit = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? 100 : 1;
    const delta = clamp(e.deltaY * unit, -WHEEL_MAX_DELTA, WHEEL_MAX_DELTA);
    // Exponencial, para que el paso se note igual en cualquier escala.
    const factor = Math.exp(-delta / WHEEL_DIVISOR);
    if (hit === "band") setFontSize(Number(sizeEl.value) * factor);
    else setZoom(state.transform.zoom * factor);
  },
  { passive: false },
);

// --- Dibujo ----------------------------------------------------------------

function draw(): void {
  hintEl.hidden = state.photo !== null;
  // Centralizado aqui: asi ningun cambio puede dejar un encuadre invalido.
  // Escribir tambien mueve el hueco de la foto, y sin esto un desplazamiento
  // que era valido con la banda corta destapaba la banda al crecer.
  clampOffset();
  const opts = options();
  const layout = render(previewCtx, opts);
  sizeValueEl.textContent = sizeEl.value;
  const n = layout.lines.length;
  const band = n > 0 ? `banda ${layout.bandH} px · ${n} ${n === 1 ? "línea" : "líneas"}` : "sin banda";
  previewInfoEl.textContent = `${layout.width} × ${layout.height} px · ${band}`;
  drawMini();
  updateMini();
}

for (const el of [textEl, sizeEl, bandEl, textColorEl, highlightEl]) {
  el.addEventListener("input", draw);
}

alignEl.addEventListener("change", draw);

// --- Vista previa flotante (movil) -----------------------------------------

/** Una vez cerrada a mano, no vuelve a salir en toda la sesion. */
let miniDismissed = false;

/**
 * Cuanto antes de que asome el apartado de la previa se retira la miniatura:
 * con las dos a la vista sobra una. Poco margen a proposito, que en el movil
 * el formulario entero cabe en dos pantallas y comerse mas es quedarse sin
 * miniatura justo cuando sirve, escribiendo el rotulo.
 */
const MINI_HIDE_MARGIN = 40;

/** Copia la previa grande en la miniatura: mas barato que volver a componer. */
function drawMini(): void {
  miniCtx.drawImage(previewEl, 0, 0, miniCanvasEl.width, miniCanvasEl.height);
}

/** True cuando el apartado de la previa esta a la vista, o a punto de estarlo. */
function previewIsNear(): boolean {
  const rect = previewPanelEl.getBoundingClientRect();
  return rect.top - MINI_HIDE_MARGIN < window.innerHeight && rect.bottom > 0;
}

function updateMini(): void {
  // Solo tiene sentido cuando ya hay algo que mirar.
  const show = !miniDismissed && state.photo !== null && !previewIsNear();
  miniEl.classList.toggle("is-visible", show);
  miniEl.setAttribute("aria-hidden", show ? "false" : "true");
}

for (const evt of ["scroll", "resize"] as const) {
  window.addEventListener(evt, updateMini, { passive: true });
}

miniCloseEl.addEventListener("click", () => {
  miniDismissed = true;
  updateMini();
});

// Tocar la miniatura lleva a la previa grande.
miniCanvasEl.addEventListener("click", () => {
  previewEl.scrollIntoView({ behavior: "smooth", block: "center" });
});

// --- Salida ----------------------------------------------------------------

function generate(): void {
  if (!state.photo) {
    setStatus("Falta la foto.", "error");
    return;
  }
  void ensureFont().then(() => {
    const layout = render(resultCtx, options());
    outputEl.hidden = false;
    resultInfoEl.textContent = `${layout.width} × ${layout.height} px`;
    setStatus("Listo.");
    outputEl.scrollIntoView({ behavior: "smooth", block: "start" });
    // La revision va aparte y no se espera: la imagen ya esta hecha.
    void review(textEl.value);
  });
}

generateEl.addEventListener("click", generate);

// --- Revision del texto ----------------------------------------------------

/** Ultimo texto revisado con exito, para no preguntar dos veces por lo mismo. */
let reviewed = "";
/** Cada revision anula el pintado de la anterior, que pudo tardar mas. */
let reviewToken = 0;
/** Texto propuesto por la ultima revision, el que aplica CORREGIR. */
let proposal = "";

function setReview(title: string, issues: Issue[] = []): void {
  reviewEl.hidden = false;
  reviewTitleEl.textContent = title;

  reviewListEl.replaceChildren();
  reviewListEl.hidden = issues.length === 0;
  for (const issue of issues) {
    const li = document.createElement("li");
    const marked = document.createElement("q");
    marked.textContent = issue.text;
    li.append(marked);
    if (issue.replacements.length > 0) {
      const to = document.createElement("b");
      to.textContent = issue.replacements.join(", ");
      li.append(" → ", to);
    }
    const why = document.createElement("span");
    why.className = "muted";
    why.textContent = ` · ${issue.message}`;
    li.append(why);
    reviewListEl.append(li);
  }

  // La propuesta solo sale si de verdad cambia algo respecto a lo escrito.
  proposal = issues.length > 0 ? applyFixes(textEl.value, issues) : "";
  const usable = proposal !== "" && proposal !== textEl.value;
  reviewFixEl.hidden = !usable;
  reviewProposalEl.textContent = usable ? proposal : "";
}

async function review(text: string): Promise<void> {
  if (text.trim() === reviewed) return;
  const token = ++reviewToken;
  setReview("Revisando el texto…");
  try {
    const issues = await check(text);
    if (token !== reviewToken) return;
    reviewed = text.trim();
    const n = issues.length;
    setReview(n === 0 ? "Sin erratas." : `${n} ${n === 1 ? "aviso" : "avisos"} en el texto`, issues);
  } catch {
    if (token !== reviewToken) return;
    // Que no se pueda revisar no es un problema del meme, que ya esta hecho.
    setReview("No se pudo revisar el texto.");
  }
}

/** Aplica la propuesta al rotulo y rehace la imagen, que si no queda vieja. */
fixEl.addEventListener("click", () => {
  if (proposal === "" || proposal === textEl.value) return;
  textEl.value = proposal;
  draw();
  generate();
});

downloadEl.addEventListener("click", () => {
  resultEl.toBlob((blob) => {
    if (!blob) {
      setStatus("No se pudo generar el PNG.", "error");
      return;
    }
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = state.photoName.replace(/\.[^.]+$/, "") || "meme";
    a.download += "-meme.png";
    a.click();
    URL.revokeObjectURL(url);
  }, "image/png");
});

// --- Arranque --------------------------------------------------------------

textEl.value = "";
sizeEl.value = String(FONT_SIZE);
previewEl.width = CANVAS_W;
bandEl.value = COLOR_BAND;
textColorEl.value = COLOR_TEXT;
highlightEl.value = COLOR_HIGHLIGHT;
void ensureFont().then(draw);
