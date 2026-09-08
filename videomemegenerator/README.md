# videomemegenerator

Generador de video memes de Cabronazi: coges un vídeo, escribes el rótulo, lo
encuadras, y sale el **MP4 de 1080 × 1920** listo para reels, shorts y TikTok.

Reproduce `VIDEO MEME NUEVO.psd`: el marco negro con el logo y los filetes, el
rótulo donde va la capa `TEXTO`, y el vídeo asomando por el hueco de la ventana
con sus bordes desvanecidos.

Con una diferencia: **el hueco no está clavado por ningún lado**. Los dos
degradados siguen a lo que tienen al lado —el de arriba sube y baja con el
rótulo, el de abajo va pegado al filo inferior del vídeo—, y el bloque de arriba
va 52 px más alto que en el PSD. El logo y los filetes no se mueven.

**Todo ocurre en el navegador.** No hay servidor y no hay nada que instalar: el
montaje lo hace una build de ffmpeg compilada a WebAssembly, así que la página
publicada funciona sola.

## Uso

1. Escribe el **rótulo**. Sale siempre en mayúsculas, como en el PSD. Lo que
   envuelvas en `*asteriscos*` sale en el color de resaltado, igual que en
   news-maker y memegenerator.
2. Ajusta el **tamaño de letra** si quieres. Viene puesto el del PSD, 52,3 px.
   **El degradado de arriba va donde acabe el rótulo**: con dos líneas cae
   exactamente donde el PSD lo pone, con tres baja para dejarles sitio en vez de
   encoger la letra, y con una sola sube 63 px, porque no hay razón para
   guardarle a una línea el hueco de dos. La letra solo se reduce si llegase a
   dejar la ventana por debajo de su mínimo, cosa que con el cuerpo topado en
   76 px no pasa hasta las once líneas.
3. Suelta el **vídeo** en cualquier parte de la página —no hay que apuntar a
   ninguna caja— o elígelo con el botón.
4. Si el primer fotograma sale en negro —que pasa a menudo—, recórrelo con la
   **barra que hay bajo la previa**. El **play** de su izquierda reproduce el
   montaje entero, con sonido, para verlo en movimiento. Recorrerla no le
   recorta nada al vídeo: solo cambia lo que se ve mientras encuadras.
5. La **barra de las tijeras**, justo debajo, es el recorte. Sus dos extremos se
   arrastran, o se afinan con las flechas del teclado —una décima por pulsación,
   un segundo con Mayúsculas— y al moverlos la previa salta a ese punto para ver
   por dónde estás cortando. La barra de reproducción **se queda encerrada entre
   los dos**, así que lo que recorres, y lo que reproduce el play, es exactamente
   lo que se va a exportar. Sin tocarlos abarca el vídeo entero y no se recorta
   nada.
6. El icono de las flechas, **abajo a la derecha de la previa**, voltea el vídeo
   en horizontal. No mueve el encuadre: solo da la vuelta a la imagen dentro de
   él.
7. Ajusta el **tamaño del vídeo** con la barra. **El margen negro de abajo se
   adapta solo**: al ampliar, el vídeo baja y el margen se encoge, hasta llegar
   al borde del lienzo y desaparecer; al reducir, vuelve a crecer. Arrastrando
   sobre la vista previa lo mueves; si es más largo que el hueco lo recorres de
   arriba abajo, y el encuadre está topado para que no deje nunca hueco.
8. Si quieres **más margen abajo** del que sale solo, súbelo con la barra de
   **margen inferior**. Es opcional: en cero es automático. Lo que elijas se
   readapta al cambiar el tamaño del vídeo, porque los dos extremos de esa barra
   salen del encuadre — el mismo punto vale 195 px con el vídeo al 100 % y 802
   con el vídeo al 200 %.
9. Cambia los **colores** si quieres. El apartado va plegado, porque casi
   siempre son los mismos. En escritorio la previa acompaña al scroll, así que
   el selector se toca mirando el resultado.
10. Pon el **CTA** si quieres: el reclamo que se pega sobre el vídeo, en una
    línea, centrado y en el rosa de la plantilla, que es siempre el mismo.
    **Abrir el apartado es ponerlo y plegarlo es quitarlo**; no hay casilla que
    marcar. Viene escrito `*reenvíaselo*`, que sale **tal cual**, con sus
    asteriscos: ahí no valen como marca de resaltado, son parte del dibujo.
    Se **arrastra sobre la vista previa** para subirlo y bajarlo —solo eso: a
    lo ancho va centrado y punto—, y la rueda o el pellizco le cambian el
    cuerpo, que también tiene su barra.
