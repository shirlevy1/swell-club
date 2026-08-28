"use client";

import { ChevronIcon } from "./social-icons";

export function CloseIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      className={className}
      aria-hidden
    >
      <path d="M6 6 18 18M18 6 6 18" />
    </svg>
  );
}

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
  if (!photo) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black/95" role="dialog" aria-modal="true">
      <div className="flex items-center justify-between gap-3 p-4">
        <button
          type="button"
          onClick={onClose}
          aria-label="סגירה"
          className="flex size-10 items-center justify-center rounded-full bg-white/10 text-white"
        >
          <CloseIcon className="size-5" />
        </button>
        {label && (
          <span className="rounded-full bg-white/10 px-3 py-1.5 text-xs font-bold text-white">
            {label}
          </span>
        )}
        <div className="flex items-center gap-2">{actions}</div>
      </div>

      <div className="relative flex flex-1 items-center justify-center px-2">
        {index > 0 && (
          <button
            type="button"
            onClick={() => onIndexChange(index - 1)}
            aria-label="התמונה הקודמת"
            className="absolute start-1 flex size-10 items-center justify-center rounded-full bg-white/10 text-white"
          >
            <ChevronIcon className="size-5" />
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
            <ChevronIcon className="size-5 rotate-180" />
          </button>
        )}
      </div>

      {footer}
    </div>
  );
}
