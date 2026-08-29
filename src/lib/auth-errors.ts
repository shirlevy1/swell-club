import type { AuthError } from "@supabase/supabase-js";

/**
 * מתרגם שגיאות אימות של Supabase לעברית לפי `error.code` — קוד קבוע
 * ("weak_password", "same_password" וכו'), לא לפי חיפוש מילים בתוך
 * `error.message` האנגלי החופשי. חיפוש מילים שביר: אם הניסוח של
 * Supabase משתנה בעדכון עתידי, הזיהוי נשבר בשקט. כל קוד שלא מוכר —
 * fallback ספציפי להקשר, כדי שלעולם לא ידלוף טקסט אנגלי גולמי.
 */
export function authErrorMessage(
  error: Pick<AuthError, "code"> | null | undefined,
  fallback: string,
): string {
  switch (error?.code) {
    case "user_already_exists":
    case "email_exists":
      return "האימייל הזה כבר רשום. אפשר להתחבר.";
    case "invalid_credentials":
      return "אימייל או סיסמה לא נכונים.";
    case "email_not_confirmed":
      return "קודם צריך לאשר את המייל שנשלח אליכם.";
    case "same_password":
      return "הסיסמה החדשה חייבת להיות שונה מהקודמת.";
    case "weak_password":
      return "הסיסמה חלשה מדי. נסו סיסמה אחרת.";
    case "session_expired":
    case "session_not_found":
    case "refresh_token_not_found":
    case "flow_state_expired":
    case "flow_state_not_found":
      return "הקישור פג תוקף. בקשו קישור חדש.";
    case "over_email_send_rate_limit":
    case "over_request_rate_limit":
    case "over_sms_send_rate_limit":
      return "יותר מדי בקשות בזמן קצר. חכו כמה דקות ונסו שוב.";
    case "email_address_invalid":
    case "email_address_not_authorized":
      return "כתובת האימייל לא תקינה.";
    default:
      return fallback;
  }
}
