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
 *
 * אותה ריצה גם מחזירה את מרכז הפנים (ראו FaceDetectionResult) — לא
 * ריצה נוספת, רק עוד פרט מהתוצאה שכבר חושבה, לשימוש בחיתוך ממורכז
 * של תמונות פרופיל. ראו lib/face-position.ts.
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
      // detectFace() נכשלת אל תוך ה-catch ומחזירה hasFace:true תמיד —
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

export type FaceDetectionResult = {
  /** true = הפנים כולן נראות בתמונה — מצח עד סנטר, לחי עד לחי — לא רק
   * חלק מהן. גם true אם הבדיקה עצמה נכשלה (מודל לא נטען, דפדפן לא
   * נתמך, בעיית רשת בהורדת המודל) — תקלה בתשתית הזיהוי לא אמורה לחסום
   * מישהו מלסמן הגעה אמיתית. */
  hasFace: boolean;
  /**
   * ⚠️ זה *לא* מיקום הפנים הגולמי בתמונה — זה כבר `object-position`
   * מוכן שממרכז את הפנים בחיתוך `object-fit: cover` לתוך קונטיינר
   * ריבועי. `object-position: X% Y%` לא ממרכז נקודה שאינה כבר במרכז —
   * הוא רק משמר את המיקום היחסי שלה בתוך החלון החתוך (זו התנהגות
   * מתועדת של CSS, לא באג בדפדפן). פנים שהיו נמוך בפריים המקורי היו
   * נשארות נמוך גם בחיתוך העגול. החישוב כאן פותר את זה: הוא לוקח
   * בחשבון כמה בדיוק נחתך מהתמונה (לפי היחס בין רוחב לגובה המקור)
   * ומזיז את נקודת ה-object-position כך שהפנים יופיעו קרוב ככל
   * האפשר למרכז החיתוך, לא רק באותו יחס כמו במקור.
   */
  center: { x: number; y: number } | null;
};

function clamp01(n: number): number {
  return Math.min(1, Math.max(0, n));
}

/**
 * ממירה מיקום פנים גולמי (שבר מרוחב/גובה התמונה המקורית) ל-
 * object-position שממרכז אותן בפועל בחיתוך ריבועי (כל התמונות באתר
 * מוצגות בקונטיינר 1:1 — עיגול או ריבוע). כשהתמונה עצמה כבר ריבועית
 * אין בכלל חיתוך, והמיקום הגולמי תקף כמו שהוא.
 */
function centerInSquareCrop(
  faceX: number,
  faceY: number,
  imageWidth: number,
  imageHeight: number,
): { x: number; y: number } {
  const ratio = imageWidth / imageHeight;

  if (ratio > 1) {
    // רחבה יותר מגבוהה: הגובה נראה במלואו, יש חיתוך רק בצדדים
    const windowFrac = 1 / ratio;
    const range = 1 - windowFrac;
    const x = range <= 0 ? 0.5 : clamp01((faceX - windowFrac / 2) / range);
    return { x, y: 0.5 };
  }
  if (ratio < 1) {
    // גבוהה יותר מרחבה (המצב הרגיל בסלפי מהנייד): יש חיתוך רק למעלה/למטה
    const windowFrac = ratio;
    const range = 1 - windowFrac;
    const y = range <= 0 ? 0.5 : clamp01((faceY - windowFrac / 2) / range);
    return { x: 0.5, y };
  }
  return { x: faceX, y: faceY };
}

export async function detectFace(
  canvas: HTMLCanvasElement,
): Promise<FaceDetectionResult> {
  try {
    const landmarker = await getLandmarker();
    const result = landmarker.detect(canvas);

    for (const landmarks of result.faceLandmarks) {
      const [forehead, chin, rightCheek, leftCheek] = [
        FOREHEAD,
        CHIN,
        RIGHT_CHEEK,
        LEFT_CHEEK,
      ].map((i) => landmarks[i]);
      if (!forehead || !chin || !rightCheek || !leftCheek) continue;
      if (
        ![forehead, chin, rightCheek, leftCheek].every(
          (p) => withinFrame(p.x) && withinFrame(p.y),
        )
      )
        continue;

      const faceX = (rightCheek.x + leftCheek.x) / 2;
      const faceY = (forehead.y + chin.y) / 2;

      return {
        hasFace: true,
        center: centerInSquareCrop(
          faceX,
          faceY,
          canvas.width,
          canvas.height,
        ),
      };
    }
    return { hasFace: false, center: null };
  } catch {
    return { hasFace: true, center: null };
  }
}
