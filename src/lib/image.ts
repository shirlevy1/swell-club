const MAX_EDGE = 1600;
const JPEG_QUALITY = 0.8;

/**
 * קורא קובץ תמונה מהמכשיר, מקטין ומדחיס ל-JPEG. פותר גם את בעיית
 * HEIC (ברירת המחדל של אייפון) בעקיפין — ציור לקנבס ופענוח מחדש
 * כ-JPEG לא תלוי בפורמט המקור, ב-Safari.
 *
 * ברירות המחדל מתאימות לסלפי (מהיר, קטן — נלכד חי בחוף). לתמונות
 * אלבום, שמעלים בזמן פנוי מגלריית המכשיר, קוראים עם ערכים גבוהים
 * יותר — ראו `ALBUM_PHOTO_OPTIONS` למטה.
 */
export async function compressImageFile(
  file: File,
  { maxEdge = MAX_EDGE, quality = JPEG_QUALITY }: { maxEdge?: number; quality?: number } = {},
): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  try {
    const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);

    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("canvas 2d context unavailable");
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", quality),
    );
    if (!blob) throw new Error("image compression failed");
    return blob;
  } finally {
    bitmap.close();
  }
}

// היה 2400px/0.92 — הורד ל-1600px/0.82 כדי לצמצם תעבורה (כל תמונה
// חדשה קטנה משמעותית מעכשיו, לא רק באחסון אלא בכל טעינה שלה). זו
// עדיין רזולוציה ואיכות גבוהים בהרבה ממה שוואטסאפ שולח כברירת מחדל —
// לא ירידה שאמורה להיות מורגשת על מסך טלפון.
export const ALBUM_PHOTO_OPTIONS = { maxEdge: 1600, quality: 0.82 };

export function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}
