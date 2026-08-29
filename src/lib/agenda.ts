import { formatTime } from "./format";
import type { SwellEvent } from "./types";

/**
 * לו״ז ברירת המחדל, יחסית לשעת ההתחלה של המפגש — לא שעון קיר קשיח.
 * כך זה נכון גם למפגש שמתחיל בשעה אחרת (למשל שחיית שקיעה), ולא רק
 * לזה שמתחיל ב-6:45. משמש כערך פתיחה בטופס יצירת מפגש, וכנפילה
 * אחורה למפגשים ישנים בלי לו״ז מותאם משלהם.
 */
const AGENDA_STEPS_MIN = [
  { offsetMin: 0, label: "התכנסות, חיבוקים וחימום" },
  { offsetMin: 15, label: "רגליים במים" },
  { offsetMin: 75, label: "רגליים ביבשה" },
];

const DEFAULT_AGENDA_CLOSING =
  "ומיד אחר כך מתכנסים לחלק החשוב ביותר: קפה, עוגה וחיבורים.";

export function defaultAgendaText(startsAtISO: string): string {
  const startMs = new Date(startsAtISO).getTime();
  const lines = AGENDA_STEPS_MIN.map(
    ({ offsetMin, label }) =>
      `${formatTime(new Date(startMs + offsetMin * 60_000).toISOString())} — ${label}`,
  );
  return [...lines, "", DEFAULT_AGENDA_CLOSING].join("\n");
}

export function getEventAgendaText(
  event: Pick<SwellEvent, "starts_at" | "agenda_text">,
): string {
  return event.agenda_text?.trim() || defaultAgendaText(event.starts_at);
}

/**
 * ברירת המחדל של "מה להביא למים?" — אותו טקסט קבוע כל עוד לא הוחלף.
 * בכוונה בלי המשפט על הטבות המותגים — זה טקסט חופשי שכל מנהלת יכולה
 * לערוך, וההטבות מוצגות בתנאי נפרד (equipment_link_visible) שאין לו
 * שום קשר לטקסט. אם המשפט היה כאן, מנהלת שמכבה את ה-toggle אבל
 * משאירה את הטקסט הייתה מבטיחה הטבה שלא מופיעה. המשפט עצמו יושב
 * עכשיו ב-what-to-bring.tsx, צמוד לכרטיסים ולאותו תנאי בדיוק.
 */
export function defaultEquipmentText(): string {
  return "בגד ים · כובע · משקפת · מצוף בטיחות (חובה!) · שעון חכם";
}

export function getEventEquipmentText(
  event: Pick<SwellEvent, "equipment_text">,
): string {
  return event.equipment_text?.trim() || defaultEquipmentText();
}

/**
 * כותרת ברירת מחדל לפי שעת ההתחלה — לא תמיד "שחיית בוקר". משמש גם
 * את טופס יצירת המפגש וגם את זריעת נתוני ההדגמה, כדי ששתי הגרסאות
 * לא יתפצלו זו מזו.
 */
export function defaultEventTitle(startsAtISO: string): string {
  const h = new Date(startsAtISO).getHours();
  if (h >= 5 && h < 10) return "שחיית בוקר";
  if (h >= 10 && h < 16) return "שחיית צהריים";
  if (h >= 16 && h < 20) return "שחיית שקיעה";
  return "שחיית לילה";
}
