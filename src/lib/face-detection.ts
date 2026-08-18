/**
 * זיהוי **נוכחות** פנים מלאות בתמונה — לא זיהוי זהות, לא אימות שזו
 * אותה זהות שנרשמה. המטרה: לחסום תמונה שאין בה פנים בכלל (תקרה,
 * שמיים), וגם תמונה עם פנים חלקיות בלבד (רק מצח, רק עיניים) — לא
 * רמאות מתוחכמת. משקפי שמש, כובע, שיער רטוב עדיין "פנים" מבחינת
 * המודל, ומכוון בכוונה כך (זה חוף, לא צילום דרכון).
 *
 * רץ כולו בדפדפן (WASM) — שום תמונה לא יוצאת מהמכשיר בשביל הבדיקה
 * הזו. הריצה הראשונה מורידה מודל מ-CDN של גוגל ונשמרת בקאש של
 * הדפדפן; ריצות הבאות מהירות.
 *
 * משתמשים כאן ב-Face Landmarker (רשת מלאה של ~478 נקודות), לא ב-Face
 * Detector הפשוט (6 נקודות): גילינו בבדיקה בפועל שהגרסה הפשוטה
 * "מנחשת" במידה סבירה של ביטחון גם היכן העיניים/הפה נמצאים כשרק
 * המצח נראה בתמונה — היא בנויה להיות עמידה לחסימה חלקית, וזה בדיוק
 * ההפך ממה שרוצים כאן. ברשת המלאה, נקודה שהאזור שלה לא באמת נראה
 * בתמונה נוטה לצאת עם קואורדינטה מחוץ לגבולות הפריים (0–1), כי המודל
 * מעריך מיקום יחסי ולא מוגבל לפיקסלים שבאמת קיימים — וזה כן אות אמין.
 */

import type { FaceLandmarker } from "@mediapipe/tasks-vision";

let landmarkerPromise: Promise<FaceLandmarker> | null = null;

async function getLandmarker(): Promise<FaceLandmarker> {
  if (!landmarkerPromise) {
    landmarkerPromise = (async () => {
      const { FaceLandmarker: FaceLandmarkerClass, FilesetResolver } = await import(
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
      return FaceLandmarkerClass.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath:
            "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task",
        },
        runningMode: "IMAGE",
        numFaces: 1,
      });
    })();
  }
  return landmarkerPromise;
}

// אינדקסים סטנדרטיים ברשת הפנים של MediaPipe (topology קבוע, אותו
// דבר בכל תמונה): 10 = קצה המצח, 152 = תחתית הסנטר, 234 = קצה הלחי
// הימנית (בערך גובה האוזן), 454 = קצה הלחי השמאלית. ארבע הנקודות
// האלה יחד מגדירות את קצוות הפנים מלמעלה-למטה ומצד-לצד.
const FOREHEAD = 10;
const CHIN = 152;
const RIGHT_CHEEK = 234;
const LEFT_CHEEK = 454;

// שוליים קטנים מגבול התמונה — לא רק "בדיוק בפנים", אלא עם קצת מרווח,
// כדי שפנים שממש נוגעות בקצה (וכנראה חתוכות בפועל) גם יחסמו.
const EDGE_MARGIN = 0.03;

function withinFrame(value: number): boolean {
  return value > EDGE_MARGIN && value < 1 - EDGE_MARGIN;
}

/**
 * true = הפנים כולן נראות בתמונה — מצח עד סנטר, לחי עד לחי — לא רק
 * חלק מהן. גם true אם הבדיקה עצמה נכשלה (מודל לא נטען, דפדפן לא
 * נתמך, בעיית רשת בהורדת המודל) — תקלה בתשתית הזיהוי לא אמורה לחסום
 * מישהו מלסמן הגעה אמיתית.
 */
export async function photoHasFace(canvas: HTMLCanvasElement): Promise<boolean> {
  try {
    const landmarker = await getLandmarker();
    const result = landmarker.detect(canvas);

    return result.faceLandmarks.some((landmarks) => {
      const corners = [FOREHEAD, CHIN, RIGHT_CHEEK, LEFT_CHEEK].map(
        (i) => landmarks[i],
      );
      if (corners.some((p) => !p)) return false;
      return corners.every((p) => withinFrame(p.x) && withinFrame(p.y));
    });
  } catch {
    return true;
  }
}
