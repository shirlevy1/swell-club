/**
 * שליחת מייל מותאם אישית דרך Resend — לא Supabase Auth. Supabase Auth
 * שולחת רק מיילי מערכת קבועים (אימות הרשמה, איפוס סיסמה) בלי אפשרות
 * לתוכן חופשי, ולכן כל מייל אחר (כמו הודעת שחזור חברות) עובר כאן.
 *
 * דורש דומיין מאומת ב-Resend עבור swellclub.co.il, ומפתח API בתור
 * RESEND_API_KEY — בלי NEXT_PUBLIC, בדיוק כמו SUPABASE_SERVICE_ROLE_KEY.
 *
 * לא לייבא את הקובץ הזה מרכיב "use client".
 */

const FROM = "Swell Club <noreply@swellclub.co.il>";
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://swellclub.co.il";

export function emailConfigured(): boolean {
  return !!process.env.RESEND_API_KEY;
}

/** שקטה אם המייל לא מוגדר, כדי שקריאה מ-API route חדש לא תשבור פעולה עיקרית. */
export async function sendEmail(
  to: string,
  subject: string,
  html: string,
): Promise<void> {
  if (!emailConfigured()) return;

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from: FROM, to, subject, html }),
  });
  if (!res.ok) {
    console.error(
      "sendEmail: Resend request failed",
      res.status,
      await res.text().catch(() => ""),
    );
  }
}

export function loginUrl(): string {
  return `${SITE_URL}/login`;
}
