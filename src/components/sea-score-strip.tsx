import type { SeaScoreDay } from "@/lib/gosurf";
import { formatDayMonth } from "@/lib/format";
import { StarIcon } from "./social-icons";
import { cx } from "./ui";

function Stars({ stars }: { stars: number }) {
  const pct = Math.max(0, Math.min(100, (stars / 5) * 100));
  return (
    <span className="relative flex" aria-label={`${stars} מתוך 5 כוכבים`}>
      <span className="flex gap-0.5 text-(--color-line)">
        {[0, 1, 2, 3, 4].map((i) => (
          <StarIcon key={i} className="size-3.5" />
        ))}
      </span>
      {/* start-0 ולא inset-0: inset-0 קובע גם left וגם right, וכש-width
          מפורש מתווסף לזה נוצרת סתירה שגרמה לשכבה הצבועה "לזחול" מהצד
          הלא נכון ב-RTL — נראה כאילו הכוכבים עקומים/לא מיושרים. */}
      <span
        className="absolute inset-y-0 start-0 flex gap-0.5 overflow-hidden text-(--color-warn)"
        style={{ width: `${pct}%` }}
      >
        {[0, 1, 2, 3, 4].map((i) => (
          <StarIcon key={i} className="size-3.5" />
        ))}
      </span>
    </span>
  );
}

/**
 * "מתי הים הכי מתאים לסוואל" — תקציר כוכבים ליום. ראו lib/sea-score.ts
 * לנוסחה. גריד קבוע (3 בשורה) במקום שורה נגללת — כל הימים שיש להם
 * תחזית (בד"כ שישה: ממחר עד סוף שבוע הקרוב) נכנסים בלי גלילה.
 */
export function SeaScoreStrip({ days }: { days: SeaScoreDay[] }) {
  if (days.length === 0) return null;

  return (
    <div className="space-y-4 rounded-2xl border border-(--color-line) bg-(--color-surface) p-5">
      <p className="text-xs font-bold tracking-[0.2em] text-(--color-sea)">
        מתי הים הכי מתאים לסוואל?
      </p>
      <ul className="grid grid-cols-3 gap-2.5">
        {days.map((d, i) => (
          <li
            key={d.dateISO}
            className={cx(
              "flex flex-col items-center gap-1.5 rounded-xl border py-3",
              i === 0
                ? "border-(--color-sea) bg-(--color-haze)"
                : "border-(--color-line)",
            )}
          >
            <span className="text-xs font-bold text-(--color-ink)">
              {d.dayName}
            </span>
            <span className="ltr-nums text-[0.65rem] text-(--color-ink-faint)">
              {formatDayMonth(d.dateISO)}
            </span>
            <Stars stars={d.stars} />
          </li>
        ))}
      </ul>
    </div>
  );
}
