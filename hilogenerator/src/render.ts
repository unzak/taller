import {
  ARROW,
  CANVAS_H,
  CANVAS_W,
  MEDIA_MIN_H,
  STYLES,
  type Kind,
  type Style,
} from "./format.js";

/** Un trozo de texto, con su color y su tamaño. */
export interface Segment {
  text: string;
  /** Entre *asteriscos*: va del color del resaltado. */
  highlight: boolean;
  /** Entre +mases+: va mas grande que el resto. */
  big: boolean;
}

export interface MediaTransform {
  /** 1 = encaje "cover" justo en la ventana. Mas de 1 amplia. */
  zoom: number;
  /** Desplazamiento en px de lienzo, respecto al encaje centrado. */
  offsetX: number;
  offsetY: number;
}

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface TextSpec {
  text: string;
  /** Cuerpo pedido. Es un tope: si el bloque no cabe, se compone mas pequeño. */
  size: number;
}

export interface RenderOptions {
  kind: Kind;
  /** La imagen, o el fotograma del video que se esta encuadrando. */
  media: CanvasImageSource | null;
  mediaSize: { width: number; height: number } | null;
  transform: MediaTransform;
  flip: boolean;
  /** El texto de abajo, que es el de siempre. Vacio es no ponerlo. */
  bottom: TextSpec;
  /** El de arriba, opcional. `null` es que no hay. */
  top: TextSpec | null;
  /** Del filo de abajo a la baseline de la ultima linea. */
  marginBottom: number;
  /** Del filo de arriba a la cabeza de la primera linea. */
  marginTop: number;
  marginSide: number;
  /** Negro macizo entre cada texto y su difuminado. */
  bandPad: number;
  /** Lo que crece lo +destacado+ respecto al resto. */
  bigScale: number;
  colorText: string;
  colorHighlight: string;
  /** En la previa, la ventana vacia se pinta con un aviso. En la pieza, no. */
  placeholder: boolean;
}

const MARKS = { "*": "highlight", "+": "big" } as const;

/**
 * Parte el texto en segmentos. Hay dos marcas y son independientes:
 * `*asi*` resalta —cambia el color— y `+asi+` destaca —agranda—. Se pueden
 * anidar en cualquier orden: `+*ES OFICIAL:*+` sale grande y de color.
 *
 * Una marca solo abre si mas adelante hay otra que la cierre. Sin eso, el «+»
 * de un «1+1» dejaria destacado todo lo que viene detras.
 */
export function parseSegments(text: string): Segment[] {
  const out: Segment[] = [];
  const on = { highlight: false, big: false };
  let run = "";
  const flush = () => {
    if (run.length > 0) out.push({ text: run, ...on });
    run = "";
  };
  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i]!;
    const mark = ch === "*" || ch === "+" ? MARKS[ch] : null;
    if (mark && (on[mark] || text.indexOf(ch, i + 1) !== -1)) {
      flush();
      on[mark] = !on[mark];
      continue;
    }
    run += ch;
  }
  flush();
  return out;
}

/** Una palabra o un espacio, con su color y lo que crece respecto al cuerpo. */
interface Token {
  text: string;
  highlight: boolean;
  space: boolean;
  scale: number;
  width: number;
  /**
   * El tracking que `letterSpacing` mete detras del ultimo caracter. Entre
   * palabras hace falta; al final de la linea sobra, y con el tracking negativo
   * de la portada descentraria el bloque.
   */
  tail: number;
}

export interface Line {
  tokens: Token[];
  /** La escala del token mas grande: es la que decide cuanto ocupa la linea. */
  scale: number;
  width: number;
}

function setFont(ctx: CanvasRenderingContext2D, style: Style, px: number): void {
  ctx.font = `${style.font.weight} ${px}px ${style.font.stack}`;
  ctx.letterSpacing = `${style.trackingEm * px}px`;
}

/**
 * Altura de las mayusculas y caida de las descendentes, en emes. Se le
 * preguntan a la fuente en vez de apuntarlas a mano: asi cambiar la letra de
 * la portada es cambiar una linea de `format.ts` y el bloque sigue cuadrando.
 */
const ratios = new Map<string, { cap: number; desc: number }>();

function ratio(ctx: CanvasRenderingContext2D, style: Style): { cap: number; desc: number } {
  let r = ratios.get(style.font.family);
  if (!r) {
    ctx.font = `${style.font.weight} 200px ${style.font.stack}`;
    ctx.letterSpacing = "0px";
    r = {
      cap: ctx.measureText("H").actualBoundingBoxAscent / 200,
      desc: ctx.measureText("gjpqy").actualBoundingBoxDescent / 200,
    };
    ratios.set(style.font.family, r);
  }
  return r;
}

