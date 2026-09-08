/**
 * Medidas de la plantilla del meme: banda de color arriba con el texto, y la
 * foto debajo. A diferencia de news-maker aqui no hay PSD del que sacar los
 * numeros, asi que estos son de diseño y se pueden mover. El unico que no se
 * toca es el ancho: 1080 es lo que pide Facebook.
 */

export const CANVAS_W = 1080;

/** 1080x1350 es el 4:5 de Facebook. El lienzo no cambia nunca. */
export const CANVAS_H = 1350;

/** Margenes de la banda. El lateral fija de paso el ancho de composicion. */
export const BAND_PAD_X = 56;
export const BAND_PAD_Y = 44;

/** Ancho de composicion del texto. */
export const TEXT_MAX_W = CANVAS_W - BAND_PAD_X * 2;

export const FONT_SIZE = 52;
export const FONT_SIZE_MIN = 26;
export const FONT_SIZE_MAX = 84;

export const LINE_RATIO = 1.25;

/**
 * Altura de mayusculas como fraccion del cuerpo. Sirve para centrar cada linea
 * dentro de su caja sin depender de las metricas de la fuente, que cambian de
 * una familia a otra.
 */
export const CAP_RATIO = 0.72;

export const COLOR_BAND = "#ffffff";
export const COLOR_TEXT = "#000000";

/** Color de lo que va entre *asteriscos*. Solo sale si se usan. */
export const COLOR_HIGHLIGHT = "#e11d2f";

export const ZOOM_MIN = 1;
export const ZOOM_MAX = 3;

export interface Font {
  /** Nombre a secas de la familia, para comprobar si esta cargada. */
  family: string;
  /** Pila completa, con respaldo por si la familia no llega a cargar. */
  stack: string;
  weight: number;
}

/**
 * La tipografia del rotulo. SF Pro Display Medium, servida por el propio repo
 * en `src/assets` y declarada en `style.css`, asi que sale igual en cualquier
 * equipo sin depender de lo que tenga instalado.
 *
 * Medium es peso 500, mas fina que una negrita: el rotulo se ve ligero a
 * proposito.
 */
export const FONT: Font = {
  family: "SF Pro Display",
  stack: '"SF Pro Display", system-ui, sans-serif',
  weight: 500,
};


export interface Swatch {
  label: string;
  hex: string;
}

/**
 * Paleta de la casa. El rosa es el de Cabronazi y el verde el de
 * Cabrodeportes, los mismos `#cc1c65` y `#00ce5c` que en news-maker, medidos
 * alli sobre los logos originales.
 */
export const COLORS: Swatch[] = [
  { label: "Blanco", hex: "#ffffff" },
  { label: "Negro", hex: "#000000" },
  { label: "Rosa Cabronazi", hex: "#cc1c65" },
  { label: "Rojo", hex: "#e11d2f" },
  { label: "Verde Cabrodeportes", hex: "#00ce5c" },
];
