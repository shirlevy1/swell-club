import type { SeaScoreDay } from "@/lib/gosurf";
import { seaScoreColor } from "@/lib/sea-score";
import { formatDayMonth } from "@/lib/format";
import { cx } from "./ui";

const CHART_HEIGHT = 96;
const CHART_PAD = 16;
const COL_WIDTH = 56;

/** עקומה חלקה ("S" בין כל שתי נקודות) — לא ספליין מלא, אבל תמיד
 * מתנהגת יפה ובלי חריגות, גם עם ערכים קיצוניים סמוכים. */
function buildSmoothPath(points: { x: number; y: number }[]): string {
  let d = `M${points[0].x},${points[0].y}`;
  for (let i = 0; i < points.length - 1; i++) {
    const { x: x0, y: y0 } = points[i];
    const { x: x1, y: y1 } = points[i + 1];
    const midX = (x0 + x1) / 2;
    d += ` C${midX},${y0} ${midX},${y1} ${x1},${y1}`;
  }
  return d;
}

/**
 * "איך הים השבוע" — גרף שטח רציף וחלק, בהשראת תחזית גלים אמיתית:
 * כל יום הוא נקודה על העקומה, עם הציון (0–5) רשום ישירות עליה. המקרא
 * למטה מציג רק את שני הקצוות (1 ו-5) בצבע האמיתי שלהם — לא שני צבעים
 * בינאריים מנותקים מהגרדיאנט הרציף בפועל של seaScoreColor.
 * הפוך מהציון: ים רגוע (ציון גבוה) הוא נקודה נמוכה בגרף, ים סוער
 * (ציון נמוך) הוא פסגה — כמו גרף גובה גל אמיתי. ראו lib/sea-score.ts.
 */
export function SeaScoreStrip({ days }: { days: SeaScoreDay[] }) {
  if (days.length === 0) return null;

  const width = days.length * COL_WIDTH;
  const usableHeight = CHART_HEIGHT - CHART_PAD * 2;
  // ה-SVG תמיד שמאל-לימין במרחב הקואורדינטות שלו, גם בעמוד RTL —
  // בניגוד לכותרות הימים למעלה (flex רגיל, מתהפך לבד ב-RTL). בלי
  // ההיפוך הזה כאן, האינדקס הראשון (ראשון) היה מצויר בקצה השמאלי של
  // הגרף בזמן שהכותרת "ראשון" יושבת בקצה הימני — הערכים היו נראים
  // שייכים ליום ההפוך לגמרי (בדיוק הבאג שדווח בפועל).
  const points = days.map((d, i) => ({
    x: (days.length - 1 - i) * COL_WIDTH + COL_WIDTH / 2,
    y: CHART_PAD + (d.stars / 5) * usableHeight,
  }));
  const linePath = buildSmoothPath(points);
  const lastX = points[points.length - 1].x;
  const areaPath = `${linePath} L${lastX},${CHART_HEIGHT} L${points[0].x},${CHART_HEIGHT} Z`;

  return (
    <div className="space-y-3 rounded-2xl border border-(--color-line) bg-(--color-surface) p-4">
      <p className="text-xs font-bold tracking-[0.2em] text-(--color-sea)">
        איך הים השבוע?
      </p>

      <div className="flex justify-between px-1">
        {days.map((d, i) => (
          <div key={d.dateISO} className="flex-1 text-center">
            <span
              className={cx(
                "block text-xs font-bold",
                i === 0 ? "text-(--color-sea)" : "text-(--color-ink)",
              )}
            >
              {d.dayName}
            </span>
            <span className="ltr-nums block text-[0.6rem] text-(--color-ink-faint)">
              {formatDayMonth(d.dateISO)}
            </span>
          </div>
        ))}
      </div>

      <svg
        viewBox={`0 0 ${width} ${CHART_HEIGHT}`}
        preserveAspectRatio="none"
        className="h-24 w-full overflow-visible"
      >
        <defs>
          <linearGradient id="sea-score-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#46738f" stopOpacity="0.28" />
            <stop offset="100%" stopColor="#46738f" stopOpacity="0.02" />
          </linearGradient>
        </defs>
        <path d={areaPath} fill="url(#sea-score-fill)" />
        <path
          d={linePath}
          fill="none"
          stroke="#46738f"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
        {points.map((p, i) => {
          const color = seaScoreColor(days[i].stars);
          const labelAbove = p.y > 18;
          return (
            <g key={days[i].dateISO}>
              <circle cx={p.x} cy={p.y} r="4" fill={color} stroke="#fff" strokeWidth="1.5" />
              <text
                x={p.x}
                y={labelAbove ? p.y - 10 : p.y + 18}
                textAnchor="middle"
                fontSize="11"
                fontWeight="800"
                fill={color}
              >
                {days[i].stars}
              </text>
            </g>
          );
        })}
      </svg>

      <div className="flex items-center justify-center gap-4 pt-1 text-[0.68rem] text-(--color-ink-faint)">
        <span className="flex items-center gap-1.5">
          <span
            className="flex size-4 shrink-0 items-center justify-center rounded-full text-[0.6rem] font-extrabold text-white"
            style={{ background: seaScoreColor(1) }}
          >
            1
          </span>
          ים סוער, לא מתאים
        </span>
        <span className="flex items-center gap-1.5">
          <span
            className="flex size-4 shrink-0 items-center justify-center rounded-full text-[0.6rem] font-extrabold text-white"
            style={{ background: seaScoreColor(5) }}
          >
            5
          </span>
          ים רגוע, מושלם לסוואל
        </span>
      </div>
    </div>
  );
}
