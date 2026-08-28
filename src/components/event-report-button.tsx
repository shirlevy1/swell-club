"use client";

import { useState } from "react";
import { getEventAttendanceReportAction } from "@/lib/actions";
import { downloadCsv } from "@/lib/csv";
import { formatDayMonth } from "@/lib/format";

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
        "נוכחות נוספה ידנית ע״י המנהלת?",
      ],
      ...result.rows.map((r) => [
        r.fullName,
        r.going ? "כן" : "לא",
        r.attended ? "כן" : "לא",
        r.addedManually ? "כן" : "לא",
      ]),
    ];

    downloadCsv(
      rows,
      `swell-${eventTitle}-${formatDayMonth(eventStartsAt)}.csv`,
    );
  }

  return (
    <span className="shrink-0">
      <button
        type="button"
        onClick={download}
        disabled={pending}
        aria-label="ייצוא נוכחות"
        className="flex h-7 shrink-0 items-center justify-center rounded-xl border border-(--color-line) bg-(--color-surface) px-2.5 text-xs font-bold text-(--color-sea) transition hover:border-(--color-sea)/50 hover:bg-(--color-sea)/10 disabled:opacity-50"
      >
        {pending ? "…" : "CSV"}
      </button>
      {error && (
        <p className="mt-1 text-xs whitespace-nowrap text-(--color-fail)">
          {error}
        </p>
      )}
    </span>
  );
}
