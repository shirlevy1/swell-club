const MIN_TEMP_C = 17;
const MAX_TEMP_C = 32; // קצה עליון של "29°C ומעלה", לצורך מיקום הסמן בלבד

/**
 * חמשת הטווחים, מהחם (אינדקס 0) לקר (אינדקס 4) — סדר פיזי שמאל→ימין
 * בדיוק, כי זה הסדר שגם הגרדיאנט וגם קווי הפרדה למטה משתמשים בו
 * ישירות (style ישיר, לא flex, אז לא הופך לבד ב-RTL). שורת התוויות
 * למטה חייבת dir="ltr" מפורש כדי *לא* להיפוך — אחרת flex רגיל בעמוד
 * RTL היה הופך את הסדר ומפריד בין התווית לצבע שמתחתיה.
 */
const BANDS = [
  { name: "חם מאוד", range: "29°C ומעלה", color: "#c0392b" },
  { name: "חמים וכיפיים", range: "26–28°C", color: "#d9793f" },
  { name: "נעים", range: "23–25°C", color: "#d8c79a" },
  { name: "קריר", range: "20–22°C", color: "#5f8fc0" },
  { name: "קר", range: "17–19°C", color: "#2f6698" },
] as const;

/** 100% = קצה ימין (קר), 0% = קצה שמאל (חם) — תואם למפת הצבעים הקבועה. */
function rightPercentFor(tempC: number): number {
  const clamped = Math.min(MAX_TEMP_C, Math.max(MIN_TEMP_C, tempC));
  return ((clamped - MIN_TEMP_C) / (MAX_TEMP_C - MIN_TEMP_C)) * 100;
}

function bandColorFor(tempC: number): string {
  if (tempC >= 29) return BANDS[0].color;
  if (tempC >= 26) return BANDS[1].color;
  if (tempC >= 23) return BANDS[2].color;
  if (tempC >= 20) return BANDS[3].color;
  return BANDS[4].color;
}

/**
 * "טמפרטורת מים" — בכרטיס המשותף עם "תחזית גלים ורוח"
 * (ראו sea-conditions-card.tsx, שמספק את המסגרת/הכותרת החיצונית
 * ואת הקו המפריד; הרכיב הזה הוא רק התוכן הפנימי). אותו מקור (GoSurf)
 * ואותה תדירות עדכון (getCurrentWaterTempC ב-lib/gosurf.ts). מחזירה
 * null כשאין נתון (למשל GoSurf לא זמין כרגע) כדי לא להציג מד שבור.
 */
export function WaterTemperatureGauge({
  tempC,
  showSource = false,
}: {
  tempC: number | null;
  /** רק כש"תחזית גלים ורוח" לא מוצגת לידו — אחרת "מקור: GoSurf" כבר
   * מופיע למעלה, באותו כרטיס, ולא צריך פעמיים (ראו sea-conditions-card.tsx). */
  showSource?: boolean;
}) {
  if (tempC == null) return null;

  const markerRight = rightPercentFor(tempC);
  const markerColor = bandColorFor(tempC);
  // בועת הטמפרטורה ממורכזת סביב markerRight (translateX 50%), אז
  // בקצוות הסולם היא יוצאת מגבולות הכרטיס ומתנגשת בכותרת שמעליה —
  // ה-clamp הזה רק על מיקום הבועה/המחט, לא על הנקודה בתוך הרצועה
  // (שנשארת מדויקת), כדי שזה יקרה רק במקרי קצה נדירים.
  const bubbleRight = Math.min(90, Math.max(10, markerRight));

  return (
    <div className="space-y-3">
      <div className="flex items-baseline justify-between">
        <p className="text-xs font-bold tracking-[0.2em] text-(--color-sea)">
          טמפרטורת מים
        </p>
        {showSource && (
          <span className="text-xs text-(--color-ink-faint)">
            מקור:{" "}
            <a
              href="https://gosurf.co.il/forecast/tel-aviv"
              target="_blank"
              rel="noreferrer"
              className="underline underline-offset-2"
            >
              GoSurf
            </a>
          </span>
        )}
      </div>

      {/* !mt-9 (לא רק mt-9): חייב לנצח את space-y-3 שעל הכרטיס מסביב.
          הגובה חייב לכסות את כל גובה הבועה הצפה מעל הרצועה (כ-33px),
          אחרת היא מתנגשת עם שורת הכותרת שמעליה. */}
      <div className="relative !mt-9 h-4">
        <div
          className="absolute bottom-full mb-1 flex flex-col items-center"
          style={{ right: `${bubbleRight}%`, transform: "translateX(50%)" }}
        >
          <span className="whitespace-nowrap rounded-lg bg-(--color-deep) px-2 py-0.5 text-xs font-extrabold text-white ltr-nums">
            {tempC.toFixed(1)}°C
          </span>
          <span className="mt-0.5 h-2 w-0.5 bg-(--color-deep)" />
        </div>

        <div
          className="relative h-4 rounded-full shadow-[inset_0_1px_2px_rgba(21,40,58,0.18)]"
          style={{
            background: `linear-gradient(90deg, ${BANDS[0].color} 10%, ${BANDS[1].color} 30%, ${BANDS[2].color} 50%, ${BANDS[3].color} 70%, ${BANDS[4].color} 90%)`,
          }}
        >
          <span
            className="absolute top-1/2 size-3 -translate-y-1/2 translate-x-1/2 rounded-full border-2 border-white shadow-[0_1px_4px_rgba(21,40,58,0.35)]"
            style={{ right: `${markerRight}%`, background: markerColor }}
          />
          {[20, 40, 60, 80].map((tick) => (
            <span
              key={tick}
              className="absolute -top-1 h-6 w-px bg-white/55"
              style={{ right: `${tick}%` }}
            />
          ))}
        </div>
      </div>

      <div dir="ltr" className="flex justify-between gap-0.5">
        {BANDS.map((band) => (
          <div key={band.name} className="flex flex-1 flex-col items-center">
            <span className="whitespace-nowrap text-[0.62rem] font-extrabold text-(--color-ink-soft) ltr-nums">
              {band.range}
            </span>
            <span className="whitespace-nowrap text-[0.58rem] text-(--color-ink-faint)">
              {band.name}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
