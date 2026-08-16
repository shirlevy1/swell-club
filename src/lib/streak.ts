/**
 * רצף נוכחות שבועי.
 *
 * מונה שרק עולה ("נכחתם ב-12 מפגשים") לא יוצר שום דחיפות — הוא זהה
 * היום ובעוד חודש. רצף כן, כי אפשר לאבד אותו.
 *
 * ⚠️ אבל רצף שנשבר מיידית הוא מסוכן כאן: הוא דוחף אנשים למים כשהם
 * חולים, פצועים או כשהים סוער. לכן הוא **סלחני** בשתי דרכים:
 *   1. היחידה היא **שבוע** ולא מפגש. מי ששוחה פעמיים בשבוע לא נענש.
 *   2. השבוע הנוכחי לא שובר כלום עד שהוא נגמר — עוד לא איחרתם.
 */

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
const TZ = "Asia/Jerusalem";

/**
 * התאריך האזרחי בישראל, כנקודה ב-UTC.
 *
 * בלי זה מפגש של 6:45 בבוקר יום ראשון הוא 03:45 UTC באותו יום — אבל
 * בחורף, מפגש מוקדם יותר יכול ליפול על שבת ב-UTC וליפול לשבוע הקודם.
 * מחשבים לפי היום בישראל, לא לפי השעון של השרת.
 */
function civilDate(iso: string): Date {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(iso));
  const [y, m, d] = parts.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

/** תחילת השבוע — יום ראשון, כמו לוח השנה בישראל */
function weekStart(d: Date): number {
  const copy = new Date(d);
  copy.setUTCDate(copy.getUTCDate() - copy.getUTCDay());
  return copy.getTime();
}

export type Streak = {
  /** מהישן לחדש. האיבר האחרון הוא השבוע הנוכחי. */
  weeks: boolean[];
  /** שבועות רצופים עד עכשיו */
  current: number;
  /** בכמה מתוך חלון השבועות הייתה נוכחות */
  attendedWeeks: number;
  windowWeeks: number;
};

export function attendanceStreak(
  attendedAt: string[],
  windowWeeks = 8,
  now: Date = new Date(),
): Streak {
  const thisWeek = weekStart(civilDate(now.toISOString()));

  // מרחק בשבועות אחורה מהשבוע הנוכחי: 0 = השבוע, 1 = שעבר
  const offsets = new Set(
    attendedAt.map((iso) =>
      Math.round((thisWeek - weekStart(civilDate(iso))) / WEEK_MS),
    ),
  );

  const weeks: boolean[] = [];
  for (let i = windowWeeks - 1; i >= 0; i--) weeks.push(offsets.has(i));

  // השבוע הנוכחי עוד לא נגמר, ולכן היעדרות בו לא שוברת — מתחילים
  // לספור מהשבוע שעבר. רק שבוע **שלם** שחלף בלי שחייה מאפס.
  let i = offsets.has(0) ? 0 : 1;
  let current = 0;
  while (offsets.has(i)) {
    current++;
    i++;
  }

  return {
    weeks,
    current,
    attendedWeeks: weeks.filter(Boolean).length,
    windowWeeks,
  };
}
