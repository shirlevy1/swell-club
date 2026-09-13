"use client";

import { useState } from "react";
import { formatWeekdayName, formatDayMonth, formatTime } from "@/lib/format";
import { ShareIcon } from "./social-icons";

/**
 * שיתוף מפגש דרך תפריט השיתוף הרגיל של הטלפון (navigator.share) —
 * אותו API שכבר בשימוש לשיתוף תמונות באלבום (event-photo-album.tsx).
 * מי שאין לו/ה חשבון ולוחץ/ת על הקישור מגיע/ה למסך התחברות ומשם
 * להרשמה — זה כבר קורה מעצמו דרך proxy.ts, בלי קוד נוסף כאן.
 */
export function ShareEventButton({
  title,
  startsAt,
  locationName,
}: {
  title: string;
  startsAt: string;
  locationName: string;
}) {
  const [copied, setCopied] = useState(false);

  async function handleShare() {
    const text = `יש סוואל!\n${formatWeekdayName(startsAt)} | ${formatDayMonth(startsAt)} | ${formatTime(startsAt)} | ${locationName}\n\nאתם באים?`;
    const url = window.location.href;

    if (navigator.share) {
      try {
        await navigator.share({ title, text, url });
      } catch {
        // ביטול תפריט השיתוף ביוזמת המשתמש/ת — לא שגיאה
      }
      return;
    }

    // דפדפן שולחני בלי תמיכה בתפריט שיתוף — מעתיקים ללוח כחלופה
    try {
      await navigator.clipboard.writeText(`${text}\n${url}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // אין חלופה נוספת אם גם ההעתקה נכשלה
    }
  }

  return (
    <button
      type="button"
      onClick={handleShare}
      aria-label="שיתוף המפגש"
      className="flex size-11 shrink-0 items-center justify-center rounded-full border border-(--color-line) bg-(--color-surface) text-(--color-sea) transition hover:border-(--color-sea)/50 hover:bg-(--color-sea)/10"
    >
      {copied ? (
        <span className="text-[0.6rem] font-bold">הועתק</span>
      ) : (
        <ShareIcon className="size-5" />
      )}
    </button>
  );
}