11. **GENERA**. La primera vez tarda más porque se descarga el motor de vídeo
    (unos 30 MB, luego queda en caché). Abajo aparece el resultado con el botón
    de descarga.

En el móvil aparece una **miniatura flotante** arriba a la derecha, colgada de
la barra de herramientas, en cuanto hay vídeo: sirve para ir viendo el resultado
mientras se escribe el rótulo. Se retira sola al llegar al apartado de la vista previa,
se cierra con la ✕ (y ya no vuelve en esa sesión), y tocándola salta a la previa
completa.

Va arriba y no abajo a la derecha, que es donde estaba en news-maker: ahí
descansa el pulgar, y por ese filo entran GENERA y el botón de descarga, así que
tapaba justo lo que se iba a pulsar.

La **rueda del ratón** y el **pellizco de dos dedos** actúan sobre lo que haya
debajo, como en news-maker: encima del hueco hacen zoom del vídeo, encima del
marco cambian el tamaño de la letra, y encima del CTA el suyo. Arrastrando pasa
lo mismo: sobre el hueco se mueve el encuadre y sobre el CTA se mueve el CTA.

El zoom del vídeo va **anclado al puntero**: lo que tienes debajo del ratón se
queda donde está y la imagen crece por ahí. Escalando desde el centro del lienzo
—que es lo que hacía antes— lo que estabas mirando se te iba de la pantalla y
tocaba ampliar y volver a colocar, una y otra vez. Solo se desvía cuando el
encuadre topa con el borde, porque ahí manda el tope de no dejar hueco. Al
pellizcar, el ancla es el punto medio de los dedos, que además arrastra, así que
se coloca y se dimensiona de un solo gesto. Y desde la barra, que no apunta a
nada, el ancla es el centro de lo que se ve.

## Calidad

El vídeo hay que recodificarlo, porque le estamos quemando el rótulo encima. Se
hace en H.264 con **CRF 18**, que es donde la recodificación deja de
distinguirse del original a simple vista.

El **audio se copia tal cual**, bit a bit, sin tocarlo. Solo se recodifica a AAC
si el contenedor no lo admite, que en la práctica pasa con los `.webm`, porque
suelen traer Opus.

Lo que de verdad se nota es otra cosa: el hueco ocupa siempre los **1080 px** de
ancho del lienzo, así que un vídeo más estrecho se amplía para cubrirlo. Si te
avisa de que se verá pixelado, es por eso, y no hay recodificación que lo
arregle.

## Requisitos

- Node.js >= 20

```bash
npm install
```

## Desarrollo

```bash
npm run dev
```

## Publicar

```bash
npm run build
```

La build sale en `dist/` con rutas relativas, así que funciona tanto en GitHub
Pages como abriendo el HTML directamente. El workflow de `.github/workflows`
despliega a Pages en cada push a `main`.

## De dónde salen las medidas

Todo lo de `src/format.ts` está medido sobre `VIDEO MEME NUEVO.psd`, no puesto a
ojo. Si cambia la plantilla hay que volver a medirlo, porque son valores que no
se adivinan mirando la imagen:

| Dato | Valor | Origen |
| --- | --- | --- |
| Lienzo | 1080 × 1920 | cabecera del PSD |
| Techo del hueco | y = 647 | capa `PLANTILLA`: última fila opaca antes de la ventana |
| Fin del logo y los filetes | y = 496 | tinta de la capa `PLANTILLA` |
| Degradado de arriba | 156 px | y 647 … 802 en el PSD, de alfa 255 a 0 |
| Degradado de abajo | 157 px | y 1355 … 1511 en el PSD, de alfa 0 a 255 |
| Ventana limpia del PSD | y 803 … 1355 | el tramo con alfa 0 |
| Fuente | SF Pro Display Bold, 52,28 px | `FontSize` 42 × escala 1,24484 de la capa |
| Negrita sintética | sí | `FauxBold: true` sobre la Bold |
| Mayúsculas | siempre | `FontCaps: 2` |
| Interlineado | 62,74 px | `AutoLeading` 1,2 × cuerpo; baselines del PSD en 568 y 631 |
| Tracking | −20 / 1000 eme | `Tracking` del `StyleRun` |
| Ancho de párrafo | 915 px | `BoxBounds` 736 × escala 1,24321 |
| Arranque del rótulo | 33 px bajo los filetes | tinta del PSD: filetes hasta 496, mayúsculas desde 529 (aquí se aprietan a 28) |
| Aire bajo el rótulo | 16 px | de la última baseline (631) al techo del hueco (647) |
| Color | `#ffffff` | `FillColor` del `StyleRun` |

