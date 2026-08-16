import { formatTime } from "./format";

/**
 * לו״ז קבוע לכל מפגשי Swell Club, יחסית לשעת ההתחלה של המפגש —
 * לא שעון קיר קשיח. כך זה נכון גם למפגש שמתחיל בשעה אחרת (למשל
 * שחיית שקיעה), ולא רק לזה שמתחיל ב-6:45.
 */
const AGENDA_STEPS_MIN = [
  { offsetMin: 0, label: "התכנסות, חיבוקים וחימום" },
  { offsetMin: 15, label: "רגליים במים" },
  { offsetMin: 75, label: "רגליים ביבשה" },
];

export type AgendaStep = { time: string; label: string };

export type EventAgenda = {
  steps: AgendaStep[];
  closingLine: string;
};

export function getEventAgenda(startsAtISO: string): EventAgenda {
  const startMs = new Date(startsAtISO).getTime();

  const steps = AGENDA_STEPS_MIN.map(({ offsetMin, label }) => ({
    time: formatTime(new Date(startMs + offsetMin * 60_000).toISOString()),
    label,
  }));

  return {
    steps,
    closingLine:
      "ומיד אחר כך מתכנסים לחלק החשוב ביותר: קפה, עוגה וחיבורים.",
  };
}
