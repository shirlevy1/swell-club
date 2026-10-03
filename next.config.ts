import type { NextConfig } from "next";

/**
 * כותרות אבטחה בסיסיות — בכוונה בלי Content-Security-Policy כאן.
 * שלב 1 מתוך 2: הכותרות האלה לא יכולות לשבור שום דבר בעמוד (לא
 * חוסמות משאבים/סקריפטים) — רק CSP יכול, ולכן הוא עובר בנפרד,
 * בפריסה הבאה, אחרי שמוודאים ששלב 1 עלה בשלום.
 */
const nextConfig: NextConfig = {
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
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