Comparado píxel a píxel con la referencia exportada del PSD, el marco entero
(logo, filetes y fondo) sale con **0 de diferencia**, y en la banda del rótulo
solo quedan los bordes de las letras, que es donde el rasterizador de Chrome no
puede coincidir con el de Photoshop.

Seis trampas que costaron encontrar, por si alguien vuelve por aquí:

- **El vídeo tiene que llegar por debajo de los degradados, no hasta el borde de
  la ventana limpia.** El alfa de la plantilla no cae a cero de golpe: baja de
  255 a 0 entre 647 y 802, y vuelve a subir a lo largo de 157 px. Si el vídeo se
  corta donde empieza el desvanecido, este deja pasar medio degradado sobre nada
  y se ve un corte cruzando el ancho entero. Por eso el borde de arriba del
  vídeo va siempre por encima de 647, y el degradado de abajo se coloca de modo
  que su fila opaca caiga justo en el filo inferior.
- **La negrita sintética también ensancha el avance.** Emularla solo con un
  trazo sobre el contorno engorda la letra pero no la separa de la siguiente, y
  Photoshop sí las separa: las dos líneas de la plantilla salían 7 y 4 px
  cortas. Son 0,004 emes por hueco en las dos, así que van sumadas al tracking.
- **`letterSpacing` mete el espacio detrás de cada carácter, también del
  último.** Con el tracking negativo del PSD, `measureText` devuelve una cola de
  menos que descentraría el rótulo medio píxel si no se descuenta.
- El alfa de la plantilla es **función pura de la fila**: no varía a lo ancho.
  Eso es lo que permite recortar los degradados y pegarlos en otro sitio sin que
  se note ninguna costura.
- **Los `pointerup` hay que escucharlos en `window`, no en el lienzo.**
  Soltando el ratón fuera de la previa —que pasa constantemente al arrastrar
  hasta el borde— el lienzo no se entera, y ese puntero se queda anotado para
  siempre: a partir de ahí el mapa de punteros nunca vuelve a estar vacío,
  cualquier pulsación cuenta como segundo dedo y todo gesto se toma por un
  pellizco. El síntoma es que el vídeo deja de poder moverse y encima el zoom se
  mueve solo, y no se arregla hasta recargar.
- **El ajuste del cuerpo hay que buscarlo, no calcularlo por proporción.** Al
  subir el tamaño llega un momento en que una línea deja de entrar en la caja y
  el rótulo pasa de dos líneas a tres; encoger entonces por la altura que ocupan
  tres devuelve un cuerpo al que vuelven a caber dos, mucho más pequeño del que
  de verdad cabría. Se veía como que ampliar de más empequeñecía el texto. Se
  busca por bisección el mayor cuerpo que cabe, que depende solo del texto, así
  que subir el deslizador nunca puede achicar el rótulo.

## Un hueco que no está clavado

El PSD deja la ventana entre 647 y 1511. Aquí los dos bordes se mueven, cada uno
siguiendo a lo que tiene al lado.

**El techo lo pone el rótulo.** El bloque de texto va anclado **por arriba**, a
28 px de la cabecera —el PSD deja 33 y aquí se aprietan 5, que se los lleva el
vídeo—; de ahí crece hacia abajo, y
el degradado se pone justo detrás. Con dos líneas cae exactamente donde el PSD lo
puso. Con tres baja para dejarles sitio, en vez de encoger la letra — encoger la
letra es lo que hace que un titular de tres líneas se lea peor que el vídeo que
lleva debajo. Y con una sola línea **sube**, 63 px, porque centrando el bloque una
línea se quedaba flotando en una cabecera pensada para dos y le robaba al vídeo un
hueco que no usaba nadie.

