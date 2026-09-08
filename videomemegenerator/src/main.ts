import overlayUrl from "./assets/overlay.png";
import { encode } from "./encode.js";
import {
  CANVAS_H,
  CANVAS_W,
  COLOR_HIGHLIGHT,
  COLOR_TEXT,
  COLORS,
  CTA_FONT_SIZE,
  CTA_FONT_SIZE_MAX,
  CTA_FONT_SIZE_MIN,
  CTA_POS,
  CTA_TEXT,
  FONT,
  FONT_SIZE,
  FONT_SIZE_MAX,
  FONT_SIZE_MIN,
  VIDEO_Y,
  ZOOM_MAX,
  ZOOM_MIN,
} from "./format.js";
import {
  centerVideoOffset,
  clampVideoOffset,
  computeLayout,
  render,
  renderPlate,
  zoomVideoAt,
  type Rect,
  type RenderOptions,
  type VideoTransform,
} from "./render.js";
import { applyFixes, check, type Issue } from "./spell.js";
import "./style.css";

function need<T extends Element>(id: string): T {
  const el = document.getElementById(id);
  if (!el) throw new Error(`Falta el elemento #${id} en el HTML`);
  return el as unknown as T;
}

const textEl = need<HTMLTextAreaElement>("text");
const sizeEl = need<HTMLInputElement>("size");
const sizeValueEl = need<HTMLSpanElement>("size-value");
const dropEl = need<HTMLDivElement>("drop");
const fileEl = need<HTMLInputElement>("file");
const pickEl = need<HTMLButtonElement>("pick");
const fileNameEl = need<HTMLParagraphElement>("file-name");
const seekEl = need<HTMLInputElement>("seek");
const seekValueEl = need<HTMLSpanElement>("seek-value");
const flipEl = need<HTMLButtonElement>("flip");
const playEl = need<HTMLButtonElement>("play");
const trimEl = need<HTMLDivElement>("trim");
const trimTrackEl = need<HTMLDivElement>("trim-track");
const trimSpanEl = need<HTMLDivElement>("trim-span");
const trimInEl = need<HTMLDivElement>("trim-in");
const trimOutEl = need<HTMLDivElement>("trim-out");
const trimValueEl = need<HTMLSpanElement>("trim-value");
const zoomEl = need<HTMLInputElement>("zoom");
const zoomValueEl = need<HTMLSpanElement>("zoom-value");
const bottomEl = need<HTMLInputElement>("bottom");
const bottomValueEl = need<HTMLSpanElement>("bottom-value");
const ctaSectionEl = need<HTMLDetailsElement>("cta-section");
const ctaEl = need<HTMLInputElement>("cta");
const ctaSizeEl = need<HTMLInputElement>("cta-size");
const ctaSizeValueEl = need<HTMLSpanElement>("cta-size-value");
const textColorEl = need<HTMLInputElement>("color-text");
const highlightEl = need<HTMLInputElement>("color-highlight");
const generateEl = need<HTMLButtonElement>("generate");
const progressEl = need<HTMLDivElement>("progress");
const progressBarEl = need<HTMLDivElement>("progress-bar");
const statusEl = need<HTMLParagraphElement>("status");
const previewEl = need<HTMLCanvasElement>("preview");
const previewInfoEl = need<HTMLParagraphElement>("preview-info");
const outputEl = need<HTMLElement>("output");
const resultEl = need<HTMLVideoElement>("result");
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
const sourceEl = need<HTMLVideoElement>("source");

function context(canvas: HTMLCanvasElement): CanvasRenderingContext2D {
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Este navegador no soporta canvas 2D");
  return ctx;
}

const previewCtx = context(previewEl);
const miniCtx = context(miniCanvasEl);

