"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { deleteEventAction } from "@/lib/actions";
import { useConfirmDialog } from "./confirm-dialog";
import { TrashIcon } from "./social-icons";

/**
 * מחיקת מפגש — פעולה נדירה והרסנית, ולכן אייקון קטן ומרוחק בתחתית
 * העמוד, לא כפתור בולט. `deleteEventAction` (שרת) בודקת הרשאת מנהלת
 * בעצמה - לא מסתמכת רק על ההסתרה בממשק. כל הטבלאות שתלויות במפגש
 * (rsvps, attendances, event_photos, event_reminders) הן `on delete
 * cascade`, אז זה נקי במסד מעצמו - אבל קבצי התמונה עצמם ב-storage
 * לא נמחקים אוטומטית, ולכן deleteEventAction מנקה אותם קודם בשרת
 * (צריך service_role בשביל סלפים של אחרים, אין לזה policy RLS).
 */
export function DeleteEventButton({
  eventId,
  redirectTo,
}: {
  eventId: string;
  /** לאן חוזרים אחרי מחיקה — /admin אם הגיעו מהניהול, /events אם לא
      (מחושב ב-events/[id]/page.tsx לפי מאיפה הגיעו למפגש). */
  redirectTo: string;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { confirm, dialog } = useConfirmDialog();

  async function handleDelete() {
    const ok = await confirm({
      title: "למחוק את המפגש הזה?",
      body: "הפעולה לא הפיכה - כל הרישומים, הצ׳ק־אינים והתמונות שלו יימחקו יחד איתו.",
      confirmText: "כן, למחוק",
      tone: "danger",
    });
    if (!ok) return;

    setError(null);
    setPending(true);
    try {
      const result = await deleteEventAction(eventId);
      if (!result.ok) {
        setError(result.error);
        setPending(false);
        return;
      }

      router.push(redirectTo);
    } catch {
      setPending(false);
      setError("משהו השתבש. בדקו את החיבור ונסו שוב.");
    }
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
        <TrashIcon className="size-4 shrink-0" />
        {pending ? "מוחק…" : "מחיקת המפגש"}
      </button>
      {error && <p className="text-xs text-(--color-fail)">{error}</p>}
      {dialog}
    </div>
  );
}
