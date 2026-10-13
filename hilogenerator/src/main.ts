import { encode } from "../../comun/encode.js";
import {
  CANVAS_H,
  CANVAS_W,
  COLOR_HIGHLIGHT,
  COLOR_TEXT,
  COLORS,
  BAND_PAD_MAX,
  BAND_PAD_MIN,
  BIG_SCALE,
  BIG_SCALE_MAX,
  BIG_SCALE_MIN,
  INSET,
  MARGIN_MAX,
  MARGIN_MIN,
  MARGIN_SIDE,
  MARGIN_SIDE_MAX,
  MARGIN_TOP,
  STYLES,
  ZOOM_MAX,
  ZOOM_MIN,
  type Kind,
} from "./format.js";
import {
  clampInsetOffset,
  clampMediaOffset,
  computeLayout,
  hitsInset,
  render,
  renderPlate,
  resetMetrics,
  zoomMediaAt,
  type Inset,
  type MediaTransform,
  type RenderOptions,
} from "./render.js";
import {
  available,
  deleteWorks,
  getFile,
  listWorks,
  prune,
  putFile,
  putWork,
  type SavedSlide,
  type Work,
  type WorkData,
} from "./store.js";
import { nav } from "../../comun/nav.js";
import { applyFixes, check, type Issue } from "../../comun/spell.js";
import "./style.css";

nav("hilogenerator");

function need<T extends Element>(id: string): T {
  const el = document.getElementById(id);
  if (!el) throw new Error(`Falta el elemento #${id} en el HTML`);
  return el as unknown as T;
}

const stripEl = need<HTMLDivElement>("strip");
const moveLeftEl = need<HTMLButtonElement>("move-left");
const moveRightEl = need<HTMLButtonElement>("move-right");
const removeEl = need<HTMLButtonElement>("remove");
const kindEls: Record<Kind, HTMLButtonElement> = {
  portada: need<HTMLButtonElement>("kind-portada"),
  slide: need<HTMLButtonElement>("kind-slide"),
};
const kindHintEl = need<HTMLParagraphElement>("kind-hint");
const resetAllEl = need<HTMLButtonElement>("reset-all");
const arrowFieldEl = need<HTMLLabelElement>("arrow-field");
const arrowEl = need<HTMLInputElement>("arrow");
const textEl = need<HTMLTextAreaElement>("text");
const sizeEl = need<HTMLInputElement>("size");
const sizeValueEl = need<HTMLSpanElement>("size-value");
const hlEl = need<HTMLInputElement>("hl");
const hlValueEl = need<HTMLSpanElement>("hl-value");
const topSectionEl = need<HTMLDetailsElement>("top-section");
const topTextEl = need<HTMLTextAreaElement>("top-text");
const topSizeEl = need<HTMLInputElement>("top-size");
const topSizeValueEl = need<HTMLSpanElement>("top-size-value");
const marginTopEl = need<HTMLInputElement>("margin-top");
const marginTopValueEl = need<HTMLSpanElement>("margin-top-value");
const marginBottomEl = need<HTMLInputElement>("margin-bottom");
const marginBottomValueEl = need<HTMLSpanElement>("margin-bottom-value");
const marginSideEl = need<HTMLInputElement>("margin-side");
const marginSideValueEl = need<HTMLSpanElement>("margin-side-value");
const bandPadEl = need<HTMLInputElement>("band-pad");
const bandPadValueEl = need<HTMLSpanElement>("band-pad-value");
const dropEl = need<HTMLDivElement>("drop");
const fileEl = need<HTMLInputElement>("file");
const pickEl = need<HTMLButtonElement>("pick");
const file2El = need<HTMLInputElement>("file2");
const addPhotoEl = need<HTMLButtonElement>("add-photo");
const fileListEl = need<HTMLDivElement>("file-list");
const zoomEl = need<HTMLInputElement>("zoom");
const zoomWhichEl = need<HTMLSpanElement>("zoom-which");
const insetSectionEl = need<HTMLDetailsElement>("inset-section");
const insetFileEl = need<HTMLInputElement>("inset-file");
const insetPickEl = need<HTMLButtonElement>("inset-pick");
const insetClearEl = need<HTMLButtonElement>("inset-clear");
const insetNameEl = need<HTMLParagraphElement>("inset-name");
const insetSizeEl = need<HTMLInputElement>("inset-size");
const insetSizeValueEl = need<HTMLSpanElement>("inset-size-value");
const insetImageEl = need<HTMLDivElement>("inset-image");
const insetZoomEl = need<HTMLInputElement>("inset-zoom");
const insetModeEls = {
  move: need<HTMLButtonElement>("inset-move"),
  frame: need<HTMLButtonElement>("inset-frame"),
};
const zoomValueEl = need<HTMLSpanElement>("zoom-value");
const textColorEl = need<HTMLInputElement>("color-text");
const highlightEl = need<HTMLInputElement>("color-highlight");
const generateEl = need<HTMLButtonElement>("generate");
const progressEl = need<HTMLDivElement>("progress");
const progressBarEl = need<HTMLDivElement>("progress-bar");
const statusEl = need<HTMLParagraphElement>("status");
const previewEl = need<HTMLCanvasElement>("preview");
const previewInfoEl = need<HTMLParagraphElement>("preview-info");
const flipEl = need<HTMLButtonElement>("flip");
const barsEl = need<HTMLDivElement>("bars");
const playEl = need<HTMLButtonElement>("play");
const seekEl = need<HTMLInputElement>("seek");
const seekValueEl = need<HTMLSpanElement>("seek-value");
const trimTrackEl = need<HTMLDivElement>("trim-track");
const trimSpanEl = need<HTMLDivElement>("trim-span");
const trimInEl = need<HTMLDivElement>("trim-in");
const trimOutEl = need<HTMLDivElement>("trim-out");
const trimValueEl = need<HTMLSpanElement>("trim-value");
const outputEl = need<HTMLElement>("output");
const resultsEl = need<HTMLDivElement>("results");
const reviewEl = need<HTMLDivElement>("review");
const reviewTitleEl = need<HTMLParagraphElement>("review-title");
const reviewListEl = need<HTMLUListElement>("review-list");
const reviewFixEl = need<HTMLDivElement>("review-fix");
const reviewProposalEl = need<HTMLParagraphElement>("review-proposal");
const fixEl = need<HTMLButtonElement>("fix");
const downloadEl = need<HTMLButtonElement>("download");
const previewPanelEl = need<HTMLElement>("preview-panel");
const sourcesEl = need<HTMLDivElement>("sources");
const miniEl = need<HTMLDivElement>("mini");
const miniCanvasEl = need<HTMLCanvasElement>("mini-canvas");
const miniCloseEl = need<HTMLButtonElement>("mini-close");
const newWorkEl = need<HTMLButtonElement>("new-work");
const historyEl = need<HTMLElement>("history");
const worksEl = need<HTMLDivElement>("works");

function context(canvas: HTMLCanvasElement): CanvasRenderingContext2D {
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Este navegador no soporta canvas 2D");
  return ctx;
}

const previewCtx = context(previewEl);
const miniCtx = context(miniCanvasEl);

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

// --- El hilo ----------------------------------------------------------------

type Media =
  | { kind: "image"; id: string; el: HTMLImageElement; file: File; url: string; size: Size }
  | { kind: "video"; id: string; el: HTMLVideoElement; file: File; url: string; size: Size };

interface Size {
  width: number;
  height: number;
}

/**
 * El id de un archivo cargado. Es con lo que el historial lo guarda una sola
 * vez y lo reconoce despues, por muchas veces que se guarde su hilo.
 */
