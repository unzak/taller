# memegenerator

Generador de memes rotulados: una **banda con el texto arriba** y la **foto
debajo**. Sin logo y sin plantilla fija, al contrario que
[news-maker](../news-maker), que reproduce el PSD de las noticias de Cabronazi.

El lienzo es siempre **1080 × 1350**, el 4:5 de Facebook.

## Uso

1. Escribe el **rótulo**. Lo que envuelvas en `*asteriscos*` sale en el color de
   resaltado, igual que en news-maker.

   La **alineación** puede ser centrada o a la izquierda. A la izquierda el
   bloque sigue centrado en el lienzo y son las líneas las que se alinean entre
   sí, tomando como referencia la más larga: nunca se pega al margen salvo que
   esa línea ocupe todo el ancho de composición.
2. Ajusta el **tamaño de letra**. Manda el tamaño: **la banda se adapta** a lo
   que ocupe el texto, no hay un alto reservado de antemano.

   La tipografía es siempre **SF Pro Display Medium**, que sirve el propio repo,
   así que sale igual en cualquier equipo sin depender de lo que tenga
   instalado. No es una negrita — Medium es peso 500 —, así que el rótulo se ve
   ligero a propósito.
3. Mete la **foto** soltándola directamente sobre la vista previa — vale
   soltarla en cualquier parte de la página. Mientras no haya ninguna, la previa
   se muestra punteada y pulsándola se abre el selector de archivo; también hay
   un botón «Elegir archivo…» en el panel, y **Ctrl+V** pega la del
   portapapeles.
4. Ajusta el **encuadre** con la barra que hay bajo el botón de la imagen. Como
   el lienzo no se mueve, lo que la banda ocupa se lo quita al hueco de la foto,
   y la foto se recorta para llenarlo. La barra hace zoom, y arrastrando sobre
   la vista previa la mueves.
5. Cambia los **colores** si quieres. El apartado va plegado, porque casi
   siempre son los mismos: se despliega pulsando en su título. Dentro, banda,
   texto y resaltado, cada uno con las muestras de la paleta de la casa además
   del selector libre. El rosa es el de Cabronazi y el verde el de
   Cabrodeportes, los mismos `#cc1c65` y `#00ce5c` de news-maker.
6. **GENERA**, y abajo aparece la imagen con el botón de descarga. Antes de la
   imagen sale la revisión del texto con
   [LanguageTool](https://languagetool.org): ortografía y gramática en español,
   con la frase corregida propuesta y un botón **CORREGIR** que la aplica y
   rehace la imagen. Nunca corrige solo ni impide generar, porque a veces la
   errata es el chiste.

En escritorio la vista previa acompaña al scroll, así que los controles de más
abajo se tocan viendo lo que le pasa al rótulo. En móvil no, que ahí las dos
columnas van apiladas.

En el móvil aparece una **miniatura flotante** arriba a la derecha, colgada de
la barra de herramientas, en cuanto hay foto: sirve para ir viendo el resultado
mientras se escribe el rótulo. Se retira sola al llegar al apartado de la vista previa,
se cierra con la ✕ (y ya no vuelve en esa sesión), y tocándola salta a la previa
completa.

Va arriba y no abajo a la derecha, que es donde estaba en news-maker: ahí
descansa el pulgar, y por ese filo entran GENERA y el botón de descarga, así que
tapaba justo lo que se iba a pulsar.

La **rueda del ratón** y el **pellizco de dos dedos** actúan sobre lo que haya
debajo, como en news-maker: encima de la foto hacen zoom de la foto, y encima
del rótulo cambian el tamaño de la letra. Al pellizcar la foto, el punto medio
de los dedos arrastra a la vez, así que se coloca y se dimensiona en un solo
gesto. Arrastrar solo mueve la foto: el rótulo va siempre centrado en su banda.
El encuadre está topado para que la foto no deje nunca hueco, y se recorta en
cada dibujo, así que tampoco escribir puede descolocarla.

Si no escribes nada, no hay banda y sale la foto sola. Si dejas una línea en
blanco entre dos párrafos, la banda la respeta.

## La revisión del texto

Se consulta el API pública de LanguageTool **solo al pulsar GENERA**, nunca por
su cuenta: sus condiciones piden expresamente que no se manden peticiones
automáticas, y una pulsación tuya no lo es. Además se guarda el último texto
revisado, así que generar cuatro veces mientras cambias colores no gasta ni una
consulta de más: es **una petición por texto distinto**.

Tampoco estorba: la imagen se compone al instante y la revisión llega después.
Si el servicio tarda o está caído, lo dice y ya está.

No se avisa de **mayúsculas**: las reglas de la categoría `CASING` se descartan,
porque un rótulo empieza en minúscula o va entero en caja alta cuando al meme le
conviene, no cuando lo dice la norma. Eso no toca las tildes — un texto en
mayúsculas sigue avisando de que «ESTA» del verbo estar lleva tilde.

Y cada sugerencia se devuelve **con la caja de la palabra que sustituye**. Hace
falta porque en inicio de frase LanguageTool capitaliza la sugerencia aunque lo
escrito vaya en minúscula: «ortografia» devuelve «Ortografía». Sin eso, corregir
una errata de la primera palabra te cambiaba además la mayúscula. Filtrar
`CASING` no cubría este caso, porque el aviso viene de la regla de erratas, no
de la de mayúsculas.

La propuesta de corrección respeta los `*asteriscos*` del resaltado. Se quitan
para consultar, pero se guarda de dónde salió cada carácter, así que al aplicar
el arreglo vuelven a su sitio pegados a la palabra corregida.

Sus condiciones obligan a un enlace visible a languagetool.org sin
`rel="nofollow"`, que va junto al aviso.

Si algún día levantas un LanguageTool propio (es LGPL y hay imagen de Docker),
basta cambiar `ENDPOINT` en `src/spell.ts`: ahí se caen los límites, las
condiciones y el enlace obligatorio.

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

## Estructura

| Archivo | Qué hay dentro |
| --- | --- |
| `src/assets/` | La SF Pro, reducida a Latin y en woff2 (54 KB). |
| `src/format.ts` | Las medidas, la tipografía y la paleta. Es lo único que hay que tocar para cambiar el diseño. |
| `src/render.ts` | El ajuste del texto y el dibujo sobre el lienzo. No toca el DOM. |
| `src/main.ts` | La interfaz: carga de foto, encuadre, colores y descarga. |
| `src/spell.ts` | La consulta a LanguageTool. No toca el DOM. |

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
el PNG que se descarga no se entera de nada. Lo único que cambió de sitio es la
cuadrícula de detrás del lienzo, ahora en rosa claro: sigue estando para ver
dónde acaba una foto clara sobre la banda blanca.

## Pendiente

- **Medir la referencia.** Lo que hizo que news-maker saliera clavado fue medir
  el PSD en vez de estimar. Aquí los márgenes y el cuerpo son de diseño, así que
  si aparece una referencia hay que volver a medir sobre ella.
