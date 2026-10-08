import Link from "next/link";
import type { GenderBreakdown } from "@/lib/data";
import { Card } from "./ui";
import { ChevronIcon } from "./social-icons";

/**
 * גרף 4: חלוקת כל חברי הקהילה הפעילים (לא רק 8 מפגשים אחרונים) בין
 * נשים לגברים. עוגה דרך conic-gradient (לא SVG ידני) - פשוט ומדויק
 * לאחוזים נקיים. אותם צבעים כמו גרף 1 (sea=גברים, deep=נשים), כדי
 * שכל הגרפים "ידברו אותה שפה".
 *
 * בשונה משאר גרפי התובנות: לחיצה על הכרטיס פותחת עמוד פירוט
 * (admin/insights/gender) עם רשימת החברות/ים בפועל, מחולקות לשתי
 * רשימות נפרדות (כל אחת עם חיפוש משלה). ה-ChevronIcon בכותרת מסמן
 * שזה כרטיס לחיץ - אותו סימן בדיוק כמו בשורות going-list.tsx.
 */
export function GenderDonutChart({ data }: { data: GenderBreakdown }) {
  const total = data.maleCount + data.femaleCount;
  if (total === 0) return null;

  const femalePercent = Math.round((data.femaleCount / total) * 100);
  const malePercent = 100 - femalePercent;

  return (
    <Link href="/admin/insights/gender" className="block h-full">
      <Card className="h-full transition hover:border-(--color-sea)/40">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-bold text-(--color-ink-soft)">
            נשים מול גברים
          </p>
          <ChevronIcon className="size-3.5 shrink-0 text-(--color-ink-faint)" />
        </div>
        <div className="mt-4 flex flex-col items-center gap-3">
          <div
            className="relative size-28 shrink-0 rounded-full border border-(--color-line)"
            style={{
              background: `conic-gradient(var(--color-deep) 0% ${femalePercent}%, var(--color-sea) ${femalePercent}% 100%)`,
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
              <span className="size-2 shrink-0 rounded-full bg-(--color-sea)" />
              גברים · <span className="ltr-nums">{malePercent}%</span>
            </li>
            <li className="flex items-center gap-1.5 text-(--color-ink-soft)">
              <span className="size-2 shrink-0 rounded-full bg-(--color-deep)" />
              נשים · <span className="ltr-nums">{femalePercent}%</span>
            </li>
          </ul>
        </div>
      </Card>
    </Link>
  );
}
