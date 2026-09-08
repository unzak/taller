import {
  CANVAS_H,
  CANVAS_W,
  CAP_RATIO,
  COLOR_CTA,
  CTA_GRAB,
  CTA_MARGIN,
  FAUX_BOLD_ADVANCE_EM,
  FAUX_BOLD_EM,
  FONT_SIZE_MIN,
  LINE_RATIO,
  TEXT_MAX_W,
  TEXT_TOP,
  ART_OFFSET,
  FADE_TOP_DRAW_H,
  LOGO_SCALE,
  SRC_FADE_BOTTOM_H,
  SRC_FADE_BOTTOM_Y,
  SRC_FADE_TOP_H,
  SRC_FADE_TOP_Y,
  SRC_LOGO_CX,
  SRC_LOGO_CY,
  SRC_LOGO_H,
  SRC_LOGO_W,
  SRC_RULES_H,
  SRC_RULES_LEFT_W,
  SRC_RULES_RIGHT_X,
  SRC_RULES_Y,
  TEXT_GAP_BOTTOM,
  TEXT_MAX_BOTTOM,
  TRACKING_EM,
  VIDEO_MIN_H,
  VIDEO_Y,
  type Font,
} from "./format.js";

/** Un trozo de texto con su color. Lo que va entre *asteriscos* se resalta. */
export interface Segment {
  text: string;
  highlight: boolean;
}