El aire de debajo son 18 px y no los 16 del PSD. La diferencia no es de diseño:
los 16 del PSD van de la última baseline (631) a la ventana (647), pero esa 631 es
la fila donde acaba la **tinta**, con sus bordes suavizados, y aquí el bloque se
mide con las métricas de la fuente, que dejan la baseline un par de píxeles más
arriba. Con 18, el caso de dos líneas abre la ventana clavada en su sitio.

**El suelo lo pone el vídeo.** La escala base es el **encaje a lo ancho**: el
hueco ocupa siempre los 1080 px del lienzo, y el tamaño solo decide cuánto baja.
El filo inferior del vídeo marca dónde se pega el degradado de abajo y dónde
arranca el margen negro, topado al borde del lienzo. Un 16:9 al 100 % deja 608 px
de hueco y 665 de margen; al 250 % llega abajo del todo y no queda margen. La
barra de **margen inferior** sube ese filo a mano si se quiere más negro, y como
sus dos extremos salen del encuadre, lo elegido se readapta al cambiar el tamaño.

**El degradado de abajo nunca es más alto que el negro al que funde.** Si el
vídeo llega al borde del lienzo no hay margen ninguno, así que no se pinta: ahí
el desvanecido no fundiría nada, sólo oscurecería imagen. Y como se va
comprimiendo con el margen —97 px de margen dan 79 de desvanecido, 36 dan 30—,
ampliar el vídeo hasta llenar el hueco no da ningún salto.

**A lo alto el vídeo se mueve libre, en los dos sentidos.** Como los dos
degradados van pegados a sus filos, subirlo agranda el margen de abajo y bajarlo
agranda el marco de arriba, y ninguna de las dos cosas deja un corte: el
degradado de arriba se pega al filo del vídeo en cuanto este baja del techo. El
único tope es no cerrar la ventana, que nunca baja de `VIDEO_MIN_H`.

A lo ancho no hay libertad que dar: el hueco ocupa el lienzo entero, así que
mover el vídeo de lado solo puede destapar negro por un costado. Solo se puede
desplazar lo que sobre del encaje.

**Y el bloque de arriba va 65 px más alto que en el PSD, con el logo al 80 %.** Por encima del logo el
PSD deja 347 px de negro vacío que no pintan nada, y subiendo el bloque ese aire
se le regala al vídeo. Es el único número del `format.ts` que no sale de medir,
así que está suelto en `HEADER_LIFT` para poder moverlo de un sitio: con 0 la
composición vuelve a ser la del PSD, clavada.

El tope de ese número no es el borde del lienzo, es el del **feed de Instagram**,
que recorta la pieza a 4:5 y se come las 285 primeras filas. Con 65, y con el
logo ya reducido, la cola del halo llega justo a esa 285; la tinta sólida del
logo empieza en la 292, siete por debajo del corte. Ahí ya no queda margen.

**El logo se dibuja al 80 %, y los filetes no.** Se puede porque en el PNG no se
solapan ni por un píxel —la tinta del logo ocupa x 459…617, los filetes van de 74
a 458 y de 618 a 1002—, así que el marco se repinta con un relleno negro (que es
lo que hay ahí en el PSD) y las dos piezas se pegan encima por separado. Escalar
la banda entera habría acortado también los filetes, que es otra cosa. Entre el
final de cada filete y el logo quedan 16 px, que el halo cubre de sobra.

Reducirlo devuelve 14 px por arriba, porque al escalar desde el centro el borde
superior baja; `ART_LIFT` sube la cabecera esos mismos 14 para que el logo
arranque donde arrancaba y la reducción entera se convierta en sitio para el
vídeo.

**El degradado de arriba se pinta comprimido**, 90 px en vez de los 156 del PSD.
Los 156 se comían media cabecera antes de que el vídeo se viera entero; con 90 la
entrada es mucho más corta y esa diferencia —77 px medidos— se gana de imagen. Se
comprime, no se recorta: pintándolo más bajo, el desvanecido conserva su curva
entera y solo pasa más deprisa. Recortando filas se quedaría a medias y el corte
se vería cruzando el ancho.

Para todo esto la plantilla se dibuja **en cuatro piezas** en vez de como un PNG
de una sola: el bloque de arriba, subido; negro macizo hasta el techo de verdad;
los dos degradados, recortados del propio PNG y pegados cada uno a su borde; y
negro macizo del filo de abajo al final del lienzo. Recortarlos del PNG en vez de
repintarlos es lo que mantiene el desvanecido exactamente igual que en el PSD
esté donde esté.

