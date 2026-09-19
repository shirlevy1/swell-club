import type { SeaScoreDay } from "@/lib/gosurf";
import { seaScoreColor, seaScoreLabel } from "@/lib/sea-score";
import { formatDayMonth } from "@/lib/format";
import { cx } from "./ui";

/**
 * "מתי הים הכי מתאים לסוואל" — גרסת "מילה + פס": בלי מספרים או
 * כוכבים, מילה עברית אחת (מעולה/טוב מאוד/טוב/בינוני/גלי/לא מומלץ)
 * ופס צבעוני קטן מתחתיה. ראו lib/sea-score.ts לנוסחה ולתיאורים.
 */
export function SeaScoreWordStrip({ days }: { days: SeaScoreDay[] }) {
  if (days.length === 0) return null;

  return (
    <div className="space-y-4 rounded-2xl border border-(--color-line) bg-(--color-surface) p-5">
      <p className="text-xs font-bold tracking-[0.2em] text-(--color-sea)">
        מתי הים הכי מתאים לסוואל? — מילה ופס
      </p>
      <div className="flex justify-between gap-1">
        {days.map((d) => {
          const color = seaScoreColor(d.stars);
          return (
            <div
              key={d.dateISO}
              className="flex min-w-0 flex-1 flex-col items-center gap-1.5"
            >
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
              <span
                className="flex h-8 items-center text-center text-[0.62rem] font-extrabold leading-tight"
                style={{ color }}
              >
                {seaScoreLabel(d.stars)}
              </span>
              <span className="h-1.5 w-full overflow-hidden rounded-full bg-(--color-line)">
                <span
                  className="block h-full rounded-full"
                  style={{ width: `${(d.stars / 5) * 100}%`, background: color }}
                />
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
