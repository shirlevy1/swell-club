import Link from "next/link";
import type { SwimLevelBreakdown } from "@/lib/data";
import { SWIM_LEVEL_COLOR, SWIM_LEVEL_OPTIONS } from "@/lib/swim-level";
import { Card } from "./ui";
import { ChevronIcon } from "./social-icons";

/**
 * שלישיית הדמוגרפיה: רמת שחייה, בצד ימין ל"נשים מול גברים" (שיר
 * ביקשה שורה אחת של שלוש עוגות - רמת שחייה/מגדר/ותק). שלושת גווני
 * הכחול הקבועים של SWIM_LEVEL_COLOR - אותו מקור יחיד שכבר קובע את
 * הצבעים בתגית רמת השחייה בכל שאר האתר, לא צבעים חדשים.
 *
 * גודל קומפקטי (לא size-28 כמו שתי העוגות האחרות היו) כדי ששלוש
 * עוגות ייכנסו בשורה אחת ברוחב מסך נייד - גם שתי העוגות האחרות
 * (gender-donut-chart/tenure-donut-chart) צומצמו לאותו גודל בדיוק,
 * כדי שהשורה תיראה אחידה.
 */
export function SwimLevelDonutChart({ data }: { data: SwimLevelBreakdown }) {
  const total = data.enteringCount + data.flowingCount + data.deepeningCount;
  if (total === 0) return null;

  const enteringPct = Math.round((data.enteringCount / total) * 100);
  const flowingPct = Math.round((data.flowingCount / total) * 100);
  // המשלים ל-100%, לא עוד עיגול נפרד - אותו עיקרון כמו בעוגות האחרות.
  const deepeningPct = 100 - enteringPct - flowingPct;

  const stop1 = enteringPct;
  const stop2 = stop1 + flowingPct;

  const levelLabel = (value: string) =>
    SWIM_LEVEL_OPTIONS.find((o) => o.value === value)?.label ?? value;

  return (
    <Link href="/admin/insights/swim-level" className="block h-full">
      <Card className="!p-3 h-full transition hover:border-(--color-sea)/40">
        <div className="flex items-center justify-between gap-1">
          <p className="text-xs font-bold text-(--color-ink-soft)">רמת שחייה</p>
          <ChevronIcon className="size-3 shrink-0 text-(--color-ink-faint)" />
        </div>
        <div className="mt-2 flex flex-col items-center gap-2">
          <div
            className="relative size-16 shrink-0 rounded-full border border-(--color-line)"
            style={{
              background: `conic-gradient(${SWIM_LEVEL_COLOR.entering} 0% ${stop1}%, ${SWIM_LEVEL_COLOR.flowing} ${stop1}% ${stop2}%, ${SWIM_LEVEL_COLOR.deepening} ${stop2}% 100%)`,
            }}
          >
            <div className="absolute inset-[16%] flex items-center justify-center rounded-full bg-(--color-surface)">
              <span className="font-[family-name:var(--font-display)] text-sm font-bold text-(--color-ink) ltr-nums">
                {total}
              </span>
            </div>
          </div>
          <ul className="flex flex-col gap-0.5 text-[0.6rem]">
            <li className="flex items-center gap-1 text-(--color-ink-soft)">
              <span
                className="size-1.5 shrink-0 rounded-full"
                style={{ background: SWIM_LEVEL_COLOR.entering }}
              />
              {levelLabel("entering")} · <span className="ltr-nums">{enteringPct}%</span>
            </li>
            <li className="flex items-center gap-1 text-(--color-ink-soft)">
              <span
                className="size-1.5 shrink-0 rounded-full"
                style={{ background: SWIM_LEVEL_COLOR.flowing }}
              />
              {levelLabel("flowing")} · <span className="ltr-nums">{flowingPct}%</span>
            </li>
            <li className="flex items-center gap-1 text-(--color-ink-soft)">
              <span
                className="size-1.5 shrink-0 rounded-full"
                style={{ background: SWIM_LEVEL_COLOR.deepening }}
              />
              {levelLabel("deepening")} · <span className="ltr-nums">{deepeningPct}%</span>
            </li>
          </ul>
        </div>
      </Card>
    </Link>
  );
}