interface Composed {
  lines: Line[];
  /** Baselines contadas desde la cabeza de la primera linea. */
  baselines: number[];
  /** De la cabeza de la primera linea a la baseline de la ultima. */
  height: number;
  widest: number;
}

function tokenize(
  ctx: CanvasRenderingContext2D,
  style: Style,
  text: string,
  size: number,
  bigScale: number,
): Token[] {
  const tokens: Token[] = [];
  for (const seg of parseSegments(text)) {
    const scale = seg.big ? bigScale : 1;
    setFont(ctx, style, size * scale);
    const shown = style.upper ? seg.text.toUpperCase() : seg.text;
    for (const part of shown.split(/(\s+)/)) {
      if (part === "") continue;
      tokens.push({
        text: part,
        highlight: seg.highlight,
        space: /^\s+$/.test(part),
        scale,
        width: ctx.measureText(part).width,
        tail: style.trackingEm * size * scale,
      });
    }
  }
  return tokens;
}

function closeLine(tokens: Token[]): Line {
  while (tokens.length > 0 && tokens[tokens.length - 1]!.space) tokens.pop();
  let width = 0;
  let scale = 0;
  for (const t of tokens) {
    width += t.width;
    if (!t.space) scale = Math.max(scale, t.scale);
  }
  const last = tokens[tokens.length - 1];
  return { tokens, scale: scale || 1, width: width - (last?.tail ?? 0) };
}

function compose(
  ctx: CanvasRenderingContext2D,
  style: Style,
  text: string,
  size: number,
  bigScale: number,
  maxWidth: number,
): Composed {
  const lines: Line[] = [];
  let line: Token[] = [];
  let width = 0;

  for (const token of tokenize(ctx, style, text, size, bigScale)) {
    // Un salto de linea explicito manda sobre el ajuste automatico, y dos
    // seguidos dejan una linea en blanco: un parrafo separado a proposito.
    if (token.space && token.text.includes("\n")) {
      const breaks = (token.text.match(/\n/g) ?? []).length;
      lines.push(closeLine(line));
      for (let i = 1; i < breaks; i += 1) lines.push(closeLine([]));
      line = [];
      width = 0;
      continue;
    }
    if (!token.space && width + token.width > maxWidth && line.length > 0) {
      lines.push(closeLine(line));
      line = [token];
      width = token.width;
      continue;
    }
    if (token.space && line.length === 0) continue; // no abrir linea con espacio
    line.push(token);
    width += token.width;
  }
  const lastLine = closeLine(line);
  if (lastLine.tokens.length > 0) lines.push(lastLine);
  // Las lineas vacias de los extremos son saltos sueltos, no parrafos.
  while (lines.length > 0 && lines[lines.length - 1]!.tokens.length === 0) lines.pop();
  while (lines.length > 0 && lines[0]!.tokens.length === 0) lines.shift();

  const { cap } = ratio(ctx, style);
  const gap = style.gapEm * size;
  const baselines: number[] = [];
  let y = 0;
  lines.forEach((l, i) => {
    y += (i === 0 ? 0 : gap) + cap * size * l.scale;
    baselines.push(y);
  });

  return { lines, baselines, height: y, widest: Math.max(0, ...lines.map((l) => l.width)) };
}

export interface Block {
  lines: Line[];
  /** Baselines ya en coordenadas de lienzo. */
  baselines: number[];
  /** Cuerpo con el que se ha compuesto de verdad, ya reducido si hizo falta. */
  size: number;
  shrunk: boolean;
  /** Cabeza de las mayusculas de la primera linea. */
  top: number;
  /** Baseline de la ultima. */
  bottom: number;
}

interface Fitted {
  composed: Composed;
  size: number;
}

/**
 * Componer es medir palabra a palabra, y la previa de un video lo pide varias
 * veces por fotograma con el mismo texto. Se guarda lo ya compuesto; hay que
 * tirarlo cuando terminan de cargar las fuentes, que cambian todas las medidas.
 */
const fitted = new Map<string, Fitted>();

export function resetMetrics(): void {
  ratios.clear();
  fitted.clear();
}

/**
 * El mayor cuerpo, hasta el pedido, con el que el bloque cabe a lo ancho y a
 * lo alto. Se busca y no se reduce por proporcion porque al encoger cambian los
 * saltos de linea, y la proporcion se pasa de frenada.
 */
