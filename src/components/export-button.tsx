"use client";

import { useState } from "react";
import { downloadCsv } from "@/lib/csv";

type ReportResult =
  | { ok: true; rows: string[][] }
  | { ok: false; error: string };

/**
 * נשלף ונבנה רק בלחיצה (פעולת שרת), לא כחלק מטעינת העמוד שמכיל אותו —
 * אותו דפוס כמו EventReportButton, רק כללי יותר (אין גודל/עומק קבוע
 * לדוח).
 */
export function ExportButton({
  action,
  filename,
  label = "CSV",
}: {
  action: () => Promise<ReportResult>;
  filename: string;
  /** טקסט הכפתור — ברירת המחדל "CSV", אבל כשיש כמה כפתורי ייצוא באותה
   *  שורה צריך ניסוח שמבדיל ביניהם (למשל "נוכחות"). */
  label?: string;
}) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function download() {
    setPending(true);
    setError(null);
    try {
      const result = await action();
      setPending(false);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      downloadCsv(result.rows, filename);
    } catch {
      setPending(false);
      setError("משהו השתבש. בדקו את החיבור ונסו שוב.");
    }
  }

  return (
    <span className="shrink-0">
      <button
        type="button"
        onClick={download}
        disabled={pending}
        aria-label={`ייצוא ${label}`}
        className="flex h-7 shrink-0 items-center justify-center rounded-xl border border-(--color-line) bg-(--color-surface) px-2.5 text-xs font-bold text-(--color-sea) transition hover:border-(--color-sea)/50 hover:bg-(--color-sea)/10 disabled:opacity-50"
      >
        {pending ? "…" : label}
      </button>
      {error && (
        <p className="mt-1 text-xs whitespace-nowrap text-(--color-fail)">
          {error}
        </p>
      )}
    </span>
  );
}
