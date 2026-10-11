import type { BestSwimDay, WaveForecastDay } from "@/lib/gosurf";
import { WaveForecastStrip } from "./wave-forecast-strip";
import { WaterTemperatureGauge } from "./water-temperature-gauge";

/**
 * כרטיס אחד משותף ל"תחזית גלים ורוח" ו"טמפרטורת מים" — בלי רווח
 * רקע-העמוד ביניהם, עם קו מפריד בין "הבקרים הכי טובים לשחייה השבוע"
 * לטמפרטורת המים. לא <hr> חדש: אותו border-t+pt-3 שכבר קיים בתוך
 * הכרטיס הזה (BestSwimDaysHighlight מול הגרף שמעליו), לשמור על אותו
 * ריתמוס חזותי. שני המדורים נשארים עמידים בנפרד: אם רק לאחד מהם יש
 * נתון, מוצג רק הוא (בלי קו יתום); אם לאף אחד אין, לא מוצג כלום.
 */
export function SeaConditionsCard({
  days,
  bestDays,
  tempC,
}: {
  days: WaveForecastDay[];
  bestDays: BestSwimDay[];
  tempC: number | null;
}) {
  const hasForecast = days.length > 0;
  const hasTemp = tempC != null;
  if (!hasForecast && !hasTemp) return null;

  return (
    <div className="space-y-3 rounded-2xl border border-(--color-line) bg-(--color-surface) p-4">
      {hasForecast && <WaveForecastStrip days={days} bestDays={bestDays} />}
      {hasTemp && (
        <div className={hasForecast ? "border-t border-(--color-line) pt-3" : undefined}>
          <WaterTemperatureGauge tempC={tempC} />
        </div>
      )}
    </div>
  );
}
