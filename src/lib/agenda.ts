import { formatTime } from "./format";
import type { EventAgendaStep, SwellEvent } from "./types";

/**
 * לו״ז ברירת המחדל, יחסית לשעת ההתחלה של המפגש — לא שעון קיר קשיח.
 * כך זה נכון גם למפגש שמתחיל בשעה אחרת (למשל שחיית שקיעה), ולא רק
 * לזה שמתחיל ב-6:45. משמש כערך פתיחה בטופס יצירת מפגש, וכנפילה
 * אחורה למפגשים ישנים בלי לו״ז מפורש משלהם.
 */
const AGENDA_STEPS_MIN = [
  { offsetMin: 0, label: "התכנסות, חיבוקים וחימום" },
  { offsetMin: 15, label: "רגליים במים" },
  { offsetMin: 75, label: "רגליים ביבשה" },
];

export const DEFAULT_AGENDA_CLOSING =
  "ומיד אחר כך מתכנסים לחלק החשוב ביותר: קפה, עוגה וחיבורים.";

export type AgendaStep = EventAgendaStep;

export type EventAgenda = {
  steps: AgendaStep[];
  closingLine: string;
};

export function defaultAgendaSteps(startsAtISO: string): AgendaStep[] {
  const startMs = new Date(startsAtISO).getTime();
  return AGENDA_STEPS_MIN.map(({ offsetMin, label }) => ({
    time: formatTime(new Date(startMs + offsetMin * 60_000).toISOString()),
    label,
  }));
}

export function getEventAgenda(
  event: Pick<SwellEvent, "starts_at" | "agenda" | "agenda_closing">,
): EventAgenda {
  return {
    steps:
      event.agenda.length > 0 ? event.agenda : defaultAgendaSteps(event.starts_at),
    closingLine: event.agenda_closing ?? DEFAULT_AGENDA_CLOSING,
  };
}