function newId(): string {
  return typeof crypto.randomUUID === "function"
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

/** Una imagen o un video de la pieza, con su encuadre y su volteo. */
interface Item {
  media: Media;
  transform: MediaTransform;
  flip: boolean;
}

/**
 * Una pieza del hilo. Todo lo que la define vive aqui y no en los controles:
 * los controles enseñan la pieza abierta, y al generar hay que poder pintar
 * tambien las que no lo estan.
 */
interface Slide {
  kind: Kind;
  text: string;
  size: number;
  /** El apartado del texto superior abierto es el texto superior puesto. */
  topOn: boolean;
  topText: string;
  topSize: number;
  marginBottom: number;
  marginTop: number;
  marginSide: number;
  bandPad: number;
  /** Lo que crece lo +destacado+. Lo *resaltado* solo cambia de color. */
  bigScale: number;
  /** La flecha del pie. Solo cuenta en la portada. */
  arrow: boolean;
  /** Ninguna, una, o dos que se reparten la ventana. Como mucho un video. */
  items: Item[];
  /** A cual de las dos le hablan el zoom y el volteo: la ultima tocada. */
  active: number;
  /** La mosca. Existe siempre; sale cuando su apartado esta abierto. */
  inset: Inset & { on: boolean; media: Media | null };
  /** Tramo del video que se exporta. Arranca abarcandolo entero. */
  trim: { start: number; end: number };
  /** Su miniatura en la tira: una copia de la ultima previa. */
  thumb: HTMLCanvasElement;
}

function newSlide(kind: Kind): Slide {
  const thumb = document.createElement("canvas");
  thumb.width = 108;
  thumb.height = 135;
  return {
    kind,
    text: "",
    size: STYLES[kind].size,
    topOn: false,
    topText: "",
    topSize: STYLES[kind].size,
    marginBottom: STYLES[kind].marginBottom,
    marginTop: MARGIN_TOP,
    marginSide: MARGIN_SIDE,
    bandPad: STYLES[kind].bandPad,
    bigScale: BIG_SCALE,
    arrow: true,
    items: [],
    active: 0,
    inset: {
      on: false,
      media: null,
      source: null,
      size: null,
      cx: INSET.cx,
      cy: INSET.cy,
      radius: INSET.radius,
      zoom: 1,
      offsetX: 0,
      offsetY: 0,
    },
    trim: { start: 0, end: 0 },
    thumb,
  };
}

// El hilo arranca con su portada. Lo que se añada despues son slides.
const slides: Slide[] = [newSlide("portada")];
let current = 0;
let busy = false;

function cur(): Slide {
  return slides[current]!;
}

/** La imagen a la que le hablan el zoom y el volteo, o null si no hay. */
function item(s: Slide = cur()): Item | null {
  return s.items[s.active] ?? s.items[0] ?? null;
}

/** El video de una pieza y el hueco que ocupa. Como mucho hay uno. */
function videoOf(s: Slide): { index: number; el: HTMLVideoElement; file: File } | null {
  for (const [index, it] of s.items.entries()) {
    if (it.media.kind === "video") return { index, el: it.media.el, file: it.media.file };
  }
  return null;
}

/** El <video> de la pieza abierta, o null si no lleva video. */
function video(): HTMLVideoElement | null {
  return videoOf(cur())?.el ?? null;
}

function options(s: Slide, placeholder: boolean): RenderOptions {
  return {
    kind: s.kind,
    items: s.items.map((it) => ({
      source: it.media.el,
      size: it.media.size,
      transform: it.transform,
      flip: it.flip,
      video: it.media.kind === "video",
    })),
    inset: s.inset.on ? s.inset : null,
    bottom: { text: s.text, size: s.size },
    top: s.topOn ? { text: s.topText, size: s.topSize } : null,
    marginBottom: s.marginBottom,
    marginTop: s.marginTop,
    marginSide: s.marginSide,
    bandPad: s.bandPad,
    bigScale: s.bigScale,
    arrow: s.arrow,
    colorText: textColorEl.value,
    colorHighlight: highlightEl.value,
    placeholder,
  };
}

function setStatus(message: string, kind: "" | "error" = ""): void {
  statusEl.textContent = message;
  statusEl.className = kind === "error" ? "status error" : "status";
}

/**
 * Espera a las dos letras antes de medir. Sin esto la primera pasada mide con
 * la de respaldo y el texto sale partido por donde no es.
 */
async function ensureFonts(): Promise<void> {
  try {
    await Promise.all(
      Object.values(STYLES).map((st) =>
        document.fonts.load(`${st.font.weight} 64px "${st.font.family}"`),
      ),
    );
    await document.fonts.ready;
  } catch {
    setStatus("No se pudieron cargar las tipografías; se usarán las de respaldo.", "error");
  }
  resetMetrics();
}

// --- La tira ----------------------------------------------------------------

function label(s: Slide, i: number): string {
  return `${String(i + 1).padStart(2, "0")} · ${s.kind === "portada" ? "Portada" : "Slide"}`;
}

function showStrip(): void {
  const items: HTMLElement[] = slides.map((s, i) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = i === current ? "thumb is-current" : "thumb";
    btn.append(s.thumb, label(s, i));
    btn.addEventListener("click", () => select(i));
    return btn;
  });
  const add = document.createElement("button");
  add.type = "button";
  add.className = "thumb thumb-add";
  add.textContent = "+";
  add.title = "Añadir una slide";
  add.setAttribute("aria-label", "Añadir una slide");
  add.addEventListener("click", () => {
    slides.push(newSlide("slide"));
    select(slides.length - 1);
  });
  stripEl.replaceChildren(...items, add);

  moveLeftEl.disabled = current === 0;
  moveRightEl.disabled = current === slides.length - 1;
  removeEl.disabled = slides.length === 1;
}

function select(i: number): void {
  pausePreview();
  current = clamp(i, 0, slides.length - 1);
  showStrip();
  showSlide();
  draw();
}

function move(by: number): void {
  const to = current + by;
  if (to < 0 || to >= slides.length) return;
  const [s] = slides.splice(current, 1);
  slides.splice(to, 0, s!);
  select(to);
}

moveLeftEl.addEventListener("click", () => move(-1));
moveRightEl.addEventListener("click", () => move(1));

removeEl.addEventListener("click", () => {
  if (slides.length === 1) return;
  pausePreview();
  const [gone] = slides.splice(current, 1);
  if (gone) dropSlide(gone);
  select(Math.min(current, slides.length - 1));
});

/** Pasa la pieza abierta a los controles. Lo contrario lo hacen sus `input`. */
function showSlide(): void {
  const s = cur();
  const style = STYLES[s.kind];

  for (const kind of ["portada", "slide"] as const) {
    kindEls[kind].setAttribute("aria-checked", String(s.kind === kind));
  }
  kindHintEl.textContent =
    s.kind === "portada"
      ? "Todo en mayúsculas, centrado, y con la flecha al pie."
      : "Tal cual se escriba, alineado a la izquierda.";

  for (const el of [sizeEl, topSizeEl]) {
    el.min = String(style.sizeMin);
    el.max = String(style.sizeMax);
  }
  textEl.value = s.text;
  topTextEl.value = s.topText;
  topSectionEl.open = s.topOn;

  arrowFieldEl.hidden = !STYLES[s.kind].arrow;
  arrowEl.checked = s.arrow;

  showFiles();
  showActive();
  showInset();
  barsEl.hidden = !video();
  showTrim();
  showPlay();
  showTime();
}

for (const kind of ["portada", "slide"] as const) {
  kindEls[kind].addEventListener("click", () => {
    const s = cur();
    if (s.kind === kind) return;
    s.kind = kind;
    // Cada tipo tiene su letra y su banda: las medidas de la una no valen
    // para la otra.
    s.size = STYLES[kind].size;
    s.topSize = STYLES[kind].size;
    s.marginBottom = STYLES[kind].marginBottom;
    s.bandPad = STYLES[kind].bandPad;
    showStrip();
    showSlide();
    draw();
  });
}

textEl.addEventListener("input", () => {
  cur().text = textEl.value;
  draw();
});
topTextEl.addEventListener("input", () => {
  cur().topText = topTextEl.value;
  draw();
});
sizeEl.addEventListener("input", () => {
  cur().size = Number(sizeEl.value);
  draw();
});
topSizeEl.addEventListener("input", () => {
  cur().topSize = Number(topSizeEl.value);
  draw();
});
arrowEl.addEventListener("change", () => {
  cur().arrow = arrowEl.checked;
  draw();
});
hlEl.addEventListener("input", () => {
  cur().bigScale = Number(hlEl.value);
  draw();
});
bandPadEl.addEventListener("input", () => {
  cur().bandPad = Number(bandPadEl.value);
  draw();
});
marginBottomEl.addEventListener("input", () => {
  cur().marginBottom = Number(marginBottomEl.value);
  draw();
});
marginTopEl.addEventListener("input", () => {
  cur().marginTop = Number(marginTopEl.value);
  draw();
});
marginSideEl.addEventListener("input", () => {
  cur().marginSide = Number(marginSideEl.value);
  draw();
});
topSectionEl.addEventListener("toggle", () => {
  cur().topOn = topSectionEl.open;
  draw();
});
for (const el of [textColorEl, highlightEl]) el.addEventListener("input", draw);

// --- Volver al valor por defecto --------------------------------------------

/**
 * Cada barra, con el valor del que parte. Casi todo aqui se mueve tambien con
 * un gesto sobre la previa, y un gesto se escapa con facilidad: en cuanto una
 * barra deja de estar en su sitio le sale al lado el boton que la devuelve.
 *
 * Va barra a barra y no en un solo boton para todo, porque lo normal es haber
 * movido una sin querer y querer conservar las demas.
 */
interface Reset {
  input: HTMLInputElement;
  get: (s: Slide) => number;
  def: (s: Slide) => number;
  set: (s: Slide, value: number) => void;
}

const RESETS: Reset[] = [
  { input: sizeEl, get: (s) => s.size, def: (s) => STYLES[s.kind].size, set: (s, v) => (s.size = v) },
  { input: hlEl, get: (s) => s.bigScale, def: () => BIG_SCALE, set: (s, v) => (s.bigScale = v) },
  {
    input: topSizeEl,
    get: (s) => s.topSize,
    def: (s) => STYLES[s.kind].size,
    set: (s, v) => (s.topSize = v),
  },
  { input: marginTopEl, get: (s) => s.marginTop, def: () => MARGIN_TOP, set: (s, v) => (s.marginTop = v) },
  {
    input: marginBottomEl,
    get: (s) => s.marginBottom,
    def: (s) => STYLES[s.kind].marginBottom,
    set: (s, v) => (s.marginBottom = v),
  },
  { input: marginSideEl, get: (s) => s.marginSide, def: () => MARGIN_SIDE, set: (s, v) => (s.marginSide = v) },
  {
    input: bandPadEl,
    get: (s) => s.bandPad,
    def: (s) => STYLES[s.kind].bandPad,
    set: (s, v) => (s.bandPad = v),
  },
  {
    input: zoomEl,
    get: (s) => item(s)?.transform.zoom ?? 1,
    def: () => 1,
    // Volver al tamaño de partida es tambien volver al centro: con el zoom a 1
    // no sobra imagen que mover a lo ancho o a lo alto, segun el formato.
    set: (s) => {
      const it = item(s);
      if (it) it.transform = { zoom: 1, offsetX: 0, offsetY: 0 };
    },
  },
  {
    input: insetSizeEl,
    get: (s) => s.inset.radius,
    def: () => INSET.radius,
    set: (s, v) => (s.inset.radius = v),
  },
  { input: insetZoomEl, get: (s) => s.inset.zoom, def: () => 1, set: (s, v) => (s.inset.zoom = v) },
];