## El CTA va por libre

El rótulo manda sobre la composición: al crecer empuja el degradado y le come
sitio al vídeo. El CTA no. Se compone al final, encima de todo lo demás, y no
se entera de nada: ni mueve el hueco, ni le importa cuántas líneas tenga el
rótulo, ni se aparta de la barra negra. Es una línea suelta que se pega donde
se le diga.

Por eso su ajuste es el simple: no hay saltos de línea que calcular, así que si
no cabe en la caja de composición —los mismos 915 px del rótulo— se encoge **en
proporción**, y ahí la proporción sí vale, porque sin líneas que repartir el
ancho crece con el cuerpo y ya está.

La altura se pide como el centro de sus mayúsculas, en tanto por uno del
lienzo, y se topa para que ni la cabeza ni las descendentes se salgan. De ahí
que subir el cuerpo con el mando al final del recorrido aparte el reclamo del
filo en vez de cortarlo.

Y no lleva la negrita sintética del PSD ni su tracking negativo: eso es del
rótulo, que va en mayúsculas y a 52 px. Con un cuerpo pequeño el trazo del
contorno emborrona las minúsculas y el tracking las junta de más.

Se coge **antes que el hueco**, porque cae justo encima: es una pieza suelta
puesta sobre el vídeo, y lo de arriba se agarra primero. Su zona de agarre sale
de la propia composición —la tinta más 20 px por lado, que una línea de 44 px de
alto es un blanco muy fino para un dedo—, así que lo que se coge es exactamente
lo que se ve, mida lo que mida y esté donde esté.

## Cómo se monta el MP4

El navegador dibuja la plantilla y el rótulo en un canvas de 1080 × 1920 sobre
transparente, y ffmpeg lo pega encima del vídeo. **La previa y la pieza final
salen del mismo dibujo**, así que lo que se ve es literalmente lo que se monta;
el rectángulo del vídeo se redondea a enteros en `computeLayout` y se le pasa a
ffmpeg tal cual, para que las dos no puedan redondear distinto.

La cadena de filtros es una sola línea: escalar, quitar lo que se sale, colocar
sobre el lienzo negro y superponer la plantilla.

El **volteo** entra como un `hflip` **después de escalar y antes de recortar**,
que es justo donde lo pone la previa: espeja el vídeo dentro de su rectángulo,
así que el encuadre no se mueve. Volteando antes de escalar, el recorte caería
en el lado contrario.

El **recorte** va en `-ss` y `-to` **antes del `-i`**, así que ffmpeg ni
descodifica lo que se tira: solo lee el tramo pedido. Como el vídeo se
recodifica de todas formas, el corte cae en el fotograma exacto y no en el
keyframe anterior. El audio, que se copia, solo puede cortar en frontera de
paquete: en la prueba, un recorte de 3,0 s salió de 2,97, y el audio sobrevivió
copiado tal cual. Lo que el vídeo se salga por
arriba o por abajo no hay que recortarlo: la plantilla es negro opaco en esas
dos zonas y lo tapa igual, tanto en la previa como en el montaje.

Cuatro cosas que no son opcionales, y que fallan de formas poco evidentes:

- **El core de ffmpeg tiene que ser la build `esm`, no la `umd`.** El worker se
  crea con `type: "module"`, y ahí no existe `importScripts`, que es lo único
  con lo que se puede cargar la UMD. `@ffmpeg/ffmpeg` tiene un respaldo que
  cambia solo a `esm`, pero solo salta si no le has dado ninguna URL; si le
  pasas la de la UMD, la intenta importar y falla con un escueto
  `failed to import ffmpeg-core.js`.
- **El worker hay que empaquetarlo con Vite** y pasarlo en `classWorkerURL`. Por
  su cuenta, `@ffmpeg/ffmpeg` lo busca en `new URL("./worker.js",
  import.meta.url)`, y como Vite reescribe el módulo a `node_modules/.vite/deps`
  ahí no hay ningún `worker.js`: el Worker no llega a arrancar, nadie contesta al
  mensaje de carga y `load()` se queda colgado **para siempre, sin un solo error
  en la consola**. Por eso `vite.config.ts` lleva `worker.format: "es"`.
