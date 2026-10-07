import Link from "next/link";
import type { RecentEventGenderAttendance } from "@/lib/data";
import { formatDayMonth } from "@/lib/format";
import { Card } from "./ui";

const CHART_HEIGHT_PX = 140;

function average(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

type Trend = { kind: "percent" | "diff"; value: number } | null;

/** השוואת ממוצע המחצית הראשונה מול השנייה - "האם זה עולה או יורד",
 * לא רק "מה הערך האחרון". null כשאין מספיק מפגשים כדי שזה יהיה בעל
 * משמעות. כשהבסיס להשוואה קטן (פחות מ-3, כמו בקהילה בשלב בדיקות) -
 * אחוז יהיה מטעה (1→3 זה "200%" שנשמע דרמטי בלי סיבה) - אז מציגים
 * את ההפרש הגולמי במקום ("↑2"), לא מסתירים את התג לגמרי. */
function computeTrend(values: number[]): Trend {
  if (values.length < 4) return null;
  const mid = Math.floor(values.length / 2);
  const first = average(values.slice(0, mid));
  const second = average(values.slice(mid));
  if (first < 3) {
    const diff = Math.round(second - first);
    return diff === 0 ? null : { kind: "diff", value: diff };
  }
  return { kind: "percent", value: Math.round(((second - first) / first) * 100) };
}

/**
 * inline-flex עם סדר DOM קבוע (חץ קודם) - בעמוד RTL זה ממקם את החץ
 * תמיד מימין, בלי להסתמך על פענוח bidi של דפדפן למחרוזת מעורבת
 * (תו חץ + ספרה), שהתברר ויזואלית כלא אמין: חץ ומספר ישבו על גבהים
 * שונים ובסדר לא עקבי. items-center מיישר את שניהם לאותו קו אמצע.
 */
function TrendBadge({ trend }: { trend: Trend }) {
  if (trend === null) return null;
  const up = trend.value >= 0;
  return (
    <span
      className={
        "inline-flex items-center gap-0.5 font-bold leading-none " +
        (up ? "text-(--color-verified)" : "text-(--color-fail)")
      }
    >
      <span>{up ? "↑" : "↓"}</span>
      <span className="ltr-nums">
        {Math.abs(trend.value)}
        {trend.kind === "percent" && "%"}
      </span>
    </span>
  );
}

/**
 * גרף 1 מתוך תהליך בניית /admin/insights גרף-אחר-גרף עם שיר: כמה
 * הגיעו בכל אחד מה-N המפגשים האחרונים, מפוצל לגברים/נשים, עם מגמה
 * נפרדת לכל מגדר (לא רק מגמה כוללת) - כדי לענות ישירות על "האם יש
 * ירידה באחד המגדרים ספציפית". כל עמודה מקושרת לעמוד המפגש עצמו.
 */
export function GenderAttendanceChart({
  events,
}: {
  events: RecentEventGenderAttendance[];
}) {
  if (events.length === 0) return null;

  const totals = events.map((e) => e.maleCount + e.femaleCount);
  const avgTotal = Math.round(average(totals));
  const maxTotal = Math.max(1, ...totals);

  // events מגיע מהחדש לישן (ה"היום" מימין, ראו getRecentGenderAttendance) -
  // אבל מגמה (עולה/יורדת) צריכה להיקרא מהישן לחדש, אחרת היא תתהפך.
  const chronological = [...events].reverse();
  const totalTrend = computeTrend(
    chronological.map((e) => e.maleCount + e.femaleCount),
  );
  const maleTrend = computeTrend(chronological.map((e) => e.maleCount));
  const femaleTrend = computeTrend(chronological.map((e) => e.femaleCount));

  return (
    <Card>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-bold text-(--color-ink-soft)">
            כמה הגיעו?
          </p>
          <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5">
            <span className="text-sm text-(--color-ink-soft)">בממוצע:</span>
            <span className="font-[family-name:var(--font-display)] text-[2.25rem] font-bold text-(--color-ink) ltr-nums">
              {avgTotal}
            </span>
            {totalTrend !== null && (
              <span className="text-sm">
                <TrendBadge trend={totalTrend} />
              </span>
            )}
          </div>
        </div>
        <div className="flex gap-4 text-sm">
          <span className="flex items-center gap-1.5 text-(--color-ink-soft)">
            <span className="size-2.5 rounded-full bg-(--color-sea)" />
            גברים <TrendBadge trend={maleTrend} />
          </span>
          <span className="flex items-center gap-1.5 text-(--color-ink-soft)">
            <span className="size-2.5 rounded-full bg-(--color-deep)" />
            נשים <TrendBadge trend={femaleTrend} />
          </span>
        </div>
      </div>

      <div
        className="mt-5 flex items-end gap-1"
        style={{ height: CHART_HEIGHT_PX }}
      >
        {events.map((e) => {
          const total = e.maleCount + e.femaleCount;
          const stackHeight = Math.round((total / maxTotal) * CHART_HEIGHT_PX);
          const femaleHeight =
            total > 0 ? Math.round((e.femaleCount / total) * stackHeight) : 0;
          const maleHeight = stackHeight - femaleHeight;

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
                {femaleHeight > 0 && (
                  <div
                    className="flex items-center justify-center bg-(--color-deep) text-[0.6rem] font-medium text-white/70 ltr-nums"
                    style={{ height: femaleHeight }}
                  >
                    {e.femaleCount}
                  </div>
                )}
                {maleHeight > 0 && (
                  <div
                    className="flex items-center justify-center bg-(--color-sea) text-[0.6rem] font-medium text-white/70 ltr-nums"
                    style={{ height: maleHeight }}
                  >
                    {e.maleCount}
                  </div>
                )}
              </div>
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
