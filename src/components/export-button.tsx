"use client";

import { downloadCsv } from "@/lib/csv";

export function ExportButton({
  rows,
  filename,
  label = "CSV",
}: {
  rows: string[][];
  filename: string;
  /** טקסט הכפתור — ברירת המחדל "CSV", אבל כשיש כמה כפתורי ייצוא באותה
   *  שורה צריך ניסוח שמבדיל ביניהם (למשל "נוכחות"). */
  label?: string;
}) {
  return (
    <button
      type="button"
      onClick={() => downloadCsv(rows, filename)}
      aria-label={`ייצוא ${label}`}
      className="flex h-7 shrink-0 items-center justify-center rounded-xl border border-(--color-line) bg-(--color-surface) px-2.5 text-xs font-bold text-(--color-sea) transition hover:border-(--color-sea)/50 hover:bg-(--color-sea)/10"
    >
      {label}
    </button>
  );
}