interface State {
  /** El <video> oculto, parado en el fotograma que se esta encuadrando. */
  hasVideo: boolean;
  frameSize: { width: number; height: number } | null;
  file: File | null;
  transform: VideoTransform;
  /** Espejado horizontal. No toca el encuadre, solo da la vuelta a la imagen. */
  flip: boolean;
  /**
   * Tramo que se exporta. Arranca abarcando el video entero, asi que mientras
   * no se toquen los extremos no hay recorte que hacer.
   */
  trim: { start: number; end: number };
  overlay: HTMLImageElement | null;
  /**
   * Altura del CTA, de 0 a 1 del lienzo. Vive aqui y no en un control porque no
   * hay ninguno: se arrastra sobre la previa, como el encuadre del video.
   */
  ctaPos: number;
  /** URL del MP4 ya montado, para el boton de descarga. */
  result: string | null;
  busy: boolean;
}

const state: State = {
  hasVideo: false,
  frameSize: null,
  file: null,
  transform: { zoom: 1, offsetX: 0, offsetY: 0 },
  flip: false,
  trim: { start: 0, end: 0 },
  overlay: null,
  ctaPos: CTA_POS,
  result: null,
  busy: false,
};

function options(): RenderOptions {
  return {
    frame: state.hasVideo ? sourceEl : null,
    frameSize: state.frameSize,
    transform: state.transform,
    flip: state.flip,
    overlay: state.overlay,
    text: textEl.value,
    font: FONT,
    fontSize: Number(sizeEl.value),
    bottomMargin: Number(bottomEl.value),
    // El apartado plegado es el CTA quitado. Es el interruptor y ya: abrirlo lo
    // pone, cerrarlo lo quita, y el texto se queda escrito para la proxima.
    ctaText: ctaSectionEl.open ? ctaEl.value : "",
    ctaSize: Number(ctaSizeEl.value),
    ctaPos: state.ctaPos,
    colorText: textColorEl.value,
    colorHighlight: highlightEl.value,
  };
}

function setStatus(message: string, kind: "" | "error" = ""): void {
  statusEl.textContent = message;
  statusEl.className = kind === "error" ? "status error" : "status";
}

// --- Recursos ---------------------------------------------------------------

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`No se pudo cargar ${src}`));
    img.src = src;
  });
}

/**
 * Espera a que cargue SF Pro antes de medir. Sin esto, la primera pasada mide
 * con la de respaldo y el rotulo sale con un ajuste que no corresponde.
 */
async function ensureFont(): Promise<void> {
  try {
    await document.fonts.load(`${FONT.weight} 64px ${FONT.stack}`);
    await document.fonts.ready;
  } catch {
    setStatus("No se pudo cargar SF Pro; se usará una de respaldo.", "error");
  }
}

// --- Colores ----------------------------------------------------------------

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

/** m:ss, que es como lo escribe cualquier reproductor. */
function clock(seconds: number): string {
  if (!Number.isFinite(seconds)) return "0:00";
  const total = Math.max(0, Math.round(seconds));
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
}

function showTime(): void {
  seekValueEl.textContent = `${clock(sourceEl.currentTime)} / ${clock(sourceEl.duration)}`;
}

// --- Video ------------------------------------------------------------------

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

