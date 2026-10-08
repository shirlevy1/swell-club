import Link from "next/link";
import type { NewVsReturningStats } from "@/lib/data";
import { formatDayMonth } from "@/lib/format";
import { Card } from "./ui";

const CHART_HEIGHT_PX = 140;

/**
 * גרף 3 ב-admin/insights: כמה מהמגיעים לכל מפגש הם חדשים (לא נכחו
 * מעולם לפני כן) מול חוזרים - עונה על "האם המפגשים האחרונים מביאים
 * אנשים חדשים, או כל פעם אותה חבורה". אותה שפה חזותית כמו גרף 1
 * (GenderAttendanceChart) בכוונה: עמודות ערומות, כי חדש/חוזר הוא
 * פיצול-מתוך-שלם בדיוק כמו גברים/נשים.
 *
 * בלי תג מגמה בכותרת (היה כאן קודם, ושיר אמרה שזה לא היה ברור -
 * "בממוצע: 0" עם חץ "+1" ליד זה נראה כמו סתירה, כי שני המספרים
 * ענו על שאלות שונות). המספר עצמו כן ממוצע (לא סכום) - "בממוצע: X
 * חדשים" - אותו דפוס בדיוק כמו גרף 1/גרף 2, רק בלי תג המגמה.
 */
export function NewVsReturningChart({
  events,
}: {
  events: NewVsReturningStats[];
}) {
  if (events.length === 0) return null;

  const avgNew = Math.round(
    events.reduce((sum, e) => sum + e.newCount, 0) / events.length,
  );
  const maxTotal = Math.max(
    1,
    ...events.map((e) => e.newCount + e.returningCount),
  );

  return (
    <Card>
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1.5">
        <div className="flex flex-wrap items-baseline gap-x-1.5 gap-y-0.5">
          <p className="text-sm font-bold text-(--color-ink-soft)">
            חדשים מול חוזרים
          </p>
          <span className="text-xs text-(--color-ink-faint)">בממוצע</span>
          <span className="font-[family-name:var(--font-display)] text-lg font-bold text-(--color-ink) ltr-nums">
            {avgNew}
          </span>
          <span className="text-xs text-(--color-ink-faint)">חדשים</span>
        </div>
        <div className="flex gap-3 text-xs">
          <span className="flex items-center gap-1 text-(--color-ink-soft)">
            <span className="size-2 rounded-full bg-(--color-sea)" />
            חדשים
          </span>
          <span className="flex items-center gap-1 text-(--color-ink-soft)">
            <span className="size-2 rounded-full bg-(--color-deep)" />
            חוזרים
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
          // איזה חלק מהמגיעים למפגש הזה היו חדשים - "1 מתוך 2" הוא
          // סיפור שונה מ"1 מתוך 8", גם אם שני המקרים מראים "1" בעמודה.
          const newPercent = total > 0 ? Math.round((e.newCount / total) * 100) : null;

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
                    className="flex items-center justify-center bg-(--color-deep) text-[0.6rem] font-medium text-white/70 ltr-nums"
                    style={{ height: returningHeight }}
                  >
                    {e.returningCount}
                  </div>
                )}
                {newHeight > 0 && (
                  <div
                    className="flex items-center justify-center bg-(--color-sea) text-[0.6rem] font-medium text-white/70 ltr-nums"
                    style={{ height: newHeight }}
                  >
                    {e.newCount}
                  </div>
                )}
              </div>
              {newPercent !== null && (
                <span className="rounded bg-(--color-haze) px-1 text-[0.55rem] font-bold text-(--color-sea) ltr-nums">
                  {newPercent}%
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