function fit(
  ctx: CanvasRenderingContext2D,
  style: Style,
  spec: TextSpec,
  bigScale: number,
  maxWidth: number,
  maxHeight: number,
): Fitted {
  const key = [style.font.family, spec.size, bigScale, maxWidth, maxHeight, spec.text].join("|");
  const cached = fitted.get(key);
  if (cached) return cached;

  const attempt = (size: number) => compose(ctx, style, spec.text, size, bigScale, maxWidth);
  const fits = (c: Composed) => c.height <= maxHeight && c.widest <= maxWidth + 1;

  let size = spec.size;
  let composed = attempt(size);
  if (!fits(composed)) {
    // El minimo se acepta aunque no quepa: por debajo ya no se leeria.
    let lo = Math.min(style.sizeMin, size);
    let hi = size;
    size = lo;
    composed = attempt(lo);
    for (let i = 0; i < 14; i += 1) {
      const mid = (lo + hi) / 2;
      const c = attempt(mid);
      if (fits(c)) {
        lo = mid;
        size = mid;
        composed = c;
      } else {
        hi = mid;
      }
    }
  }

  if (fitted.size > 200) fitted.clear();
  const out = { composed, size };
  fitted.set(key, out);
  return out;
}

export interface Layout {
  width: number;
  height: number;
  top: Block | null;
  bottom: Block | null;
  /** Donde acaba el negro macizo de arriba. 0 si no hay texto superior. */
  bandTop: number;
  /** Donde empieza el negro macizo de abajo. El alto del lienzo si no hay texto. */
  bandBottom: number;
  /** La ventana por la que se ve la imagen, entre las dos bandas. */
  area: Rect;
  /** Donde se pinta la imagen o el video. null si no hay. */
  media: Rect | null;
}

function mediaScale(size: { width: number; height: number }, zoom: number, area: Rect): number {
  return Math.max(area.w / size.width, area.h / size.height) * zoom;
}

/**
 * Calcula la caja de todo antes de pintar. Va aparte del dibujo porque la
 * interfaz necesita las mismas medidas para los gestos, y porque a ffmpeg hay
 * que darle el rectangulo del video exactamente igual que en la previa.
 */
export function computeLayout(ctx: CanvasRenderingContext2D, opts: RenderOptions): Layout {
  const style = STYLES[opts.kind];
  const { desc } = ratio(ctx, style);
  const maxWidth = CANVAS_W - opts.marginSide * 2;

  const hasBottom = opts.bottom.text.trim().length > 0;
  const hasTop = opts.top !== null && opts.top.text.trim().length > 0;

  // Lo que le queda a cada bloque: el lienzo menos la ventana minima y menos
  // lo que ya se llevan los margenes. Con los dos textos, a medias.
  const spare =
    CANVAS_H -
    MEDIA_MIN_H -
    (hasBottom ? opts.marginBottom + opts.bandPad : 0) -
    (hasTop ? opts.marginTop + opts.bandPad : 0);
  const maxHeight = Math.max(60, spare / (hasBottom && hasTop ? 2 : 1));

  let top: Block | null = null;
  let bandTop = 0;
  if (hasTop && opts.top) {
    const f = fit(ctx, style, opts.top, opts.bigScale, maxWidth, maxHeight);
    if (f.composed.lines.length > 0) {
      const y = opts.marginTop;
      top = {
        lines: f.composed.lines,
        baselines: f.composed.baselines.map((b) => y + b),
        size: f.size,
        shrunk: f.size < opts.top.size - 0.01,
        top: y,
        bottom: y + f.composed.height,
      };
      // Las descendentes cuentan solo donde las hay: la portada va en caja alta.
      const tail = style.upper ? 0 : desc * f.size;
      bandTop = Math.round(Math.min(CANVAS_H - MEDIA_MIN_H, top.bottom + tail + opts.bandPad));
    }
  }

  let bottom: Block | null = null;
  let bandBottom = CANVAS_H;
  if (hasBottom) {
    const f = fit(ctx, style, opts.bottom, opts.bigScale, maxWidth, maxHeight);
    if (f.composed.lines.length > 0) {
      const y = CANVAS_H - opts.marginBottom - f.composed.height;
      bottom = {
        lines: f.composed.lines,
        baselines: f.composed.baselines.map((b) => y + b),
        size: f.size,
        shrunk: f.size < opts.bottom.size - 0.01,
        top: y,
        bottom: y + f.composed.height,
      };
      bandBottom = Math.round(Math.max(bandTop + MEDIA_MIN_H, y - opts.bandPad));
    }
  }

  const area: Rect = { x: 0, y: bandTop, w: CANVAS_W, h: bandBottom - bandTop };

  // El rectangulo se redondea aqui, y no al dibujar, porque este mismo va a
  // parar a ffmpeg: si la previa y la pieza redondean distinto, no cuadran.
  let media: Rect | null = null;
  if (opts.mediaSize) {
    const scale = mediaScale(opts.mediaSize, opts.transform.zoom, area);
    const w = Math.round(opts.mediaSize.width * scale);
    const h = Math.round(opts.mediaSize.height * scale);
    media = {
      x: Math.round((CANVAS_W - w) / 2 + opts.transform.offsetX),
      y: Math.round(area.y + (area.h - h) / 2 + opts.transform.offsetY),
      w,
      h,
    };
  }

  return { width: CANVAS_W, height: CANVAS_H, top, bottom, bandTop, bandBottom, area, media };
}