async function loadFile(file: File): Promise<void> {
  if (!file.type.startsWith("video/")) {
    setStatus("Ese archivo no es un vídeo.", "error");
    return;
  }

  const url = URL.createObjectURL(file);
  const previous = sourceEl.src;
  sourceEl.src = url;
  try {
    await once(sourceEl, "loadedmetadata");
    // `loadeddata` significa que ya hay un fotograma pintable, y ese fotograma
    // es el primero: no hace falta buscar nada para tener la previa.
    await once(sourceEl, "loadeddata");
  } catch (err) {
    URL.revokeObjectURL(url);
    sourceEl.src = previous;
    setStatus(err instanceof Error ? err.message : "No se pudo abrir el vídeo.", "error");
    return;
  }
  if (previous) URL.revokeObjectURL(previous);

  state.hasVideo = true;
  state.file = file;
  state.frameSize = { width: sourceEl.videoWidth, height: sourceEl.videoHeight };
  state.transform = { zoom: 1, offsetX: 0, offsetY: 0 };
  zoomEl.value = "1";
  bottomEl.value = "0";
  // De partida, centrado en el hueco: con un video mas largo que el hueco, ver
  // el centro es lo que se espera. Uno que cabe entero se pega al techo solo.
  // El techo hay que preguntarlo, porque un rotulo largo lo habra bajado.
  state.transform.offsetY = centerVideoOffset(
    state.frameSize,
    1,
    computeLayout(previewCtx, options()).videoTopBase,
  );
  state.flip = false;
  state.trim = { start: 0, end: sourceEl.duration || 0 };
  pausePreview();
  showFlip();
  showTrim();
  showPlay();
  seekEl.disabled = false;
  seekEl.value = "0";
  showTime();

  const mb = file.size / (1024 * 1024);
  fileNameEl.textContent =
    `${file.name} · ${sourceEl.videoWidth} × ${sourceEl.videoHeight} · ` +
    `${sourceEl.duration.toFixed(1)} s · ${mb.toFixed(1)} MB`;

  // El hueco de la plantilla mide 1080 de ancho: por debajo de eso el video se
  // amplia, y ampliar es lo unico de todo el montaje que se ve de verdad.
  if (sourceEl.videoWidth < CANVAS_W) {
    setStatus(
      `Aviso: el vídeo tiene ${sourceEl.videoWidth} px de ancho y el hueco pide ${CANVAS_W}. Se verá pixelado.`,
      "error",
    );
  } else {
    setStatus("Listo para generar.");
  }
  draw();
}

pickEl.addEventListener("click", () => fileEl.click());
fileEl.addEventListener("change", () => {
  const file = fileEl.files?.[0];
  if (file) void loadFile(file);
});

/**
 * Se suelta en cualquier parte de la ventana. `dragleave` salta tambien al
 * pasar de un elemento a otro por dentro, asi que hay que contar entradas y
 * salidas en vez de fiarse del evento: si no, el aviso parpadea al cruzar
 * cualquier borde de camino a donde se quiere soltar.
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
  const file = e.dataTransfer?.files?.[0];
  if (file) void loadFile(file);
});

// El fotograma solo cambia la previa: al video no le recorta nada. Sirve para
// encuadrar cuando el primer fotograma esta en negro, que pasa a menudo. Con el
// recorte puesto, la barra se queda encerrada entre los dos extremos, asi que
// solo recorre lo que de verdad se va a exportar.
seekEl.addEventListener("input", () => {
  if (!state.hasVideo) return;
  pausePreview();
  showSeekFill();
  sourceEl.currentTime = Number(seekEl.value);
});
sourceEl.addEventListener("seeked", () => {
  showTime();
  draw();
});

// --- Voltear ----------------------------------------------------------------

function showFlip(): void {
  flipEl.setAttribute("aria-pressed", String(state.flip));
  flipEl.disabled = !state.hasVideo;
}

// --- Reproducir la previa ---------------------------------------------------

/**
 * La previa se puede reproducir para ver el montaje en movimiento. Solo recorre
 * el tramo elegido: al llegar al extremo de salida se para, y volviendo a darle
 * arranca otra vez desde el de entrada.
 */
let playing = false;
let frameLoop = 0;

function showPlay(): void {
  playEl.setAttribute("aria-pressed", String(playing));
  playEl.disabled = !state.hasVideo;
  playEl.title = playing ? "Pausar la previa" : "Reproducir la previa";
}

function pausePreview(): void {
  if (!playing) return;
  playing = false;
  cancelAnimationFrame(frameLoop);
  sourceEl.pause();
  showPlay();
}

/** Lleva la barra y el reloj a donde vaya la reproduccion. */
function followTime(): void {
  seekEl.value = String(sourceEl.currentTime);
  showSeekFill();
  showTime();
}

function tick(): void {
  if (!playing) return;
  if (sourceEl.currentTime >= state.trim.end - 0.01) {
    pausePreview();
    return;
  }
  followTime();
  draw();
  frameLoop = requestAnimationFrame(tick);
}

// El lienzo se repinta con `requestAnimationFrame`, que es lo suyo para algo
// que va a la cadencia de la pantalla. Pero el navegador lo para en cuanto la
// pestaña deja de verse, y entonces la barra se quedaba clavada aunque el video
// siguiera corriendo. `timeupdate` llega igual con la pestaña oculta, asi que
// al volver los numeros estan donde tienen que estar.
sourceEl.addEventListener("timeupdate", () => {
  if (!playing) return;
  if (sourceEl.currentTime >= state.trim.end - 0.01) pausePreview();
  else followTime();
});

