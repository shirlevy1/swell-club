import { Card } from "./ui";
import type { Trend } from "./trend-badge";

/**
 * כרטיס KPI עם גרף-זרם (sparkline) קטן מתחת למספר - לפי הדמיה ששיר
 * שלחה (שני כרטיסים: "פעילים בחודש האחרון", "חזרו למפגש שני").
 *
 * כותרת ומספר באותה שורה (לא שתי שורות), ובלי TrendBadge - שיר ביקשה
 * להוריד את המגמה הירוקה בינתיים. ה-prop trend נשאר (מחושב כבר
 * ב-data.ts) כדי שיהיה קל להחזיר אותה אם תתבקש שוב, רק לא מוצג.
 *
 * הקו מעוגל (Catmull-Rom→בזייה, לא קווים ישרים חדים) עם מילוי עדין
 * מתחתיו (גרדיאנט של אותו גוון עד שקיפות) ונקודת-עיגון בסוף הקו, כדי
 * שהכרטיס ירגיש גמור ולא כמו קו-עזר טכני - בקשה מפורשת של שיר
 * ("יותר אסתטי"). עדיין קישוטי בלבד (preserveAspectRatio="none",
 * לא גרף מדויק לקריאת ערכים) - בדיוק כמו קודם.
 */
function toPoints(values: number[]): { x: number; y: number }[] {
  if (values.length === 0) return [];
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const stepX = 100 / (values.length - 1 || 1);
  return values.map((v, i) => ({
    x: i * stepX,
    y: 28 - ((v - min) / range) * 24,
  }));
}

/** Catmull-Rom עם מתיחה 1/6 - עקומה חלקה שעוברת בדיוק דרך כל הנקודות. */
function smoothPath(points: { x: number; y: number }[]): string {
  if (points.length < 2) return "";
  let d = `M ${points[0].x},${points[0].y}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i === 0 ? i : i - 1];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2 < points.length ? i + 2 : i + 1];
    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;
    d += ` C ${cp1x},${cp1y} ${cp2x},${cp2y} ${p2.x},${p2.y}`;
  }
  return d;
}

export function SparklineCard({
  title,
  value,
  valueSuffix,
  sparkline,
}: {
  title: string;
  value: number;
  valueSuffix?: string;
  /** מחושב ב-data.ts, לא מוצג כרגע (ראו הערה למעלה) - נשאר בטיפוס
      כדי שקריאות ל-SparklineCard ימשיכו להעביר אותו בלי שינוי. */
  trend: Trend;
  sparkline: number[];
}) {
  const points = toPoints(sparkline);
  const linePath = smoothPath(points);
  const last = points[points.length - 1];
  const gradientId = `sparkline-fill-${title.replace(/[^a-zA-Z0-9]/g, "")}`;
  const areaPath =
    points.length >= 2
      ? `${linePath} L ${points[points.length - 1].x},32 L ${points[0].x},32 Z`
      : "";

  return (
    <Card>
      <div className="flex flex-wrap items-baseline justify-between gap-x-2 gap-y-0.5">
        <p className="text-sm font-bold text-(--color-ink-soft)">{title}</p>
        <span className="font-[family-name:var(--font-display)] text-lg font-bold text-(--color-ink) ltr-nums">
          {value}
          {valueSuffix}
        </span>
      </div>
      {points.length >= 2 && (
        <div className="relative mt-3 h-8 w-full">
          <svg
            viewBox="0 0 100 32"
            preserveAspectRatio="none"
            className="h-full w-full overflow-visible"
            aria-hidden
          >
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--color-sea)" stopOpacity="0.22" />
                <stop offset="100%" stopColor="var(--color-sea)" stopOpacity="0" />
              </linearGradient>
            </defs>
            <path d={areaPath} fill={`url(#${gradientId})`} stroke="none" />
            <path
              d={linePath}
              fill="none"
              stroke="var(--color-sea)"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              vectorEffect="non-scaling-stroke"
            />
          </svg>
          {/* נקודה עגולה אמיתית (לא <circle> בתוך ה-viewBox המתוח
              preserveAspectRatio="none" - זה היה הופך אותה לאליפסה,
              כי המתיחה לא אחידה בין x ל-y) - ממוקמת ב-% על גבי ה-div,
              שמתרגם נכון לכל יחס-רוחב בלי לעוות את העיגול עצמו. */}
          <span
            className="absolute size-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-(--color-sea)"
            style={{ left: `${last.x}%`, top: `${(last.y / 32) * 100}%` }}
          />
        </div>
      )}
    </Card>
  );
}
