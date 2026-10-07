import Link from "next/link";
import type { NewVsReturningStats } from "@/lib/data";
import { formatDayMonth } from "@/lib/format";
import { Card } from "./ui";
import { average, computeTrend, TrendBadge } from "./trend-badge";

const CHART_HEIGHT_PX = 140;

/**
 * גרף 3 ב-admin/insights: כמה מהמגיעים לכל מפגש הם חדשים (לא נכחו
 * מעולם לפני כן) מול חוזרים - עונה על "האם המפגשים האחרונים מביאים
 * אנשים חדשים, או כל פעם אותה חבורה". אותה שפה חזותית כמו גרף 1
 * (GenderAttendanceChart) בכוונה: עמודות ערומות, כי חדש/חוזר הוא
 * פיצול-מתוך-שלם בדיוק כמו גברים/נשים.
 */
export function NewVsReturningChart({
  events,
}: {
  events: NewVsReturningStats[];
}) {
  if (events.length === 0) return null;

  const newValues = events.map((e) => e.newCount);
  const avgNew = Math.round(average(newValues));
  const maxTotal = Math.max(
    1,
    ...events.map((e) => e.newCount + e.returningCount),
  );

  // events מגיע מהחדש לישן (ה"היום" מימין) - אבל מגמה צריכה להיקרא
  // מהישן לחדש, אחרת היא תתהפך.
  const chronological = [...events].reverse();
  const newTrend = computeTrend(chronological.map((e) => e.newCount));
  const returningTrend = computeTrend(
    chronological.map((e) => e.returningCount),
  );

  return (
    <Card>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-bold text-(--color-ink-soft)">
            חדשים מול חוזרים
          </p>
          <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5">
            <span className="text-sm text-(--color-ink-soft)">
              בממוצע חדשים:
            </span>
            <span className="font-[family-name:var(--font-display)] text-[2.25rem] font-bold text-(--color-ink) ltr-nums">
              {avgNew}
            </span>
            {newTrend !== null && (
              <span className="text-sm">
                <TrendBadge trend={newTrend} />
              </span>
            )}
          </div>
        </div>
        <div className="flex gap-4 text-sm">
          <span className="flex items-center gap-1.5 text-(--color-ink-soft)">
            <span className="size-2.5 rounded-full bg-(--color-deep)" />
            חדשים
          </span>
          <span className="flex items-center gap-1.5 text-(--color-ink-soft)">
            <span className="size-2.5 rounded-full bg-(--color-sea)" />
            חוזרים <TrendBadge trend={returningTrend} />
          </span>
        </div>
      </div>

      <div
        className="mt-5 flex items-end gap-1"
        style={{ height: CHART_HEIGHT_PX }}
      >
        {events.map((e) => {
          const total = e.newCount + e.returningCount;
          const stackHeight = Math.round((total / maxTotal) * CHART_HEIGHT_PX);
          const newHeight =
            total > 0 ? Math.round((e.newCount / total) * stackHeight) : 0;
          const returningHeight = stackHeight - newHeight;

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
                {returningHeight > 0 && (
                  <div
                    className="flex items-center justify-center bg-(--color-sea) text-[0.6rem] font-medium text-white/70 ltr-nums"
                    style={{ height: returningHeight }}
                  >
                    {e.returningCount}
                  </div>
                )}
                {newHeight > 0 && (
                  <div
                    className="flex items-center justify-center bg-(--color-deep) text-[0.6rem] font-medium text-white/70 ltr-nums"
                    style={{ height: newHeight }}
                  >
                    {e.newCount}
                  </div>
                )}
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