playEl.addEventListener("click", () => {
  if (!state.hasVideo) return;
  if (playing) {
    pausePreview();
    return;
  }
  // Al final del tramo, volver a darle es empezar de nuevo.
  if (sourceEl.currentTime >= state.trim.end - 0.05) sourceEl.currentTime = state.trim.start;
  // Con sonido: el clic ya es el gesto que piden los navegadores, y un meme sin
  // audio esta a medias.
  sourceEl.muted = false;
  playing = true;
  showPlay();
  void sourceEl.play().catch(() => pausePreview());
  frameLoop = requestAnimationFrame(tick);
});

sourceEl.addEventListener("ended", pausePreview);

flipEl.addEventListener("click", () => {
  if (!state.hasVideo) return;
  state.flip = !state.flip;
  showFlip();
  draw();
});

// --- Recortar ---------------------------------------------------------------

/** Lo mas corto que se puede dejar un recorte. Menos que esto no es un video. */
const TRIM_MIN = 0.2;

/**
 * m:ss.d. Los extremos del recorte se afinan a decimas, asi que redondearlos al
 * segundo como el reloj de la reproduccion deja etiquetas que se contradicen
 * con su propia duracion: «0:02 – 0:06 · 4,5 s».
 */
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
function trimRange(): { start: number; end: number } | null {
  const duration = sourceEl.duration || 0;
  const { start, end } = state.trim;
  if (duration <= 0) return null;
  if (start <= 0.001 && end >= duration - 0.001) return null;
  return { start, end };
}

