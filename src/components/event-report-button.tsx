"use client";

import { useState } from "react";
import { getEventAttendanceReportAction } from "@/lib/actions";
import { downloadCsv } from "@/lib/csv";
import { formatDateTime, formatDayMonth } from "@/lib/format";

/**
 * דוח RSVP/הגעה/תמונות למפגש ספציפי, שורה לכל חבר/ת קהילה — נשלף
 * רק בלחיצה (server action), לא כחלק מטעינת רשימת המפגשים כולה.
 */
export function EventReportButton({
  eventId,
  eventTitle,
  eventStartsAt,
}: {
  eventId: string;
  eventTitle: string;
  eventStartsAt: string;
}) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function download() {
    setPending(true);
    setError(null);
    const result = await getEventAttendanceReportAction(eventId);
    setPending(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }

    const rows = [
      [
        "שם",
        "סימן/ה שמתכנן/ת להגיע?",
        "הגיע/ה בפועל?",
        "מתי סימן/ה הגעה",
        "העלה/תה תמונות?",
      ],
      ...result.rows.map((r) => [
        r.fullName,
        r.going === null ? "לא סימן/ה" : r.going ? "כן" : "לא",
        r.attended ? "כן" : "לא",
        r.checkedInAt ? formatDateTime(r.checkedInAt) : "",
        r.uploadedPhoto ? "כן" : "לא",
      ]),
    ];

    downloadCsv(
      rows,
      `swell-${eventTitle}-${formatDayMonth(eventStartsAt)}.csv`,
    );
  }

  return (
    <span>
      <button
        type="button"
        onClick={download}
        disabled={pending}
        className="inline-flex min-h-11 items-center px-2 text-xs font-semibold text-(--color-sea) underline underline-offset-4 disabled:opacity-50"
      >
        {pending ? "מכין…" : "ייצוא נוכחות"}
      </button>
      {error && <p className="px-2 text-xs text-(--color-fail)">{error}</p>}
    </span>
  );
}
