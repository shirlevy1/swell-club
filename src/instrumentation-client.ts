import * as Sentry from "@sentry/nextjs";

/**
 * Sentry - ניטור שגיאות בייצור (ללא זה, לא היה שום דרך לדעת שמשהו
 * נשבר באתר חוץ מתלונה ישירה ממישהו). קובץ הזה רץ בדפדפן, אח שלו
 * (instrumentation.ts) רץ בשרת.
 *
 * ⚠️ DSN הוא לא סוד - בדיוק כמו NEXT_PUBLIC_SUPABASE_ANON_KEY, הוא
 * מיועד להיחשף בצד הלקוח (זה הרעיון: מודיע ל-Sentry "לאן לשלוח
 * אירועים", לא מאפשר קריאה/כתיבה של שום דבר). לכן מקובע כאן ישירות,
 * לא ב-env var - חוסך שלב התקנה נוסף בלוח הבקרה של Vercel.
 *
 * ⚠️ dataCollection.userInfo: false (לא sendDefaultPii - אופציה
 * שלא קיימת בגרסה הזו בכלל) הוא המקום הנכון והרשמי של Sentry עצמם
 * לכבות איסוף user.* (כולל IP) - מתועד ישירות במסך ה-setup שלהם
 * ("Control the Data You Send to Sentry"). ניסיון קודם (beforeSend
 * שמנסה "לנקות" ip_address בדיעבד + הסרת BrowserSession ידנית)
 * עבד רק חלקית ובאופן שביר - האפשרות הזו חוסמת את האיסוף מהמקור,
 * לא מנקה תוצאה אחרי שכבר נאספה. חשוב כי הצהרת הפרטיות של האתר אומרת
 * במפורש "אין עוגיות מעקב" - לא רוצים לסתור את זה בלי החלטה מודעת.
 * Session Replay גם לא מופעל, מאותה סיבה - רק דיווח שגיאות, לא מעקב
 * התנהגות.
 */
Sentry.init({
  dsn: "https://f82ee8432cca9736b72b1dbfc874ec40@o4512198536658944.ingest.de.sentry.io/4512198647742544",
  tracesSampleRate: 0,
  dataCollection: { userInfo: false },
});

// נדרש ע"י Sentry עצמה (אחרת מזהירה בכל build) - נותן הקשר "איזה
// ניווט היה באמצע" כשמצרפים דיווח שגיאה, גם בלי tracing מלא מופעל.
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
