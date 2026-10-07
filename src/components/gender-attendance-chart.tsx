import Link from "next/link";
import type { RecentEventStats } from "@/lib/data";
import { formatDayMonth } from "@/lib/format";
import { Card } from "./ui";
import { average, computeTrend, TrendBadge } from "./trend-badge";

const CHART_HEIGHT_PX = 140;

/**
 * גרף 1 מתוך תהליך בניית /admin/insights גרף-אחר-גרף עם שיר: כמה
 * הגיעו בכל אחד מה-N המפגשים האחרונים, מפוצל לגברים/נשים, עם מגמה
 * נפרדת לכל מגדר (לא רק מגמה כוללת) - כדי לענות ישירות על "האם יש
 * ירידה באחד המגדרים ספציפית". כל עמודה מקושרת לעמוד המפגש עצמו.
 */
export function GenderAttendanceChart({
  events,
}: {
  events: RecentEventStats[];
}) {
  if (events.length === 0) return null;

  const totals = events.map((e) => e.maleCount + e.femaleCount);
  const avgTotal = Math.round(average(totals));
  const maxTotal = Math.max(1, ...totals);

  // events מגיע מהחדש לישן (ה"היום" מימין, ראו getRecentEventStats) -
  // אבל מגמה (עולה/יורדת) צריכה להיקרא מהישן לחדש, אחרת היא תתהפך.
  const chronological = [...events].reverse();
  const totalTrend = computeTrend(
    chronological.map((e) => e.maleCount + e.femaleCount),
  );
  const maleTrend = computeTrend(chronological.map((e) => e.maleCount));
  const femaleTrend = computeTrend(chronological.map((e) => e.femaleCount));

  return (
    <Card>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-bold text-(--color-ink-soft)">
            כמה הגיעו?
          </p>
          <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5">
            <span className="text-sm text-(--color-ink-soft)">בממוצע:</span>
            <span className="font-[family-name:var(--font-display)] text-[2.25rem] font-bold text-(--color-ink) ltr-nums">
              {avgTotal}
            </span>
            {totalTrend !== null && (
              <span className="text-sm">
                <TrendBadge trend={totalTrend} />
              </span>
            )}
          </div>
        </div>
        <div className="flex gap-4 text-sm">
          <span className="flex items-center gap-1.5 text-(--color-ink-soft)">
            <span className="size-2.5 rounded-full bg-(--color-sea)" />
            גברים <TrendBadge trend={maleTrend} />
          </span>
          <span className="flex items-center gap-1.5 text-(--color-ink-soft)">
            <span className="size-2.5 rounded-full bg-(--color-deep)" />
            נשים <TrendBadge trend={femaleTrend} />
          </span>
        </div>
      </div>

      <div
        className="mt-5 flex items-end gap-1"
        style={{ height: CHART_HEIGHT_PX }}
      >
        {events.map((e) => {
          const total = e.maleCount + e.femaleCount;
          const stackHeight = Math.round((total / maxTotal) * CHART_HEIGHT_PX);
          const femaleHeight =
            total > 0 ? Math.round((e.femaleCount / total) * stackHeight) : 0;
          const maleHeight = stackHeight - femaleHeight;
          // אותו עיקרון כמו באחוזים בגרף "חדשים מול חוזרים" - איזה
          // חלק מהמגיעים למפגש הזה היו נשים, לא רק הספירה הגולמית.
          const femalePercent =
            total > 0 ? Math.round((e.femaleCount / total) * 100) : null;

          return (
            <Link
              key={e.eventId}
              href={`/events/${e.eventId}?from=admin-insights`}
              className="flex h-full flex-1 flex-col items-center justify-end gap-1 rounded-lg px-0.5 transition hover:bg-(--color-haze)"
            >
              <span className="text-xs font-bold text-(--color-ink) ltr-nums">
                {total}
              </span>
              <div
                className="flex w-full flex-col overflow-hidden rounded-t"
                style={{ height: stackHeight }}
              >
                {femaleHeight > 0 && (
                  <div
                    className="flex items-center justify-center bg-(--color-deep) text-[0.6rem] font-medium text-white/70 ltr-nums"
                    style={{ height: femaleHeight }}
                  >
                    {e.femaleCount}
                  </div>
                )}
                {maleHeight > 0 && (
                  <div
                    className="flex items-center justify-center bg-(--color-sea) text-[0.6rem] font-medium text-white/70 ltr-nums"
                    style={{ height: maleHeight }}
                  >
                    {e.maleCount}
                  </div>
                )}
              </div>
              {femalePercent !== null && (
                <span className="rounded bg-(--color-haze) px-1 text-[0.55rem] font-bold text-(--color-sea) ltr-nums">
                  {femalePercent}%
                </span>
              )}
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
