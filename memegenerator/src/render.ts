import {
  BAND_PAD_Y,
  CANVAS_H,
  CANVAS_W,
  CAP_RATIO,
  LINE_RATIO,
  TEXT_MAX_W,
  type Font,
} from "./format.js";

/** Un trozo de texto con su color. Lo que va entre *asteriscos* se resalta. */
export interface Segment {
  text: string;
  highlight: boolean;
}

export interface PhotoTransform {
  /** 1 = encaje "cover" justo. Mas de 1 amplia la foto. */
  zoom: number;
  /** Desplazamiento en px de lienzo, respecto al encaje centrado. */
  offsetX: number;
  offsetY: number;
}

export interface RenderOptions {
  photo: CanvasImageSource | null;
  photoSize: { width: number; height: number } | null;
  transform: PhotoTransform;
  text: string;
  align: Align;
  font: Font;
  /** Tamaño de letra. Manda el: la banda se adapta a lo que ocupe. */
  fontSize: number;
  colorBand: string;
  colorText: string;
  colorHighlight: string;
}

/**
 * Alineacion del rotulo. En `left` no se pega al margen del lienzo: el bloque
 * se centra y las lineas se alinean entre si por la izquierda, tomando como
 * referencia la linea mas larga. Solo llega al margen cuando esa linea ocupa
 * todo el ancho de composicion.
 */
export type Align = "center" | "left";

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/**
 * Parte el texto en segmentos. Lo que va entre asteriscos se resalta, el mismo
 * convenio que en news-maker para no tener que aprender dos.
 */
export function parseSegments(text: string): Segment[] {
  const out: Segment[] = [];
  const re = /\*([^*]+)\*/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) out.push({ text: text.slice(last, m.index), highlight: false });
    out.push({ text: m[1] ?? "", highlight: true });
    last = m.index + m[0].length;
  }
  if (last < text.length) out.push({ text: text.slice(last), highlight: false });
  return out.filter((s) => s.text.length > 0);
}

/** Un token es una palabra o un espacio, con el color que le toca. */
interface Token {
  text: string;
  highlight: boolean;
  space: boolean;
}

function tokenize(segments: Segment[]): Token[] {
  const tokens: Token[] = [];
  for (const seg of segments) {
    for (const part of seg.text.split(/(\s+)/)) {
      if (part === "") continue;
      tokens.push({ text: part, highlight: seg.highlight, space: /^\s+$/.test(part) });
    }
  }
  return tokens;
}

type Line = Token[];

export function setFont(ctx: CanvasRenderingContext2D, font: Font, size: number): void {
  ctx.font = `${font.weight} ${size}px ${font.stack}`;
}

function layoutLines(
  ctx: CanvasRenderingContext2D,
  tokens: Token[],
  maxWidth: number,
): Line[] {
  const lines: Line[] = [];
  let line: Line = [];
  let width = 0;

  for (const token of tokens) {
    const w = ctx.measureText(token.text).width;
    // Un salto de linea explicito manda sobre el ajuste automatico. Dos
    // seguidos dejan una linea en blanco: es un parrafo que el usuario separo
    // a proposito, y la banda tiene que crecer para respetarlo.
    if (token.space && token.text.includes("\n")) {
      const breaks = (token.text.match(/\n/g) ?? []).length;
      lines.push(line);
      for (let i = 1; i < breaks; i += 1) lines.push([]);
      line = [];
      width = 0;
      continue;
    }
    if (!token.space && width + w > maxWidth && line.length > 0) {
      // Cerrar linea quitando el espacio final, que no pinta nada.
      while (line.length > 0 && line[line.length - 1]!.space) line.pop();
      lines.push(line);
      line = [token];
      width = w;
      continue;
    }
    if (token.space && line.length === 0) continue; // no abrir linea con espacio
    line.push(token);
    width += w;
  }
  while (line.length > 0 && line[line.length - 1]!.space) line.pop();
  if (line.length > 0) lines.push(line);
  // Una linea vacia al final no es un parrafo, es un salto suelto que el
  // usuario dejo escribiendo: no debe abultar la banda.
  while (lines.length > 0 && lines[lines.length - 1]!.length === 0) lines.pop();
  return lines;
}

function lineWidth(ctx: CanvasRenderingContext2D, line: Line): number {
  let w = 0;
  for (const t of line) w += ctx.measureText(t.text).width;
  return w;
}

export interface Layout {
  width: number;
  height: number;
  /** Alto de la banda. 0 cuando no hay texto: entonces sale la foto sola. */
  bandH: number;
  /** Tamaño de letra con el que se ha compuesto. */
  fontSize: number;
  lineHeight: number;
  lines: Line[];
  /** Hueco reservado a la foto, debajo de la banda. */
  photoArea: Rect;
  /** Donde se pinta la foto dentro del hueco. null si aun no hay foto. */
  photo: Rect | null;
}

/**
 * Calcula la caja de todo antes de pintar nada. Va aparte del dibujo porque la
 * interfaz necesita las mismas medidas para el arrastre y para el tamaño del
 * lienzo de la vista previa.
 */
