/**
 * Las medidas del hilo. Aqui no hay PSD: salen de medir las dos piezas de
 * referencia, la portada («OTRO AÑO CON POLEMICAS…») y la slide («Un fallo
 * impide completar…»), las dos a 1080x1440.
 *
 * Todo lo que se mueve desde la interfaz —cuerpos y margenes— arranca en el
 * valor medido, asi que sin tocar nada sale la pieza de referencia.
 */

/**
 * Lienzo: 1080x1440, el 3:4 del carrusel, que es lo que miden las dos
 * referencias. Paso una temporada en 4:5 (1080x1350); como todo lo medido se
 * cuenta desde el filo de abajo o es un tamaño, el cambio solo mueve la
 * ventana de la imagen, que gana esos 90 px.
 */
export const CANVAS_W = 1080;
export const CANVAS_H = 1440;

export interface Font {
  /** Nombre a secas de la familia, para comprobar si esta cargada. */
  family: string;
  /** Pila completa, con respaldo por si la familia no llega a cargar. */
  stack: string;
  weight: number;
}

export type Kind = "portada" | "slide";

/**
 * El aspecto del hilo entero. NEW es el de ahora: el texto sobre la imagen,
 * con su banda negra y su difuminado. CLASSIC es el de antes: una banda
 * blanca arriba con el texto en negro, como el Meme Generator, y la imagen
 * debajo.
 */
export type Look = "new" | "classic" | "tiktok";

/**
 * Los emojis van con Noto Color Emoji, la de Google: a color y la misma en
 * cualquier equipo. Sin ella cada sistema pinta los suyos (en Windows salen
 * planos). Los de Apple, que son los que se ven en las redes desde un iPhone,
 * no se pueden servir: su licencia no lo permite. Va en todas las pilas detras
 * de la letra del texto, asi que solo entra en lo que esa letra no tiene.
 */
const EMOJI = '"Noto Color Emoji"';

/** Lo que distingue a una portada de una slide. */
export interface Style {
  font: Font;
  /** La portada va entera en mayusculas, se escriba como se escriba. */
  upper: boolean;
  align: "center" | "left";
  /** Cuerpo de partida y sus topes. Mantener en sync con el `range`. */
  size: number;
  sizeMin: number;
  sizeMax: number;
  /**
   * Aire entre la baseline de una linea y la cabeza de las mayusculas de la
   * siguiente, en emes del cuerpo base. Se mide asi, y no con un interlineado,
   * porque lo +destacado+ va mas grande que el resto: con el aire fijo las
   * lineas quedan igual de separadas midan lo que midan.
   */
  gapEm: number;
  trackingEm: number;
  /** Alto del difuminado con el que la banda negra entra en la imagen. */
  fade: number;
  /** Margen inferior de partida: del filo a la baseline de la ultima linea. */
  marginBottom: number;
  /** Negro macizo que la banda deja entre el texto y su difuminado. */
  bandPad: number;
  /** La portada puede acabar en la flecha que invita a pasar a la siguiente. */
  arrow: boolean;
  /** Margen superior de partida: del filo a la cabeza de la primera linea. */
  marginTop: number;
  /** Margen lateral de partida, que fija el ancho de composicion. */
  marginSide: number;
  /**
   * `overlay`: el texto va sobre la imagen, con banda y difuminado. `band`: el
   * texto va en una banda lisa arriba y la imagen ocupa lo que queda debajo.
   */
  layout: "overlay" | "band" | "free";
  /** Color de las bandas y de lo que no tape la imagen. */
  background: string;
  /** La junta entre dos imagenes. */
  divider: { width: number; color: string };
  /** Los dos colores de partida del texto. */
  colorText: string;
  colorHighlight: string;
  /**
   * Lineas que la banda reserva siempre, haya las que haya. Con menos, el
   * texto se centra en ese hueco y la imagen empieza en el mismo sitio en
   * todas las piezas. 0 es que la banda se ajusta al texto.
   */
  minLines: number;
}

/**
 * Portada: Anton, sin tracking. Medido sobre la referencia «ES OFICIAL: HABRA
 * HUELGA GENERAL EL 11 DE NOVIEMBRE»: las dos lineas normales miden 890 y 734
 * px de tinta, que con los anchos de la Anton salen las dos a 101 px de cuerpo
 * con el espaciado natural de la fuente; «ES OFICIAL:» mide 675, o sea 169 px,
 * 1,67 veces mas. La ultima baseline cae a 100 px del filo y el negro macizo
 * empieza unos 40 px por encima del texto.
 *
 * Slide: Poppins Bold, la misma que rotula News Maker. «Un fallo impide
 * completar la» mide 935 px, que son 64 px de cuerpo sin tracking; baselines
 * cada 90 px, o sea 45 de mayuscula y otros 45 de aire. Ultima baseline a 152
 * px del filo y 125 de negro macizo sobre el texto.
 */
