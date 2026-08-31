/**
 * "ערפל בוקר מעל המים" — הרקע האטמוספרי המשותף לדף הבית ולמסכי
 * ההתחברות/הרשמה. מרכז אחד לגרדיאנט ולזוהר הפועם (horizon, מוגדר
 * ב-globals.css) כדי ששלושת המסכים ידברו באותה שפה חזותית בדיוק,
 * במקום שכל מסך "ימציא" גוון קרוב-אבל-לא-זהה משלו.
 *
 * horizonTop: איפה קו המים יושב — שונה כשיש לוגו גדול לבד (דף הבית)
 * לעומת לוגו קטן יותר מעל טופס (מסכי ההתחברות).
 */
export function MorningGlow({ horizonTop = "50%" }: { horizonTop?: string }) {
  return (
    <div className="haze pointer-events-none absolute inset-0 -z-10 overflow-hidden">
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(180deg, #ffffff 0%, #f2f7fa 42%, #dbe8f1 100%)",
        }}
      />
      <div
        className="absolute inset-x-0 h-[30rem] -translate-y-1/2"
        style={{
          top: horizonTop,
          background:
            "radial-gradient(64% 46% at 50% 50%, color-mix(in oklab, var(--color-sky) 46%, transparent), transparent 72%)",
          animation: "horizon 12s ease-in-out infinite",
        }}
      />
    </div>
  );
}
