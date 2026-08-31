import type { Streak } from "@/lib/streak";
import type { Gender } from "@/lib/types";
import { byGender } from "@/lib/format";
import { WaveIcon } from "./social-icons";
import { Card } from "./ui";

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

  // מד רצף אישי, לא לוח שבועות קלנדרי: כל אחד מתחיל את העיגול הראשון
  // מימין. אם המשתמשת לא הייתה בכלל שבוע שעבר אבל כן השבוע, הרצף שלה
  // הוא עיגול אחד — לא "עיגול ריק בשבוע שעבר, עיגול מלא השבוע". בלי
  // dir override: איבר ראשון ב-DOM נופל מימין (RTL טבעי), ולכן ממלאים
  // את ה-N העיגולים הראשונים ב-DOM.
  const filledCount = Math.min(current, windowWeeks);

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
              ? "שבוע אחד ברצף על הגל"
              : `${current} שבועות ברצף על הגל`}
        </p>
      </div>

      <div className="flex gap-1.5 py-0.5">
        {Array.from({ length: windowWeeks }, (_, i) => {
          const isNow = i === 0;
          const filled = i < filledCount;
          return (
            <span
              key={i}
              title={isNow ? "השבוע" : undefined}
              className={
                "h-2.5 flex-1 rounded-full " +
                (filled ? "bg-(--color-sea)" : "bg-(--color-line)/60") +
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
          ? "השבוע היית בסוואל."
          : current > 0
            ? "השבוע עוד פתוח — שחייה אחת שומרת על הרצף."
            : "שחייה אחת מתחילה רצף חדש."}
      </p>
    </Card>
  );
}
