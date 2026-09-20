import type { BestSwimDay } from "@/lib/gosurf";
import { StarIcon } from "./social-icons";

function joinDayNames(names: string[]): string {
  if (names.length <= 1) return names[0] ?? "";
  if (names.length === 2) return `${names[0]} ו${names[1]}`;
  return `${names.slice(0, -1).join(", ")} ו${names[names.length - 1]}`;
}

/**
 * "הימים הכי טובים לשחייה השבוע" — הימים בשבוע הקרוב שקיבלו 4+
 * כוכבים לפי computeBestSwimStars (lib/sea-score.ts), על סמך תחזית
 * GoSurf לשעה 7:00 בבוקר. לא מוצג בכלל אם אין אף יום כזה השבוע —
 * אותו כלל כמו שאר הכרטיסים המותנים בדף הבית (KnownPeopleStrip וכו').
 */
export function BestSwimDaysCard({ days }: { days: BestSwimDay[] }) {
  if (days.length === 0) return null;

  const names = days.map((d) => d.dayName);

  return (
    <div
      className="space-y-3 rounded-2xl border border-(--color-sea)/20 p-4"
      style={{
        background: "linear-gradient(155deg, #eef5fa 0%, #e2eef5 55%, #d8e9f1 100%)",
      }}
    >
      <p className="flex items-center gap-1.5 font-[family-name:var(--font-display)] text-sm font-bold text-(--color-deep)">
        <StarIcon className="size-4 shrink-0" />
        הימים הכי טובים לשחייה השבוע
      </p>

      <p className="text-sm leading-relaxed text-(--color-ink)">
        לפי תחזית הים לשעה <span className="ltr-nums">7:00</span> בבוקר,{" "}
        {days.length === 1 ? (
          <>
            היום הכי טוב לשחייה השבוע הוא{" "}
            <b className="font-bold text-(--color-deep)">{names[0]}</b>.
          </>
        ) : (
          <>
            הימים הכי טובים לשחייה השבוע הם{" "}
            <b className="font-bold text-(--color-deep)">{joinDayNames(names)}</b>.
          </>
        )}
      </p>

      <ul className="flex flex-wrap gap-2">
        {days.map(({ dateISO, dayName, stars }) => (
          <li
            key={dateISO}
            className="flex shrink-0 items-center gap-1 rounded-full border border-(--color-sea)/40 bg-(--color-sea)/10 px-2 py-0.5 text-[0.7rem] font-bold text-(--color-sea)"
          >
            {dayName}
            <StarIcon className="size-2.5" />
            <span className="ltr-nums">{stars}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