const resetButtons = RESETS.map((r) => {
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "reset";
  btn.textContent = "↺ por defecto";
  btn.title = "Volver al valor por defecto";
  btn.hidden = true;
  btn.addEventListener("click", (e) => {
    // Va dentro del `label`: sin esto, pulsarlo le daria ademas el foco a la barra.
    e.preventDefault();
    r.set(cur(), r.def(cur()));
    draw();
  });
  document.querySelector(`label[for="${r.input.id}"]`)?.append(btn);
  return btn;
});

/** true cuando la barra no esta en su valor de partida. */
function moved(r: Reset, s: Slide): boolean {
  return Math.abs(r.get(s) - r.def(s)) >= 0.005;
}

/** Algun encuadre de la pieza no esta en el centro y a su tamaño. */
function framed(s: Slide): boolean {
  return s.items.some(
    (it) => it.transform.zoom !== 1 || it.transform.offsetX !== 0 || it.transform.offsetY !== 0,
  );
}

/**
 * Enseña el boton solo en las barras que no estan en su valor de partida, y
 * deja pulsar el de todo solo cuando hay algo que devolver.
 */
function showResets(): void {
  const s = cur();
  RESETS.forEach((r, i) => {
    const btn = resetButtons[i];
    if (btn) btn.hidden = !moved(r, s);
  });
  resetAllEl.disabled = !RESETS.some((r) => moved(r, s)) && !framed(s);
}

// Todo de una vez, para la pieza abierta: las medidas y el encuadre de sus
// imagenes. No toca ni el texto, ni los archivos, ni donde este la mosca, que
// no son tamaños y no se mueven sin querer.
resetAllEl.addEventListener("click", () => {
  const s = cur();
  for (const r of RESETS) r.set(s, r.def(s));
  resetFraming(s);
  draw();
});

// --- Colores ----------------------------------------------------------------

for (const row of document.querySelectorAll<HTMLDivElement>(".swatches")) {
  const target = need<HTMLInputElement>(row.dataset.for ?? "");
  for (const { label: name, hex } of COLORS) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "swatch";
    btn.style.background = hex;
    btn.title = `${name} · ${hex}`;
    btn.addEventListener("click", () => {
      target.value = hex;
      draw();
    });
    row.append(btn);
  }
}

// --- Imagen y video ---------------------------------------------------------

/** Espera a un evento del <video>, con el error del propio elemento si falla. */
function once(el: HTMLVideoElement, type: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const ok = () => {
      el.removeEventListener("error", ko);
      resolve();
    };
    const ko = () => {
      el.removeEventListener(type, ok);
      reject(new Error("El navegador no puede reproducir este vídeo."));
    };
    el.addEventListener(type, ok, { once: true });
    el.addEventListener("error", ko, { once: true });
  });
}

async function openImage(file: File, id = newId()): Promise<Media> {
  const url = URL.createObjectURL(file);
  const el = new Image();
  // Con `load` y no con `decode()`: en una pestaña que no se esta viendo el
  // navegador aplaza la descodificacion y `decode()` no vuelve hasta que se
  // mira, asi que pegar una imagen y cambiar de pestaña la dejaba colgada.
  try {
    await new Promise<void>((resolve, reject) => {
      el.onload = () => resolve();
      el.onerror = () => reject(new Error("No se pudo abrir la imagen."));
      el.src = url;
    });
  } catch (err) {
    URL.revokeObjectURL(url);
    throw err;
  }
  return {
    kind: "image",
    id,
    el,
    file,
    url,
    size: { width: el.naturalWidth, height: el.naturalHeight },
  };
}

async function openVideo(file: File, id = newId()): Promise<Media> {
  const url = URL.createObjectURL(file);
  const el = document.createElement("video");
  el.muted = true;
  el.playsInline = true;
  el.preload = "auto";
  el.src = url;
  sourcesEl.append(el);
  try {
    await once(el, "loadedmetadata");
    // `loadeddata` es que ya hay un fotograma pintable, y es el primero.
    await once(el, "loadeddata");
  } catch (err) {
    el.remove();
    URL.revokeObjectURL(url);
    throw err;
  }

  // Cada video avisa a la previa solo si es el de la pieza abierta.
  const mine = () => video() === el;
  el.addEventListener("seeked", () => {
    if (!mine()) return;
    showTime();
    draw();
  });
  // `requestAnimationFrame` se para con la pestaña oculta y `timeupdate` no,
  // asi que al volver la barra esta donde tiene que estar.
  el.addEventListener("timeupdate", () => {
    if (!mine() || !playing) return;
    if (el.currentTime >= cur().trim.end - 0.01) pausePreview();
    else followTime();
  });
  el.addEventListener("ended", () => {
    if (mine()) pausePreview();
  });

  return {
    kind: "video",
    id,
    el,
    file,
    url,
    size: { width: el.videoWidth, height: el.videoHeight },
  };
}

function release(m: Media): void {
  if (m.kind === "video") {
    m.el.pause();
    m.el.remove();
  }
  URL.revokeObjectURL(m.url);
}

/** Suelta todo lo que una pieza tiene cargado, para cuando se elimina. */
function dropSlide(s: Slide): void {
  for (const it of s.items) release(it.media);
  s.items = [];
  if (s.inset.media) release(s.inset.media);
}

/**
 * Al cambiar cuantas imagenes hay cambian los huecos, y un encuadre pensado
 * para la ventana entera no vale para media: vuelven todas al centro.
 */
function resetFraming(s: Slide): void {
  for (const it of s.items) it.transform = { zoom: 1, offsetX: 0, offsetY: 0 };
}

function removeItem(s: Slide, index: number): void {
  const [gone] = s.items.splice(index, 1);
  if (!gone) return;
  release(gone.media);
  if (gone.media.kind === "video") s.trim = { start: 0, end: 0 };
  s.active = 0;
  resetFraming(s);
}

/** Los archivos de la pieza abierta, cada uno con su boton de quitar. */
function showFiles(): void {
  const s = cur();
  const rows = s.items.map((it, i) => {
    const m = it.media;
    const row = document.createElement("p");
    row.className = "file-row muted small";
    const mb = (m.file.size / (1024 * 1024)).toFixed(1);
    const secs = m.kind === "video" ? ` · ${m.el.duration.toFixed(1)} s` : "";
    const side = s.items.length > 1 ? (i === 0 ? "Izquierda: " : "Derecha: ") : "";
    const name = document.createElement("span");
    name.textContent =
      `${side}${m.file.name} · ${m.size.width} × ${m.size.height}${secs} · ${mb} MB`;
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "btn-secondary";
    btn.textContent = "Quitar";
    btn.addEventListener("click", () => {
      pausePreview();
      removeItem(s, i);
      showSlide();
      draw();
    });
    row.append(name, btn);
    return row;
  });
  if (rows.length === 0) {
    const none = document.createElement("p");
    none.className = "muted small";
    none.textContent = "Ningún archivo seleccionado";
    rows.push(none);
  }
  fileListEl.replaceChildren(...rows);

  // La segunda solo tiene sentido cuando ya hay una primera.
  addPhotoEl.hidden = s.items.length === 0;
  addPhotoEl.textContent = s.items.length > 1 ? "Cambiar la segunda imagen…" : "Añadir nueva imagen";
}

/** A cual de las dos mitades le hablan el zoom y el volteo. */
function showActive(): void {
  const s = cur();
  const it = item(s);
  flipEl.disabled = !it;
  flipEl.setAttribute("aria-pressed", String(it?.flip ?? false));
  zoomWhichEl.textContent =
    s.items.length > 1 ? (s.active === 0 ? "de la izquierda" : "de la derecha") : "";
}

/**
 * `slot` es el hueco que se rellena: 0 la primera imagen, 1 la segunda. Pedir
 * la segunda sin tener la primera es poner la primera.
 */