export const STYLES: Record<Kind, Style> = {
  portada: {
    font: { family: "Anton", stack: `"Anton", ${EMOJI}, Impact, "Arial Narrow", sans-serif`, weight: 400 },
    upper: true,
    align: "center",
    size: 101,
    sizeMin: 50,
    sizeMax: 220,
    gapEm: 0.24,
    trackingEm: 0,
    fade: 90,
    marginBottom: 100,
    bandPad: 40,
    arrow: true,
    marginTop: 120,
    marginSide: 55,
    layout: "overlay",
    background: "#000000",
    // El grosor de la junta de News Maker, de donde viene la idea, pero en
    // negro: aqui tiene que fundirse con las bandas.
    divider: { width: 3, color: "#000000" },
    colorText: "#ffffff",
    colorHighlight: "#ffff00",
    minLines: 0,
  },
  slide: {
    font: { family: "Poppins", stack: `"Poppins", ${EMOJI}, system-ui, sans-serif`, weight: 700 },
    upper: false,
    align: "left",
    size: 64,
    sizeMin: 30,
    sizeMax: 110,
    gapEm: 0.7,
    trackingEm: 0,
    fade: 140,
    marginBottom: 155,
    bandPad: 124,
    arrow: false,
    marginTop: 120,
    marginSide: 55,
    layout: "overlay",
    background: "#000000",
    divider: { width: 3, color: "#000000" },
    colorText: "#ffffff",
    colorHighlight: "#ffff00",
    minLines: 0,
  },
};

/**
 * CLASSIC, medido sobre la referencia «Estas historias de amor tuvieron un
 * final que parece imposible»: SF Pro Display Medium, la del Meme Generator,
 * en negro y centrada sobre blanco. Las dos primeras lineas miden 831 y 995 px
 * de tinta, que salen a 84,5 px de cuerpo sin tracking; baselines cada 105 px,
 * la primera mayuscula a 80 px del filo y la imagen empezando en y = 433. Con
 * 36 px de margen lateral el texto se parte solo por donde se parte alli.
 *
 * La banda es siempre la de tres lineas: con una o dos, el texto se centra en
 * ella y la imagen no se mueve de sitio.
 *
 * Portada y slide son iguales: en la referencia la portada se distingue por
 * llevar escrita su flecha («-->») al final del texto.
 */
export const CLASSIC: Style = {
  font: { family: "SF Pro Display", stack: `"SF Pro Display", ${EMOJI}, system-ui, sans-serif`, weight: 500 },
  upper: false,
  align: "center",
  size: 84.5,
  sizeMin: 30,
  sizeMax: 140,
  gapEm: 0.54,
  trackingEm: 0,
  fade: 0,
  marginBottom: 100,
  bandPad: 67,
  arrow: false,
  marginTop: 80,
  marginSide: 36,
  layout: "band",
  background: "#ffffff",
  divider: { width: 9, color: "#ffffff" },
  colorText: "#000000",
  colorHighlight: "#e11d2f",
  minLines: 3,
};

/** El estilo de una pieza: lo deciden el aspecto del hilo y su tipo. */
/**
 * TIKTOK: el rotulo de TikTok encima de la imagen, que la ocupa entera. La
 * letra es TikTok Sans, la de la propia app. El texto va centrado alrededor de
 * un punto que se arrastra a cualquier sitio, con trazo negro y con o sin
 * fondo, que se eligen en cada pieza.
 *
 * Medido sobre la referencia «un random VARIOS días cualquiera:»: la primera
 * linea mide el 76 % del ancho, 819 px, que en TikTok Sans son 72 px de
 * cuerpo; las baselines van cada 1,31 cuerpos y el trazo asoma ~3 px.
 */
export const TIKTOK: Style = {
  font: { family: "TikTok Sans", stack: `"TikTok Sans", ${EMOJI}, system-ui, sans-serif`, weight: 600 },
  upper: false,
  align: "center",
  size: 72,
  sizeMin: 30,
  sizeMax: 180,
  gapEm: 0.6,
  trackingEm: 0,
  fade: 0,
  marginBottom: 100,
  bandPad: 0,
  arrow: false,
  marginTop: 120,
  marginSide: 80,
  layout: "free",
  background: "#000000",
  divider: { width: 3, color: "#000000" },
  colorText: "#ffffff",
  colorHighlight: "#ffff00",
  minLines: 0,
};

