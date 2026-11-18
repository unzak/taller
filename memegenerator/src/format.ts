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
 * Los dos tipos de pieza. `classic` es la de siempre: banda con el texto y la
 * foto debajo. `new` le pone encima la cabecera de la casa, logo centrado con
 * su filete partido a los lados.
 */
export type Kind = "classic" | "new";

/*
 * Medidas de la cabecera del tipo NEW, tomadas sobre la referencia de
 * 1080x1350 y no inventadas. Si cambia la plantilla, volver a medir sobre ella.
 */

/**
 * La cabecera es un PNG recortado de la referencia, logo y filete juntos, con
 * el fondo ya transparente. Va a 1:1 sobre el lienzo, que mide lo mismo de
 * ancho, asi que no hay nada que escalar ni que colocar: su sitio lo trae el
 * propio recorte, con la tinta de (39, 25) a (1040, 142).
 */
export const NEW_HEAD_W = 1080;
export const NEW_HEAD_H = 160;

/**
 * Aire sobre y bajo el bloque de texto. No son iguales a proposito: arriba hay
 * que dejar sitio al logo y al filete. Salen de la referencia, donde con tres
 * lineas el texto arranca en y=168 y la foto en y=424.
 */
export const NEW_PAD_TOP = 152;
export const NEW_PAD_BOTTOM = 18;

/** En la referencia el cuerpo mide 72 y las lineas caen cada 85 px. */
export const NEW_FONT_SIZE = 72;
export const NEW_LINE_RATIO = 85 / 72;



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

/**
 * La del tipo `new`: la misma familia en Heavy. Se eligio midiendo las tres
 * lineas de la referencia a 72 px, no a ojo — ver el comentario del
 * `@font-face` en `style.css`.
 */
export const FONT_NEW: Font = {
  family: "SF Pro Display",
  stack: '"SF Pro Display", system-ui, sans-serif',
  weight: 900,
};

/** La tipografia que le toca a cada tipo de pieza. */
export function fontFor(kind: Kind): Font {
  return kind === "new" ? FONT_NEW : FONT;
}


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
