/**
 * Las medidas del hilo. Aqui no hay PSD: salen de medir las dos piezas de
 * referencia, la portada («OTRO AÑO CON POLEMICAS…») y la slide («Un fallo
 * impide completar…»), las dos a 1080x1440.
 *
 * Todo lo que se mueve desde la interfaz —cuerpos y margenes— arranca en el
 * valor medido, asi que sin tocar nada sale la pieza de referencia.
 */

/**
 * Lienzo: 1080x1350, el 4:5 del feed, igual que News Maker.
 *
 * Las referencias miden 1080x1440 (3:4), 90 px mas de alto. Todo lo que se
 * midio sobre ellas se cuenta desde el filo de abajo o es un tamaño, asi que
 * vale tal cual: el texto, sus margenes y la banda quedan identicos, y los 90
 * px salen de la ventana de la imagen.
 */
export const CANVAS_W = 1080;
export const CANVAS_H = 1350;

export interface Font {
  /** Nombre a secas de la familia, para comprobar si esta cargada. */
  family: string;
  /** Pila completa, con respaldo por si la familia no llega a cargar. */
  stack: string;
  weight: number;
}

export type Kind = "portada" | "slide";

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
  /** La portada acaba en la flecha que invita a pasar a la siguiente. */
  arrow: boolean;
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
    font: { family: "Anton", stack: '"Anton", Impact, "Arial Narrow", sans-serif', weight: 400 },
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
  },
  slide: {
    font: { family: "Poppins", stack: '"Poppins", system-ui, sans-serif', weight: 700 },
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
  },
};

/**
 * Lo que crece lo +destacado+ respecto al resto. Es cosa aparte del
 * *resaltado*, que solo cambia el color: «ES OFICIAL:» va destacado y
 * resaltado, y «HUELGA GENERAL» solo resaltado, al cuerpo de su linea.
 */
export const BIG_SCALE = 1.67;
export const BIG_SCALE_MIN = 1;
export const BIG_SCALE_MAX = 2.4;

/**
 * Margenes de partida que no dependen del tipo. El superior va del filo a la
 * cabeza de la primera linea; el lateral es el de la slide, que arranca en
 * x = 55.
 */
export const MARGIN_TOP = 120;
export const MARGIN_SIDE = 55;
export const MARGIN_MIN = 30;
export const MARGIN_MAX = 760;
export const MARGIN_SIDE_MAX = 260;

/** Topes del negro macizo entre el texto y el difuminado. */
export const BAND_PAD_MIN = 0;
export const BAND_PAD_MAX = 320;

/**
 * La flecha de la portada, medida sobre la referencia: 170 px de ancho,
 * centrada, con el asta de 7 px y la punta de 28 x 30, y su eje 47 px por
 * debajo de la ultima baseline.
 */
export const ARROW = {
  width: 170,
  shaft: 7,
  headW: 28,
  headH: 30,
  drop: 47,
  /** Lo mas abajo que puede caer su eje, para que no se salga del lienzo. */
  edge: 24,
  color: "#d6336c",
};

/** Lo que nunca se estrecha la ventana de la imagen, crezca lo que crezca el texto. */
export const MEDIA_MIN_H = 320;

export const COLOR_TEXT = "#ffffff";
/** El amarillo del resaltado, medido sobre las dos referencias. */
export const COLOR_HIGHLIGHT = "#ffff00";

export const ZOOM_MIN = 1;
export const ZOOM_MAX = 3;

export interface Swatch {
  label: string;
  hex: string;
}

export const COLORS: Swatch[] = [
  { label: "Blanco", hex: "#ffffff" },
  { label: "Amarillo hilo", hex: COLOR_HIGHLIGHT },
  { label: "Amarillo News Maker", hex: "#ffde00" },
  { label: "Rosa Cabronazi", hex: "#cc1c65" },
  { label: "Verde Cabrodeportes", hex: "#00ce5c" },
  { label: "Rojo Cabromotor", hex: "#ed282b" },
];