/**
 * Recorta el encuadre para que la imagen siga tapando toda la ventana: solo se
 * puede mover lo que sobra del encaje, y ni un pixel mas. Sin esto, arrastrando
 * lo suficiente se destapa un borde.
 */
export function clampMediaOffset(
  size: { width: number; height: number },
  transform: MediaTransform,
  area: Rect,
): void {
  const scale = mediaScale(size, transform.zoom, area);
  const maxX = Math.max(0, (size.width * scale - area.w) / 2);
  const maxY = Math.max(0, (size.height * scale - area.h) / 2);
  transform.offsetX = Math.min(maxX, Math.max(-maxX, transform.offsetX));
  transform.offsetY = Math.min(maxY, Math.max(-maxY, transform.offsetY));
}

/**
 * Cambia el zoom dejando quieto el punto de la imagen que hay bajo `anchor`: el
 * puntero, o el punto medio de los dedos. Asi la imagen crece justo por donde
 * se apunta y no hay que recolocarla despues de cada ampliacion.
 */
export function zoomMediaAt(
  size: { width: number; height: number },
  transform: MediaTransform,
  zoom: number,
  area: Rect,
  anchor: { x: number; y: number },
): void {
  const before = mediaScale(size, transform.zoom, area);
  const after = mediaScale(size, zoom, area);
  transform.zoom = zoom;
  if (before <= 0 || after === before) return;

  const cx = area.x + area.w / 2;
  const cy = area.y + area.h / 2;
  // El punto del original que cae bajo el ancla, y el desplazamiento que lo
  // devuelve al mismo sitio ya con la escala nueva.
  const sx = (anchor.x - (cx - (size.width * before) / 2 + transform.offsetX)) / before;
  const sy = (anchor.y - (cy - (size.height * before) / 2 + transform.offsetY)) / before;
  transform.offsetX = anchor.x - sx * after - (cx - (size.width * after) / 2);
  transform.offsetY = anchor.y - sy * after - (cy - (size.height * after) / 2);
}

function prepare(ctx: CanvasRenderingContext2D, layout: Layout): void {
  const { canvas } = ctx;
  if (canvas.width !== layout.width || canvas.height !== layout.height) {
    canvas.width = layout.width;
    canvas.height = layout.height;
  }
  ctx.clearRect(0, 0, layout.width, layout.height);
}

/**
 * La pieza entera: imagen, bandas y texto. Con un video es la previa, y es
 * exactamente lo que va a salir, porque la pieza final se monta con estas
 * mismas bandas y este mismo texto sobre el video en movimiento.
 */
export function render(ctx: CanvasRenderingContext2D, opts: RenderOptions): Layout {
  const layout = computeLayout(ctx, opts);
  prepare(ctx, layout);

  ctx.fillStyle = "#000000";
  ctx.fillRect(0, 0, layout.width, layout.height);

  if (opts.media && layout.media) {
    const { x, y, w, h } = layout.media;
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    if (opts.flip) {
      // Se espeja dentro de su rectangulo, no respecto al lienzo: el encuadre
      // se queda donde estaba. En ffmpeg es un `hflip` despues de escalar.
      ctx.save();
      ctx.translate(x + w, y);
      ctx.scale(-1, 1);
      ctx.drawImage(opts.media, 0, 0, w, h);
      ctx.restore();
    } else {
      ctx.drawImage(opts.media, x, y, w, h);
    }
  } else if (opts.placeholder) {
    const { area } = layout;
    ctx.fillStyle = "#23252d";
    ctx.fillRect(area.x, area.y, area.w, area.h);
    ctx.font = "600 40px Inter, system-ui, sans-serif";
    ctx.letterSpacing = "0px";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "#7d8190";
    const cy = area.y + area.h / 2;
    ctx.fillText("Haz clic para añadir una imagen o un vídeo", area.w / 2, cy - 30);
    ctx.font = "500 30px Inter, system-ui, sans-serif";
    ctx.fillText("o suéltalo aquí, o pégalo con Ctrl+V", area.w / 2, cy + 30);
    ctx.textAlign = "left";
    ctx.textBaseline = "alphabetic";
  }

  drawPlate(ctx, opts, layout);
  return layout;
}