async function loadFile(file: File, s: Slide, slot = 0): Promise<void> {
  const isVideo = file.type.startsWith("video/");
  if (!isVideo && !file.type.startsWith("image/")) {
    setStatus("Ese archivo no es ni una imagen ni un vídeo.", "error");
    return;
  }

  // ffmpeg monta un video con una capa encima: dos videos no caben en eso.
  const taken = videoOf(s);
  if (isVideo && taken && taken.index !== Math.min(slot, s.items.length)) {
    setStatus("En una pieza solo cabe un vídeo: la otra mitad tiene que ser una imagen.", "error");
    return;
  }

  let media: Media;
  try {
    media = await (isVideo ? openVideo(file) : openImage(file));
  } catch (err) {
    setStatus(err instanceof Error ? err.message : "No se pudo abrir el archivo.", "error");
    return;
  }

  if (s === cur()) pausePreview();
  const index = Math.min(slot, s.items.length);
  const before = s.items.length;
  const old = s.items[index];
  if (old) {
    release(old.media);
    if (old.media.kind === "video") s.trim = { start: 0, end: 0 };
  }
  s.items[index] = { media, transform: { zoom: 1, offsetX: 0, offsetY: 0 }, flip: false };
  s.active = index;
  if (s.items.length !== before) resetFraming(s);
  if (media.kind === "video") s.trim = { start: 0, end: media.el.duration || 0 };

  // Por debajo del ancho de su hueco la imagen se amplia, y ampliar es lo
  // unico de toda la pieza que se nota de verdad.
  const wanted = CANVAS_W / s.items.length;
  if (media.size.width < wanted) {
    setStatus(
      `Aviso: tiene ${media.size.width} px de ancho y su hueco pide ${wanted}. Se verá pixelado.`,
      "error",
    );
  } else {
    setStatus("");
  }

  if (s === cur()) {
    seekEl.value = "0";
    showSlide();
    draw();
  } else {
    paintThumb(s);
  }
}

/**
 * Varios archivos de una vez son varias piezas: el primero va a la abierta y
 * cada uno de los demas abre una slide nueva detras, en el orden en que llegan.
 */
async function loadFiles(files: File[]): Promise<void> {
  const [first, ...rest] = files;
  if (!first) return;
  await loadFile(first, cur());
  for (const file of rest) {
    const s = newSlide("slide");
    slides.push(s);
    await loadFile(file, s);
  }
  if (rest.length > 0) showStrip();
}

pickEl.addEventListener("click", () => fileEl.click());
fileEl.addEventListener("change", () => {
  const files = [...(fileEl.files ?? [])];
  // Vaciarlo deja volver a elegir el mismo archivo, que si no no avisa.
  fileEl.value = "";
  void loadFiles(files);
});

// La segunda imagen: la pieza pasa a llevar dos, mitad y mitad, y cada una se
// encuadra por su cuenta igual que cuando va sola.
addPhotoEl.addEventListener("click", () => file2El.click());
file2El.addEventListener("change", () => {
  const file = file2El.files?.[0];
  file2El.value = "";
  if (file) void loadFile(file, cur(), 1);
});

/**
 * Se suelta en cualquier parte de la ventana. `dragleave` salta tambien al
 * pasar de un elemento a otro por dentro, asi que se cuentan entradas y
 * salidas en vez de fiarse del evento.
 */
let dragDepth = 0;

function showDrop(visible: boolean): void {
  dragDepth = visible ? dragDepth : 0;
  dropEl.hidden = !visible;
}

window.addEventListener("dragenter", (e) => {
  e.preventDefault();
  dragDepth += 1;
  dropEl.hidden = false;
});
window.addEventListener("dragover", (e) => e.preventDefault());
window.addEventListener("dragleave", (e) => {
  e.preventDefault();
  dragDepth -= 1;
  if (dragDepth <= 0) showDrop(false);
});
window.addEventListener("drop", (e) => {
  e.preventDefault();
  showDrop(false);
  void loadFiles([...(e.dataTransfer?.files ?? [])]);
});

// Pegar una captura del portapapeles vale igual que soltarla.
window.addEventListener("paste", (e) => {
  const files = [...(e.clipboardData?.files ?? [])].filter(
    (f) => f.type.startsWith("image/") || f.type.startsWith("video/"),
  );
  if (files.length === 0) return;
  e.preventDefault();
  void loadFiles(files);
});

flipEl.addEventListener("click", () => {
  const it = item();
  if (!it) return;
  it.flip = !it.flip;
  flipEl.setAttribute("aria-pressed", String(it.flip));
  draw();
});

// --- Mosca ------------------------------------------------------------------

/**
 * Que hace un gesto sobre la mosca cuando lleva imagen: moverla y cambiarle el
 * tamaño, o encuadrar y ampliar lo que tiene dentro. Sin imagen no hay nada
 * que encuadrar y siempre se mueve.
 */
let insetMode: "move" | "frame" = "move";

function showInset(): void {
  const { inset } = cur();
  insetSectionEl.open = inset.on;
  insetClearEl.hidden = !inset.media;
  insetPickEl.textContent = inset.media ? "Cambiar la imagen…" : "Poner una imagen dentro…";
  insetNameEl.textContent = inset.media
    ? `${inset.media.file.name} · ${inset.media.size.width} × ${inset.media.size.height}`
    : "Sin imagen: solo el aro, para señalar algo de la foto.";
  insetImageEl.hidden = !inset.media;
  if (!inset.media) insetMode = "move";
  for (const mode of ["move", "frame"] as const) {
    insetModeEls[mode].setAttribute("aria-checked", String(insetMode === mode));
  }
}

function setInsetMedia(s: Slide, media: Media | null): void {
  const { inset } = s;
  if (inset.media) release(inset.media);
  inset.media = media;
  inset.source = media?.el ?? null;
  inset.size = media?.size ?? null;
  inset.zoom = 1;
  inset.offsetX = 0;
  inset.offsetY = 0;
}

insetSectionEl.addEventListener("toggle", () => {
  cur().inset.on = insetSectionEl.open;
  draw();
});

insetPickEl.addEventListener("click", () => insetFileEl.click());
insetFileEl.addEventListener("change", () => {
  const file = insetFileEl.files?.[0];
  insetFileEl.value = "";
  if (!file) return;
  const s = cur();
  void openImage(file).then(
    (media) => {
      setInsetMedia(s, media);
      if (s === cur()) {
        showInset();
        draw();
      } else {
        paintThumb(s);
      }
    },
    () => setStatus("No se pudo abrir la imagen de la mosca.", "error"),
  );
});

insetClearEl.addEventListener("click", () => {
  setInsetMedia(cur(), null);
  showInset();
  draw();
});

insetSizeEl.addEventListener("input", () => {
  cur().inset.radius = Number(insetSizeEl.value);
  draw();
});
insetZoomEl.addEventListener("input", () => {
  cur().inset.zoom = Number(insetZoomEl.value);
  draw();
});

for (const mode of ["move", "frame"] as const) {
  insetModeEls[mode].addEventListener("click", () => {
    insetMode = mode;
    showInset();
  });
}

/** Mueve la mosca, o lo que lleva dentro, segun el modo. */
function dragInset(dx: number, dy: number): void {
  const { inset } = cur();
  if (insetMode === "frame") {
    inset.offsetX += dx;
    inset.offsetY += dy;
    return;
  }
  inset.cx = clamp(inset.cx + dx, 0, CANVAS_W);
  inset.cy = clamp(inset.cy + dy, 0, CANVAS_H);
}

/** Cambia el tamaño de la mosca, o el zoom de lo que lleva dentro. */
function scaleInset(radius: number, zoom: number): void {
  const { inset } = cur();
  if (insetMode === "frame") inset.zoom = clamp(zoom, ZOOM_MIN, ZOOM_MAX);
  else inset.radius = clamp(radius, INSET.radiusMin, INSET.radiusMax);
}

// --- Reproducir la previa ---------------------------------------------------

/** m:ss, que es como lo escribe cualquier reproductor. */
function clock(seconds: number): string {
  if (!Number.isFinite(seconds)) return "0:00";
  const total = Math.max(0, Math.round(seconds));
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
}

function showTime(): void {
  const v = video();
  seekValueEl.textContent = v ? `${clock(v.currentTime)} / ${clock(v.duration)}` : "0:00 / 0:00";
}

/**
 * La previa se puede reproducir para ver la pieza en movimiento. Solo recorre
 * el tramo elegido: al llegar al extremo de salida se para, y volviendo a darle
 * arranca otra vez desde el de entrada.
 */
let playing = false;
let frameLoop = 0;

function showPlay(): void {
  playEl.setAttribute("aria-pressed", String(playing));
  playEl.title = playing ? "Pausar la previa" : "Reproducir la previa";
}

function pausePreview(): void {
  if (!playing) return;
  playing = false;
  cancelAnimationFrame(frameLoop);
  video()?.pause();
  showPlay();
}

/** Lleva la barra y el reloj a donde vaya la reproduccion. */
function followTime(): void {
  const v = video();
  if (!v) return;
  seekEl.value = String(v.currentTime);
  showSeekFill();
  showTime();
}

function tick(): void {
  const v = video();
  if (!playing || !v) return;
  if (v.currentTime >= cur().trim.end - 0.01) {
    pausePreview();
    return;
  }
  followTime();
  draw();
  frameLoop = requestAnimationFrame(tick);
}

playEl.addEventListener("click", () => {
  const v = video();
  if (!v) return;
  if (playing) {
    pausePreview();
    return;
  }
  const { trim } = cur();
  // Al final del tramo, volver a darle es empezar de nuevo.
  if (v.currentTime >= trim.end - 0.05) v.currentTime = trim.start;
  // Con sonido: el clic ya es el gesto que piden los navegadores.
  v.muted = false;
  playing = true;
  showPlay();
  void v.play().catch(() => pausePreview());
  frameLoop = requestAnimationFrame(tick);
});

