import type { GoSurfDay } from "@/lib/gosurf";
import { cx } from "./ui";

type WindTone = "calm" | "moderate" | "strong";

/** ספים לשחייה בים פתוח — לא בהכרח זהים לסולם הצבעים של GoSurf עצמו */
function windTone(kmh: number | null): WindTone {
  if (kmh == null) return "calm";
  if (kmh >= 25) return "strong";
  if (kmh >= 15) return "moderate";
  return "calm";
}

const TONE_CLASS: Record<WindTone, string> = {
  calm: "text-(--color-verified)",
  moderate: "text-(--color-warn)",
  strong: "text-(--color-fail)",
};

/**
 * GoSurf כותב כיוון כמילה עברית מלאה ("צפון מזרחית") — לא נכנס בעמודה
 * צרה במסך טלפון. חץ מעביר את אותו מידע בשבריר מהמקום, בדיוק כמו בכל
 * אפליקציית מזג אוויר. בדיקה לפי שורש המילה (לא התאמה מלאה), כי הסיומת
 * הדקדוקית משתנה בין השדות (windDir/swellDir) בלי סיבה ברורה ("מזרחית"
 * מול "מערבי") — לא רוצים שחיץ ייעלם רק כי הניסוח קצת שונה ממה שציפינו.
 */
function compassArrow(dir: string | null): string | null {
  if (!dir) return null;
  const n = dir.includes("צפון");
  const s = dir.includes("דרום");
  const e = dir.includes("מזרח");
  const w = dir.includes("מערב");
  if (n && e) return "↗";
  if (n && w) return "↖";
  if (s && e) return "↘";
  if (s && w) return "↙";
  if (n) return "↑";
  if (s) return "↓";
  if (e) return "→";
  if (w) return "←";
  return null;
}

/** חץ כיוון מוצג בבידוד LTR — חיצים כאלה הם bidi-mirrored ביוניקוד,
 * ובלי זה טקסט RTL סביבם יכול להפוך אותם ולשקר על הכיוון האמיתי. */
function DirArrow({ dir }: { dir: string | null }) {
  const arrow = compassArrow(dir);
  if (!arrow) return null;
  return (
    <span dir="ltr" className="block text-[9px] text-(--color-ink-faint)">
      {arrow}
    </span>
  );
}

const TH = "px-1 py-2 text-center font-semibold";
const TD = "px-1 py-2 text-center align-middle";

export function SeaForecast({ day }: { day: GoSurfDay }) {
  if (!day.rows.length) return null;

  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between">
        <p className="text-sm font-semibold">תחזית ים לזמן המפגש</p>
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
      </div>

      <div className="overflow-hidden rounded-xl border border-(--color-line)">
        <table className="w-full table-fixed border-collapse text-[11px] leading-tight">
          <thead>
            <tr className="bg-(--color-haze) text-(--color-ink-soft)">
              <th className={TH}>שעה</th>
              <th className={TH}>גובה</th>
              <th className={TH}>גלים</th>
              <th className={TH}>רוח</th>
              <th className={TH}>סוואל</th>
            </tr>
          </thead>
          <tbody>
            {day.rows.map((row) => {
              const tone = windTone(row.windKmh);
              return (
                <tr key={row.hour} className="border-t border-(--color-line)">
                  <td className={cx(TD, "font-bold")}>
                    <span className="ltr-nums">{row.hour}</span>
                  </td>
                  <td className={TD}>
                    {row.heightCm ? (
                      <>
                        <span className="ltr-nums">{row.heightCm}</span> ס״מ
                      </>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className={cx(TD, "text-(--color-ink-soft)")}>
                    {row.waveDesc ?? "—"}
                  </td>
                  <td className={cx(TD, "font-semibold", TONE_CLASS[tone])}>
                    {row.windKmh != null ? (
                      <span className="ltr-nums">{row.windKmh}</span>
                    ) : (
                      "—"
                    )}
                    <DirArrow dir={row.windDir} />
                  </td>
                  <td className={TD}>
                    {row.swellCm != null && (
                      <span className="block text-[9.5px]">
                        <span className="ltr-nums">{row.swellCm}</span> ס״מ
                      </span>
                    )}
                    {row.swellPeriodSec != null && (
                      <span className="block text-[9.5px]">
                        <span className="ltr-nums">{row.swellPeriodSec}</span> שנ׳
                      </span>
                    )}
                    {row.swellCm == null && row.swellPeriodSec == null && "—"}
                    <DirArrow dir={row.swellDir} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
