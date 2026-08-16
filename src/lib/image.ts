const MAX_EDGE = 1600;
const JPEG_QUALITY = 0.8;

/**
 * קורא קובץ תמונה מהמכשיר, מקטין ומדחיס ל-JPEG. פותר גם את בעיית
 * HEIC (ברירת המחדל של אייפון) בעקיפין — ציור לקנבס ופענוח מחדש
 * כ-JPEG לא תלוי בפורמט המקור, ב-Safari.
 */
export async function compressImageFile(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  try {
    const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);

    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("canvas 2d context unavailable");
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", JPEG_QUALITY),
    );
    if (!blob) throw new Error("image compression failed");
    return blob;
  } finally {
    bitmap.close();
  }
}

export function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}
