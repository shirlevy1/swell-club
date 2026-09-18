import Link from "next/link";
import type { AdminEvent } from "@/lib/data";
import { formatDayMonth, formatTime, formatWeekdayName } from "@/lib/format";
import { Card } from "./ui";
import { EventReportButton } from "./event-report-button";

/**
 * כרטיס מפגש בעמוד הניהול — משותף בין הרשימה הראשית (admin/page.tsx,
 * קרובים + שהיו האחרונים) לעמוד ההיסטוריה המלאה (admin/events/history).
 * eventLinkQuery: לכפתור החזרה בעמוד המפגש עצמו, כדי שידע לחזור
 * לניהול ולא ל"לכל המפגשים" הרגיל — כל קורא/ת קובע/ת את ה-query שלו.
 */
export function AdminEventCard({
  event,
  eventLinkQuery,
}: {
  event: AdminEvent;
  eventLinkQuery?: string;
}) {
  const eventHref = `/events/${event.id}${eventLinkQuery ? `?${eventLinkQuery}` : ""}`;
  const femalePercent =
    event.cameCount > 0
      ? Math.round((event.femaleCame / event.cameCount) * 100)
      : 0;
  const malePercent =
    event.cameCount > 0
      ? Math.round((event.maleCame / event.cameCount) * 100)
      : 0;

  return (
    <Card className="space-y-4 transition hover:border-(--color-line)">
      {/* שורת הכותרת היא Link בפני עצמה (לא כל הכרטיס) — כפתור הייצוא
          לידה הוא <button>, ולא ניתן לקנן אותו בתוך Link (עוגן-בתוך-
          עוגן, ראו attendee-grid). */}
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
        <Link
          href={eventHref}
          className="min-w-0 truncate font-[family-name:var(--font-display)] text-lg font-bold"
        >
          {event.title}
        </Link>
        <p className="ltr-nums shrink-0 text-xs text-(--color-ink-faint)">
          {formatWeekdayName(event.starts_at)} ·{" "}
          {formatDayMonth(event.starts_at)} · {formatTime(event.starts_at)}
        </p>
        <div className="justify-self-end">
          <EventReportButton
            eventId={event.id}
            eventTitle={event.title}
            eventStartsAt={event.starts_at}
          />
        </div>
      </div>
      <Link href={eventHref} className="block space-y-4">
        {/* שתי קבוצות — "כמה" ו"מי" — מופרדות בקו דק, לא חמש עמודות
            דחוסות. סדר ה-DOM הפוך מסדר התצוגה במכוון: איבר ראשון נופל
            מימין ב-RTL, ולכן כדי לקבל משמאל לימין "הגיעו בפועל, סימנו
            שיגיעו, נשים, גברים" הם נכתבים כאן בסדר הפוך. */}
        <div className="flex items-center gap-4">
          <div className="flex flex-1 gap-4">
            <div className="flex-1 text-center">
              <p className="ltr-nums text-2xl font-bold text-(--color-deep)">
                {malePercent}%
              </p>
              <p className="text-[0.7rem] text-(--color-ink-faint)">גברים</p>
            </div>
            <div className="flex-1 text-center">
              <p className="ltr-nums text-2xl font-bold text-(--color-sea)">
                {femalePercent}%
              </p>
              <p className="text-[0.7rem] text-(--color-ink-faint)">נשים</p>
            </div>
          </div>

          <div className="h-9 w-px shrink-0 bg-(--color-line)" />

          <div className="flex flex-1 gap-4">
            <div className="flex-1 text-center">
              <p className="ltr-nums text-2xl font-bold text-(--color-ink-soft)">
                {event.goingCount}
              </p>
              <p className="text-[0.7rem] text-(--color-ink-faint)">
                סימנו שיגיעו
              </p>
            </div>
            <div className="flex-1 text-center">
              <p className="ltr-nums text-2xl font-bold text-(--color-verified)">
                {event.cameCount}
              </p>
              <p className="text-[0.7rem] text-(--color-ink-faint)">
                הגיעו בפועל
              </p>
            </div>
          </div>
        </div>
      </Link>
    </Card>
  );
}