function showTrim(): void {
  const { start, end } = state.trim;
  const duration = sourceEl.duration || 0;
  trimEl.hidden = !state.hasVideo;

  // La barra de reproduccion se encierra entre los dos extremos: asi lo que se
  // recorre es exactamente lo que va a salir.
  seekEl.min = String(start);
  seekEl.max = String(end || duration || 1);

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

/**
 * Medio tirador. Los dos extremos del recorte y el pulgar de la reproduccion
 * miden 12 px y recorren de 6 a ancho-6, no de 0 a 100 %: es lo que hace que
 * las dos pistas empiecen y acaben en el mismo sitio.
 */
const HANDLE = 6;

/** Posicion de un tirador dentro de la pista, en el recorrido util. */
function alongTrack(fraction: number): string {
  return `calc(${HANDLE}px + (100% - ${HANDLE * 2}px) * ${fraction})`;
}

/** El relleno de la barra de reproduccion, que el `range` pintado ya no da. */
function showSeekFill(): void {
  const min = Number(seekEl.min);
  const max = Number(seekEl.max);
  const span = max - min;
  const f = span > 0 ? (Number(seekEl.value) - min) / span : 0;
  seekEl.style.setProperty("--fill", alongTrack(Math.min(1, Math.max(0, f))));
}

/** Lleva la previa al extremo que se esta moviendo, para ver por donde corta. */
function seekTo(time: number): void {
  sourceEl.currentTime = time;
  seekEl.value = String(time);
}

/**
 * Los dos extremos. Se arrastran sobre la pista, y cada uno empuja al otro solo
 * hasta `TRIM_MIN`: el de entrada no puede pasar del de salida ni al reves.
 */
/** Cual de los dos extremos se esta arrastrando ahora mismo. */
let dragging: "start" | "end" | null = null;

/** Lleva el extremo que se arrastra al punto de la pista donde este el dedo. */
function dragTo(clientX: number): void {
  const duration = sourceEl.duration || 0;
  const rect = trimTrackEl.getBoundingClientRect();
  if (!dragging || duration <= 0 || rect.width === 0) return;
  // Mismo recorrido que los tiradores: de 6 a ancho-6.
  const travel = rect.width - HANDLE * 2;
  if (travel <= 0) return;
  const t = clamp(((clientX - rect.left - HANDLE) / travel) * duration, 0, duration);
  if (dragging === "start") state.trim.start = Math.min(t, state.trim.end - TRIM_MIN);
  else state.trim.end = Math.max(t, state.trim.start + TRIM_MIN);
  showTrim();
  seekTo(dragging === "start" ? state.trim.start : state.trim.end);
}

// El arrastre se sigue desde `window` y no con `setPointerCapture`: asi el
// extremo no se queda atras si el puntero se sale de la pista, y de paso se
// evita que capturar un puntero que ya no existe reviente el manejador.
window.addEventListener("pointermove", (e) => dragTo(e.clientX));
for (const type of ["pointerup", "pointercancel"] as const) {
  window.addEventListener(type, () => {
    dragging = null;
  });
}

for (const [handle, which] of [[trimInEl, "start"], [trimOutEl, "end"]] as const) {
  handle.addEventListener("pointerdown", (e) => {
    if (!state.hasVideo) return;
    pausePreview();
    e.preventDefault();
    dragging = which;
    dragTo(e.clientX);
  });

  // Con el teclado, un paso por pulsacion: es la unica forma de afinarlo al
  // fotograma sin pelearse con el raton.
  handle.addEventListener("keydown", (e) => {
    if (!state.hasVideo) return;
    const step = e.shiftKey ? 1 : 0.04;
    const dir = e.key === "ArrowLeft" ? -1 : e.key === "ArrowRight" ? 1 : 0;
    if (dir === 0) return;
    e.preventDefault();
    const duration = sourceEl.duration || 0;
    if (which === "start") {
      state.trim.start = clamp(state.trim.start + dir * step, 0, state.trim.end - TRIM_MIN);
    } else {
      state.trim.end = clamp(state.trim.end + dir * step, state.trim.start + TRIM_MIN, duration);
    }
    showTrim();
    seekTo(which === "start" ? state.trim.start : state.trim.end);
  });
}

// --- Encuadre ---------------------------------------------------------------

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/** Del espacio de pantalla al del lienzo: la previa va escalada. */
function canvasScale(): number {
  return previewEl.width / previewEl.getBoundingClientRect().width;
}

function clampOffset(): void {
  if (!state.frameSize) return;
  // El techo del hueco depende del rotulo y del cuerpo, nunca del encuadre, asi
  // que se le puede preguntar a la composicion antes de recortar nada.
  const { videoTopBase } = computeLayout(previewCtx, options());
  clampVideoOffset(state.frameSize, state.transform, videoTopBase);
}

function toCanvas(clientX: number, clientY: number): { x: number; y: number } {
  const rect = previewEl.getBoundingClientRect();
  const s = canvasScale();
  return { x: (clientX - rect.left) * s, y: (clientY - rect.top) * s };
}

type Target = "text" | "video" | "cta";

function inside(p: { x: number; y: number }, r: Rect): boolean {
  return p.x >= r.x && p.x < r.x + r.w && p.y >= r.y && p.y < r.y + r.h;
}

/**
 * Que hay bajo el puntero. Decide a que afecta cada gesto. Ni el hueco ni el
 * CTA estan en un sitio fijo, asi que hay que preguntarselo a la composicion.
 *
 * El CTA se mira **antes** que el hueco, porque cae justo encima: es una pieza
 * suelta puesta sobre el video, y lo de arriba se coge primero.
 */
function targetAt(clientX: number, clientY: number): Target | null {
  const p = toCanvas(clientX, clientY);
  const { videoArea, cta } = computeLayout(previewCtx, options());
  if (cta && inside(p, cta.box)) return "cta";
  if (p.y >= videoArea.y && p.y < videoArea.y + videoArea.h) {
    return state.hasVideo ? "video" : null;
  }
  return "text";
}

function setFontSize(size: number): void {
  sizeEl.value = String(clamp(size, FONT_SIZE_MIN, FONT_SIZE_MAX).toFixed(1));
  draw();
}

function setCtaSize(size: number): void {
  ctaSizeEl.value = String(clamp(size, CTA_FONT_SIZE_MIN, CTA_FONT_SIZE_MAX).toFixed(1));
  draw();
}

/**
 * Sube y baja el CTA. `dy` viene en pixeles de lienzo, y la altura se guarda en
 * tanto por uno, asi que el reclamo sigue al puntero exactamente. Topado a los
 * dos extremos: pasado el filo, la composicion ya no lo movia mas y arrastrar
 * de mas dejaba un margen muerto que habia que deshacer para volver.
 */
function moveCta(dy: number): void {
  state.ctaPos = clamp(state.ctaPos + dy / CANVAS_H, 0, 1);
}

/**
 * `anchor` es el punto del lienzo que tiene que quedarse quieto: el puntero, o
 * el punto medio de los dedos. Sin el —cuando el zoom viene de la barra, que no
 * apunta a nada— se ancla en el centro de lo que se ve, que es lo que uno esta
 * mirando.
 */
function setZoom(zoom: number, anchor?: { x: number; y: number }): void {
  const next = clamp(zoom, ZOOM_MIN, ZOOM_MAX);
  if (state.frameSize) {
    const { videoTopBase, videoArea } = computeLayout(previewCtx, options());
    const at = anchor ?? { x: CANVAS_W / 2, y: videoArea.y + videoArea.h / 2 };
    zoomVideoAt(state.frameSize, state.transform, next, videoTopBase, at);
  } else {
    state.transform.zoom = next;
  }
  zoomEl.value = String(state.transform.zoom);
  clampOffset();
  draw();
}

zoomEl.addEventListener("input", () => setZoom(Number(zoomEl.value)));
bottomEl.addEventListener("input", draw);

const pointers = new Map<number, { x: number; y: number }>();
let lastX = 0;
let lastY = 0;
let target: Target | null = null;
let pinch: { dist: number; zoom: number; size: number } | null = null;

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
    // cuerpo de la letra, y sobre el hueco hace zoom del video.
    target = targetAt(g.mx, g.my);
    if (!target) return;
    // El cuerpo de partida es el de la pieza que se este pellizcando.
    pinch = {
      dist: g.dist,
      zoom: state.transform.zoom,
      size: Number(target === "cta" ? ctaSizeEl.value : sizeEl.value),
    };
    lastX = g.mx;
    lastY = g.my;
    return;
  }

  target = targetAt(e.clientX, e.clientY);
  if (target !== "video" && target !== "cta") return;
  lastX = e.clientX;
  lastY = e.clientY;
  previewEl.setPointerCapture(e.pointerId);
});

