/**
 * Las medidas del hilo. Aqui no hay PSD: salen de medir las dos piezas de
 * referencia, la portada («OTRO AÑO CON POLEMICAS…») y la slide («Un fallo
 * impide completar…»), las dos a 1080x1440.
 *
 * Todo lo que se mueve desde la interfaz —cuerpos y margenes— arranca en el
 * valor medido, asi que sin tocar nada sale la pieza de referencia.
 */

/** Lienzo de las dos referencias: 1080x1440, el 3:4 del carrusel. */
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
   * porque en la portada el resaltado va mas grande que el resto: con el aire
   * fijo las lineas quedan igual de separadas midan lo que midan.
   */
  gapEm: number;
  trackingEm: number;
  /** Alto del difuminado con el que la banda negra entra en la imagen. */
  fade: number;
}

/**
 * Portada: Anton, que es la letra estrecha de la referencia. Las mayusculas de
 * la primera linea miden ~97 px de alto, que con la altura de caja de la Anton
 * (0,86 emes) son 113 px de cuerpo. A ese cuerpo «OTRO AÑO CON POLEMICAS»
 * mediria 1089 px y en la referencia mide 950: la diferencia, repartida entre
 * sus letras, es un tracking de -0,055 emes, y el mismo numero sale midiendo
 * «12 DE OCTUBRE». Entre linea y linea hay ~33 px de aire.
 *
 * Slide: Poppins Bold, la misma que rotula News Maker. «Un fallo impide
 * completar la» mide 935 px, que son 64 px de cuerpo sin tracking; baselines
 * cada 90 px, o sea 45 de mayuscula y otros 45 de aire.
 */
export const STYLES: Record<Kind, Style> = {
  portada: {
    font: { family: "Anton", stack: '"Anton", Impact, "Arial Narrow", sans-serif', weight: 400 },
    upper: true,
    align: "center",
    size: 113,
    sizeMin: 50,
    sizeMax: 220,
    gapEm: 0.29,
    trackingEm: -0.055,
    fade: 90,
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
  },
};

/**
 * Lo que crece el resaltado de la portada respecto al resto: en la referencia
 * «12 DE OCTUBRE» mide 133 px de alto frente a los 97 de las otras dos lineas.
 * En la slide el resaltado solo cambia de color.
 */
export const HIGHLIGHT_SCALE = 1.37;
export const HIGHLIGHT_SCALE_MIN = 1;
export const HIGHLIGHT_SCALE_MAX = 1.8;

/**
 * Margenes de partida. El inferior va del filo del lienzo a la baseline de la
 * ultima linea (1283 y 1288 en las referencias); el superior, del filo a la
 * cabeza de la primera; el lateral es el de la slide, que arranca en x = 55.
 */
export const MARGIN_BOTTOM = 155;
export const MARGIN_TOP = 120;
export const MARGIN_SIDE = 55;
export const MARGIN_MIN = 30;
export const MARGIN_MAX = 760;
export const MARGIN_SIDE_MAX = 260;

/**
 * Negro macizo que la banda deja por encima del texto de abajo antes de
 * empezar a difuminarse: 123 px en la portada y 125 en la slide.
 */
export const BAND_PAD = 124;

/** Lo mismo por debajo del texto de arriba, contado desde las descendentes. */
export const BAND_PAD_TOP = 96;

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