/** Donde arranca el texto de TIKTOK: su centro, en px de lienzo. */
export const TIKTOK_POS = { x: 540, y: 420 };

/**
 * El trazo de TIKTOK, en emes: lo que asoma por fuera de la letra. El fondo
 * es una caja redondeada por linea, con este aire alrededor del texto. Como en
 * la app, la caja toma el color del texto y la letra pasa a negro o a blanco,
 * la que se lea sobre ella.
 */
export const TIKTOK_STROKE = 0.045;
export const TIKTOK_BOX = { padX: 0.32, padY: 0.2, radius: 0.24 };

/** El estilo de una pieza: lo deciden el aspecto del hilo y su tipo. */
export function styleFor(look: Look, kind: Kind): Style {
  if (look === "classic") return CLASSIC;
  if (look === "tiktok") return TIKTOK;
  return STYLES[kind];
}

/** Todas las letras que puede pedir el hilo, para cargarlas antes de medir. */
export const FONTS: Font[] = [STYLES.portada.font, STYLES.slide.font, CLASSIC.font, TIKTOK.font];

/** La de los emojis se carga aparte, cuando aparece uno: pesa mucho. */
export const EMOJI_FONT = "Noto Color Emoji";

/**
 * Lo que crece lo +destacado+ respecto al resto. Es cosa aparte del
 * *resaltado*, que solo cambia el color: «ES OFICIAL:» va destacado y
 * resaltado, y «HUELGA GENERAL» solo resaltado, al cuerpo de su linea.
 */
export const BIG_SCALE = 1.67;
export const BIG_SCALE_MIN = 1;
export const BIG_SCALE_MAX = 2.4;

/**
 * Topes de los margenes. Los de partida van en cada estilo: en NEW el superior
 * es 120 y el lateral 55, el de la slide, que arranca en x = 55.
 */
export const MARGIN_MIN = 30;
export const MARGIN_MAX = 760;
export const MARGIN_SIDE_MAX = 260;

/** Topes del negro macizo entre el texto y el difuminado. */
export const BAND_PAD_MIN = 0;
export const BAND_PAD_MAX = 320;

/**
 * La flecha de la portada, medida sobre la referencia: 170 px de ancho,
 * centrada, con el asta de 7 px y la punta de 28 x 30, y su eje a 53 px del
 * filo de abajo. Esta siempre ahi: no sigue al texto, asi que en todas las
 * portadas cae en el mismo sitio.
 */
export const ARROW = {
  width: 170,
  shaft: 7,
  headW: 28,
  headH: 30,
  /** Del filo de abajo del lienzo al eje de la flecha. */
  bottom: 53,
  color: "#d6336c",
};

/**
 * La mosca: un aro del color del resaltado, con o sin imagen dentro. Sin
 * imagen es el circulo que señala algo de la foto, como el de la portada de
 * referencia; con imagen es la mosca de News Maker.
 *
 * El aro de la referencia mide ~9 px con ~185 de radio: un 5 %.
 */
export const INSET = {
  cx: 700,
  cy: 400,
  radius: 180,
  radiusMin: 50,
  radiusMax: 460,
  ringRatio: 0.05,
  ringMin: 5,
  /** Sin imagen se coge por el aro: esto es lo que el agarre sobresale de el. */
  grab: 26,
};

/** Lo que nunca se estrecha la ventana de la imagen, crezca lo que crezca el texto. */
export const MEDIA_MIN_H = 320;

/** El amarillo del resaltado de NEW, medido sobre las dos referencias. */
export const COLOR_HIGHLIGHT = "#ffff00";

export const ZOOM_MIN = 1;
export const ZOOM_MAX = 3;

export interface Swatch {
  label: string;
  hex: string;
}

export const COLORS: Swatch[] = [
  { label: "Blanco", hex: "#ffffff" },
  { label: "Negro", hex: "#000000" },
  { label: "Rojo classic", hex: "#e11d2f" },
  { label: "Amarillo hilo", hex: COLOR_HIGHLIGHT },
  { label: "Amarillo News Maker", hex: "#ffde00" },
  { label: "Rosa Cabronazi", hex: "#cc1c65" },
  { label: "Verde Cabrodeportes", hex: "#00ce5c" },
  { label: "Rojo Cabromotor", hex: "#ed282b" },
];
