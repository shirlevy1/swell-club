import * as Sentry from "@sentry/nextjs";

/**
 * חצי השרת/edge של Sentry - ראו instrumentation-client.ts להסבר המלא
 * (DSN לא סוד, dataCollection.userInfo:false במכוון - לא sendDefaultPii
 * שלא קיים בגרסה הזו). שם הקובץ (instrumentation.ts) ומבנהו (export
 * async function register) הם מוסכמה מובנית של Next.js עצמו - לא
 * המצאה של Sentry - לכן חייבים להישאר בדיוק ככה.
 */
const dsn =
  "https://f82ee8432cca9736b72b1dbfc874ec40@o4512198536658944.ingest.de.sentry.io/4512198647742544";

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs" || process.env.NEXT_RUNTIME === "edge") {
    Sentry.init({
      dsn,
      tracesSampleRate: 0,
      dataCollection: { userInfo: false },
    });
  }
}

// תופס שגיאות בעיבוד שרת (React Server Components) שהיו אחרת
// חומקות משני ה-init למעלה - ראו תיעוד Next.js על onRequestError.
export const onRequestError = Sentry.captureRequestError;