previewEl.addEventListener("pointermove", (e) => {
  if (pointers.has(e.pointerId)) pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
  if (!target) return;

  const s = canvasScale();

  if (pinch && pointers.size >= 2) {
    const g = pinchGeometry();
    if (!g || pinch.dist === 0) return;
    const ratio = g.dist / pinch.dist;
    if (target === "text") {
      setFontSize(pinch.size * ratio);
    } else if (target === "cta") {
      // El punto medio arrastra y ademas dimensiona, igual que en el video: el
      // reclamo se coloca y se agranda de un solo pellizco.
      moveCta((g.my - lastY) * s);
      setCtaSize(pinch.size * ratio);
    } else {
      // El punto medio arrastra y ademas ancla el zoom, asi que se coloca y se
      // dimensiona de un solo gesto y sin que la imagen se escape del dedo.
      state.transform.offsetX += (g.mx - lastX) * s;
      state.transform.offsetY += (g.my - lastY) * s;
      setZoom(pinch.zoom * ratio, toCanvas(g.mx, g.my));
    }
    lastX = g.mx;
    lastY = g.my;
    return;
  }

  // El CTA solo sube y baja: a lo ancho va centrado, asi que del arrastre se
  // aprovecha la vertical y se tira la horizontal.
  if (target === "cta") {
    moveCta((e.clientY - lastY) * s);
    lastX = e.clientX;
    lastY = e.clientY;
    draw();
    return;
  }

  // Arrastrar el rotulo no hace nada: va siempre centrado en su banda.
  if (target === "video") {
    state.transform.offsetX += (e.clientX - lastX) * s;
    state.transform.offsetY += (e.clientY - lastY) * s;
    lastX = e.clientX;
    lastY = e.clientY;
    draw();
  }
});

