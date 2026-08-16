"use client";

/**
 * ⚠️ תא שמתחיל ב-`=`, `+`, `-` או `@` נקרא באקסל כ**נוסחה**, לא כטקסט.
 *
 * השמות בקובץ הזה מגיעים מטופס ההרשמה, כלומר מחברי הקהילה. מי שנרשם
 * בשם `=HYPERLINK(...)` מריץ קוד אצל **המנהלת** ברגע שהיא פותחת את
 * הייצוא. הגרש מנטרל את זה, ואקסל לא מציג אותו.
 */
function neutralize(value: string): string {
  return /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
}

function toCsv(rows: string[][]): string {
  return rows
    .map((row) =>
      row
        .map((cell) => {
          const v = neutralize(cell ?? "");
          return /[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
        })
        .join(","),
    )
    .join("\n");
}

export function ExportButton({
  rows,
  filename,
}: {
  rows: string[][];
  filename: string;
}) {
  function download() {
    // ה-BOM הכרחי — בלעדיו אקסל פותח עברית כג'יבריש
    const blob = new Blob(["﻿" + toCsv(rows)], {
      type: "text/csv;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <button
      type="button"
      onClick={download}
      className="-me-2 inline-flex min-h-11 items-center px-2 text-xs font-semibold text-(--color-sea) underline underline-offset-4"
    >
      ייצוא CSV
    </button>
  );
}
