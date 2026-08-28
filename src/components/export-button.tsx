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
      className="-me-2 inline-flex min-h-11 items-center px-2 text-xs font-semibold text-(--color-sea) underline underline-offset-4"
    >
      ייצוא CSV
    </button>
  );
}
