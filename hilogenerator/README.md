# hilogenerator

El **Hilo Generator**: el carrusel entero en una sola página. Una portada y las
slides que hagan falta, cada una con su imagen o su vídeo, a **1080 × 1440**
(3:4).

No hay PSD detrás. Las medidas salen de las dos piezas de referencia —la portada
«Otro año con polémicas…» y la slide «Un fallo impide completar…»— y están
todas en `src/format.ts`.

## Portada y slide

| | Portada | Slide |
| --- | --- | --- |
| Letra | Anton | Poppins Bold |
| Caja | todo en mayúsculas | tal cual se escriba |
| Alineación | centrada | a la izquierda |
| Cuerpo de partida | 113 px | 64 px |
| Resaltado (`*así*`) | otro color **y más grande** (137 %) | solo otro color |

El hilo arranca con una portada y lo que se añade con el `+` son slides, pero el
tipo se cambia en cualquier pieza.

## El texto y su difuminado

El texto va **abajo**. Arriba es opcional: sale al abrir el apartado «Texto
superior» y se quita al plegarlo.

Cada texto trae su banda: negro macizo detrás de las letras y un difuminado en
el filo que da a la imagen. **Solo hay banda donde hay texto** —abajo con el de
abajo, arriba con el de arriba—, y sin texto la imagen llega al borde.

La imagen se encaja en la ventana que queda entre las bandas, así que mover un
margen o alargar un texto la reencuadra sola.

## Lo que se mueve

- **Márgenes**: inferior, superior y lateral, con su barra. El inferior y el
  superior también arrastrando el texto sobre la vista previa.
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

Soltar o elegir varios archivos de una vez abre una slide por archivo.

## Archivos

| Archivo | Qué hay dentro |
| --- | --- |
| `src/format.ts` | Lienzo, letras, cuerpos, márgenes y bandas. |
| `src/render.ts` | Composición del texto, bandas, encuadre y dibujo. |
| `src/main.ts` | El hilo, la tira de piezas, los gestos y la exportación. |
