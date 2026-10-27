// Redução de fotos no envio. A foto inteira é mantida (nada é cortado): só o
// tamanho em pixels é limitado e o arquivo vira WebP leve. Os dados escondidos
// da foto (localização do GPS, modelo do celular) são removidos.
// Se a biblioteca de imagens não estiver disponível, o arquivo original é
// guardado como veio — o envio nunca deixa de funcionar por causa disso.

export const photoLimits = {
  /** Maior foto aceita no envio (antes de reduzir). */
  uploadBytes: 40 * 1024 * 1024,
  /** Maior lado da foto guardada, em pixels. */
  maxSide: 2400,
  quality: 82,
  /** Proteção contra imagens com bilhões de pixels. */
  maxInputPixels: 120_000_000,
} as const;

export type OptimizedPhoto = {
  buffer: Buffer;
  contentType: string;
  extension: string;
  width: number | null;
  height: number | null;
  optimized: boolean;
  originalBytes: number;
};

let sharpPromise: Promise<any | null> | null = null;

async function loadSharp() {
  if (!sharpPromise) {
    sharpPromise = import("sharp")
      .then(module => {
        const sharp = (module as any).default ?? module;
        sharp.cache(false);
        sharp.concurrency(1);
        return sharp;
      })
      .catch(() => null);
  }
  return sharpPromise;
}

const extensionByType: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/avif": ".avif",
};

export async function optimizePhoto(
  input: Buffer,
  contentType: string
): Promise<OptimizedPhoto> {
  const original: OptimizedPhoto = {
    buffer: input,
    contentType,
    extension: extensionByType[contentType] ?? ".jpg",
    width: null,
    height: null,
    optimized: false,
    originalBytes: input.byteLength,
  };
  const sharp = await loadSharp();
  if (!sharp) return original;
  try {
    const pipeline = sharp(input, {
      limitInputPixels: photoLimits.maxInputPixels,
      failOn: "error",
    })
      // Gira conforme a orientação gravada pelo celular, depois a marca é descartada.
      .rotate()
      .resize({
        width: photoLimits.maxSide,
        height: photoLimits.maxSide,
        fit: "inside",
        withoutEnlargement: true,
      })
      .webp({ quality: photoLimits.quality, effort: 4 });
    const { data, info } = await pipeline.toBuffer({ resolveWithObject: true });
    if (!data.byteLength) return original;
    return {
      buffer: data,
      contentType: "image/webp",
      extension: ".webp",
      width: info.width,
      height: info.height,
      optimized: true,
      originalBytes: input.byteLength,
    };
  } catch {
    // Arquivo que a biblioteca não consegue ler: guarda o original, já validado.
    return original;
  }
}
