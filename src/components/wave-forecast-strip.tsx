import type { WaveForecastDay } from "@/lib/gosurf";
import { formatDayMonth } from "@/lib/format";

const CHART_HEIGHT = 96;
const CHART_PAD = 18;
const COL_WIDTH = 56;
/** קנה מידה קבוע, לא יחסי לימים שבשבוע הזה — כך שבוע רגוע לא "נראה
 * גלי" סתם כי הוא מנורמל מול עצמו. תואם לטווח שרואים בפועל ב-GoSurf. */
const SCALE_MAX_CM = 160;

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

function WindArrow({ deg }: { deg: number }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="size-3.5"
      style={{ transform: `rotate(${deg}deg)` }}
      aria-hidden
    >
      <path d="M12 19V5M6 11l6-6 6 6" />
    </svg>
  );
}

/**
 * "תחזית גלים ורוח" — אותה תחזית ואותו מבנה בדיוק כמו ב-gosurf.co.il
 * (כותרות ימים עם חץ כיוון רוח, גרף שטח רציף עם גובה גל בס"מ על כל
 * נקודה), רק בגופנים ובצבעים של Swell. ראו getWaveForecast ב-lib/gosurf.ts.
 * גובה גל גבוה יותר = נקודה גבוהה יותר בגרף — כמו תחזית גלים אמיתית,
 * בלי שום היפוך מלאכותי.
 */
export function WaveForecastStrip({ days }: { days: WaveForecastDay[] }) {
  if (days.length === 0) return null;

  const width = days.length * COL_WIDTH;
  const usableHeight = CHART_HEIGHT - CHART_PAD * 2;
  // ה-SVG תמיד שמאל-לימין במרחב הקואורדינטות שלו, גם בעמוד RTL —
  // בניגוד לכותרות הימים למעלה (flex רגיל, מתהפך לבד ב-RTL). בלי
  // ההיפוך הזה כאן, היום הראשון היה מצויר בקצה השמאלי בזמן שהכותרת
  // שלו יושבת בימין, וכל הערכים היו נראים שייכים ליום ההפוך לגמרי.
  const points = days.map((d, i) => {
    const clamped = Math.min(SCALE_MAX_CM, d.heightCm);
    return {
      x: (days.length - 1 - i) * COL_WIDTH + COL_WIDTH / 2,
      y: CHART_PAD + (1 - clamped / SCALE_MAX_CM) * usableHeight,
    };
  });
  const linePath = buildSmoothPath(points);
  const lastX = points[points.length - 1].x;
  const areaPath = `${linePath} L${lastX},${CHART_HEIGHT} L${points[0].x},${CHART_HEIGHT} Z`;

  return (
    <div className="space-y-3 rounded-2xl border border-(--color-line) bg-(--color-surface) p-4">
      <p className="text-xs font-bold tracking-[0.2em] text-(--color-sea)">
        תחזית גלים ורוח
      </p>

      <div className="flex justify-between px-1">
        {days.map((d) => (
          <div key={d.dateISO} className="flex flex-1 flex-col items-center gap-1">
            <span className="text-xs font-bold text-(--color-ink)">
              {d.dayName}
            </span>
            <span className="ltr-nums text-[0.6rem] text-(--color-sea)">
              {formatDayMonth(d.dateISO)}
            </span>
            <span className="text-(--color-ink-faint)">
              <WindArrow deg={d.windDeg} />
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
          <linearGradient id="wave-forecast-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#46738f" stopOpacity="0.32" />
            <stop offset="100%" stopColor="#46738f" stopOpacity="0.03" />
          </linearGradient>
        </defs>
        <path d={areaPath} fill="url(#wave-forecast-fill)" />
        <path
          d={linePath}
          fill="none"
          stroke="#46738f"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
        {points.map((p, i) => (
          <g key={days[i].dateISO}>
            <circle cx={p.x} cy={p.y} r="4" fill="#46738f" stroke="#fff" strokeWidth="1.5" />
            <text
              x={p.x}
              y={p.y > 22 ? p.y - 10 : p.y + 18}
              textAnchor="middle"
              fontSize="10"
              fontWeight="800"
              fill="#23405a"
            >
              {days[i].heightCm} ס״מ
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
}
