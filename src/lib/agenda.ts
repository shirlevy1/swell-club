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

/** ברירת המחדל של "מה להביא למים?" — אותו טקסט קבוע כל עוד לא הוחלף. */
export function defaultEquipmentText(): string {
  return [
    "בגד ים · כובע · משקפת · מצוף בטיחות מים פתוחים (חובה) · שעון חכם",
    "",
    "חסר לכם ציוד?",
    "יש לנו הטבות שוות באתר ובחנויות של Speedo ושל Garmin:",
  ].join("\n");
}

export function getEventEquipmentText(
  event: Pick<SwellEvent, "equipment_text">,
): string {
  return event.equipment_text?.trim() || defaultEquipmentText();
}
