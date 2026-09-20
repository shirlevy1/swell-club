import type { BestSwimDay } from "@/lib/gosurf";
import { StarIcon } from "./social-icons";

function joinDayNames(names: string[]): string {
  if (names.length <= 1) return names[0] ?? "";
  if (names.length === 2) return `${names[0]} ו${names[1]}`;
  return `${names.slice(0, -1).join(", ")} ו${names[names.length - 1]}`;
}

/**
 * "הבקרים הכי טובים לשחייה השבוע" — תוספת בתוך כרטיס "תחזית גלים
 * ורוח" (לא כרטיס נפרד משלה), הימים בשבוע הקרוב שקיבלו 3.5+ כוכבים
 * לפי computeBestSwimStars (lib/sea-score.ts), על סמך תחזית GoSurf
 * לשעה 7:00 בבוקר — ממוינים מהציון הגבוה לנמוך, אבל הציון עצמו לא
 * מוצג (רק שמות הימים) לפי הניסוח שהוגדר. לא מוצג בכלל אם אין אף
 * יום כזה השבוע.
 */
export function BestSwimDaysHighlight({ days }: { days: BestSwimDay[] }) {
  if (days.length === 0) return null;

  const namesText = joinDayNames(days.map((d) => d.dayName));
  const verb = days.length === 1 ? "נראה" : "נראים";

  return (
    <div className="space-y-1.5 border-t border-(--color-line) pt-3">
      <p className="flex items-center gap-1.5 text-xs font-bold tracking-[0.2em] text-(--color-sea)">
        <StarIcon className="size-3.5 shrink-0" />
        הבקרים הכי טובים לשחייה השבוע
      </p>

      <p className="text-sm leading-relaxed text-(--color-ink)">
        בדקנו את מצב הים ל־<span className="ltr-nums">7:00</span>.
        <br />
        <b className="font-bold text-(--color-deep)">{namesText}</b> {verb} הכי טוב.
      </p>
    </div>
  );
}
