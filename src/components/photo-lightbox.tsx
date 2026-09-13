"use client";

import { useEffect, useRef } from "react";
import { ChevronIcon, XIcon } from "./social-icons";

/**
 * תצוגת מסך-מלא משותפת: אלבום המפגש (`event-photo-album.tsx`) ותור
 * האישור בעמוד הניהול (`pending-photo-group.tsx`) שניהם צריכים "לראות
 * בגדול" עם ניווט בין תמונות — ההבדל היחיד הוא אילו כפתורי פעולה
 * מופיעים למעלה, ולכן זה מגיע כ-`actions` מבחוץ במקום מוטבע כאן.
 */
export function PhotoLightbox({
  photos,
  index,
  onIndexChange,
  onClose,
  actions,
  label,
  footer,
}: {
  photos: { id: string; url: string }[];
  index: number;
  onIndexChange: (i: number) => void;
  onClose: () => void;
  actions?: React.ReactNode;
  label?: string;
  footer?: React.ReactNode;
}) {
  const photo = photos[index];

  const dialogRef = useRef<HTMLDivElement>(null);
  // מקלדת: Escape סוגר, ופוקוס עובר לחלון עצמו בפתיחה — בלי זה מי
  // שמנווט/ת במקלדת נשאר/ת "מאחורי" התוכן שכבר לא נראה מתחת לרקע השחור.
  useEffect(() => {
    if (!photo) return;
    dialogRef.current?.focus();
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [photo, onClose]);

  if (!photo) return null;

  return (
    <div
      ref={dialogRef}
      tabIndex={-1}
      className="fixed inset-0 z-50 flex flex-col bg-black/95 outline-none"
      role="dialog"
      aria-modal="true"
    >
      <div className="flex items-center justify-between gap-3 p-4">
        <div className="flex items-center gap-2">{actions}</div>
        {label && (
          <span className="rounded-full bg-white/10 px-3 py-1.5 text-xs font-bold text-white">
            {label}
          </span>
        )}
        {/* אחרונה ב-DOM כדי שתמיד תופיע בצד שמאל, בלי קשר למה actions
            מכיל — שיר ביקשה במפורש X בצד שמאל. */}
        <button
          type="button"
          onClick={onClose}
          aria-label="סגירה"
          className="flex size-10 items-center justify-center rounded-full bg-white/10 text-white"
        >
          <XIcon className="size-5" />
        </button>
      </div>

      <div className="relative flex flex-1 items-center justify-center px-2">
        {index > 0 && (
          <button
            type="button"
            onClick={() => onIndexChange(index - 1)}
            aria-label="התמונה הקודמת"
            className="absolute start-1 flex size-10 items-center justify-center rounded-full bg-white/10 text-white"
          >
            <ChevronIcon className="size-5 rotate-180" />
          </button>
        )}

        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={photo.url} alt="" className="max-h-full max-w-full object-contain" />

        {index < photos.length - 1 && (
          <button
            type="button"
            onClick={() => onIndexChange(index + 1)}
            aria-label="התמונה הבאה"
            className="absolute end-1 flex size-10 items-center justify-center rounded-full bg-white/10 text-white"
          >
            <ChevronIcon className="size-5" />
          </button>
        )}
      </div>

      {footer}
    </div>
  );
}
