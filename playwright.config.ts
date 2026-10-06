import { defineConfig } from "@playwright/test";

/**
 * רץ נגד מצב הדגמה בלבד (NEXT_PUBLIC_SWELL_DEMO=1) - לא נוגע במסד
 * הנתונים האמיתי בשום מצב, גם אם יש מפתחות Supabase אמיתיים ב-
 * .env.local (יש כאלה, לפיתוח רגיל). ראו e2e/README.md.
 */
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  retries: 0,
  reporter: "list",
  // הקומפילציה הראשונה של כל נתיב ב-next dev (Turbopack) לוקחת עד
  // כ-30 שניות בפעם הראשונה שמבקשים אותו - לא תקלה, רק עלות חד-פעמית
  // לכל נתיב בכל הפעלת שרת. הזמן הזה גדול בכוונה כדי לא "להיכשל" על זה.
  timeout: 90_000,
  use: {
    baseURL: "http://localhost:3100",
    trace: "retain-on-failure",
  },
  webServer: {
    command: "npx next dev -p 3100",
    url: "http://localhost:3100",
    reuseExistingServer: false,
    timeout: 60_000,
    env: {
      NEXT_PUBLIC_SWELL_DEMO: "1",
    },
  },
});
