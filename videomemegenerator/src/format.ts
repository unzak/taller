/**
 * Constantes extraidas directamente de "VIDEO MEME NUEVO.psd".
 * No tocar a ojo: si cambia la plantilla, volver a medir sobre el PSD.
 *
 * El PSD trae dos capas y nada mas: `PLANTILLA`, que es el marco negro con el
 * logo, los filetes y el hueco por donde se ve el video, y `TEXTO`, que es la
 * que sustituye el rotulo que se escriba aqui.
 */

/** Lienzo del PSD: 1080x1920, el 9:16 de reels, shorts y TikTok. */
export const CANVAS_W = 1080;
export const CANVAS_H = 1920;

/**
 * Filas de `overlay.png`, que es la capa `PLANTILLA` tal cual salio del PSD.
 * Son coordenadas **del archivo**, no del lienzo: las piezas se recortan de
 * aqui y se pegan donde toque, que ya no es donde estaban.
 */
export const SRC_FADE_TOP_Y = 647;
export const SRC_FADE_TOP_H = 803 - SRC_FADE_TOP_Y;

/**
 * Alto con el que se pinta ese degradado. Los 156 px del PSD se comen media
 * cabecera antes de que el video se vea entero; comprimidos a 90 la entrada es
 * mucho mas corta y esa diferencia se gana de imagen.
 *
 * Se comprime, no se recorta: pintandolo mas bajo, el desvanecido conserva su
 * curva entera y solo pasa mas deprisa. Recortando filas se quedaria a medias
 * y el corte se veria cruzando el ancho.
 */
export const FADE_TOP_DRAW_H = 90;
export const SRC_FADE_BOTTOM_Y = 1355;
export const SRC_FADE_BOTTOM_H = 1512 - SRC_FADE_BOTTOM_Y;

/**
 * Caja del logo dentro del PNG, y banda de los filetes. Medidas sobre la propia
 * capa: la tinta del logo ocupa x 459..617, y los filetes van de 74 a 458 y de
 * 618 a 1002. **No se solapan ni por un pixel**, y eso es lo que permite
 * dibujarlos como piezas separadas —y por tanto reducir el logo sin acortar los
 * filetes— sin tener que retocar el PNG.
 *
 * Todo lo demas de esa zona es negro opaco, asi que el marco se repinta con un
 * relleno y estas dos piezas encima.
 */
const SRC_LOGO_X = 459;
const SRC_LOGO_Y = 349;
export const SRC_LOGO_W = 159;
export const SRC_LOGO_H = 145;
export const SRC_LOGO_CX = SRC_LOGO_X + SRC_LOGO_W / 2;
export const SRC_LOGO_CY = SRC_LOGO_Y + SRC_LOGO_H / 2;

export const SRC_RULES_Y = 419;
export const SRC_RULES_H = 41;
/** Los filetes acaban justo donde empieza la caja del logo, y al reves. */
export const SRC_RULES_LEFT_W = SRC_LOGO_X;
export const SRC_RULES_RIGHT_X = SRC_LOGO_X + SRC_LOGO_W;

/** Lo que se reduce el logo respecto al PSD. */
export const LOGO_SCALE = 0.8;

/**
 * Lo que sube todo el bloque de arriba —logo, filetes y rotulo— respecto al
 * PSD. Por encima del logo el PSD deja 347 px de negro vacio que no pintan
 * nada, y subiendo el bloque ese aire se le regala al video.
 *
 * El tope no es el borde del lienzo, es el del **feed de Instagram**, que
 * recorta la pieza a 4:5 y se come las 285 primeras filas. Con estos 65, y con
 * el logo ya reducido, la primera fila con tinta cae en la 284: el halo roza el
 * filo del recorte. Comprobado sobre publicaciones reales, ahi todavia hay
 * aire; subiendo mas, ya no.
 *
 * Es el unico numero de este archivo que no sale de medir: es una decision de
 * diseño, y esta suelto justo para poder moverla de un sitio. Con 0 la
 * composicion vuelve a ser la del PSD, clavada.
 */
export const HEADER_LIFT = 65;

/**
 * Lo que suben ademas el logo y los filetes, por encima de `HEADER_LIFT`.
 *
 * Sale de reducir el logo: al escalarlo desde su centro, su borde de arriba
 * baja 14 px. Subiendo la cabecera esos mismos 14, el logo vuelve a arrancar
 * exactamente donde arrancaba —a 12 px del recorte 4:5 del feed, que es todo el
 * aire que hay— y la reduccion entera se convierte en sitio para el video en
 * vez de en mas negro por arriba.
 */
