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
        // ברירת המחדל (0.5) מזהה גם מצח או לחי בלבד כ"פנים" בביטחון
        // מספיק. רוצים תווי פנים אמיתיים (עיניים, אף, פה) — בדיוק כמו
        // שפילטר "אוזני כלב" של אינסטגרם צריך לראות אותם כדי למקם את
        // האוזניים נכון, לא סתם משהו עורי בפריים.
        minDetectionConfidence: 0.75,
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

// המודל מחזיר 6 נקודות ציון בסדר קבוע: עין ימין, עין שמאל, קצה
// האף, מרכז הפה, אוזן ימין, אוזן שמאל (נקודות ה-index למטה).
// מצח בלבד (בלי עיניים ופה בפריים) עדיין מקבל בביטחון-לא-מבוטל
// ניחוש למיקומן — אבל המרחק האנכי בין העיניים לפה, יחסית לגובה
// תיבת הפנים, יוצא נמוך מדי כי אין שם באמת תווי פנים לעגן עליהם.
// זו בדיוק הבדיקה שפילטר "אוזני כלב" צריך כדי למקם את האוזניים נכון.
const RIGHT_EYE = 0;
const LEFT_EYE = 1;
const MOUTH = 3;
const MIN_EYE_TO_MOUTH_RATIO = 0.22;

/**
 * true = יש בתמונה פנים אמיתיות — לא רק "יש שם משהו עורי", אלא
 * שרואים גם עיניים וגם פה, בפרופורציה שמעידה על פנים שלמות ולא רק
 * מצח או לחי בקרבת המצלמה. גם true אם הבדיקה עצמה נכשלה (מודל לא
 * נטען, דפדפן לא נתמך, בעיית רשת בהורדת המודל) — תקלה בתשתית הזיהוי
 * לא אמורה לחסום מישהו מלסמן הגעה אמיתית.
 */
export async function photoHasFace(canvas: HTMLCanvasElement): Promise<boolean> {
  try {
    const detector = await getDetector();
    const result = detector.detect(canvas);
    const frameArea = canvas.width * canvas.height;

    return result.detections.some((d) => {
      const box = d.boundingBox;
      if (!box) return false;
      if ((box.width * box.height) / frameArea < MIN_FACE_AREA_RATIO) return false;

      const points = d.keypoints;
      if (points && points.length > MOUTH) {
        const eyesY = (points[RIGHT_EYE].y + points[LEFT_EYE].y) / 2;
        const spread = Math.abs(points[MOUTH].y - eyesY);
        const normalizedBoxHeight = box.height / canvas.height;
        if (spread / normalizedBoxHeight < MIN_EYE_TO_MOUTH_RATIO) return false;
      }

      return true;
    });
  } catch {
    return true;
  }
}
