/**
 * "פתק" זמני בין check-in-flow.tsx לבין רשימת הנוכחים בעמוד המפגש —
 * שני רכיבים שלא "מדברים" ישירות זה עם זה. sessionStorage שורד את
 * router.refresh() שקורה אחרי צ'ק־אין מוצלח, בשביל שהפתק יחכה שם
 * גם רגע אחרי הריענון.
 *
 * ⚠️ לא מספיק "פתק שבודקים ב-mount": אצל מנהלת (או בהדגמה, שתמיד
 * מתחילה כמנהלת) רשימת הנוכחים כבר מוצגת עוד *לפני* הצ'ק־אין — הרכיב
 * שקורא את הפתק כבר mounted מקודם, ולכן ה-mount effect שלו כבר רץ
 * (ולא מצא כלום) לפני שהפתק בכלל הונח. גם אירוע חי (JUST_CHECKED_IN_EVENT)
 * צריך בשביל המקרה הזה — שאותו רכיב שכבר קיים יגיב בזמן אמת.
 */
const JUST_CHECKED_IN_KEY = "swell-just-checked-in";
export const JUST_CHECKED_IN_EVENT = "swell-just-checked-in-event";

export function markJustCheckedIn(): void {
  try {
    sessionStorage.setItem(JUST_CHECKED_IN_KEY, "1");
  } catch {
    // לא קריטי — הכי גרוע, לא יגלול לבד הפעם
  }
  window.dispatchEvent(new Event(JUST_CHECKED_IN_EVENT));
}

/** true פעם אחת בלבד — קוראת את הפתק ומיד קורעת אותו. */
export function consumeJustCheckedIn(): boolean {
  try {
    const was = sessionStorage.getItem(JUST_CHECKED_IN_KEY) === "1";
    sessionStorage.removeItem(JUST_CHECKED_IN_KEY);
    return was;
  } catch {
    return false;
  }
}
