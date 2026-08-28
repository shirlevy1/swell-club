"use client";

import { downloadCsv } from "@/lib/csv";

export function ExportButton({
  rows,
  filename,
}: {
  rows: string[][];
  filename: string;
}) {
  return (
    <button
      type="button"
      onClick={() => downloadCsv(rows, filename)}
      aria-label="ייצוא CSV"
      className="flex h-7 shrink-0 items-center justify-center rounded-xl border border-(--color-line) bg-(--color-surface) px-2.5 text-xs font-bold text-(--color-sea) transition hover:border-(--color-sea)/50 hover:bg-(--color-sea)/10"
    >
      CSV
    </button>
  );
}
