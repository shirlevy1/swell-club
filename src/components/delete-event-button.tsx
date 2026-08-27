"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

/**
 * מחיקת מפגש — פעולה נדירה והרסנית, ולכן אייקון קטן ומרוחק בתחתית
 * העמוד, לא כפתור בולט. `events_organizer_all` ב-RLS כבר אוכפת
 * שרק מנהלת יכולה למחוק בפועל — ה-`isOrganizer` כאן הוא רק הסתרה
 * בממשק. כל הטבלאות שתלויות במפגש (rsvps, attendances, event_photos,
 * event_reminders) הן `on delete cascade`, אז זה נקי במסד מעצמו.
 */
export function DeleteEventButton({ eventId }: { eventId: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete() {
    const ok = window.confirm(
      "למחוק את המפגש הזה? הפעולה לא הפיכה — כל הרישומים, הצ'ק־אינים והתמונות שלו יימחקו יחד איתו.",
    );
    if (!ok) return;

    setError(null);
    setPending(true);
    const { error } = await createClient()
      .from("events")
      .delete()
      .eq("id", eventId);

    if (error) {
      setError("לא הצלחנו למחוק את המפגש. נסו שוב.");
      setPending(false);
      return;
    }

    router.push("/events");
  }

  return (
    <div className="flex flex-col items-start gap-2 border-t border-(--color-line) pt-4">
      <button
        type="button"
        onClick={handleDelete}
        disabled={pending}
        aria-label="מחיקת מפגש"
        className="flex min-h-11 items-center gap-1.5 text-sm text-(--color-fail)"
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.9"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="size-4 shrink-0"
          aria-hidden
        >
          <path d="M4 7h16" />
          <path d="M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
          <path d="M6 7l1 13a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-13" />
          <path d="M10 11v6" />
          <path d="M14 11v6" />
        </svg>
        {pending ? "מוחק…" : "מחיקת המפגש"}
      </button>
      {error && <p className="text-xs text-(--color-fail)">{error}</p>}
    </div>
  );
}
