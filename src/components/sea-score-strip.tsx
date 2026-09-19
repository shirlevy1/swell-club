import type { SeaScoreDay } from "@/lib/gosurf";
import { formatDayMonth } from "@/lib/format";
import { StarIcon } from "./social-icons";
import { cx } from "./ui";

function Stars({ stars }: { stars: number }) {
  const pct = Math.max(0, Math.min(100, (stars / 5) * 100));
  return (
    <span className="relative inline-flex" aria-label={`${stars} מתוך 5 כוכבים`}>
      <span className="flex gap-0.5 text-(--color-line)">
        {[0, 1, 2, 3, 4].map((i) => (
          <StarIcon key={i} className="size-3.5" />
        ))}
      </span>
      <span
        className="absolute inset-0 flex gap-0.5 overflow-hidden text-(--color-warn)"
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
 * "מתי הים הכי מתאים לסוואל" — תקציר כוכבים ליום, לא רק ליום מפגש
 * ספציפי. ראו lib/sea-score.ts לנוסחה. קומפקטי בכוונה: תאריך + כוכבים
 * בלבד, בלי הסבר טקסטואלי.
 */
export function SeaScoreStrip({ days }: { days: SeaScoreDay[] }) {
  if (days.length === 0) return null;

  return (
    <div className="space-y-3 rounded-2xl border border-(--color-line) bg-(--color-surface) p-4">
      <p className="text-xs font-bold tracking-[0.2em] text-(--color-sea)">
        מתי הים הכי מתאים לסוואל?
      </p>
      <ul className="flex gap-2 overflow-x-auto pb-0.5">
        {days.map((d, i) => (
          <li
            key={d.dateISO}
            className={cx(
              "flex shrink-0 flex-col items-center gap-1 rounded-xl border px-3 py-2",
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
