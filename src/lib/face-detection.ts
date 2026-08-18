/**
 * זיהוי **נוכחות** פנים בתמונה — לא זיהוי זהות, לא אימות שזו אותה
 * זהות שנרשמה. המטרה היחידה: לחסום תמונה של תקרה/שמיים/קיר, לא
 * לתפוס רמאות מתוחכמת. משקפי שמש, כובע, שיער רטוב — כל אלה עדיין
 * "פנים" מבחינת המודל, ומכוון בכוונה כך (זה חוף, לא צילום דרכון).
 *
 * רץ כולו בדפדפן (WASM) — שום תמונה לא יוצאת מהמכשיר בשביל הבדיקה
 * הזו. הריצה הראשונה מורידה מודל קטן מ-CDN של גוגל ונשמרת בקאש של
 * הדפדפן; ריצות הבאות מהירות.
 */

import type { FaceDetector } from "@mediapipe/tasks-vision";

let detectorPromise: Promise<FaceDetector> | null = null;

async function getDetector(): Promise<FaceDetector> {
  if (!detectorPromise) {
    detectorPromise = (async () => {
      const { FaceDetector: FaceDetectorClass, FilesetResolver } = await import(
        "@mediapipe/tasks-vision"
      );
      // הגרסה כאן חייבת להיות זהה לגרסה המותקנת ב-package.json —
      // אי-התאמה בין ה-JS (מהחבילה שלנו) ל-WASM (מה-CDN הזה) גורמת
      // לאתחול להיכשל בשקט, ובלי לזרוק שגיאה ברורה. כשזה קורה,
      // photoHasFace() נכשלת אל תוך ה-catch ומחזירה true תמיד —
      // כלומר הבדיקה כולה הופכת לא-פעילה בלי שרואים את זה בממשק.
      const vision = await FilesetResolver.forVisionTasks(
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.0.1/wasm",
      );
      return FaceDetectorClass.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath:
            "https://storage.googleapis.com/mediapipe-models/face_detector/blaze_face_short_range/float16/1/blaze_face_short_range.tflite",
        },
        runningMode: "IMAGE",
      });
    })();
  }
  return detectorPromise;
}

// פינה של פנים בתמונה שהיא בעיקר תקרה עדיין "מזוהה" כפנים — נדרש
// גם שהפנים יתפסו חלק משמעותי מהפריים, לא רק להופיע איפשהו בו.
// סלפי אמיתי, גם ביד מושטת, בדרך כלל עובר את זה בנוחות; פינה קטנה
// שנתפסת בטעות בקצה התמונה — לא.
const MIN_FACE_AREA_RATIO = 0.05;

/**
 * true = יש בתמונה פנים שתופסות חלק משמעותי מהפריים. גם true אם
 * הבדיקה עצמה נכשלה (מודל לא נטען, דפדפן לא נתמך, בעיית רשת בהורדת
 * המודל) — תקלה בתשתית הזיהוי לא אמורה לחסום מישהו מלסמן הגעה אמיתית.
 */
export async function photoHasFace(canvas: HTMLCanvasElement): Promise<boolean> {
  try {
    const detector = await getDetector();
    const result = detector.detect(canvas);
    const frameArea = canvas.width * canvas.height;
    return result.detections.some((d) => {
      const box = d.boundingBox;
      if (!box) return false;
      return (box.width * box.height) / frameArea >= MIN_FACE_AREA_RATIO;
    });
  } catch {
    return true;
  }
}
