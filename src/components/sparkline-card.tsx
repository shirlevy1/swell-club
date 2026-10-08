import { Card } from "./ui";
import { TrendBadge, type Trend } from "./trend-badge";

/**
 * כרטיס KPI עם גרף-זרם (sparkline) קטן מתחת למספר - לפי הדמיה ששיר
 * שלחה (שני כרטיסים: "פעילים ב-30 יום אחרונים", "חזרו למפגש שני").
 * אותה שפה ויזואלית כמו שאר גרפי /admin/insights: כותרת קטנה, מספר
 * גדול + TrendBadge המשותף לצידו. ה-SVG נמתח למלוא רוחב הכרטיס
 * (preserveAspectRatio="none") כי זו קישוטית-מגמה בלבד, לא גרף מדויק
 * לקריאת ערכים - בדיוק כמו בהדמיה המקורית.
 */
function sparklinePoints(values: number[]): string {
  if (values.length === 0) return "";
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const stepX = 100 / (values.length - 1 || 1);
  return values
    .map((v, i) => {
      const x = i * stepX;
      const y = 28 - ((v - min) / range) * 24;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
}

export function SparklineCard({
  title,
  value,
  valueSuffix,
  trend,
  sparkline,
}: {
  title: string;
  value: number;
  valueSuffix?: string;
  trend: Trend;
  sparkline: number[];
}) {
  return (
    <Card>
      <p className="text-sm font-bold text-(--color-ink-soft)">{title}</p>
      <div className="mt-1 flex items-baseline gap-1.5">
        <span className="font-[family-name:var(--font-display)] text-lg font-bold text-(--color-ink) ltr-nums">
          {value}
          {valueSuffix}
        </span>
        <TrendBadge trend={trend} />
      </div>
      <svg
        viewBox="0 0 100 32"
        preserveAspectRatio="none"
        className="mt-3 h-8 w-full"
        aria-hidden
      >
        <polyline
          points={sparklinePoints(sparkline)}
          fill="none"
          stroke="var(--color-sea)"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </Card>
  );
}
