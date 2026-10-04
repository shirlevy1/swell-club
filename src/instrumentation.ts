import * as Sentry from "@sentry/nextjs";

/**
 * חצי השרת/edge של Sentry - ראו instrumentation-client.ts להסבר המלא
 * (DSN לא סוד, sendDefaultPii כבוי במכוון). שם הקובץ (instrumentation.ts)
 * ומבנהו (export async function register) הם מוסכמה מובנית של
 * Next.js עצמו - לא המצאה של Sentry - לכן חייבים להישאר בדיוק ככה.
 */
const dsn =
  "https://3471106293f14b108e3900e65caa54d@o4511000776556544.ingest.de.sentry.io/4511000824233040";

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs" || process.env.NEXT_RUNTIME === "edge") {
    Sentry.init({ dsn, tracesSampleRate: 0 });
  }
}

// תופס שגיאות בעיבוד שרת (React Server Components) שהיו אחרת
// חומקות משני ה-init למעלה - ראו תיעוד Next.js על onRequestError.
export const onRequestError = Sentry.captureRequestError;
