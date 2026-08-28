"use client";

import { downloadCsv } from "@/lib/csv";
import { DownloadIcon } from "./social-icons";

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
      className="flex size-8 shrink-0 items-center justify-center rounded-full border border-(--color-line) bg-(--color-surface) text-(--color-sea) transition hover:border-(--color-sea)/50 hover:bg-(--color-sea)/10"
    >
      <DownloadIcon className="size-4" />
    </button>
  );
}