export interface VideoTransform {
  /** 1 = encaje "cover" justo en el hueco. Mas de 1 amplia el video. */
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

export interface RenderOptions {
  /** El fotograma que se esta encuadrando. En la pieza final va el video. */
  frame: CanvasImageSource | null;
  frameSize: { width: number; height: number } | null;
  transform: VideoTransform;
  /** Voltea el video en horizontal. No mueve el encuadre: solo lo espeja. */
  flip: boolean;
  /** La capa `PLANTILLA` del PSD, con su hueco y sus degradados. */
  overlay: CanvasImageSource | null;
  text: string;
  font: Font;
  /**
   * Cuerpo pedido. Es un tope, no una orden: si el rotulo no cabe entre el
   * logo y el hueco del video, se compone mas pequeño.
   */
  fontSize: number;
  /**
   * Cuanto se sube a mano el suelo del hueco, de 0 a 1. En 0 es automatico: la
   * barra negra es justo lo que sobra por debajo del video, asi que crece y
   * mengua con el. Subiendolo, la barra se agranda desde ahi, y como los dos
   * extremos salen del encuadre, lo que se elija se readapta solo al cambiar
   * el tamaño del video. En 1 el hueco queda en su minimo.
   */
  bottomMargin: number;
  /**
   * El reclamo, en una linea sobre el video. Vacio es no ponerlo, que es lo
   * normal: esto es opcional y va aparte del rotulo. Sale **tal cual se
   * escriba**: ni mayusculas ni *asteriscos*, porque el CTA de la plantilla
   * lleva los suyos a la vista y son parte del dibujo.
   */
  ctaText: string;
  /** Cuerpo pedido. Como el rotulo, es un tope: se reduce si no cabe a lo ancho. */
  ctaSize: number;
  /**
   * Altura del centro de sus mayusculas, de 0 a 1 del lienzo. Es lo unico que
   * se mueve: a lo ancho va centrado y punto. No hay barra que lo gobierne, lo
   * arrastra el raton sobre la previa.
   */
  ctaPos: number;
  colorText: string;
  colorHighlight: string;
}

/**
 * Donde acaba la tinta del rotulo. Como el bloque va anclado por arriba, esto
 * depende solo de cuanto ocupe, y es lo que decide donde se pone el techo del
 * hueco.
 */
function blockBottomFor(lineCount: number, size: number): number {
  return TEXT_TOP + blockHeight(lineCount, size);
}

/**
 * Parte el texto en segmentos. Lo que va entre asteriscos se resalta, el mismo
 * convenio que en news-maker y memegenerator, para no tener que aprender tres.
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

/**
 * La capa del PSD lleva `FontCaps: 2`, o sea versalitas completas: todo va en
 * mayusculas pase lo que pase, igual que en la plantilla original.
 */
function tokenize(segments: Segment[]): Token[] {
  const tokens: Token[] = [];
  for (const seg of segments) {
    for (const part of seg.text.toUpperCase().split(/(\s+)/)) {
      if (part === "") continue;
      tokens.push({ text: part, highlight: seg.highlight, space: /^\s+$/.test(part) });
    }
  }
  return tokens;
}

type Line = Token[];

/**
 * Lo que se mete entre caracter y caracter: el tracking del PSD mas el avance
 * que añade la negrita sintetica. Los dos van en emes, asi que escalan con el
 * cuerpo, y se aplican juntos con `letterSpacing` para no perder el kerning
 * por el camino.
 */
function spacing(size: number): number {
  return (TRACKING_EM + FAUX_BOLD_ADVANCE_EM) * size;
}

export function setFont(ctx: CanvasRenderingContext2D, font: Font, size: number): void {
  ctx.font = `${font.weight} ${size}px ${font.stack}`;
  ctx.letterSpacing = `${spacing(size)}px`;
}

/**
 * Ancho de tinta de un trozo. `letterSpacing` mete el espacio **detras de cada
 * caracter**, tambien del ultimo, asi que `measureText` devuelve una cola de
 * mas que hay que descontar; con el tracking negativo del PSD la diferencia
 * juega en contra y descentraria el rotulo medio pixel.
 */
function textWidth(ctx: CanvasRenderingContext2D, text: string, size: number): number {
  if (text.length === 0) return 0;
  return ctx.measureText(text).width - spacing(size);
}

function layoutLines(
  ctx: CanvasRenderingContext2D,
  tokens: Token[],
  size: number,
  maxWidth: number,
): Line[] {
  const lines: Line[] = [];
  let line: Line = [];
  let width = 0;

  for (const token of tokens) {
    const w = textWidth(ctx, token.text, size);
    // Un salto de linea explicito manda sobre el ajuste automatico. Dos
    // seguidos dejan una linea en blanco, que es un parrafo separado a
    // proposito y el bloque tiene que crecer para respetarlo.
    if (token.space && token.text.includes("\n")) {
      const breaks = (token.text.match(/\n/g) ?? []).length;
      lines.push(line);
      for (let i = 1; i < breaks; i += 1) lines.push([]);
      line = [];
      width = 0;
      continue;
    }
    if (!token.space && width + w > maxWidth && line.length > 0) {
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
  // Una linea vacia al final es un salto suelto que quedo escribiendo, no un
  // parrafo: no debe abultar el bloque.
  while (lines.length > 0 && lines[lines.length - 1]!.length === 0) lines.pop();
  return lines;
}

function lineWidth(ctx: CanvasRenderingContext2D, line: Line, size: number): number {
  let w = 0;
  for (const t of line) w += textWidth(ctx, t.text, size);
  return w;
}

/**
 * Alto de tinta del bloque: de la cabeza de las mayusculas de la primera linea
 * a la baseline de la ultima. Es lo que se centra en `TEXT_CENTER_Y`, y por eso
 * no entran ni ascendentes ni descendentes: el rotulo va todo en mayusculas.
 */
function blockHeight(lineCount: number, size: number): number {
  if (lineCount === 0) return 0;
  return (lineCount - 1) * size * LINE_RATIO + size * CAP_RATIO;
}

/**
 * Compone el rotulo a un cuerpo dado y dice ademas si cabe: entre el logo y el
 * hueco del video por un lado, y dentro de la caja de composicion por otro. Lo
 * segundo solo puede fallar con una palabra suelta mas larga que la caja, que
 * no hay forma de partir por espacios.
 */
function compose(
  ctx: CanvasRenderingContext2D,
  opts: RenderOptions,
  size: number,
): { lines: Line[]; fits: boolean } {
  setFont(ctx, opts.font, size);
  const lines = layoutLines(ctx, tokenize(parseSegments(opts.text)), size, TEXT_MAX_W);
  if (lines.length === 0) return { lines, fits: true };
  const widest = Math.max(0, ...lines.map((l) => lineWidth(ctx, l, size)));
  const bottom = blockBottomFor(lines.length, size);
  return { lines, fits: bottom <= TEXT_MAX_BOTTOM && widest <= TEXT_MAX_W };
}

export interface Layout {
  width: number;
  height: number;
  /** Cuerpo con el que se ha compuesto de verdad, ya reducido si hizo falta. */
  fontSize: number;
  /** true cuando el rotulo no cabia al cuerpo pedido. */
  shrunk: boolean;
  lineHeight: number;
  lines: Line[];
  /** Cabeza de las mayusculas de la primera linea. */
  blockTop: number;
  /**
   * El hueco por el que se ve el video: del techo fijo al borde de abajo, que
   * es el que se adapta. Con esto se sabe donde caen los gestos.
   */
  videoArea: Rect;
  /**
   * El techo que pone el rotulo: donde se abriria el hueco con el video sin
   * mover. Es el tope del que el encuadre no puede subir.
   */
  videoTopBase: number;
  /**
   * Donde se pega el degradado de arriba. El de arriba mientras el video no
   * baje de ahi, y el filo del video cuando si: asi bajarlo no deja un corte,
   * solo agranda el marco negro.
   */
  videoTop: number;
  /** Donde se pinta el video. null si aun no hay video. */
  video: Rect | null;
  /**
   * Donde se pega el degradado de abajo y empieza la barra negra: el filo
   * inferior del video, o mas arriba si se ha subido a mano.
   */
  videoBottom: number;
  /** El filo inferior del video, que es donde llega la barra en automatico. */
  videoBottomAuto: number;
  /** Lo mas arriba que puede ponerse la barra sin cerrar el hueco. */
  videoBottomMin: number;
  /** El reclamo ya colocado, o null si no hay ninguno que poner. */
  cta: CtaLayout | null;
}

export interface CtaLayout {
  text: string;
  /** Cuerpo con el que se compone de verdad, ya reducido si no cabia. */
  size: number;
  /** true cuando no cabia al cuerpo pedido. */
  shrunk: boolean;
  /** Baseline de la linea, ya topada para que la tinta no se salga del lienzo. */
  baseline: number;
  /**
   * Por donde se coge: su tinta mas el aire de `CTA_GRAB`. Sale de aqui y no de
   * la interfaz para que lo que se agarra sea exactamente lo que se ve, este
   * donde este y mida lo que mida.
   */
  box: Rect;
}

/**
 * La escala del video. La base es el encaje a lo ancho, que es lo que manda: el
 * hueco ocupa siempre los 1080 px del lienzo. El suelo de `VIDEO_MIN_H` solo
 * entra con material muy apaisado, para que quede ventana.
 */
function videoScale(size: { width: number; height: number }, zoom: number): number {
  return Math.max(CANVAS_W / size.width, VIDEO_MIN_H / size.height) * zoom;
}

/**
 * El techo del hueco: donde acaba el rotulo mas el aire del PSD. Sube y baja
 * con el, asi que una sola linea abre la ventana mucho antes que tres y no deja
 * la cabecera medio vacia. Con dos lineas cae justo en `VIDEO_Y`, que es donde
 * lo dejo el PSD.
 *
 * Depende solo del texto y del cuerpo, nunca del encuadre, asi que se puede
 * calcular antes de tocar el video.
 */
function videoTopFor(lineCount: number, size: number): number {
  // Sin rotulo no hay nada que seguir: se queda en el sitio de siempre, que es
  // el que no sorprende.
  if (lineCount === 0) return VIDEO_Y;
  return Math.round(blockBottomFor(lineCount, size) + TEXT_GAP_BOTTOM);
}

/**
 * Coloca el video. El borde de arriba se puede subir pero nunca bajar del techo
 * del hueco: por encima del techo la plantilla es negro opaco y tapa el corte,
 * y bajandolo se veria el filo cruzando el ancho.
 */
function videoRect(
  size: { width: number; height: number },
  transform: VideoTransform,
  top: number,
): Rect {
  const scale = videoScale(size, transform.zoom);
  const w = Math.round(size.width * scale);
  const h = Math.round(size.height * scale);
  return {
    x: Math.round((CANVAS_W - w) / 2 + transform.offsetX),
    y: Math.round(top + transform.offsetY),
    w,
    h,
  };
}

/**
 * Deja el contexto listo para el CTA. Va aparte de `setFont` a proposito: el
 * reclamo no es rotulo, asi que no lleva ni el tracking del PSD ni el avance de
 * la negrita sintetica. Y hay que **reponer el `letterSpacing` a cero**, que es
 * propiedad del contexto y viene puesto de componer el rotulo.
 */
function setCtaFont(ctx: CanvasRenderingContext2D, font: Font, size: number): void {
  ctx.font = `${font.weight} ${size}px ${font.stack}`;
  ctx.letterSpacing = "0px";
}

/**
 * Coloca el reclamo. Es una linea suelta, asi que no hay nada que partir: si no
 * cabe a lo ancho de la caja de composicion se encoge en proporcion, y ahi la
 * proporcion si vale, porque sin saltos de linea el ancho es lineal con el
 * cuerpo.
 *
 * La baseline sale del centro de las mayusculas que se haya pedido, topada para
 * que ni la cabeza ni las descendentes se salgan del lienzo. Por eso subir el
 * cuerpo al final del recorrido aparta el reclamo del filo en vez de cortarlo.
 */
function composeCta(
  ctx: CanvasRenderingContext2D,
  opts: RenderOptions,
): CtaLayout | null {
  const text = opts.ctaText.trim();
  if (text.length === 0) return null;

  setCtaFont(ctx, opts.font, opts.ctaSize);
  const width = ctx.measureText(text).width;
  const size = width > TEXT_MAX_W ? (opts.ctaSize * TEXT_MAX_W) / width : opts.ctaSize;

  const cap = size * CAP_RATIO;
  // Las descendentes de la SF Pro Display bajan 0,21 emes de la baseline. El
  // reclamo va en minusculas, asi que la "j" de un CTA cualquiera cuenta.
  const descender = size * 0.21;
  const baseline = Math.round(
    Math.min(
      CANVAS_H - CTA_MARGIN - descender,
      Math.max(CTA_MARGIN + cap, opts.ctaPos * CANVAS_H + cap / 2),
    ),
  );

  // Se vuelve a medir ya con el cuerpo definitivo: la caja de agarre tiene que
  // cuadrar con la tinta al pixel, tambien cuando ha habido que encoger.
  setCtaFont(ctx, opts.font, size);
  const ink = ctx.measureText(text).width;

  return {
    text,
    size,
    shrunk: size < opts.ctaSize - 0.01,
    baseline,
    box: {
      x: (CANVAS_W - ink) / 2 - CTA_GRAB,
      y: baseline - cap - CTA_GRAB,
      w: ink + CTA_GRAB * 2,
      h: cap + descender + CTA_GRAB * 2,
    },
  };
}

/**
 * Calcula la caja de todo antes de pintar nada. Va aparte del dibujo porque la
 * interfaz necesita las mismas medidas para el arrastre, y porque a ffmpeg hay
 * que darle el rectangulo del video exactamente igual que en la previa.
 */
export function computeLayout(
  ctx: CanvasRenderingContext2D,
  opts: RenderOptions,
): Layout {
  // El cuerpo pedido es un tope: si el rotulo no cabe, se compone mas pequeño.
  //
  // Se busca **el mayor que cabe**, y no se reduce por proporcion, porque la
  // proporcion se pasa de frenada. Al subir el cuerpo llega un momento en que
  // una linea ya no entra en la caja y el rotulo pasa de dos lineas a tres;
  // encoger entonces por la altura que ocupan tres lineas devuelve un cuerpo al
  // que vuelven a caber dos, mucho mas pequeño del que de verdad cabria. Se
  // veia como que ampliar de mas empequeñecia el texto.
  //
  // El cuerpo maximo depende solo del texto, no del que se haya pedido, asi que
  // buscandolo asi subir el deslizador nunca puede achicar el rotulo: al llegar
  // al tope se queda quieto.
  let size = opts.fontSize;
  let composed = compose(ctx, opts, size);

  if (!composed.fits) {
    let lo = FONT_SIZE_MIN;
    let hi = size;
    // El minimo se acepta aunque no quepa: es el suelo, y por debajo el rotulo
    // seria ilegible.
    composed = compose(ctx, opts, lo);
    size = lo;
    for (let i = 0; i < 18; i += 1) {
      const mid = (lo + hi) / 2;
      const attempt = compose(ctx, opts, mid);
      if (attempt.fits) {
        lo = mid;
        size = mid;
        composed = attempt;
      } else {
        hi = mid;
      }
    }
  }

  const lines = composed.lines;
  setFont(ctx, opts.font, size);
  const blockTop = TEXT_TOP;
  const videoTopBase = videoTopFor(lines.length, size);

  // El rectangulo se redondea aqui, y no al dibujar, porque este mismo va a
  // parar a ffmpeg: si la previa y la pieza final redondean distinto, no
  // cuadran.
  const video = opts.frameSize
    ? videoRect(opts.frameSize, opts.transform, videoTopBase)
    : null;

  // El degradado de arriba se pega al filo del video en cuanto este baja del
  // techo. Sin esto, bajarlo dejaba el degradado desvaneciendo sobre negro y un
  // corte seco cruzando el ancho justo donde empieza la imagen.
  const videoTop = video ? Math.max(videoTopBase, video.y) : videoTopBase;

  // El suelo del hueco lo pone el video, no el PSD: llega hasta su filo
  // inferior, topado al lienzo. La barra puede subirse a mano de ahi para
  // arriba, pero nunca por debajo del minimo del hueco.
  const videoBottomAuto = video ? Math.min(CANVAS_H, video.y + video.h) : CANVAS_H;
  const videoBottomMin = Math.min(videoBottomAuto, videoTop + VIDEO_MIN_H);
  const videoBottom = Math.round(
    videoBottomAuto - (videoBottomAuto - videoBottomMin) * clamp01(opts.bottomMargin),
  );

  return {
    width: CANVAS_W,
    height: CANVAS_H,
    fontSize: size,
    shrunk: size < opts.fontSize - 0.01,
    lineHeight: size * LINE_RATIO,
    lines,
    blockTop,
    videoArea: { x: 0, y: videoTop, w: CANVAS_W, h: videoBottom - videoTop },
    videoTopBase,
    videoTop,
    video,
    videoBottom,
    videoBottomAuto,
    videoBottomMin,
    // El reclamo va por libre: ni empuja al degradado ni se entera del rotulo,
    // asi que se compone al final y no participa de nada de lo de arriba.
    cta: composeCta(ctx, opts),
  };
}

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

/**
 * Recorta el encuadre para que el video no deje nunca hueco. A lo ancho es lo
 * de siempre: solo se puede mover lo que sobra del encaje. A lo alto el limite
 * es otro, porque el borde de abajo ya no esta clavado: se puede subir el video
 * para que la barra negra crezca, pero no bajarlo por debajo del techo ni dejar
 * la ventana con menos de `VIDEO_MIN_H`.
 */
export function clampVideoOffset(
  frameSize: { width: number; height: number },
  transform: VideoTransform,
  top: number,
): void {
  const scale = videoScale(frameSize, transform.zoom);
  const w = frameSize.width * scale;
  const h = frameSize.height * scale;

  // A lo ancho no hay libertad que dar: el hueco ocupa el lienzo entero, asi
  // que mover el video de lado solo puede destapar negro por un costado. Solo
  // se puede desplazar lo que sobre del encaje.
  const maxX = Math.max(0, (w - CANVAS_W) / 2);
  transform.offsetX = Math.min(maxX, Math.max(-maxX, transform.offsetX));

  // A lo alto si, y en los dos sentidos: los dos degradados van pegados a los
  // filos del video, asi que subirlo agranda la barra de abajo y bajarlo
  // agranda el marco de arriba, sin que ninguna de las dos cosas deje un corte.
  // El unico tope es no cerrar la ventana: nunca menos de `VIDEO_MIN_H`.
  const minY = VIDEO_MIN_H - h;
  const maxY = CANVAS_H - top - VIDEO_MIN_H;
  transform.offsetY = Math.min(maxY, Math.max(minY, transform.offsetY));
}

/**
 * Cambia el zoom dejando quieto el punto del video que hay bajo `anchor`.
 *
 * Sin esto la imagen se escala desde el centro del lienzo, asi que lo que
 * estabas mirando se va de sitio y hay que ampliar y volver a colocar, una y
 * otra vez. Anclando al puntero —o al punto medio de los dedos— la imagen
 * crece justo por donde apuntas.
 *
 * `top` entra por parametro porque el techo del hueco lo pone el rotulo, no el
 * encuadre: no cambia al ampliar, pero hace falta para saber donde cae el video.
 */
export function zoomVideoAt(
  frameSize: { width: number; height: number },
  transform: VideoTransform,
  zoom: number,
  top: number,
  anchor: { x: number; y: number },
): void {
  const before = videoScale(frameSize, transform.zoom);
  const after = videoScale(frameSize, zoom);
  transform.zoom = zoom;
  if (before <= 0 || after === before) return;

  // Que punto del original cae bajo el ancla, con la escala de ahora.
  const x = (CANVAS_W - frameSize.width * before) / 2 + transform.offsetX;
  const y = top + transform.offsetY;
  const sx = (anchor.x - x) / before;
  const sy = (anchor.y - y) / before;

  // Y el desplazamiento que lo devuelve al mismo sitio ya con la escala nueva.
  transform.offsetX = anchor.x - sx * after - (CANVAS_W - frameSize.width * after) / 2;
  transform.offsetY = anchor.y - sy * after - top;
}

/**
 * Desplazamiento vertical de partida: el video centrado en el hueco. Con uno
 * mas largo que el hueco, ver el centro es lo que se espera; con uno que cabe
 * entero sale 0 y se pega al techo, que es donde tiene que ir.
 */
export function centerVideoOffset(
  frameSize: { width: number; height: number },
  zoom: number,
  top: number,
): number {
  const h = frameSize.height * videoScale(frameSize, zoom);
  return Math.min(0, (CANVAS_H - top - h) / 2);
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
 * La previa: fotograma, plantilla y rotulo. Es exactamente lo que va a salir,
 * porque la pieza final se monta con esta misma plantilla y este mismo rotulo
 * y lo unico que cambia es que debajo hay video en movimiento.
 */
export function render(ctx: CanvasRenderingContext2D, opts: RenderOptions): Layout {
  const layout = computeLayout(ctx, opts);
  prepare(ctx, layout);

  // Fondo negro: es el de la plantilla, y ademas es lo que se ve mientras no
  // hay video cargado.
  ctx.fillStyle = "#000000";
  ctx.fillRect(0, 0, layout.width, layout.height);

  // Sin recortar: lo que se salga del hueco por arriba o por abajo lo tapa la
  // plantilla, que ahi es negro opaco. Es lo mismo que hace ffmpeg.
  if (opts.frame && layout.video) {
    const { x, y, w, h } = layout.video;
    if (opts.flip) {
      // Se espeja **dentro de su rectangulo**, no respecto al lienzo: asi el
      // encuadre se queda donde estaba y solo se da la vuelta la imagen. En
      // ffmpeg es lo mismo, un `hflip` despues de escalar y antes de recortar.
      ctx.save();
      ctx.translate(x + w, y);
      ctx.scale(-1, 1);
      ctx.drawImage(opts.frame, 0, 0, w, h);
      ctx.restore();
    } else {
      ctx.drawImage(opts.frame, x, y, w, h);
    }
  }

  drawPlate(ctx, opts, layout);
  return layout;
}

/**
 * La capa que se le pasa a ffmpeg: plantilla y rotulo sobre transparente, sin
 * fotograma. El filtro `overlay` la pega encima del video tal cual, asi que lo
 * que se vio en la previa es literalmente lo que se monta.
 */
export function renderPlate(ctx: CanvasRenderingContext2D, opts: RenderOptions): Layout {
  const layout = computeLayout(ctx, opts);
  prepare(ctx, layout);
  drawPlate(ctx, opts, layout);
  return layout;
}

/**
 * La plantilla, en cuatro piezas, porque ninguno de los dos bordes del hueco
 * esta ya donde lo dejo el PSD:
 *
 * 1. De arriba del todo hasta el techo por defecto. Es la unica pieza que no se
 *    mueve nunca: el marco negro, el logo y los filetes.
 * 2. Negro macizo hasta el techo de verdad, que es lo que se abre cuando el
 *    rotulo baja de donde cabia.
 * 3. Los dos degradados, recortados del propio PNG y pegados cada uno a su
 *    borde: el de arriba arrancando en el techo, el de abajo con su fila opaca
 *    justo en el filo inferior.
 * 4. Negro macizo del filo de abajo al final del lienzo.
 *
 * Recortarlos del PNG en vez de repintarlos es lo que mantiene el desvanecido
 * exactamente igual que en el PSD estando donde este.
 */
function drawPlate(
  ctx: CanvasRenderingContext2D,
  opts: RenderOptions,
  layout: Layout,
): void {
  const { overlay } = opts;
  if (overlay) {
    const w = layout.width;
    ctx.fillStyle = "#000000";

    // El marco de arriba: negro liso hasta donde se abra el hueco. En el PSD
    // toda esa zona es negro opaco salvo el logo y los filetes, asi que
    // repintarla y volver a poner esas dos piezas encima la reproduce igual, y
    // de paso permite tratarlas por separado.
    ctx.fillRect(0, 0, w, layout.videoTop);

    // Los filetes, en dos trozos, que es como estan: acaban justo donde empieza
    // la caja del logo y vuelven a empezar justo donde acaba.
    ctx.drawImage(
      overlay,
      0, SRC_RULES_Y, SRC_RULES_LEFT_W, SRC_RULES_H,
      0, SRC_RULES_Y - ART_OFFSET, SRC_RULES_LEFT_W, SRC_RULES_H,
    );
    ctx.drawImage(
      overlay,
      SRC_RULES_RIGHT_X, SRC_RULES_Y, w - SRC_RULES_RIGHT_X, SRC_RULES_H,
      SRC_RULES_RIGHT_X, SRC_RULES_Y - ART_OFFSET, w - SRC_RULES_RIGHT_X, SRC_RULES_H,
    );

    // Y el logo, reducido desde su centro para que no se mueva de sitio.
    const logoW = SRC_LOGO_W * LOGO_SCALE;
    const logoH = SRC_LOGO_H * LOGO_SCALE;
    ctx.drawImage(
      overlay,
      SRC_LOGO_CX - SRC_LOGO_W / 2, SRC_LOGO_CY - SRC_LOGO_H / 2, SRC_LOGO_W, SRC_LOGO_H,
      SRC_LOGO_CX - logoW / 2, SRC_LOGO_CY - logoH / 2 - ART_OFFSET, logoW, logoH,
    );

    ctx.drawImage(
      overlay,
      0, SRC_FADE_TOP_Y, w, SRC_FADE_TOP_H,
      0, layout.videoTop, w, FADE_TOP_DRAW_H,
    );

    // El degradado de abajo nunca es mas alto que el negro al que funde. Si el
    // video llega al borde del lienzo no hay negro ninguno, asi que no se pinta:
    // ahi el desvanecido no fundiria nada, solo oscureceria imagen. Y como se
    // va comprimiendo con el margen, ampliar el video hasta llenar el hueco no
    // da ningun salto.
    const barra = layout.height - layout.videoBottom;
    const fadeH = Math.min(SRC_FADE_BOTTOM_H, barra);
    if (fadeH > 0) {
      ctx.drawImage(
        overlay,
        0, SRC_FADE_BOTTOM_Y, w, SRC_FADE_BOTTOM_H,
        0, layout.videoBottom - fadeH, w, fadeH,
      );
    }
    ctx.fillRect(0, layout.videoBottom, w, barra);
  }
  drawText(ctx, opts, layout);
  drawCta(ctx, opts, layout);
}

function drawText(
  ctx: CanvasRenderingContext2D,
  opts: RenderOptions,
  layout: Layout,
): void {
  if (layout.lines.length === 0) return;

  setFont(ctx, opts.font, layout.fontSize);
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  ctx.lineJoin = "round";
  // La negrita sintetica del PSD: un trazo centrado en el contorno, del grosor
  // medido sobre la capa original.
  ctx.lineWidth = layout.fontSize * FAUX_BOLD_EM;

  const cap = layout.fontSize * CAP_RATIO;

  layout.lines.forEach((line, i) => {
    if (line.length === 0) return;
    const baseline = layout.blockTop + cap + i * layout.lineHeight;
    // El parrafo del PSD va centrado (`Justification: 2`), y su caja esta
    // centrada en el lienzo, asi que cada linea se centra en 1080.
    let x = (layout.width - lineWidth(ctx, line, layout.fontSize)) / 2;
    for (const token of line) {
      const color = token.highlight ? opts.colorHighlight : opts.colorText;
      ctx.fillStyle = color;
      ctx.strokeStyle = color;
      ctx.strokeText(token.text, x, baseline);
      ctx.fillText(token.text, x, baseline);
      x += textWidth(ctx, token.text, layout.fontSize);
    }
  });
}

/**
 * El reclamo, encima de todo lo demas: va sobre el video, asi que se pinta el
 * ultimo. Sin negrita sintetica —el trazo del rotulo lo engorda demasiado para
 * un cuerpo pequeño—, centrado a lo ancho del lienzo, que es lo unico que no se
 * puede mover, y siempre del rosa de la plantilla.
 */
function drawCta(
  ctx: CanvasRenderingContext2D,
  opts: RenderOptions,
  layout: Layout,
): void {
  const { cta } = layout;
  if (!cta) return;

  setCtaFont(ctx, opts.font, cta.size);
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = COLOR_CTA;
  ctx.fillText(cta.text, layout.width / 2, cta.baseline);
  // `textAlign` es del contexto y el de la previa se reutiliza en cada
  // fotograma: dejarlo como estaba evita que el proximo rotulo salga corrido.
  ctx.textAlign = "left";
}