export function computeLayout(
  ctx: CanvasRenderingContext2D,
  opts: RenderOptions,
): Layout {
  const fontSize = opts.fontSize;
  setFont(ctx, opts.font, fontSize);
  const lines = layoutLines(ctx, tokenize(parseSegments(opts.text)), TEXT_MAX_W);
  const lineHeight = fontSize * LINE_RATIO;
  // Manda el tamaño de letra: la banda se adapta a lo que ocupe el texto. El
  // unico tope es el propio lienzo, que no se mueve.
  const bandH =
    lines.length > 0
      ? Math.min(CANVAS_H, Math.round(BAND_PAD_Y * 2 + lines.length * lineHeight))
      : 0;

  // El lienzo no se mueve: lo que la banda ocupa se lo quita a la foto.
  const photoArea: Rect = { x: 0, y: bandH, w: CANVAS_W, h: Math.max(0, CANVAS_H - bandH) };

  let photo: Rect | null = null;
  if (opts.photoSize) {
    // El hueco es el que es, asi que hay que recortar: encaje cover.
    const scale = coverScale(opts.photoSize, photoArea, opts.transform.zoom);
    const w = opts.photoSize.width * scale;
    const h = opts.photoSize.height * scale;
    photo = {
      x: (photoArea.w - w) / 2 + opts.transform.offsetX,
      y: photoArea.y + (photoArea.h - h) / 2 + opts.transform.offsetY,
      w,
      h,
    };
  }

  return {
    width: CANVAS_W,
    height: CANVAS_H,
    bandH,
    fontSize,
    lineHeight,
    lines,
    photoArea,
    photo,
  };
}

function coverScale(
  size: { width: number; height: number },
  area: Rect,
  zoom: number,
): number {
  return Math.max(area.w / size.width, area.h / size.height) * zoom;
}

/**
 * Recorta el encuadre para que la foto siga cubriendo todo el hueco. Con el
 * encaje cover siempre sobra imagen por algun lado: eso es justo lo que se
 * puede desplazar, y ni un pixel mas.
 */
export function clampPhotoOffset(
  photoSize: { width: number; height: number },
  area: Rect,
  transform: PhotoTransform,
): void {
  const scale = coverScale(photoSize, area, transform.zoom);
  const maxX = Math.max(0, (photoSize.width * scale - area.w) / 2);
  const maxY = Math.max(0, (photoSize.height * scale - area.h) / 2);
  transform.offsetX = Math.min(maxX, Math.max(-maxX, transform.offsetX));
  transform.offsetY = Math.min(maxY, Math.max(-maxY, transform.offsetY));
}

export function render(ctx: CanvasRenderingContext2D, opts: RenderOptions): Layout {
  const layout = computeLayout(ctx, opts);
  const { canvas } = ctx;
  if (canvas.width !== layout.width || canvas.height !== layout.height) {
    canvas.width = layout.width;
    canvas.height = layout.height;
  }

  // El fondo va del color de la banda: asi los bordes que deje una foto que no
  // llene el hueco no salen negros, sino en el mismo blanco del rotulo.
  ctx.fillStyle = opts.colorBand;
  ctx.fillRect(0, 0, layout.width, layout.height);

  if (opts.photo && layout.photo) {
    ctx.save();
    ctx.beginPath();
    ctx.rect(layout.photoArea.x, layout.photoArea.y, layout.photoArea.w, layout.photoArea.h);
    ctx.clip();
    ctx.drawImage(opts.photo, layout.photo.x, layout.photo.y, layout.photo.w, layout.photo.h);
    ctx.restore();
  }

  drawBand(ctx, opts, layout);
  return layout;
}

function drawBand(
  ctx: CanvasRenderingContext2D,
  opts: RenderOptions,
  layout: Layout,
): void {
  if (layout.bandH === 0) return;

  ctx.fillStyle = opts.colorBand;
  ctx.fillRect(0, 0, layout.width, layout.bandH);

  setFont(ctx, opts.font, layout.fontSize);
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";

  const cap = layout.fontSize * CAP_RATIO;

  // Alineado a la izquierda, el bloque entero se centra y todas las lineas
  // arrancan donde arranca la mas larga.
  const widths = layout.lines.map((line) => lineWidth(ctx, line));
  const blockW = Math.max(0, ...widths);
  const blockX = (layout.width - blockW) / 2;

  layout.lines.forEach((line, i) => {
    if (line.length === 0) return;
    // Cada linea se centra dentro de su caja, y el bloque queda centrado en la
    // banda porque los margenes de arriba y abajo son iguales.
    const baseline = BAND_PAD_Y + i * layout.lineHeight + layout.lineHeight / 2 + cap / 2;
    let x = opts.align === "left" ? blockX : (layout.width - (widths[i] ?? 0)) / 2;
    for (const token of line) {
      ctx.fillStyle = token.highlight ? opts.colorHighlight : opts.colorText;
      ctx.fillText(token.text, x, baseline);
      x += ctx.measureText(token.text).width;
    }
  });
}