// El fotograma solo cambia la previa: sirve para encuadrar cuando el primero
// esta en negro. Con el recorte puesto, la barra se queda entre los extremos.
seekEl.addEventListener("input", () => {
  const v = video();
  if (!v) return;
  pausePreview();
  showSeekFill();
  v.currentTime = Number(seekEl.value);
});

// --- Recortar ---------------------------------------------------------------

/** Lo mas corto que se puede dejar un recorte. Menos que esto no es un video. */
const TRIM_MIN = 0.2;

/** m:ss.d. Los extremos del recorte se afinan a decimas. */
function clockTenths(seconds: number): string {
  if (!Number.isFinite(seconds)) return "0:00.0";
  const total = Math.max(0, seconds);
  const m = Math.floor(total / 60);
  return `${m}:${(total - m * 60).toFixed(1).padStart(4, "0")}`;
}

/**
 * El tramo que se va a exportar, o null si se exporta entero. Con los extremos
 * sin tocar no se le pasa recorte ninguno a ffmpeg: cortar en 0 y en la
 * duracion exacta no quita nada y solo puede desalinear el audio.
 */
function trimRange(s: Slide): { start: number; end: number } | null {
  const clip = videoOf(s);
  if (!clip) return null;
  const duration = clip.el.duration || 0;
  const { start, end } = s.trim;
  if (duration <= 0) return null;
  if (start <= 0.001 && end >= duration - 0.001) return null;
  return { start, end };
}

/**
 * Medio tirador. Los dos extremos del recorte y el pulgar de la reproduccion
 * miden 12 px y recorren de 6 a ancho-6: es lo que hace que las dos pistas
 * empiecen y acaben en el mismo sitio.
 */
const HANDLE = 6;

function alongTrack(fraction: number): string {
  return `calc(${HANDLE}px + (100% - ${HANDLE * 2}px) * ${fraction})`;
}

/** El relleno de la barra de reproduccion, que el `range` repintado ya no da. */
function showSeekFill(): void {
  const min = Number(seekEl.min);
  const span = Number(seekEl.max) - min;
  const f = span > 0 ? (Number(seekEl.value) - min) / span : 0;
  seekEl.style.setProperty("--fill", alongTrack(clamp(f, 0, 1)));
}

function showTrim(): void {
  const v = video();
  const duration = v?.duration || 0;
  const { start, end } = cur().trim;

  seekEl.min = String(start);
  seekEl.max = String(end || duration || 1);
  if (v) seekEl.value = String(v.currentTime);
  showSeekFill();
  if (duration <= 0) return;

  const f0 = start / duration;
  const f1 = end / duration;
  trimSpanEl.style.left = alongTrack(f0);
  trimSpanEl.style.width = `calc((100% - ${HANDLE * 2}px) * ${f1 - f0})`;
  trimInEl.style.left = alongTrack(f0);
  trimOutEl.style.left = alongTrack(f1);
  trimValueEl.textContent =
    `${clockTenths(start)} – ${clockTenths(end)} · ${(end - start).toFixed(1)} s`;
}

/** Lleva la previa al extremo que se esta moviendo, para ver por donde corta. */
function seekTo(time: number): void {
  const v = video();
  if (!v) return;
  v.currentTime = time;
  seekEl.value = String(time);
}

/** Cual de los dos extremos se esta arrastrando ahora mismo. */
let dragging: "start" | "end" | null = null;

function dragTo(clientX: number): void {
  const v = video();
  const duration = v?.duration || 0;
  const rect = trimTrackEl.getBoundingClientRect();
  const travel = rect.width - HANDLE * 2;
  if (!dragging || duration <= 0 || travel <= 0) return;
  const { trim } = cur();
  const t = clamp(((clientX - rect.left - HANDLE) / travel) * duration, 0, duration);
  if (dragging === "start") trim.start = Math.min(t, trim.end - TRIM_MIN);
  else trim.end = Math.max(t, trim.start + TRIM_MIN);
  showTrim();
  seekTo(dragging === "start" ? trim.start : trim.end);
}

// El arrastre se sigue desde `window`: asi el extremo no se queda atras si el
// puntero se sale de la pista.
window.addEventListener("pointermove", (e) => dragTo(e.clientX));
for (const type of ["pointerup", "pointercancel"] as const) {
  window.addEventListener(type, () => {
    dragging = null;
  });
}

for (const [handle, which] of [[trimInEl, "start"], [trimOutEl, "end"]] as const) {
  handle.addEventListener("pointerdown", (e) => {
    if (!video()) return;
    pausePreview();
    e.preventDefault();
    dragging = which;
    dragTo(e.clientX);
  });

  // Con el teclado, un paso por pulsacion: la forma de afinarlo al fotograma.
  handle.addEventListener("keydown", (e) => {
    const v = video();
    if (!v) return;
    const step = e.shiftKey ? 1 : 0.04;
    const dir = e.key === "ArrowLeft" ? -1 : e.key === "ArrowRight" ? 1 : 0;
    if (dir === 0) return;
    e.preventDefault();
    const { trim } = cur();
    if (which === "start") {
      trim.start = clamp(trim.start + dir * step, 0, trim.end - TRIM_MIN);
    } else {
      trim.end = clamp(trim.end + dir * step, trim.start + TRIM_MIN, v.duration || 0);
    }
    showTrim();
    seekTo(which === "start" ? trim.start : trim.end);
  });
}

// --- Encuadre y margenes ----------------------------------------------------

/** Del espacio de pantalla al del lienzo: la previa va escalada. */
function canvasScale(): number {
  return previewEl.width / previewEl.getBoundingClientRect().width;
}

function toCanvas(clientX: number, clientY: number): { x: number; y: number } {
  const rect = previewEl.getBoundingClientRect();
  const s = canvasScale();
  return { x: (clientX - rect.left) * s, y: (clientY - rect.top) * s };
}

function clampOffset(s: Slide): void {
  if (s.inset.on) clampInsetOffset(s.inset);
  if (s.items.length === 0) return;
  // Los huecos dependen del texto y de los margenes, nunca del encuadre, asi
  // que se le pueden preguntar a la composicion antes de recortar nada.
  const { columns } = computeLayout(previewCtx, options(s, true));
  s.items.forEach((it, i) => {
    const col = columns[i];
    if (col) clampMediaOffset(it.media.size, it.transform, col);
  });
}

type TextTarget = "top" | "bottom";
type Target = TextTarget | "media" | "inset";

/**
 * Que hay bajo el puntero. Las bandas negras son territorio del texto y la
 * ventana lo es de la imagen: asi el texto se coge por toda su banda, que es un
 * blanco mucho mas grande que sus letras.
 */
function targetAt(clientX: number, clientY: number): Target | null {
  const p = toCanvas(clientX, clientY);
  const layout = computeLayout(previewCtx, options(cur(), true));
  if (layout.top && p.y < layout.bandTop) return "top";
  if (layout.bottom && p.y >= layout.bandBottom) return "bottom";
  const s = cur();
  // La mosca va encima de la imagen, asi que se coge antes que ella.
  if (s.inset.on && hitsInset(s.inset, p.x, p.y)) return "inset";
  if (s.items.length === 0) return null;
  // Con dos imagenes, el gesto es para la mitad sobre la que cae.
  s.active = clamp(Math.floor((p.x / CANVAS_W) * s.items.length), 0, s.items.length - 1);
  showActive();
  return "media";
}

function sizeOf(target: TextTarget): number {
  return target === "top" ? cur().topSize : cur().size;
}

function setSize(target: TextTarget, size: number): void {
  const s = cur();
  const style = STYLES[s.kind];
  const next = Math.round(clamp(size, style.sizeMin, style.sizeMax) * 2) / 2;
  if (target === "top") s.topSize = next;
  else s.size = next;
  draw();
}

/**
 * Sube y baja un texto. `dy` viene en pixeles de lienzo y el margen tambien,
 * asi que el bloque sigue al puntero exactamente.
 */
function moveText(target: TextTarget, dy: number): void {
  const s = cur();
  if (target === "top") s.marginTop = clamp(s.marginTop + dy, MARGIN_MIN, MARGIN_MAX);
  else s.marginBottom = clamp(s.marginBottom - dy, MARGIN_MIN, MARGIN_MAX);
}

/**
 * `anchor` es el punto del lienzo que tiene que quedarse quieto. Sin el —el
 * zoom viene de la barra, que no apunta a nada— se ancla en el centro de la
 * ventana, que es lo que uno esta mirando.
 */
function setZoom(zoom: number, anchor?: { x: number; y: number }): void {
  const s = cur();
  const it = item(s);
  const col = computeLayout(previewCtx, options(s, true)).columns[s.active];
  if (it && col) {
    const at = anchor ?? { x: col.x + col.w / 2, y: col.y + col.h / 2 };
    zoomMediaAt(it.media.size, it.transform, clamp(zoom, ZOOM_MIN, ZOOM_MAX), col, at);
  }
  draw();
}

zoomEl.addEventListener("input", () => setZoom(Number(zoomEl.value)));

const pointers = new Map<number, { x: number; y: number }>();
let lastX = 0;
let lastY = 0;
let target: Target | null = null;
let pinch: { dist: number; zoom: number; size: number; radius: number; insetZoom: number } | null =
  null;

