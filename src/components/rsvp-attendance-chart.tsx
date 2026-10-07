import Link from "next/link";
import type { RecentEventStats } from "@/lib/data";
import { formatDayMonth } from "@/lib/format";
import { Card } from "./ui";
import { average, TrendBadge, type Trend } from "./trend-badge";

const CHART_HEIGHT_PX = 140;

/**
 * גרף 2 ב-admin/insights: כמה סימנו הגעה (RSVP) מול כמה הגיעו בפועל,
 * באותם N המפגשים האחרונים כמו גרף 1 (GenderAttendanceChart) - אותה
 * שפה חזותית בכוונה: Card, כותרת+מקרא באותו מבנה, בממוצע+מגמה למעלה,
 * עמודות עם מספר מעליהן ותאריך מתחתן, לחיצה על עמודה פותחת את המפגש.
 *
 * ההפרש בין גרף 1 לגרף 2: כאן שני ערכים עצמאיים (לא חלק-מתוך-שלם),
 * אז העמודות זוגיות זו-לצד-זו, לא ערומות זו-על-זו.
 *
 * מגמת הכותרת היא על "אחוז הגעה בפועל מתוך מי שסימן/ה" (לא על ספירת
 * אנשים) - לכן בכוונה לא משתמשת ב-computeTrend המשותף (שהסף שלו של
 * "בסיס קטן מ-3" מיועד לספירות אנשים, לא לאחוזים) - ההפרש מוצג תמיד
 * בנקודות אחוז גולמיות ("↑10"), לא "שינוי יחסי באחוז" שהיה מבלבל.
 */
export function RsvpAttendanceChart({
  events,
}: {
  events: RecentEventStats[];
}) {
  if (events.length === 0) return null;

  const maxVal = Math.max(
    1,
    ...events.flatMap((e) => [e.goingCount, e.attendedCount]),
  );

  const chronological = [...events].reverse();
  const rates = chronological
    .filter((e) => e.goingCount > 0)
    .map((e) => (e.attendedCount / e.goingCount) * 100);
  const avgRate = rates.length ? Math.round(average(rates)) : null;

  let rateTrend: Trend = null;
  if (rates.length >= 4) {
    const mid = Math.floor(rates.length / 2);
    const diff = Math.round(
      average(rates.slice(mid)) - average(rates.slice(0, mid)),
    );
    if (diff !== 0) rateTrend = { kind: "diff", value: diff };
  }

  return (
    <Card>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-bold text-(--color-ink-soft)">
            RSVP מול הגעה בפועל
          </p>
          <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5">
            <span className="text-sm text-(--color-ink-soft)">בממוצע:</span>
            <span className="font-[family-name:var(--font-display)] text-[2.25rem] font-bold text-(--color-ink) ltr-nums">
              {avgRate !== null ? `${avgRate}%` : "—"}
            </span>
            {rateTrend !== null && (
              <span className="text-sm">
                <TrendBadge trend={rateTrend} />
              </span>
            )}
          </div>
        </div>
        <div className="flex gap-4 text-sm">
          <span className="flex items-center gap-1.5 text-(--color-ink-soft)">
            <span className="size-2.5 rounded-full bg-(--color-line)" />
            סימנו הגעה
          </span>
          <span className="flex items-center gap-1.5 text-(--color-ink-soft)">
            <span className="size-2.5 rounded-full bg-(--color-sea)" />
            הגיעו בפועל
          </span>
        </div>
      </div>

      <div className="mt-5 flex items-end gap-1">
        {events.map((e) => {
          const goingHeight = Math.round((e.goingCount / maxVal) * CHART_HEIGHT_PX);
          const attendedHeight = Math.round(
            (e.attendedCount / maxVal) * CHART_HEIGHT_PX,
          );

          return (
            <Link
              key={e.eventId}
              href={`/events/${e.eventId}?from=admin-insights`}
              className="flex h-full flex-1 flex-col items-center justify-end gap-1 rounded-lg px-0.5 transition hover:bg-(--color-haze)"
            >
              <div
                className="flex w-full items-end justify-center gap-1"
                style={{ height: CHART_HEIGHT_PX }}
              >
                <div className="flex h-full w-1/2 max-w-3 flex-col items-center justify-end gap-0.5">
                  <span className="text-[0.58rem] font-bold text-(--color-ink-faint) ltr-nums">
                    {e.goingCount}
                  </span>
                  <div
                    className="w-full rounded-t bg-(--color-line)"
                    style={{ height: goingHeight }}
                  />
                </div>
                <div className="flex h-full w-1/2 max-w-3 flex-col items-center justify-end gap-0.5">
                  <span className="text-[0.58rem] font-bold text-(--color-ink) ltr-nums">
                    {e.attendedCount}
                  </span>
                  <div
                    className="w-full rounded-t bg-(--color-sea)"
                    style={{ height: attendedHeight }}
                  />
                </div>
              </div>
              <span className="text-[0.64rem] text-(--color-ink-faint) ltr-nums">
                {formatDayMonth(e.startsAt)}
              </span>
            </Link>
          );
        })}
      </div>
    </Card>
  );
}
