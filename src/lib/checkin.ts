import type { SwellEvent } from "./types";
import { formatTime } from "./format";

export type CheckInWindow = {
  opensAt: Date;
  closesAt: Date;
  status: "before" | "open" | "closed";
};

export function checkInWindow(
  event: Pick<
    SwellEvent,
    "starts_at" | "checkin_opens_before_min" | "checkin_closes_after_min"
  >,
  now: Date = new Date(),
): CheckInWindow {
  const start = new Date(event.starts_at).getTime();
  const opensAt = new Date(start - event.checkin_opens_before_min * 60_000);
  const closesAt = new Date(start + event.checkin_closes_after_min * 60_000);

  const status =
    now < opensAt ? "before" : now > closesAt ? "closed" : "open";

  return { opensAt, closesAt, status };
}

/** "אחרי שמפגש מתקיים" — שער לפיצ'רים כמו אלבום תמונות, לא לצ'ק־אין */
export function hasEventStarted(
  event: Pick<SwellEvent, "starts_at">,
  now: Date = new Date(),
): boolean {
  return new Date(event.starts_at).getTime() < now.getTime();
}

/**
 * תרגום קודי השגיאה של check_in() לעברית.
 * הקודים מגיעים מ-raise exception ב-SQL, עטופים בהודעת Postgres.
 */
export function checkInErrorMessage(
  raw: string,
  event?: Pick<
    SwellEvent,
    "starts_at" | "checkin_opens_before_min" | "checkin_closes_after_min"
  >,
): string {
  const win = event ? checkInWindow(event) : null;

  if (raw.includes("TOO_EARLY")) {
    return win
      ? `הצ׳ק־אין ייפתח ב-${formatTime(win.opensAt.toISOString())}.`
      : "הצ׳ק־אין עוד לא נפתח.";
  }
  if (raw.includes("TOO_LATE")) {
    return win
      ? `הצ׳ק־אין נסגר ב-${formatTime(win.closesAt.toISOString())}.`
      : "הצ׳ק־אין למפגש הזה נסגר.";
  }
  if (raw.includes("TOO_FAR")) {
    return "אתם עדיין לא במפגש. הצ׳ק־אין מחכה לכם במקום עצמו.";
  }
  if (raw.includes("ALREADY_CHECKED_IN")) {
    return "כבר סימנתם הגעה למפגש הזה.";
  }
  if (raw.includes("NOT_A_MEMBER")) {
    return "אתם לא חברים בקהילה הזאת.";
  }
  if (raw.includes("EVENT_NOT_FOUND")) {
    return "המפגש לא נמצא.";
  }
  // שתי אלה לא אמורות להגיע מהממשק שלנו — הן נשמעות כמו לקוח שניסה
  // לעקוף את הסלפי. הודעה כללית, בלי לרמז מה בדיוק חסר.
  if (raw.includes("SELFIE_MISSING") || raw.includes("BAD_SELFIE_PATH")) {
    return "התמונה לא נשמרה. צריך לצלם סלפי כדי לסמן הגעה.";
  }
  return "משהו השתבש בסימון ההגעה. נסו שוב.";
}