/**
 * La capa que se le pasa a ffmpeg: bandas y texto sobre transparente, sin
 * fotograma. Lo que tape la banda maciza queda tapado tambien en el video.
 */
export function renderPlate(ctx: CanvasRenderingContext2D, opts: RenderOptions): Layout {
  const layout = computeLayout(ctx, opts);
  prepare(ctx, layout);
  drawPlate(ctx, opts, layout);
  return layout;
}

/**
 * Un difuminado a negro de `from` (transparente) a `to` (opaco). Con curva
 * suave y no lineal: la lineal deja ver donde empieza y donde acaba.
 */
function fade(ctx: CanvasRenderingContext2D, from: number, to: number): void {
  const g = ctx.createLinearGradient(0, from, 0, to);
  const steps = 10;
  for (let i = 0; i <= steps; i += 1) {
    const t = i / steps;
    g.addColorStop(t, `rgba(0, 0, 0, ${(t * t * (3 - 2 * t)).toFixed(4)})`);
  }
  ctx.fillStyle = g;
  ctx.fillRect(0, Math.min(from, to), CANVAS_W, Math.abs(to - from));
}

/**
 * Las bandas solo existen donde hay texto: la de abajo con el texto de abajo y
 * la de arriba con el de arriba. Sin texto no hay ni negro ni difuminado, y la
 * imagen llega hasta el filo.
 */
function drawPlate(ctx: CanvasRenderingContext2D, opts: RenderOptions, layout: Layout): void {
  const style = STYLES[opts.kind];

  if (layout.top) {
    ctx.fillStyle = "#000000";
    ctx.fillRect(0, 0, layout.width, layout.bandTop);
    fade(ctx, layout.bandTop + style.fade, layout.bandTop);
  }
  if (layout.bottom) {
    fade(ctx, layout.bandBottom - style.fade, layout.bandBottom);
    ctx.fillStyle = "#000000";
    ctx.fillRect(0, layout.bandBottom, layout.width, layout.height - layout.bandBottom);
  }

  for (const block of [layout.top, layout.bottom]) {
    if (block) drawBlock(ctx, opts, style, block);
  }
  if (style.arrow) drawArrow(ctx, layout);
}

/**
 * La flecha de la portada: cuelga de la ultima baseline, asi que sube y baja
 * con el texto al mover el margen. Sin texto se queda en su sitio de siempre.
 */
function drawArrow(ctx: CanvasRenderingContext2D, layout: Layout): void {
  const limit = layout.height - ARROW.edge;
  const cy = Math.round(Math.min(limit, (layout.bottom?.bottom ?? limit - ARROW.drop) + ARROW.drop));
  const x0 = (layout.width - ARROW.width) / 2;
  const x1 = x0 + ARROW.width;
  ctx.fillStyle = ARROW.color;
  // El asta se mete un par de pixeles bajo la punta para que no quede junta.
  ctx.fillRect(x0, cy - ARROW.shaft / 2, ARROW.width - ARROW.headW + 2, ARROW.shaft);
  ctx.beginPath();
  ctx.moveTo(x1 - ARROW.headW, cy - ARROW.headH / 2);
  ctx.lineTo(x1, cy);
  ctx.lineTo(x1 - ARROW.headW, cy + ARROW.headH / 2);
  ctx.closePath();
  ctx.fill();
}

function drawBlock(
  ctx: CanvasRenderingContext2D,
  opts: RenderOptions,
  style: Style,
  block: Block,
): void {
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";

  block.lines.forEach((line, i) => {
    const baseline = block.baselines[i] ?? 0;
    let x = style.align === "center" ? (CANVAS_W - line.width) / 2 : opts.marginSide;
    for (const token of line.tokens) {
      if (!token.space) {
        setFont(ctx, style, block.size * token.scale);
        ctx.fillStyle = token.highlight ? opts.colorHighlight : opts.colorText;
        ctx.fillText(token.text, x, baseline);
      }
      x += token.width;
    }
  });
}