export const ART_LIFT = Math.round((SRC_LOGO_H * (1 - LOGO_SCALE)) / 2);

/** Lo que sube la cabecera en total. Es con lo que se dibuja. */
export const ART_OFFSET = HEADER_LIFT + ART_LIFT;

/**
 * Lo que nunca se estrecha el hueco, pase lo que pase con el rotulo o con la
 * barra de abajo. Deja 100 px de ventana limpia entre los dos degradados.
 */
export const VIDEO_MIN_H = 413;

/**
 * Donde acaba la tinta de la cabecera **en el lienzo**, con el logo ya reducido
 * y todo subido. Manda el logo, que baja mas que los filetes.
 */
export const ART_BOTTOM =
  Math.max(SRC_LOGO_CY + (SRC_LOGO_H * LOGO_SCALE) / 2, SRC_RULES_Y + SRC_RULES_H) - ART_OFFSET;

/**
 * Capa `TEXTO`: SFProDisplay-Bold, FontSize 42 x la escala 1.24484 del layer.
 * El descriptor trae ademas `FauxBold: true` y `FontCaps: 2`, es decir, negrita
 * sintetica encima de la negrita real y todo en mayusculas.
 */
export const FONT_SIZE = 52.28;
export const FONT_SIZE_MIN = 26;
export const FONT_SIZE_MAX = 76;

/**
 * `AutoLeading: true` con el 1.2 del ParagraphSheet. Comprobado sobre el
 * composite: las dos baselines caen en 568 y 631, 63 px, que es 1.2 x 52.28.
 */
export const LINE_RATIO = 1.2;

/** `Tracking: -20`, que en Photoshop son milesimas de eme. */
export const TRACKING_EM = -0.02;

/**
 * Grosor de la negrita sintetica, en eme. Photoshop no dice cuanto engorda con
 * `FauxBold`, asi que sale de medir: la tinta de las mayusculas del PSD ocupa
 * 39 px de alto y la Bold a secas da 38, o sea medio pixel por lado. Se pinta
 * con un trazo centrado en el contorno, de ahi que el valor sea el doble.
 */
export const FAUX_BOLD_EM = 0.015;

/**
 * Lo que la negrita sintetica ensancha **el avance** de cada glifo. El trazo
 * del contorno engorda la letra pero no la separa de la siguiente, y Photoshop
 * si las separa: con el tracking a secas las dos lineas de la plantilla salian
 * 7 y 4 px cortas, que son 0,004 emes por hueco en las dos. Con esto puestas,
 * la tinta cuadra con el PSD dentro de un pixel.
 */
export const FAUX_BOLD_ADVANCE_EM = 0.004;

/** Altura de mayusculas de la SF Pro Display: sCapHeight 1443 / 2048 upm. */
export const CAP_RATIO = 0.70459;

/**
 * Caja de composicion del parrafo, del descriptor de tipo: BoxBounds 736 x la
 * escala horizontal 1.24321 = 915 px, pegada en x = 82. Su centro cae en
 * 539.5, y la tinta del PSD esta centrada en 539: es caja de texto, no texto
 * de punto, y va centrada en el lienzo.
 */
export const TEXT_MAX_W = 915;

/**
 * Aire entre el final de la cabecera y la cabeza de las mayusculas del rotulo.
 * El PSD deja 33 px, de los filetes (496) a la primera linea (529); aqui van 28
 * porque el rotulo se sube 5 px, y esos 5 se los lleva el video.
 */
export const TEXT_GAP_TOP = 33 - 5;

/**
 * Donde arranca la tinta del rotulo, siempre.
 *
 * El rotulo se ancla **por arriba**, no por su centro. Centrandolo, una sola
 * linea quedaba flotando en mitad de una cabecera pensada para dos y dejaba un
 * hueco muerto encima del video; anclado aqui, el bloque crece siempre hacia
 * abajo y es el degradado el que se aparta.
 */
export const TEXT_TOP = Math.round(ART_BOTTOM + TEXT_GAP_TOP);

/**
 * Aire entre el final del rotulo y el techo del hueco. Es lo que arrastra al
 * degradado de arriba cuando el rotulo crece o mengua.
 *
 * En el PSD hay 16 px de la ultima baseline (631) a la ventana (647), pero esa
 * 631 es la fila donde acaba la **tinta**, con sus bordes suavizados, y aqui el
 * bloque se mide con las metricas de la fuente, que dejan la baseline un par de
 * pixeles mas arriba. Estos 18 son aquellos 16 mas esa diferencia: con ellos el
 * caso de dos lineas abre la ventana exactamente en `VIDEO_Y`, como el PSD.
 */
