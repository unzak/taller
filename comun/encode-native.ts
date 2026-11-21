import {
  ALL_FORMATS,
  BlobSource,
  BufferTarget,
  Conversion,
  Input,
  Mp4OutputFormat,
  Output,
  QUALITY_VERY_HIGH,
  canEncodeVideo,
} from "mediabunny";
import type { EncodeHandlers, EncodeJob } from "./encode.js";

/**
 * El motor rapido: el codificador de video del propio navegador (WebCodecs),
 * que tira de la tarjeta grafica. Mediabunny abre el archivo —MP4, MOV, WebM—
 * y nos da los fotogramas uno a uno; cada uno se pinta en un lienzo igual que
 * la previa (negro, el video en su rectangulo y la plantilla encima) y el
 * navegador lo codifica en H.264.
 *
 * Devuelve `null` cuando este navegador no puede con el video —no tiene
 * WebCodecs, no sabe descodificar el original o no sabe codificar el audio
 * en un formato que quepa en un MP4—, y entonces se monta con ffmpeg, que es
 * mas lento pero lo abre todo.
 */
export async function encodeNative(job: EncodeJob, handlers: EncodeHandlers): Promise<Blob | null> {
  if (typeof VideoEncoder === "undefined" || typeof OffscreenCanvas === "undefined") return null;
  const { w, h } = job.canvas;
  if (!(await canEncodeVideo("avc", { width: w, height: h, quality: QUALITY_VERY_HIGH }))) {
    return null;
  }

  handlers.onStage("Preparando el vídeo…");
  const plate = await createImageBitmap(job.plate);
  const canvas = new OffscreenCanvas(w, h);
  const ctx = canvas.getContext("2d", { alpha: false });
  if (!ctx) return null;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";

  const { rect, flip } = job;
  const input = new Input({ source: new BlobSource(job.source), formats: ALL_FORMATS });
  const output = new Output({
    // Con el indice al principio el MP4 empieza a verse sin descargarlo entero.
    format: new Mp4OutputFormat({ fastStart: "in-memory" }),
    target: new BufferTarget(),
  });

  try {
    const conversion = await Conversion.init({
      input,
      output,
      // Solo la pista principal de video y la de audio: los moviles meten a
      // veces pistas de metadatos que no pintan nada en la pieza.
      tracks: "primary",
      trim: job.trim ? { start: job.trim.start, end: job.trim.end } : undefined,
      video: {
        codec: "avc",
        // Equivale al CRF 18 de ffmpeg: que no se distinga del original.
        quality: QUALITY_VERY_HIGH,
        forceTranscode: true,
        processedWidth: w,
        processedHeight: h,
        process: (sample) => {
          ctx.fillStyle = job.background ?? "#000000";
          ctx.fillRect(0, 0, w, h);
          // `draw` ya tiene en cuenta el giro que traen los videos del movil,
          // igual que el <video> de la previa, con el que se calculo `rect`.
          if (flip) {
            // Espejado dentro de su rectangulo, como en la previa.
            ctx.save();
            ctx.translate(rect.x + rect.w, rect.y);
            ctx.scale(-1, 1);
            sample.draw(ctx, 0, 0, rect.w, rect.h);
            ctx.restore();
          } else {
            sample.draw(ctx, rect.x, rect.y, rect.w, rect.h);
          }
          ctx.drawImage(plate, 0, 0);
          return canvas;
        },
      },
      // Si el audio ya es AAC se copia tal cual; si no, se recodifica a AAC.
      audio: { codec: "aac" },
      showWarnings: false,
    });

    // Una pista que se queda fuera es un video sin imagen o sin sonido: mejor
    // tardar mas con ffmpeg que entregar eso.
    if (!conversion.isValid || conversion.discardedTracks.length > 0) {
      console.info(
        "[encode] WebCodecs no puede con este vídeo; se monta con ffmpeg.",
        conversion.discardedTracks.map((d) => `${d.track.type}: ${d.reason}`),
      );
      return null;
    }

    conversion.onProgress = (progress) => handlers.onProgress(Math.min(1, Math.max(0, progress)));
    handlers.onStage("Montando el vídeo…");
    await conversion.execute();

    const buffer = (output.target as BufferTarget).buffer;
    if (!buffer) throw new Error("El montaje terminó sin vídeo.");
    return new Blob([buffer], { type: "video/mp4" });
  } finally {
    plate.close();
    input.dispose();
  }
}
