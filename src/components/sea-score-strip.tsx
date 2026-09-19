import type { SeaScoreDay } from "@/lib/gosurf";
import { seaScoreColor } from "@/lib/sea-score";
import { formatDayMonth } from "@/lib/format";
import { cx } from "./ui";

function bestDay(days: SeaScoreDay[]): SeaScoreDay {
  return days.reduce((best, d) => (d.stars > best.stars ? d : best), days[0]);
}

/**
 * "מתי הים הכי מתאים לסוואל" — גרסת "אופק": כל יום הוא עמודה, הגובה
 * והצבע שלה הם הציון (גבוה+כחול עמוק = ים רגוע, נמוך+אפרפר = ים גלי).
 * ראו lib/sea-score.ts לנוסחה. שורה אחת קבועה, בלי גלילה.
 */
export function SeaScoreStrip({ days }: { days: SeaScoreDay[] }) {
  if (days.length === 0) return null;
  const best = bestDay(days);

  return (
    <div
      className="space-y-1 rounded-2xl border border-(--color-line) p-5"
      style={{ background: "linear-gradient(165deg, #f5f9fb 0%, #e9f1f6 100%)" }}
    >
      <p className="text-xs font-bold tracking-[0.2em] text-(--color-sea)">
        מתי הים הכי מתאים לסוואל? — אופק
      </p>
      <p className="text-sm text-(--color-ink-soft)">
        הכי טוב בקרוב:{" "}
        <span className="font-bold text-(--color-deep)">
          יום {best.dayName}, {formatDayMonth(best.dateISO)}
        </span>
      </p>

      <div className="relative mt-4 flex h-28 items-end justify-between gap-1.5">
        <div className="pointer-events-none absolute inset-x-0 bottom-9 h-px bg-(--color-line)" />
        {days.map((d) => {
          const color = seaScoreColor(d.stars);
          const heightPct = Math.max(12, (d.stars / 5) * 100);
          return (
            <div key={d.dateISO} className="flex flex-1 flex-col items-center gap-1.5">
              <div className="flex h-[74px] w-full items-end justify-center">
                <div
                  className="w-[62%] rounded-t-lg rounded-b-[4px]"
                  style={{ height: `${heightPct}%`, background: color }}
                />
              </div>
              <span
                className={cx(
                  "text-xs font-bold",
                  d.dateISO === days[0].dateISO
                    ? "text-(--color-sea)"
                    : "text-(--color-ink)",
                )}
              >
                {d.dayName}
              </span>
              <span className="ltr-nums text-[0.6rem] text-(--color-ink-faint)">
                {formatDayMonth(d.dateISO)}
              </span>
            </div>
          );
        })}
      </div>

      <div className="flex justify-center gap-3.5 pt-2 text-[0.68rem] text-(--color-ink-faint)">
        <span className="flex items-center gap-1">
          <span
            className="size-2.5 rounded-[3px]"
            style={{ background: seaScoreColor(5) }}
          />
          ים רגוע
        </span>
        <span className="flex items-center gap-1">
          <span
            className="size-2.5 rounded-[3px]"
            style={{ background: seaScoreColor(0) }}
          />
          ים גלי
        </span>
      </div>
    </div>
  );
}
