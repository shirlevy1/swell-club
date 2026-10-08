import Link from "next/link";
import type { TenureBreakdown } from "@/lib/data";
import { Card } from "./ui";
import { ChevronIcon } from "./social-icons";

/**
 * גרף 5: ותק חברים - קבועים/מזדמנים/חד-פעמיים/רוח רפאים. 4 גוונים
 * של אותו כחול (deep→sea→sky→line, מהכי-מחויב/כהה להכי-רחוק/בהיר) -
 * לא צבע חדש, כדי להישאר בתוך "כחול-ים ולבן, שום דבר אחר" שכבר
 * מוגדר ב-globals.css. --color-sky כבר קיים (דקורטיבי בלוגו).
 *
 * בשונה משאר גרפי התובנות: לחיצה על הכרטיס פותחת עמוד פירוט
 * (admin/insights/tenure) עם רשימת החברים בפועל לכל אחד מ-4 הדליים,
 * כל אחד עם חיפוש משלו. ה-ChevronIcon בכותרת מסמן שזה כרטיס לחיץ -
 * אותו סימן בדיוק כמו ב-GenderDonutChart.
 */
export function TenureDonutChart({ data }: { data: TenureBreakdown }) {
  const total =
    data.ghostCount + data.oneTimeCount + data.occasionalCount + data.regularCount;
  if (total === 0) return null;

  const ghostPct = Math.round((data.ghostCount / total) * 100);
  const oneTimePct = Math.round((data.oneTimeCount / total) * 100);
  const occasionalPct = Math.round((data.occasionalCount / total) * 100);
  // המשלים ל-100%, לא עוד עיגול נפרד - כדי ששלושת האחוזים + זה תמיד יסתכמו בדיוק ל-100.
  const regularPct = 100 - ghostPct - oneTimePct - occasionalPct;

  const stop1 = ghostPct;
  const stop2 = stop1 + oneTimePct;
  const stop3 = stop2 + occasionalPct;

  return (
    <Link href="/admin/insights/tenure" className="block">
      <Card className="transition hover:border-(--color-sea)/40">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-bold text-(--color-ink-soft)">ותק חברים</p>
          <ChevronIcon className="size-3.5 shrink-0 text-(--color-ink-faint)" />
        </div>
        <div className="mt-4 flex flex-col items-center gap-3">
          <div
            className="relative size-28 shrink-0 rounded-full border border-(--color-line)"
            style={{
              background: `conic-gradient(var(--color-line) 0% ${stop1}%, var(--color-sky) ${stop1}% ${stop2}%, var(--color-sea) ${stop2}% ${stop3}%, var(--color-deep) ${stop3}% 100%)`,
            }}
          >
            <div className="absolute inset-[14%] flex flex-col items-center justify-center rounded-full bg-(--color-surface)">
              <span className="font-[family-name:var(--font-display)] text-lg font-bold text-(--color-ink) ltr-nums">
                {total}
              </span>
              <span className="text-[0.6rem] text-(--color-ink-faint)">
                חברים
              </span>
            </div>
          </div>
          <ul className="flex flex-col gap-1 text-xs">
            <li className="flex items-center gap-1.5 text-(--color-ink-soft)">
              <span className="size-2 shrink-0 rounded-full bg-(--color-deep)" />
              קבועים · <span className="ltr-nums">{regularPct}%</span>
            </li>
            <li className="flex items-center gap-1.5 text-(--color-ink-soft)">
              <span className="size-2 shrink-0 rounded-full bg-(--color-sea)" />
              מזדמנים · <span className="ltr-nums">{occasionalPct}%</span>
            </li>
            <li className="flex items-center gap-1.5 text-(--color-ink-soft)">
              <span className="size-2 shrink-0 rounded-full bg-(--color-sky)" />
              חד-פעמיים · <span className="ltr-nums">{oneTimePct}%</span>
            </li>
            <li className="flex items-center gap-1.5 text-(--color-ink-soft)">
              <span className="size-2 shrink-0 rounded-full border border-(--color-ink-faint)/40 bg-(--color-line)" />
              רוח רפאים · <span className="ltr-nums">{ghostPct}%</span>
            </li>
          </ul>
        </div>
      </Card>
    </Link>
  );
}