/**
 * En `window` y no en el lienzo. Soltando el raton fuera de la previa —que pasa
 * constantemente al arrastrar hasta el borde— el lienzo no se entera, y ese
 * puntero se queda anotado **para siempre**: a partir de ahi `pointers` nunca
 * vuelve a estar vacio, cualquier pulsacion cuenta como segundo dedo y todo
 * gesto se toma por un pellizco. El sintoma es que el video deja de poder
 * moverse y encima el zoom se mueve solo, y no se arregla hasta recargar.
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
    if (hit === "text") setFontSize(Number(sizeEl.value) * factor);
    else if (hit === "cta") setCtaSize(Number(ctaSizeEl.value) * factor);
    else setZoom(state.transform.zoom * factor, toCanvas(e.clientX, e.clientY));
  },
  { passive: false },
);

// --- Dibujo -----------------------------------------------------------------

function draw(): void {
  // Centralizado aqui: asi ningun cambio puede dejar un encuadre invalido.
  clampOffset();
  const layout = render(previewCtx, options());
  sizeValueEl.textContent = Number(sizeEl.value).toFixed(1).replace(/\.0$/, "");
  zoomValueEl.textContent = String(Math.round(state.transform.zoom * 100));

  const n = layout.lines.length;
  const rotulo = n === 0
    ? "sin rótulo"
    : `${n} ${n === 1 ? "línea" : "líneas"} a ${layout.fontSize.toFixed(1)} px` +
      (layout.shrunk ? " (reducido para que quepa)" : "");
  const subido = layout.videoBottomAuto - layout.videoBottom;
  bottomValueEl.textContent = subido > 0 ? `subido ${subido} px` : "automático";

  ctaSizeValueEl.textContent = Number(ctaSizeEl.value).toFixed(1).replace(/\.0$/, "");

  const hueco = state.hasVideo
    ? ` · hueco ${layout.videoArea.h} px` +
      (layout.videoBottom >= layout.height
        ? ", sin barra negra"
        : `, barra de ${layout.height - layout.videoBottom} px`) +
      (layout.videoTop === VIDEO_Y ? "" : ` · degradado en ${layout.videoTop}`)
    : "";
  const cta = layout.cta
    ? ` · CTA en ${layout.cta.baseline} px a ${layout.cta.size.toFixed(1)} px` +
      (layout.cta.shrunk ? " (reducido para que quepa)" : "")
    : "";
  previewInfoEl.textContent = `${layout.width} × ${layout.height} px · ${rotulo}${hueco}${cta}`;
  drawMini();
  updateMini();
}

for (const el of [textEl, sizeEl, textColorEl, highlightEl, ctaEl, ctaSizeEl]) {
  el.addEventListener("input", draw);
}

// Abrir o plegar el apartado del CTA es ponerlo o quitarlo, asi que la previa
// tiene que enterarse.
ctaSectionEl.addEventListener("toggle", draw);

// --- Vista previa flotante (movil) ------------------------------------------

/** Una vez cerrada a mano, no vuelve a salir en toda la sesion. */
let miniDismissed = false;

/** Lo ultimo que se le dijo al DOM, para no repetirselo en cada fotograma. */
let miniShown = false;

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

/*
 * Reproduciendo, esto entra 60 veces por segundo desde `draw`. Tocar el DOM
 * para dejarlo como estaba invalida estilo de balde, asi que solo se escribe
 * cuando de verdad cambia.
 */
function updateMini(): void {
  // Solo tiene sentido cuando ya hay algo que mirar.
  const show = !miniDismissed && state.hasVideo && !previewIsNear();
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

// Tocar la miniatura lleva a la previa grande.
miniCanvasEl.addEventListener("click", () => {
  previewEl.scrollIntoView({ behavior: "smooth", block: "center" });
});

// --- Salida -----------------------------------------------------------------

/**
 * La plantilla con el rotulo, sobre transparente. Es lo que ffmpeg pega encima
 * del video, asi que la previa y la pieza final salen de este mismo dibujo.
 */
function plate(): Promise<Blob> {
  const canvas = document.createElement("canvas");
  renderPlate(context(canvas), options());
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error("No se pudo componer la plantilla."));
    }, "image/png");
  });
}