function pinchGeometry(): { dist: number; mx: number; my: number } | null {
  const [a, b] = [...pointers.values()];
  if (!a || !b) return null;
  return { dist: Math.hypot(a.x - b.x, a.y - b.y), mx: (a.x + b.x) / 2, my: (a.y + b.y) / 2 };
}

previewEl.addEventListener("pointerdown", (e) => {
  pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

  if (pointers.size >= 2) {
    const g = pinchGeometry();
    if (!g) return;
    // El destino lo decide el punto medio: sobre un texto cambia su cuerpo, y
    // sobre la ventana hace zoom de la imagen.
    target = targetAt(g.mx, g.my);
    if (!target) return;
    pinch = {
      dist: g.dist,
      zoom: item()?.transform.zoom ?? 1,
      size: target === "top" || target === "bottom" ? sizeOf(target) : 0,
      radius: cur().inset.radius,
      insetZoom: cur().inset.zoom,
    };
    lastX = g.mx;
    lastY = g.my;
    return;
  }

  target = targetAt(e.clientX, e.clientY);
  // Pulsar en la ventana vacia es pedir un archivo. Se apunta aqui y se abre
  // en el `click`, que es el gesto que los navegadores aceptan para eso.
  pickOnClick = !target && cur().items.length === 0;
  if (!target) return;
  lastX = e.clientX;
  lastY = e.clientY;
  previewEl.setPointerCapture(e.pointerId);
});

previewEl.addEventListener("pointermove", (e) => {
  if (pointers.has(e.pointerId)) pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
  if (!target) return;

  const s = canvasScale();
  const transform = item()?.transform ?? { zoom: 1, offsetX: 0, offsetY: 0 };

  if (pinch && pointers.size >= 2) {
    const g = pinchGeometry();
    if (!g || pinch.dist === 0) return;
    const ratio = g.dist / pinch.dist;
    if (target === "media") {
      // El punto medio arrastra y ademas ancla el zoom: se coloca y se
      // dimensiona de un solo gesto.
      transform.offsetX += (g.mx - lastX) * s;
      transform.offsetY += (g.my - lastY) * s;
      setZoom(pinch.zoom * ratio, toCanvas(g.mx, g.my));
    } else if (target === "inset") {
      dragInset((g.mx - lastX) * s, (g.my - lastY) * s);
      scaleInset(pinch.radius * ratio, pinch.insetZoom * ratio);
      draw();
    } else {
      moveText(target, (g.my - lastY) * s);
      setSize(target, pinch.size * ratio);
    }
    lastX = g.mx;
    lastY = g.my;
    return;
  }

  if (target === "media") {
    transform.offsetX += (e.clientX - lastX) * s;
    transform.offsetY += (e.clientY - lastY) * s;
  } else if (target === "inset") {
    dragInset((e.clientX - lastX) * s, (e.clientY - lastY) * s);
  } else {
    // El texto solo sube y baja: a lo ancho lo coloca su alineacion.
    moveText(target, (e.clientY - lastY) * s);
  }
  lastX = e.clientX;
  lastY = e.clientY;
  draw();
});

/**
 * En `window` y no en el lienzo. Soltando el raton fuera de la previa el lienzo
 * no se entera, y ese puntero se queda anotado para siempre: a partir de ahi
 * cualquier pulsacion cuenta como segundo dedo y todo gesto se toma por un
 * pellizco.
 */
for (const type of ["pointerup", "pointercancel"] as const) {
  window.addEventListener(type, (e) => {
    pointers.delete(e.pointerId);
    pinch = null;
    if (pointers.size === 1) {
      // Al levantar un dedo, seguir con el que queda en vez de dar un salto.
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

/** La pulsacion empezo en la ventana vacia: al soltar, se elige archivo. */
let pickOnClick = false;

previewEl.addEventListener("click", () => {
  if (pickOnClick && cur().items.length === 0) fileEl.click();
  pickOnClick = false;
});

/** Una muesca de rueda manda deltaY 100, asi que con 2000 sale un ~5%. */
const WHEEL_DIVISOR = 2000;
/** Tope por evento, para que un golpe fuerte no pegue un salto. */
const WHEEL_MAX_DELTA = 120;

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
    if (hit === "media") {
      setZoom((item()?.transform.zoom ?? 1) * factor, toCanvas(e.clientX, e.clientY));
    } else if (hit === "inset") {
      scaleInset(cur().inset.radius * factor, cur().inset.zoom * factor);
      draw();
    } else {
      setSize(hit, sizeOf(hit) * factor);
    }
  },
  { passive: false },
);

// --- Dibujo -----------------------------------------------------------------

function px(n: number): string {
  return n.toFixed(1).replace(/\.0$/, "");
}

function paintThumb(s: Slide): void {
  const canvas = document.createElement("canvas");
  clampOffset(s);
  render(context(canvas), options(s, true));
  context(s.thumb).drawImage(canvas, 0, 0, s.thumb.width, s.thumb.height);
  // Solo se pinta la miniatura de una pieza que no esta abierta cuando algo
  // suyo ha cambiado, y eso tambien hay que guardarlo.
  scheduleSave();
}

function draw(): void {
  const s = cur();
  // Centralizado aqui: asi ningun cambio puede dejar un encuadre invalido.
  clampOffset(s);
  const layout = render(previewCtx, options(s, true));

  // Los controles siguen a la pieza, tambien cuando lo que la ha movido es un
  // gesto sobre la previa y no el propio control.
  sizeEl.value = String(s.size);
  topSizeEl.value = String(s.topSize);
  hlEl.value = String(s.bigScale);
  bandPadEl.value = String(s.bandPad);
  // La ventana vacia se pulsa; con imagen, se arrastra.
  previewEl.style.cursor = s.items.length > 0 ? "grab" : "pointer";
  insetSizeEl.value = String(s.inset.radius);
  insetZoomEl.value = String(s.inset.zoom);
  insetSizeValueEl.textContent = String(Math.round(s.inset.radius * 2));
  marginBottomEl.value = String(s.marginBottom);
  marginTopEl.value = String(s.marginTop);
  marginSideEl.value = String(s.marginSide);
  const zoom = item(s)?.transform.zoom ?? 1;
  zoomEl.value = String(zoom);

  sizeValueEl.textContent = px(s.size);
  topSizeValueEl.textContent = px(s.topSize);
  hlValueEl.textContent = String(Math.round(s.bigScale * 100));
  bandPadValueEl.textContent = String(Math.round(s.bandPad));
  marginBottomValueEl.textContent = String(Math.round(s.marginBottom));
  marginTopValueEl.textContent = String(Math.round(s.marginTop));
  marginSideValueEl.textContent = String(Math.round(s.marginSide));
  zoomValueEl.textContent = String(Math.round(zoom * 100));

  const parts = [`${layout.width} × ${layout.height} px`];
  for (const [name, block] of [["arriba", layout.top], ["abajo", layout.bottom]] as const) {
    if (!block) continue;
    const n = block.lines.length;
    parts.push(
      `${name}: ${n} ${n === 1 ? "línea" : "líneas"} a ${px(block.size)} px` +
        (block.shrunk ? " (reducido para que quepa)" : ""),
    );
  }
  parts.push(`ventana de ${layout.area.h} px`);
  previewInfoEl.textContent = parts.join(" · ");

  showResets();
  scheduleSave();

  context(s.thumb).drawImage(previewEl, 0, 0, s.thumb.width, s.thumb.height);
  miniCtx.drawImage(previewEl, 0, 0, miniCanvasEl.width, miniCanvasEl.height);
  updateMini();
}

// --- Vista previa flotante (movil) ------------------------------------------

/** Una vez cerrada a mano, no vuelve a salir en toda la sesion. */
let miniDismissed = false;
/** Lo ultimo que se le dijo al DOM, para no repetirselo en cada fotograma. */
let miniShown = false;
/** Cuanto antes de que asome la previa grande se retira la miniatura. */
const MINI_HIDE_MARGIN = 40;

function previewIsNear(): boolean {
  const rect = previewPanelEl.getBoundingClientRect();
  return rect.top - MINI_HIDE_MARGIN < window.innerHeight && rect.bottom > 0;
}

function updateMini(): void {
  // Solo tiene sentido cuando ya hay algo que mirar.
  const s = cur();
  const something = s.items.length > 0 || s.text.trim() !== "";
  const show = !miniDismissed && something && !previewIsNear();
  if (show === miniShown) return;
  miniShown = show;
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

miniCanvasEl.addEventListener("click", () => {
  previewEl.scrollIntoView({ behavior: "smooth", block: "center" });
});

// --- Salida -----------------------------------------------------------------

interface Result {
  url: string;
  name: string;
  video: boolean;
  bytes: number;
  label: string;
}

let results: Result[] = [];

function toBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error("No se pudo exportar la pieza."));
    }, "image/png");
  });
}

/**
 * Una pieza del hilo. Con imagen, o sin nada, es un PNG y sale al momento. Con
 * video es un MP4: ffmpeg le pega encima las bandas y el texto, que son la
 * misma capa que se ha visto en la previa.
 */
