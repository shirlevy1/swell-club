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

const TH = "px-1 py-2 text-center font-semibold";
const TD = "px-1 py-2 text-center";

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
              <th className={TH}>כיוון</th>
              <th className={TH}>סוואל</th>
              <th className={TH}>מחזור</th>
              <th className={TH}>כיוון</th>
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
                      <span className="ltr-nums">{row.heightCm}</span>
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
                  </td>
                  <td className={cx(TD, "text-(--color-ink-soft)")}>
                    {row.windDir ?? "—"}
                  </td>
                  <td className={TD}>
                    {row.swellCm != null ? (
                      <span className="ltr-nums">{row.swellCm}</span>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className={TD}>
                    {row.swellPeriodSec != null ? (
                      <span className="ltr-nums">{row.swellPeriodSec}</span>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className={cx(TD, "text-(--color-ink-soft)")}>
                    {row.swellDir ?? "—"}
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
