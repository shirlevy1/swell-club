import type { ReactNode } from "react";
import type { BestSwimDay } from "@/lib/gosurf";
import { StarIcon } from "./social-icons";

/** "שני (⭐ 4)" — אייקון לפני המספר, כמו בכל תג אחר באתר (למשל
 * "מפגשים משותפים"). בין הימים: פסיק לאמצעיים, "ו" לפני האחרון —
 * אותו כלל חיבור עברי בדיוק כמו בכל רשימה אחרת באתר. */
function renderDayList(days: BestSwimDay[]): ReactNode[] {
  return days.map((d, i) => {
    const isLast = i === days.length - 1;
    const prefix = i === 0 ? "" : isLast ? " ו" : ", ";
    return (
      <span key={d.dateISO}>
        {prefix}
        <b className="font-bold text-(--color-deep)">{d.dayName}</b> (
        <StarIcon className="mx-0.5 inline size-3 -translate-y-px text-(--color-sea)" />
        <span className="ltr-nums">{d.stars}</span>)
      </span>
    );
  });
}

/**
 * "הבקרים הכי טובים לשחייה השבוע" — תוספת בתוך כרטיס "תחזית גלים
 * ורוח" (לא כרטיס נפרד משלה), הימים בשבוע הקרוב שקיבלו 3.5+ כוכבים
 * לפי computeBestSwimStars (lib/sea-score.ts), על סמך תחזית GoSurf
 * לשעה 7:00 בבוקר — *נבחרים* לפי הציון הגבוה ביותר, אבל מוצגים כאן
 * בסדר כרונולוגי (getBestSwimDays כבר ממיין ככה), כל אחד עם הציון
 * שלו בסוגריים. לא מוצג בכלל אם אין אף יום כזה השבוע.
 */
export function BestSwimDaysHighlight({ days }: { days: BestSwimDay[] }) {
  if (days.length === 0) return null;

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
        {renderDayList(days)} {verb} הכי טוב.
      </p>
    </div>
  );
}