export const TEXT_GAP_BOTTOM = 18;

/**
 * Techo de referencia del hueco: donde lo abre el rotulo de dos lineas al
 * cuerpo del PSD, que es el caso de la plantilla. Se usa cuando no hay rotulo
 * ninguno, que es cuando no hay nada a lo que seguir.
 *
 * Sale calculado y no medido a proposito: asi cualquier cosa que mueva la
 * cabecera —reducir el logo, subirla— lo arrastra sin tener que reajustarlo a
 * mano.
 */
export const VIDEO_Y = Math.round(
  TEXT_TOP + FONT_SIZE * LINE_RATIO + FONT_SIZE * CAP_RATIO + TEXT_GAP_BOTTOM,
);

/**
 * Hasta donde puede bajar la tinta del rotulo. No es una medida del PSD: es lo
 * que queda de empujar el techo del hueco hasta dejarlo en su minimo. Con el
 * cuerpo topado en 76 px caben once lineas antes de llegar aqui, asi que en la
 * practica el rotulo ya no se reduce nunca: lo que se mueve es el degradado.
 */
export const TEXT_MAX_BOTTOM = CANVAS_H - VIDEO_MIN_H - TEXT_GAP_BOTTOM;

/** `FillColor` del StyleRun: blanco puro. */
export const COLOR_TEXT = "#ffffff";

/**
 * Color de lo que va entre *asteriscos*, el mismo convenio que en news-maker y
 * en memegenerator. El PSD no lo usa, asi que por defecto va el rosa del logo,
 * medido sobre la propia capa `PLANTILLA` (el tono dominante de la mascota).
 */
export const COLOR_HIGHLIGHT = "#e9397e";

/**
 * El CTA: el reclamo que se pega **encima del video**, en una sola linea y
 * centrado a lo ancho. No es rotulo: no se pone en mayusculas, no entiende de
 * *asteriscos* y no empuja al degradado. Sale tal cual se escriba, asteriscos
 * incluidos, que es como se ve en la plantilla de la que salio.
 */
export const CTA_TEXT = "*reenvíaselo*";

/**
 * Cuerpo de partida, medido sobre esa plantilla: la linea ocupa alrededor de un
 * tercio del ancho del lienzo, bastante menos que el rotulo.
 */
export const CTA_FONT_SIZE = 48;
export const CTA_FONT_SIZE_MIN = 24;
export const CTA_FONT_SIZE_MAX = 96;

/**
 * Altura de partida, en tanto por uno del lienzo, del centro de las mayusculas
 * del CTA. De ahi en adelante lo mueve el raton, que es lo unico que lo mueve:
 * no hay barra. El 0,72 lo deja en la 1382, sobre el video y por encima de la
 * barra negra en casi cualquier encuadre.
 */
export const CTA_POS = 0.72;

/** Aire minimo entre la tinta del CTA y el filo del lienzo. */
export const CTA_MARGIN = 24;

/**
 * Lo que la zona de agarre del CTA sobresale de su tinta, por cada lado. Una
 * linea de 44 px de alto es un blanco muy fino para un dedo; con esto se coge
 * por donde parece que se coge.
 */
export const CTA_GRAB = 20;

/**
 * Color del CTA. Fijo: es el rosa de la plantilla, el mismo que el resaltado
 * del rotulo, y el reclamo va siempre de ese color.
 */
export const COLOR_CTA = COLOR_HIGHLIGHT;

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
 * La tipografia del rotulo. SF Pro Display Bold, servida por el propio repo en
 * `src/assets` y declarada en `style.css`, asi que sale igual en cualquier
 * equipo sin depender de lo que tenga instalado.
 */
export const FONT: Font = {
  family: "SF Pro Display",
  stack: '"SF Pro Display", system-ui, sans-serif',
  weight: 700,
};

export interface Swatch {
  label: string;
  hex: string;
}

/**
 * Paleta de la casa. El rosa de arriba es el del logo de esta plantilla, mas
 * claro que el `#cc1c65` de news-maker porque aqui la mascota lleva halo.
 */
export const COLORS: Swatch[] = [
  { label: "Blanco", hex: "#ffffff" },
  { label: "Rosa plantilla", hex: COLOR_HIGHLIGHT },
  { label: "Rosa Cabronazi", hex: "#cc1c65" },
  { label: "Amarillo", hex: "#ffde00" },
  { label: "Verde Cabrodeportes", hex: "#00ce5c" },
  { label: "Negro", hex: "#000000" },
];