async function build(s: Slide, i: number): Promise<Result> {
  const canvas = document.createElement("canvas");
  const ctx = context(canvas);
  const opts = options(s, false);
  clampOffset(s);
  const number = String(i + 1).padStart(2, "0");
  const base = `hilo-${number}${s.kind === "portada" ? "-portada" : ""}`;

  const clip = videoOf(s);
  if (clip) {
    const layout = renderPlate(ctx, opts);
    const rect = layout.media[clip.index];
    if (!rect) throw new Error("Falta el vídeo.");
    const mp4 = await encode(
      {
        source: clip.file,
        plate: await toBlob(canvas),
        rect,
        canvas: { w: CANVAS_W, h: CANVAS_H },
        flip: s.items[clip.index]?.flip ?? false,
        trim: trimRange(s),
      },
      {
        onStage: (message) => setStatus(`Pieza ${number}: ${message}`),
        onProgress: (ratio) => {
          progressBarEl.style.width = `${(ratio * 100).toFixed(1)}%`;
          setStatus(`Pieza ${number}: montando el vídeo… ${Math.round(ratio * 100)} %`);
        },
      },
    );
    return {
      url: URL.createObjectURL(mp4),
      name: `${base}.mp4`,
      video: true,
      bytes: mp4.size,
      label: label(s, i),
    };
  }

  render(ctx, opts);
  const png = await toBlob(canvas);
  return {
    url: URL.createObjectURL(png),
    name: `${base}.png`,
    video: false,
    bytes: png.size,
    label: label(s, i),
  };
}

function save(r: Result): void {
  const a = document.createElement("a");
  a.href = r.url;
  a.download = r.name;
  a.click();
}

function showResults(): void {
  const cards = results.map((r) => {
    const card = document.createElement("div");
    card.className = "result";
    let view: HTMLImageElement | HTMLVideoElement;
    if (r.video) {
      view = document.createElement("video");
      view.controls = true;
      view.playsInline = true;
    } else {
      view = document.createElement("img");
      view.alt = r.label;
    }
    view.src = r.url;
    const info = document.createElement("p");
    info.className = "muted small";
    info.textContent =
      `${r.label} · ${r.video ? "MP4" : "PNG"} · ${(r.bytes / (1024 * 1024)).toFixed(1)} MB`;
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "btn-secondary";
    btn.textContent = "Descargar";
    btn.addEventListener("click", () => save(r));
    card.append(view, info, btn);
    return card;
  });
  resultsEl.replaceChildren(...cards);
  downloadEl.hidden = results.length < 2;
}

function setBusy(value: boolean): void {
  busy = value;
  generateEl.disabled = value;
  generateEl.textContent = value ? "MONTANDO…" : "GENERA EL HILO";
  if (!value) {
    progressEl.hidden = true;
    progressBarEl.style.width = "0";
  }
}

function generate(): void {
  if (busy) return;
  pausePreview();

  // La revision arranca ya, no al final: montar un video tarda, y de nada
  // sirve enterarse de la errata cuando el texto lleva un minuto incrustado.
  outputEl.hidden = false;
  void review();

  void (async () => {
    setBusy(true);
    try {
      await ensureFonts();
      const started = performance.now();
      const built: Result[] = [];
      for (const [i, s] of slides.entries()) {
        progressEl.hidden = !videoOf(s);
        progressBarEl.style.width = "0";
        setStatus(`Pieza ${i + 1} de ${slides.length}…`);
        built.push(await build(s, i));
      }
      for (const r of results) URL.revokeObjectURL(r.url);
      results = built;
      showResults();
      const seconds = (performance.now() - started) / 1000;
      const n = built.length;
      setStatus(`Listo: ${n} ${n === 1 ? "pieza" : "piezas"} en ${seconds.toFixed(0)} s.`);
      outputEl.scrollIntoView({ behavior: "smooth", block: "start" });
    } catch (err) {
      console.error(err);
      setStatus(err instanceof Error ? err.message : "No se pudo generar el hilo.", "error");
    } finally {
      setBusy(false);
    }
  })();
}

generateEl.addEventListener("click", generate);

// De una en una y con un respiro: lanzadas todas a la vez, el navegador se
// queda con la primera descarga y tira las demas.
downloadEl.addEventListener("click", () => {
  results.forEach((r, i) => setTimeout(() => save(r), i * 350));
});

// --- Revision del texto ----------------------------------------------------

/** Un texto del hilo y donde cae dentro de lo que se manda a revisar. */
interface Part {
  slide: Slide;
  field: "text" | "topText";
  start: number;
  text: string;
}

/**
 * Todos los textos del hilo, en orden. Se revisan juntos, en una sola
 * consulta: la API publica de LanguageTool tiene un cupo por minuto, y un hilo
 * de diez piezas con una consulta por texto se lo come entero.
 */
function parts(): Part[] {
  const out: Part[] = [];
  let start = 0;
  for (const slide of slides) {
    for (const field of ["topText", "text"] as const) {
      if (field === "topText" && !slide.topOn) continue;
      const text = slide[field];
      if (text.trim() === "") continue;
      out.push({ slide, field, start, text });
      start += text.length + SEPARATOR.length;
    }
  }
  return out;
}

/** Entre texto y texto, un parrafo aparte: asi no se leen como una sola frase. */
const SEPARATOR = "\n\n";

/** Ultimo texto revisado con exito, para no preguntar dos veces por lo mismo. */
let reviewed: string | null = null;
/** Cada revision anula el pintado de la anterior, que pudo tardar mas. */
let reviewToken = 0;
/** Lo que aplicaria CORREGIR: cada texto con su version arreglada. */
let fixes: { part: Part; fixed: string }[] = [];

function setReview(title: string, issues: Issue[] = [], checked: Part[] = []): void {
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

  // Cada aviso vuelve a su texto, con las posiciones contadas desde su inicio.
  fixes = [];
  for (const part of checked) {
    const end = part.start + part.text.length;
    const own = issues
      .filter((i) => i.start >= part.start && i.end <= end)
      .map((i) => ({ ...i, start: i.start - part.start, end: i.end - part.start }));
    const fixed = own.length > 0 ? applyFixes(part.text, own) : part.text;
    if (fixed !== part.text) fixes.push({ part, fixed });
  }
  reviewFixEl.hidden = fixes.length === 0;
  reviewProposalEl.textContent = fixes.map((f) => f.fixed).join(" · ");
}

async function review(): Promise<void> {
  const checked = parts();
  const joined = checked.map((p) => p.text).join(SEPARATOR);
  if (joined === reviewed) return;
  const token = ++reviewToken;
  if (joined === "") {
    reviewEl.hidden = true;
    reviewed = joined;
    return;
  }
  setReview("Revisando el texto…");
  try {
    const issues = await check(joined, "*+");
    if (token !== reviewToken) return;
    reviewed = joined;
    const n = issues.length;
    setReview(
      n === 0 ? "Sin erratas." : `${n} ${n === 1 ? "aviso" : "avisos"} en el texto`,
      issues,
      checked,
    );
  } catch {
    if (token !== reviewToken) return;
    // Que no se pueda revisar no debe estropear el hilo, que ya va en marcha.
    setReview("No se pudo revisar el texto.");
  }
}

/** Aplica las propuestas a sus textos y rehace el hilo, que si no queda viejo. */
fixEl.addEventListener("click", () => {
  if (busy || fixes.length === 0) return;
  for (const { part, fixed } of fixes) {
    // Si el texto se ha tocado desde la revision, las posiciones ya no valen.
    if (part.slide[part.field] === part.text) part.slide[part.field] = fixed;
  }
  fixes = [];
  for (const s of slides) if (s !== cur()) paintThumb(s);
  showSlide();
  draw();
  generate();
});

// --- Historial --------------------------------------------------------------

/** Cuantos hilos se conservan. El mas antiguo se va al guardar el siguiente. */
const MAX_WORKS = 12;

/** Lo que tarda en guardarse un cambio: lo justo para no escribir a cada letra. */
const SAVE_DELAY = 900;

/** Donde la pestaña apunta que hilo tiene abierto, para volver a el. */
const SESSION_KEY = "hilogenerator:abierto";

/** IndexedDB disponible. Sin ella no hay historial, pero si herramienta. */
let storeReady = false;
/** Mientras se abre un hilo guardado, lo que se pinta no es un cambio. */
let restoring = false;
/** El id con el que se guarda el hilo abierto. null hasta el primer guardado. */
let workId: string | null = null;
/** Lo ultimo que se guardo, para no reescribir lo que no ha cambiado. */
let lastSaved = "";
/** Archivos que ya estan en la base: se escriben una vez y no mas. */
const stored = new Set<string>();
let saveTimer = 0;
/** Las escrituras van en fila: un guardado y un borrado no se pisan. */
let queue: Promise<void> = Promise.resolve();
let warned = false;

function sessionId(): string | null {
  try {
    return sessionStorage.getItem(SESSION_KEY);
  } catch {
    return null;
  }
}

function setSessionId(id: string | null): void {
  try {
    if (id) sessionStorage.setItem(SESSION_KEY, id);
    else sessionStorage.removeItem(SESSION_KEY);
  } catch {
    // Sin sessionStorage no se vuelve solo al hilo, pero sigue en el historial.
  }
}

/** True si el hilo no tiene todavia nada que merezca guardarse. */
function isEmpty(): boolean {
  return slides.every(
    (s) =>
      s.items.length === 0 &&
      !s.inset.media &&
      s.text.trim() === "" &&
      s.topText.trim() === "",
  );
}

