// Preparo da foto no aparelho antes do envio. Fotos pequenas seguem como estão;
// fotos grandes são reduzidas aqui só para o envio ser mais rápido. O servidor
// ainda converte tudo para WebP leve e guarda a foto inteira, sem cortar.

const SKIP_BELOW_BYTES = 2.5 * 1024 * 1024;
const MAX_SIDE = 2400;

export async function preparePhotoFile(file: File) {
  if (!file.type.startsWith("image/")) return file;
  try {
    const bitmap = await createImageBitmap(file);
    const largestSide = Math.max(bitmap.width, bitmap.height);
    if (largestSide <= MAX_SIDE && file.size <= SKIP_BELOW_BYTES) {
      bitmap.close();
      return file;
    }
    const ratio = Math.min(1, MAX_SIDE / largestSide);
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(bitmap.width * ratio));
    canvas.height = Math.max(1, Math.round(bitmap.height * ratio));
    const context = canvas.getContext("2d");
    if (!context) {
      bitmap.close();
      return file;
    }
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();
    const blob = await new Promise<Blob | null>(resolve =>
      canvas.toBlob(resolve, "image/jpeg", 0.9)
    );
    // Se a cópia ficou maior que a original, manda a original.
    if (!blob || blob.size >= file.size) return file;
    return new File([blob], file.name.replace(/\.[^.]+$/, ".jpg"), {
      type: "image/jpeg",
      lastModified: file.lastModified,
    });
  } catch {
    return file;
  }
}
