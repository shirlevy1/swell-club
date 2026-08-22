import type { CSSProperties } from "react";
import type { Streak } from "@/lib/streak";
import type { Gender } from "@/lib/types";
import { byGender } from "@/lib/format";
import { Card } from "./ui";

/**
 * גל א-סימטרי — אותה צורה בדיוק כמו אייקון "מפגשים" בסרגל הניווט
 * (app-nav.tsx), שנגזרה מהגל האמיתי ב-public/logo.png. לא להמציא
 * צורת גל חדשה כאן; זו שפת העיצוב של Swell, לא סינוס גנרי.
 */
export function WaveIcon({
  className,
  style,
}: {
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      style={style}
      aria-hidden
    >
      <path d="M2 11q3-2.8 6.5 0t6.5 0q2-2 5.5-0.8" />
      <path d="M4.5 16q3.5-2 7-0.3t5.5-0.7" />
    </svg>
  );
}

/**
 * הרצף: מספר גדול + אייקון גל כמסר ראשי שנקרא במבט אחד (כמו "רצף
 * להבה" באפליקציות אחרות, רק בשפה הכחולה של Swell במקום כתום) —
 * שורת הנקודות נשארת כפירוט משני, לא הדבר הראשון שצריך לפענח.
 */
export function StreakCard({
  streak,
  gender,
}: {
  streak: Streak;
  gender: Gender | null;
}) {
  const { weeks, current, attendedWeeks, windowWeeks } = streak;

  return (
    <Card className="space-y-3">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-xs font-bold tracking-[0.2em] text-(--color-sea)">
          הסוואל שלך
        </h2>
        <p className="text-xs text-(--color-ink-faint)">
          {attendedWeeks} מתוך {windowWeeks} השבועות האחרונים
        </p>
      </div>

      <div className="flex items-center gap-3">
        <div className="grid size-11 shrink-0 place-items-center rounded-full bg-(--color-sea)/12 text-(--color-sea)">
          <WaveIcon className="size-6" />
        </div>
        <p className="font-[family-name:var(--font-display)] text-2xl font-bold">
          {current === 0
            ? byGender(gender, "מתחיל מחדש", "מתחילה מחדש")
            : current === 1
              ? "שבוע אחד על הגל"
              : `${current} שבועות על הגל`}
        </p>
      </div>

      {/* כל קוביה שבוע קלנדרי אמיתי — אבל "עכשיו" בעמדה 0 (שמאל, בזכות
          dir=ltr) ולא באחרונה, כדי שהרצף (השבועות הרצופים האחרונים)
          יתמלא שמאל־לימין במקום להתרחב שמאלה מהקצה הימני. weeks
          עצמו נשאר מהישן לחדש כמו שהיה — רק ההיפוך קורה כאן בתצוגה. */}
      <div dir="ltr" className="flex gap-1.5 py-0.5">
        {[...weeks].reverse().map((swam, i) => {
          const isNow = i === 0;
          return (
            <span
              key={i}
              title={isNow ? "השבוע" : `לפני ${i} שבועות`}
              className={
                "h-2.5 flex-1 rounded-full " +
                (swam ? "bg-(--color-sea)" : "bg-(--color-line)/60") +
                (isNow
                  ? " ring-2 ring-(--color-sea) ring-offset-2 ring-offset-(--color-surface)"
                  : "")
              }
            />
          );
        })}
      </div>

      <p className="text-xs leading-relaxed text-(--color-ink-faint)">
        {weeks[weeks.length - 1]
          ? "השבוע כבר היית איתנו."
          : current > 0
            ? "השבוע עוד פתוח — שחייה אחת שומרת על הרצף."
            : "שחייה אחת מתחילה רצף חדש."}
      </p>
    </Card>
  );
}