function saved(s: Slide): SavedSlide {
  return {
    kind: s.kind,
    text: s.text,
    size: s.size,
    topOn: s.topOn,
    topText: s.topText,
    topSize: s.topSize,
    marginBottom: s.marginBottom,
    marginTop: s.marginTop,
    marginSide: s.marginSide,
    bandPad: s.bandPad,
    bigScale: s.bigScale,
    arrow: s.arrow,
    active: s.active,
    trim: { ...s.trim },
    items: s.items.map((it) => ({
      fileId: it.media.id,
      transform: { ...it.transform },
      flip: it.flip,
    })),
    inset: {
      on: s.inset.on,
      fileId: s.inset.media?.id ?? null,
      cx: s.inset.cx,
      cy: s.inset.cy,
      radius: s.inset.radius,
      zoom: s.inset.zoom,
      offsetX: s.inset.offsetX,
      offsetY: s.inset.offsetY,
    },
  };
}

function snapshot(): WorkData {
  return {
    colorText: textColorEl.value,
    colorHighlight: highlightEl.value,
    slides: slides.map(saved),
  };
}

/** El primer texto del hilo, sin marcas, para reconocerlo en la lista. */
function workTitle(): string {
  for (const s of slides) {
    const text = (s.text || s.topText).replace(/[*+]/g, "").replace(/\s+/g, " ").trim();
    if (text) return text.length > 70 ? `${text.slice(0, 70)}…` : text;
  }
  return "Sin texto";
}

function enqueue(job: () => Promise<void>): Promise<void> {
  queue = queue.then(job).catch((err: unknown) => {
    console.error(err);
    if (warned) return;
    warned = true;
    setStatus(
      "No se pudo guardar en el historial: puede que el navegador se haya quedado sin sitio.",
      "error",
    );
  });
  return queue;
}

/** Guarda el hilo abierto, si ha cambiado. Los archivos nuevos, primero. */
function saveNow(): Promise<void> {
  clearTimeout(saveTimer);
  if (!storeReady || restoring) return queue;
  return enqueue(async () => {
    if (isEmpty()) return;
    const data = snapshot();
    const json = JSON.stringify(data);
    if (json === lastSaved) return;

    for (const s of slides) {
      for (const m of [...s.items.map((it) => it.media), s.inset.media]) {
        if (!m || stored.has(m.id)) continue;
        await putFile(m.id, m.file);
        stored.add(m.id);
      }
    }

    workId ??= newId();
    setSessionId(workId);
    await putWork({
      ...data,
      id: workId,
      updated: Date.now(),
      title: workTitle(),
      thumb: slides[0]?.thumb.toDataURL("image/jpeg", 0.75) ?? "",
    });
    lastSaved = json;
    await prune(MAX_WORKS);
    await showHistory();
  });
}

function scheduleSave(): void {
  if (!storeReady || restoring) return;
  clearTimeout(saveTimer);
  saveTimer = window.setTimeout(() => void saveNow(), SAVE_DELAY);
}

// Al irse de la pagina —atras, cerrar, cambiar de pestaña— se guarda ya, sin
// esperar al retardo: es justo el momento en que se perderia lo ultimo.
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "hidden") void saveNow();
});
window.addEventListener("pagehide", () => void saveNow());

/** Cambia el hilo abierto por otro: suelta lo cargado y pone las piezas nuevas. */
function replaceSlides(next: Slide[]): void {
  pausePreview();
  for (const s of slides) dropSlide(s);
  slides.splice(0, slides.length, ...(next.length > 0 ? next : [newSlide("portada")]));
  current = 0;
  showStrip();
  for (const s of slides.slice(1)) paintThumb(s);
  showSlide();
  draw();
}

/** Vuelve a montar una pieza guardada, con sus archivos sacados de la base. */
async function revive(d: SavedSlide): Promise<Slide> {
  const s = newSlide(d.kind);
  s.text = d.text;
  s.size = d.size;
  s.topOn = d.topOn;
  s.topText = d.topText;
  s.topSize = d.topSize;
  s.marginBottom = d.marginBottom;
  s.marginTop = d.marginTop;
  s.marginSide = d.marginSide;
  s.bandPad = d.bandPad;
  s.bigScale = d.bigScale;
  s.arrow = d.arrow;
  s.trim = { ...d.trim };

  const load = async (fileId: string): Promise<Media | null> => {
    const file = await getFile(fileId);
    if (!file) return null;
    stored.add(fileId);
    try {
      return await (file.type.startsWith("video/") ? openVideo(file, fileId) : openImage(file, fileId));
    } catch {
      // Un archivo que ya no se abre no debe llevarse por delante el hilo.
      return null;
    }
  };

  for (const it of d.items) {
    const media = await load(it.fileId);
    if (media) s.items.push({ media, transform: { ...it.transform }, flip: it.flip });
  }
  s.active = clamp(d.active, 0, Math.max(0, s.items.length - 1));

  const { fileId, ...inset } = d.inset;
  Object.assign(s.inset, inset);
  if (fileId) {
    const media = await load(fileId);
    if (media?.kind === "image") {
      s.inset.media = media;
      s.inset.source = media.el;
      s.inset.size = media.size;
    }
  }
  return s;
}

async function openWork(work: Work): Promise<void> {
  if (busy) return;
  // Lo que hay abierto se guarda antes de cambiarlo por otro.
  await saveNow();
  restoring = true;
  try {
    const next: Slide[] = [];
    for (const d of work.slides) next.push(await revive(d));
    textColorEl.value = work.colorText;
    highlightEl.value = work.colorHighlight;
    replaceSlides(next);
    workId = work.id;
    setSessionId(work.id);
    // Lo abierto es lo guardado: abrir un hilo viejo no lo sube arriba del
    // historial hasta que de verdad se toque algo.
    lastSaved = JSON.stringify(snapshot());
  } finally {
    restoring = false;
  }
  setStatus("");
  await showHistory();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

newWorkEl.addEventListener("click", () => {
  if (busy) return;
  void (async () => {
    // El que habia se queda en el historial tal como estaba.
    await saveNow();
    restoring = true;
    textColorEl.value = COLOR_TEXT;
    highlightEl.value = COLOR_HIGHLIGHT;
    replaceSlides([newSlide("portada")]);
    workId = null;
    lastSaved = "";
    setSessionId(null);
    restoring = false;
    setStatus("");
    await showHistory();
  })();
});

async function showHistory(): Promise<void> {
  if (!storeReady) return;
  const works = await listWorks();
  historyEl.hidden = works.length === 0;

  const cards = works.map((w) => {
    const open = w.id === workId;
    const card = document.createElement("div");
    card.className = open ? "work is-current" : "work";

    const go = document.createElement("button");
    go.type = "button";
    go.className = "work-open";
    go.disabled = open;
    const img = document.createElement("img");
    img.src = w.thumb;
    img.alt = "";
    const title = document.createElement("strong");
    title.textContent = w.title;
    const meta = document.createElement("span");
    meta.className = "muted small";
    const n = w.slides.length;
    const when = new Date(w.updated).toLocaleString("es-ES", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
    meta.textContent = `${n} ${n === 1 ? "pieza" : "piezas"} · ${when}`;
    go.append(img, title, meta);
    go.addEventListener("click", () => void openWork(w));

    const side = document.createElement(open ? "span" : "button");
    side.className = open ? "work-now small" : "btn-secondary work-delete";
    side.textContent = open ? "Abierto ahora" : "Borrar";
    if (side instanceof HTMLButtonElement) {
      side.type = "button";
      side.addEventListener("click", () => {
        void enqueue(async () => {
          await deleteWorks([w.id]);
          await showHistory();
        });
      });
    }

    card.append(go, side);
    return card;
  });
  worksEl.replaceChildren(...cards);
}

// --- Arranque ---------------------------------------------------------------

previewEl.width = CANVAS_W;
previewEl.height = CANVAS_H;
textColorEl.value = COLOR_TEXT;
highlightEl.value = COLOR_HIGHLIGHT;
hlEl.min = String(BIG_SCALE_MIN);
hlEl.max = String(BIG_SCALE_MAX);
bandPadEl.min = String(BAND_PAD_MIN);
bandPadEl.max = String(BAND_PAD_MAX);
for (const el of [marginBottomEl, marginTopEl]) {
  el.min = String(MARGIN_MIN);
  el.max = String(MARGIN_MAX);
}
marginSideEl.min = String(MARGIN_MIN);
marginSideEl.max = String(MARGIN_SIDE_MAX);
zoomEl.min = String(ZOOM_MIN);
zoomEl.max = String(ZOOM_MAX);
insetSizeEl.min = String(INSET.radiusMin);
insetSizeEl.max = String(INSET.radiusMax);
insetZoomEl.min = String(ZOOM_MIN);
insetZoomEl.max = String(ZOOM_MAX);

showStrip();
showSlide();
draw();

void (async () => {
  await ensureFonts();
  draw();

  storeReady = await available();
  if (!storeReady) return;
  // Volver atras o recargar es seguir donde se estaba: la pestaña recuerda que
  // hilo tenia abierto. Una visita nueva empieza en blanco, con el historial
  // debajo para recuperar cualquiera de los anteriores.
  const open = (await listWorks()).find((w) => w.id === sessionId());
  if (open && isEmpty()) await openWork(open);
  else await showHistory();
  scheduleSave();
})();