function setBusy(busy: boolean): void {
  state.busy = busy;
  generateEl.disabled = busy;
  generateEl.textContent = busy ? "MONTANDO…" : "GENERA";
  progressEl.hidden = !busy;
  if (!busy) progressBarEl.style.width = "0";
}

function generate(): void {
  if (state.busy) return;
  if (!state.file) {
    setStatus("Falta el vídeo.", "error");
    return;
  }

  // La revision arranca ya, no al final: montar el video tarda, y de nada
  // sirve enterarse de la errata cuando el rotulo lleva un minuto incrustado.
  outputEl.hidden = false;
  void review(textEl.value);

  void (async () => {
    setBusy(true);
    try {
      await ensureFont();
      const layout = computeLayout(previewCtx, options());
      if (!layout.video) throw new Error("Falta el vídeo.");

      const started = performance.now();
      const mp4 = await encode(
        {
          source: state.file!,
          plate: await plate(),
          rect: layout.video,
          flip: state.flip,
          trim: trimRange(),
        },
        {
          onStage: (message) => setStatus(message),
          onProgress: (ratio) => {
            progressBarEl.style.width = `${(ratio * 100).toFixed(1)}%`;
            setStatus(`Montando el vídeo… ${Math.round(ratio * 100)} %`);
          },
        },
      );
      const seconds = (performance.now() - started) / 1000;

      if (state.result) URL.revokeObjectURL(state.result);
      state.result = URL.createObjectURL(mp4);
      resultEl.src = state.result;
      outputEl.hidden = false;
      resultInfoEl.textContent =
        `${layout.width} × ${layout.height} px · ${(mp4.size / (1024 * 1024)).toFixed(1)} MB · ` +
        `montado en ${seconds.toFixed(0)} s`;
      setStatus("Listo.");
      outputEl.scrollIntoView({ behavior: "smooth", block: "start" });
    } catch (err) {
      console.error(err);
      setStatus(err instanceof Error ? err.message : "No se pudo montar el vídeo.", "error");
    } finally {
      setBusy(false);
    }
  })();
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
    // Que no se pueda revisar no debe estropear el montaje, que ya va en marcha.
    setReview("No se pudo revisar el texto.");
  }
}

/**
 * Aplica la propuesta al rotulo y vuelve a montar el video. Aqui eso cuesta
 * bastante mas que en las imagenes, pero el rotulo va incrustado: sin rehacerlo
 * el video que te llevas sigue teniendo la errata.
 */
fixEl.addEventListener("click", () => {
  if (state.busy) return;
  if (proposal === "" || proposal === textEl.value) return;
  textEl.value = proposal;
  draw();
  generate();
});

downloadEl.addEventListener("click", () => {
  if (!state.result) {
    setStatus("Todavía no hay nada que descargar.", "error");
    return;
  }
  const a = document.createElement("a");
  a.href = state.result;
  a.download = `${state.file?.name.replace(/\.[^.]+$/, "") || "videomeme"}-videomeme.mp4`;
  a.click();
});

// --- Arranque ---------------------------------------------------------------

textEl.value = "";
sizeEl.value = String(FONT_SIZE);
previewEl.width = CANVAS_W;
textColorEl.value = COLOR_TEXT;
highlightEl.value = COLOR_HIGHLIGHT;
// El apartado del CTA arranca plegado —es opcional—, pero con su texto y su
// cuerpo ya puestos: ponerlo es abrirlo y nada mas.
ctaEl.value = CTA_TEXT;
ctaSizeEl.value = String(CTA_FONT_SIZE);
// Sin video no hay nada que voltear, recorrer ni recortar.
showFlip();
showTrim();
showPlay();

void (async () => {
  const [overlay] = await Promise.all([loadImage(overlayUrl), ensureFont()]);
  state.overlay = overlay;
  draw();
})();
