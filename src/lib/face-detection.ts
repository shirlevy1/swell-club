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
      const vision = await FilesetResolver.forVisionTasks(
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm",
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

/**
 * true = יש לפחות פנים אחת בתמונה. גם true אם הבדיקה עצמה נכשלה
 * (מודל לא נטען, דפדפן לא נתמך, בעיית רשת בהורדת המודל) — תקלה
 * בתשתית הזיהוי לא אמורה לחסום מישהו מלסמן הגעה אמיתית.
 */
export async function photoHasFace(canvas: HTMLCanvasElement): Promise<boolean> {
  try {
    const detector = await getDetector();
    const result = detector.detect(canvas);
    return result.detections.length > 0;
  } catch {
    return true;
  }
}
