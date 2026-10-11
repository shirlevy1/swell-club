import Link from "next/link";
import type { RsvpAttendanceBreakdown } from "@/lib/data";
import { formatDayMonth } from "@/lib/format";
import { Card } from "./ui";

const CHART_HEIGHT_PX = 140;

// גוון פסטל-רך לכל קטגוריה - אותו גוון-בסיס סמנטי (verified/fail/warn,
// שומר על המשמעות), מעורבב עם לבן כדי לרכך. אותה טכניקת color-mix
// שכבר בשימוש באתר (למשל live-highlight ב-globals.css) - לא צבעים
// קבועים חדשים, רק גרסה בהירה יותר של הטוקנים הקיימים.
const PASTEL = {
  matched: "color-mix(in srgb, var(--color-verified) 45%, white)",
  noShow: "color-mix(in srgb, var(--color-fail) 45%, white)",
  walkIn: "color-mix(in srgb, var(--color-warn) 45%, white)",
};

/**
 * גרף 2 ב-admin/insights: לא רק "כמה אחוז מהסימונים הגיעו" (זה החמיץ
 * לגמרי מי שהגיע/ה בלי לסמן בכלל - שיר שאלה למה, והתברר שזה באמת
 * לא נכלל בחישוב הקודם) - אלא שלוש ההתנהגויות עצמן, לכל מפגש:
 * סימנו+הגיעו (ירוק, "כמו שהובטח"), סימנו ולא הגיעו (אדום, no-show),
 * הגיעו בלי לסמן (כתום, walk-in לא מתוכנן). האחוזים למעלה הם סיכום
 * מצטבר על פני כל 8 המפגשים (לא ממוצע-של-ממוצעים), כדי שהם יבטאו
 * "מתוך כל מי שהיה מעורב/ת איכשהו, כמה % מכל קטגוריה" בצורה ישירה.
 */
export function RsvpAttendanceChart({
  events,
}: {
  events: RsvpAttendanceBreakdown[];
}) {
  if (events.length === 0) return null;

  const totalMatched = events.reduce((sum, e) => sum + e.matched, 0);
  const totalNoShow = events.reduce((sum, e) => sum + e.noShow, 0);
  const totalWalkIn = events.reduce((sum, e) => sum + e.walkIn, 0);
  const grandTotal = totalMatched + totalNoShow + totalWalkIn;

  const matchedPct = grandTotal > 0 ? Math.round((totalMatched / grandTotal) * 100) : 0;
  const noShowPct = grandTotal > 0 ? Math.round((totalNoShow / grandTotal) * 100) : 0;
  // המשלים ל-100%, לא עוד עיגול נפרד - אותו עיקרון כמו בעוגת הוותק.
  const walkInPct = grandTotal > 0 ? 100 - matchedPct - noShowPct : 0;

  const maxVal = Math.max(
    1,
    ...events.map((e) => e.matched + e.noShow + e.walkIn),
  );

  return (
    <Card>
      <p className="text-sm font-bold text-(--color-ink-soft)">הגיעו מול סימנו</p>

      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs">
        <span className="flex items-center gap-1.5 text-(--color-ink-soft)">
          <span className="size-2 rounded-full" style={{ background: PASTEL.matched }} />
          סימנו והגיעו ·{" "}
          <span className="font-bold text-(--color-ink) ltr-nums">{matchedPct}%</span>
        </span>
        <span className="flex items-center gap-1.5 text-(--color-ink-soft)">
          <span className="size-2 rounded-full" style={{ background: PASTEL.noShow }} />
          סימנו ולא הגיעו ·{" "}
          <span className="font-bold text-(--color-ink) ltr-nums">{noShowPct}%</span>
        </span>
        <span className="flex items-center gap-1.5 text-(--color-ink-soft)">
          <span className="size-2 rounded-full" style={{ background: PASTEL.walkIn }} />
          הגיעו בלי לסמן ·{" "}
          <span className="font-bold text-(--color-ink) ltr-nums">{walkInPct}%</span>
        </span>
      </div>

      <div className="mt-5 flex items-end gap-1" style={{ height: CHART_HEIGHT_PX }}>
        {events.map((e) => {
          const total = e.matched + e.noShow + e.walkIn;
          const stackHeight = Math.round((total / maxVal) * CHART_HEIGHT_PX);
          const matchedHeight =
            total > 0 ? Math.round((e.matched / total) * stackHeight) : 0;
          const noShowHeight =
            total > 0 ? Math.round((e.noShow / total) * stackHeight) : 0;
          const walkInHeight = stackHeight - matchedHeight - noShowHeight;

          return (
            <Link
              key={e.eventId}
              href={`/events/${e.eventId}?from=admin-insights`}
              className="flex h-full flex-1 flex-col items-center justify-end gap-1 rounded-lg px-0.5 transition hover:bg-(--color-haze)"
            >
              <span className="text-xs font-bold text-(--color-ink) ltr-nums">
                {total}
              </span>
              <div
                className="flex w-full flex-col-reverse overflow-hidden rounded-t"
                style={{ height: stackHeight }}
              >
                {matchedHeight > 0 && (
                  <div
                    className="flex items-center justify-center text-[0.58rem] font-medium text-(--color-ink)/70 ltr-nums"
                    style={{ height: matchedHeight, background: PASTEL.matched }}
                  >
                    {e.matched}
                  </div>
                )}
                {noShowHeight > 0 && (
                  <div
                    className="flex items-center justify-center text-[0.58rem] font-medium text-(--color-ink)/70 ltr-nums"
                    style={{ height: noShowHeight, background: PASTEL.noShow }}
                  >
                    {e.noShow}
                  </div>
                )}
                {walkInHeight > 0 && (
                  <div
                    className="flex items-center justify-center text-[0.58rem] font-medium text-(--color-ink)/70 ltr-nums"
                    style={{ height: walkInHeight, background: PASTEL.walkIn }}
                  >
                    {e.walkIn}
                  </div>
                )}
              </div>
              <span className="text-[0.64rem] text-(--color-ink-faint) ltr-nums">
                {formatDayMonth(e.startsAt)}
              </span>
            </Link>
          );
        })}
      </div>
    </Card>
  );
}
