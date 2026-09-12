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

export function updatePasswordUrl(): string {
  return `${SITE_URL}/update-password`;
}

/**
 * עטיפת HTML משותפת, באותו סגנון בדיוק כמו תבניות המייל של
 * Supabase (איפוס סיסמה/אימות הרשמה) — אותם טוקנים כמו האתר עצמו
 * (sea #46738f, ink #15283a וכו'), כדי שכל המיילים ייראו כמו אותו
 * שולח, לא כמו שני מוצרים שונים.
 */
export function buildEmailHtml(opts: {
  title: string;
  bodyHtml: string;
  buttonText?: string;
  buttonUrl?: string;
  footerNote?: string;
}): string {
  const { title, bodyHtml, buttonText, buttonUrl, footerNote } = opts;
  const button =
    buttonText && buttonUrl
      ? `<div dir="ltr" align="center" style="text-align:center; margin:0 0 24px;">
        <!--[if mso]>
        <table role="presentation" cellpadding="0" cellspacing="0" align="center"><tr><td>
        <![endif]-->
        <a href="${buttonUrl}"
           style="display:inline-block; padding:14px 32px; font-family:'Rubik', Arial, sans-serif; font-weight:700; font-size:15px; color:#ffffff; text-decoration:none; border-radius:12px; background-color:#46738f;">
          ${buttonText}
        </a>
        <!--[if mso]>
        </td></tr></table>
        <![endif]-->
      </div>`
      : "";
  const footer = footerNote
    ? `<p style="direction:rtl; text-align:right; font-family:'Assistant', -apple-system, 'Segoe UI', Arial, sans-serif; font-size:13px; line-height:1.6; color:#8199a5; margin:0;">
        ${footerNote}
      </p>`
    : "";

  return `<!DOCTYPE html>
<html lang="he" dir="rtl">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${title}</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Rubik:wght@700&family=Assistant:wght@400;700&display=swap');
</style>
</head>
<body style="margin:0; padding:0; background-color:#f2f7fa; font-family:'Assistant', -apple-system, 'Segoe UI', Arial, sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f2f7fa; padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width:480px;" cellpadding="0" cellspacing="0">
          <tr>
            <td align="center" style="padding-bottom:24px;">
              <span style="font-family:'Rubik', Arial, sans-serif; font-weight:700; font-size:20px; color:#46738f;">Swell Club</span>
            </td>
          </tr>
          <tr>
            <td style="background-color:#ffffff; border:1px solid #d2e0ea; border-radius:16px; padding:32px 28px;">
              <p style="direction:rtl; text-align:right; font-family:'Rubik', Arial, sans-serif; font-weight:700; font-size:22px; color:#15283a; margin:0 0 16px;">
                ${title}
              </p>
              ${bodyHtml}
              ${button}
              ${footer}
            </td>
          </tr>
          <tr>
            <td align="center" style="padding-top:20px;">
              <span style="font-family:'Assistant', -apple-system, 'Segoe UI', Arial, sans-serif; font-size:12px; color:#8199a5;">Swell Club · מי באמת היה איתכם בים הבוקר</span>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
