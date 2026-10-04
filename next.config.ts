import type { NextConfig } from "next";

/**
 * שלב 2/2: מוסיפה Content-Security-Policy לכותרות הבסיסיות משלב 1.
 * זו הכותרת היחידה שיכולה לשבור משהו בטעות (חוסמת משאבים שלא אושרו
 * במפורש) — ולכן כל מקור חיצוני כאן אומת ישירות מול הקוד בפועל (לא
 * ניחוש), פעמיים, בשתי בדיקות נפרדות:
 *   - גופנים (Rubik/Assistant): next/font/google ב-layout.tsx מארח
 *     אותם בעצמו בזמן ה-build — לא קריאה בזמן ריצה לדומיין גוגל,
 *     ולכן font-src לא צריך חריג.
 *   - מפות: אריחי Leaflet/CARTO מ-map-picker.tsx, basemaps.cartocdn.com.
 *   - זיהוי פנים (צ'ק-אין): face-detection.ts טוען WASM מ-
 *     cdn.jsdelivr.net ומודל מ-storage.googleapis.com.
 *   - Supabase: קריאות REST ו-Realtime (WebSocket) לאותו פרויקט.
 *   - מייל שנשלח למנהלת/חברים (email-server.ts) כן טוען Google Fonts
 *     בעצמו — לא רלוונטי כאן, זה HTML של אימייל, לא עמוד שה-CSP חל עליו.
 *
 * script-src/style-src נשארים עם 'unsafe-inline' במכוון — Next App
 * Router פולט סקריפטים פנימיים קטנים לשחזור (hydration), והאתר
 * משתמש בהרבה style={{...}} inline. הדרך המחמירה יותר (nonce דרך
 * proxy.ts) נשקלה ונדחתה כרגע — מסבכת משמעותית מול תועלת, ושיר ביקשה
 * במפורש לתעדף "לא לשבור כלום" על פני הקשחה מקסימלית.
 *
 * ⚠️ 'wasm-unsafe-eval' ב-script-src חובה בשביל זיהוי הפנים: קומפילציה
 * של WebAssembly (מה ש-face-detection.ts עושה כדי להריץ את מודל
 * MediaPipe) נחשבת מבחינת CSP כמו eval, ונחסמת אוטומטית בלי ההיתר
 * הזה — גם אם script-src/connect-src כבר מרשים את הדומיין שהקובץ
 * מגיע ממנו. זה *לא* מרחיב הרשאות ל-JS רגיל (לא כמו 'unsafe-eval'
 * המלא) — זה היתר נפרד וממוקד רק להרצת WASM. אומת ישירות: בלעדיו,
 * טעינת המודל נכשלת ב-100% מהמקרים (לא לפעמים) בכל דפדפן שמיישם את
 * ההגבלה הזו, ו-detectFace() נופלת אז ל-fail-open (hasFace:true) —
 * כלומר בדיקת "יש פנים בתמונה" הופכת ללא-פעילה בשקט, בלי שגיאה גלויה
 * באתר עצמו.
 */
const supabaseOrigin = process.env.NEXT_PUBLIC_SUPABASE_URL
  ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).origin
  : "https://*.supabase.co";
const supabaseWs = supabaseOrigin.replace("https://", "wss://");

const csp = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'none'",
  "form-action 'self'",
  "manifest-src 'self'",
  `img-src 'self' data: blob: ${supabaseOrigin} https://basemaps.cartocdn.com`,
  "font-src 'self'",
  "script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval' https://cdn.jsdelivr.net",
  "style-src 'self' 'unsafe-inline'",
  "worker-src 'self' blob:",
  `connect-src 'self' ${supabaseOrigin} ${supabaseWs} https://cdn.jsdelivr.net https://storage.googleapis.com`,
].join("; ");

const nextConfig: NextConfig = {
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "Content-Security-Policy", value: csp },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(self), geolocation=(self), microphone=(), payment=(), usb=()",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
