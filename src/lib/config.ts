/**
 * האפליקציה צריכה לרוץ גם לפני שחיברו את Supabase, כדי שאפשר יהיה
 * לפתח ולראות מסכים. במקום לקרוס על מפתח חסר — מציגים מסך הסבר.
 */
export const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

/**
 * Supabase שינו את שם המפתח הציבורי: מה שנקרא `anon key` נקרא היום
 * `publishable key`, וזה השם שכפתור Connect בדשבורד מייצר. שניהם
 * נשלחים באותה כותרת ועושים את אותו דבר, ולכן מקבלים את שניהם —
 * במקום שהאתר ייפול על שם משתנה.
 *
 * ⚠️ חייב להיות גישה **ישירה** ל-`process.env.X`. Next מחליף את
 * הביטוי הזה בערך בזמן הבנייה, ולכן `process.env[name]` דינמי
 * פשוט לא יעבוד בדפדפן.
 */
export const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

/**
 * מתג להדגמה מכוונת, גם כשיש מפתחות.
 *
 * בלעדיו, הדרך היחידה להעלות הדגמה לאוויר היא למחוק את מפתחות
 * Supabase ולהדביק אותם מחדש אחר כך — מסורבל, ומזמין טעות שמורידה
 * את המוצר האמיתי.
 *
 * ⚠️ **חייב `NEXT_PUBLIC_`.** `demoMode` נקרא גם ברכיבי לקוח, ומשתנה
 * בלי הקידומת הוא undefined בדפדפן. התוצאה הייתה שרת במצב הדגמה
 * מול לקוח שמנסה לדבר עם Supabase — שני מצבים סותרים באותו עמוד.
 */
const forceDemo = process.env.NEXT_PUBLIC_SWELL_DEMO === "1";

export const supabaseConfigured =
  !forceDemo && !!supabaseUrl && !!supabaseAnonKey;

/**
 * בלי מפתחות Supabase האפליקציה עולה במצב הדגמה: נתונים בזיכרון,
 * בלי התחברות, ובלי שמירה. נועד להראות את המוצר, לא להפעיל אותו.
 */
export const demoMode = !supabaseConfigured;

/**
 * מצב הדגמה הוא ברירת מחדל שימושית **מקומית** ומסוכנת **בענן**: אתר
 * שעלה בלי משתני סביבה נראה עובד, אבל הוא בלי התחברות ועם נתוני דמה.
 * אין שם מידע אמיתי לדלוף, אבל זו גם לא האפליקציה — וקל מאוד לא לשים לב.
 *
 * לכן: על פלטפורמת אירוח, חוסר מפתחות הוא **שגיאה**, לא ברירת מחדל.
 * מי שרוצה להעלות את ההדגמה עצמה לאוויר (למשל כדי להראות אותה מרחוק)
 * מצהיר על זה במפורש — `NEXT_PUBLIC_SWELL_DEMO=1`.
 */
function assertNotAccidentalDemo(): void {
  // בדיקה של השרת בלבד. בחבילה שנשלחת לדפדפן כל משתנה שאינו
  // NEXT_PUBLIC_ מוחלף ב-undefined, ולכן אין שם מה לבדוק.
  if (typeof window !== "undefined") return;
  if (supabaseConfigured) return;
  // הדגמה מכוונת — בין אם יש מפתחות ובין אם לא
  if (forceDemo || process.env.SWELL_ALLOW_DEMO === "1") return;

  const platform =
    process.env.RAILWAY_ENVIRONMENT_NAME ??
    process.env.RAILWAY_PROJECT_ID ??
    (process.env.VERCEL ? "Vercel" : undefined) ??
    process.env.RENDER_SERVICE_ID ??
    process.env.FLY_APP_NAME;

  // אין סימן לפלטפורמה — פיתוח מקומי, וזה בדיוק המצב שההדגמה נועדה לו
  if (!platform) return;

  throw new Error(
    [
      "",
      "───────────────────────────────────────────────",
      "Swell Club לא יכולה לעלות: חסרים משתני סביבה.",
      "",
      "בלי המפתחות האלה האפליקציה נופלת למצב הדגמה —",
      "בלי התחברות ועם נתוני דמה. בענן זו לא התנהגות רצויה,",
      "ולכן העלייה נעצרת כאן במקום להגיש אתר שנראה תקין.",
      "",
      "להגדיר בפלטפורמה:",
      "  NEXT_PUBLIC_SUPABASE_URL",
      "  NEXT_PUBLIC_SUPABASE_ANON_KEY",
      "(Supabase → Project Settings → API. פירוט ב-SETUP.md)",
      "",
      "אם ההדגמה היא בכוונה — להגדיר SWELL_ALLOW_DEMO=1",
      "───────────────────────────────────────────────",
      "",
    ].join("\n"),
  );
}

assertNotAccidentalDemo();

export const DEFAULT_CLUB_SLUG = "swell";
