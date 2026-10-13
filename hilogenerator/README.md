# hilogenerator

El **Hilo Generator**: el carrusel entero en una sola página. Una portada y las
slides que hagan falta, cada una con su imagen o su vídeo, a **1080 × 1350**
(4:5).

No hay PSD detrás. Las medidas salen de las dos piezas de referencia —la portada
«Otro año con polémicas…» y la slide «Un fallo impide completar…»— y están
todas en `src/format.ts`. Las referencias son 3:4 (1080 × 1440); el texto, los
márgenes y la banda se conservan tal cual y los 90 px de diferencia salen de la
ventana de la imagen.

## Portada y slide

| | Portada | Slide |
| --- | --- | --- |
| Letra | Anton | Poppins Bold |
| Caja | todo en mayúsculas | tal cual se escriba |
| Alineación | centrada | a la izquierda |
| Cuerpo de partida | 101 px | 64 px |
| Al pie | la flecha rosa | nada |

El hilo arranca con una portada y lo que se añade con el `+` son slides, pero el
tipo se cambia en cualquier pieza.

## Las dos marcas del texto

Son independientes y se pueden anidar:

- `*resaltado*` cambia **el color**. El tamaño no lo toca.
- `+destacado+` cambia **el tamaño**, lo que diga la barra «Tamaño del
  +destacado+» (167 % de partida). El color no lo toca.

```
+*Es oficial:*+
Habrá *huelga general*
el 11 de noviembre
```

«ES OFICIAL:» sale grande y amarillo; «HUELGA GENERAL», amarillo al cuerpo de su
línea. Un `+` o un `*` suelto, sin pareja que lo cierre, se escribe tal cual.

## El texto y su difuminado

El texto va **abajo**. Arriba es opcional: sale al abrir el apartado «Texto
superior» y se quita al plegarlo.

Cada texto trae su banda: negro macizo detrás de las letras y un difuminado en
el filo que da a la imagen. **Solo hay banda donde hay texto** —abajo con el de
abajo, arriba con el de arriba—, y sin texto la imagen llega al borde.

La imagen se encaja en la ventana que queda entre las bandas, así que mover un
margen o alargar un texto la reencuadra sola.

En la portada, la flecha cuelga de la última línea: sube y baja con el texto.

## Añadir la imagen o el vídeo

Pulsando la vista previa mientras está vacía, con el botón del panel, soltando
el archivo en cualquier parte de la ventana o pegándolo del portapapeles
(Ctrl+V). Varios archivos de una vez abren una slide por archivo.

## Lo que se mueve

- **Márgenes**: inferior, superior y lateral, con su barra. El inferior y el
  superior también arrastrando el texto sobre la vista previa.
- **Negro sobre el texto**: cuánto negro macizo queda entre el texto y el
  difuminado, o sea, dónde empieza a verse la imagen.
- **Imagen o vídeo**: se arrastra para encuadrar; la rueda o el pellizco lo
  amplían por donde se apunta. Se voltea con el botón de la esquina.
- **Cuerpo de letra**: con su barra, o con la rueda y el pellizco sobre el texto.

## Vídeo

Las mismas herramientas que el Video Meme Generator, y el mismo motor
(`comun/encode.ts`): reproducir la previa, elegir fotograma, **recortar** el
tramo, **voltear** y montar el MP4 en el navegador con ffmpeg. Una pieza con
vídeo sale en MP4; el resto, en PNG.

## Generar

«GENERA EL HILO» monta todas las piezas en orden y las deja abajo, cada una con
su descarga y un «Descargar todo». Los archivos salen numerados
(`hilo-01-portada.png`, `hilo-02.mp4`…), que es el orden del carrusel.

Los textos de todo el hilo se revisan con LanguageTool en una sola consulta.

## Archivos

| Archivo | Qué hay dentro |
| --- | --- |
| `src/format.ts` | Lienzo, letras, cuerpos, márgenes y bandas. |
| `src/render.ts` | Composición del texto, bandas, encuadre y dibujo. |
| `src/main.ts` | El hilo, la tira de piezas, los gestos y la exportación. |