- **`setsar=1` después de `scale`.** Al recortar cambiamos la proporción a
  propósito, y `scale` intenta conservar la del original metiendo un píxel no
  cuadrado: sin eso el MP4 sale marcado como 865:1538 en vez de 9:16 y los
  reproductores lo estiran.
- **`-fps_mode vfr`.** Un origen sin cadencia fija se convierte en un montaje
  eterno. Los `.webm` de MediaRecorder, por ejemplo, declaran una base de
  tiempos de 1/1000 y ffmpeg deduce que van a 1000 fps: entonces duplica
  fotogramas hasta llenar esa cadencia y un clip de 46 se codifica como 1840.
  Con `vfr` respeta las marcas de tiempo del original y no duplica ni descarta
  ninguno, así que un 30 fps sigue saliendo a 30 fps y un 60 fps a 60.

En la consola queda el log de ffmpeg, en nivel `debug`, que es lo único que dice
por dónde va un montaje cuando se atasca. El `Aborted()` del final **no es un
fallo**: es el `exit()` normal de Emscripten cuando ffmpeg termina, y sale
también en los montajes que van bien.

Se usa la build de **un solo hilo** a propósito. La multihilo necesita
`SharedArrayBuffer`, que solo se habilita con las cabeceras COOP/COEP, y GitHub
Pages no deja poner cabeceras. Sería unas tres veces más rápida, pero no se
puede servir.

El `.wasm` son 32 MB, así que se carga desde unpkg con la versión clavada en vez
de meterlo en el repo. Para servirlo del propio dominio, copia `ffmpeg-core.js`
y `ffmpeg-core.wasm` de `@ffmpeg/core/dist/esm` a `public/ffmpeg/` y cambia
`CORE_BASE` en `src/encode.ts` por `./ffmpeg`.

## Los assets

`src/assets/overlay.png` es la capa `PLANTILLA` extraída con su alfa, tal cual:
48 KB, de los que casi todo es el logo con su halo. El resto es negro y
degradado, que el PNG comprime a nada.

La tipografía es **SF Pro Display Bold**, servida por el propio repo, así que
sale igual en cualquier equipo sin depender de lo que tenga instalado. El `.otf`
original pesa 5,1 MB porque trae 30.853 glifos; aquí va reducido a Latin y en
woff2, 51 KB, sin perder acentos, eñes, ¿¡, comillas angulares ni el símbolo del
euro.

## Estructura

| Archivo | Qué hay dentro |
| --- | --- |
| `src/assets/` | La plantilla del PSD y la SF Pro. |
| `src/format.ts` | Las medidas del PSD, la tipografía y la paleta. Es lo único que hay que tocar para cambiar el diseño. |
| `src/render.ts` | El ajuste del rótulo y del CTA, y el dibujo sobre el lienzo. No toca el DOM. |
| `src/encode.ts` | ffmpeg en WebAssembly: de la plantilla y el rectángulo al MP4. |
| `src/main.ts` | La interfaz: carga del vídeo, encuadre, colores, CTA y descarga. |

## Aspecto

La página lleva el mismo aire que el panel
[Pulso Viral](https://github.com/unzak/noticias-virales): fondo rosa muy claro
con dos degradados anclados a la ventana, papel blanco con sombra rosada, el
rosa `#ed1470` de acento, Inter en la interfaz y una cabecera con el rótulo del
punto, el icono y el titular grande.

Arriba va el menú de las tres herramientas, pegado al borde superior: la
abierta en la pastilla rosa y las otras dos a un clic. Los enlaces apuntan a
GitHub Pages, así que sirviendo en local solo responde en `localhost` la que
tengas levantada; las otras saltan a la publicada. Por debajo de 560 px se
quedan los nombres cortos, que los tres enteros no caben.

Es solo la piel. Los colores viven en las variables de `src/style.css`, así que
el MP4 que se monta no se entera de nada. La cama del vídeo sigue siendo oscura
a propósito (`--ink`): la imagen se juzga sobre negro de estudio, no sobre rosa.

## Parientes

- [news-maker](../news-maker) — las noticias de Cabronazi, 1080 × 1350, también
  clavado sobre su PSD.
- [memegenerator](../memegenerator) — la banda con el texto arriba y la foto
  debajo, sin plantilla fija.
