const SPEEDO_URL =
  "https://speedo.co.il/?srsltid=AfmBOorW9ylQQUacNxdLh0RptoRXaz0tx-HY0O2EOR1WHGBd7oZ89uN1";

/**
 * הטקסט עצמו חופשי ונערך למפגש (ראו lib/agenda.ts), אבל קישור
 * הספידו קבוע — אי אפשר להפוך קישור אמיתי לחלק מ-textarea חופשי.
 */
export function WhatToBring({ text }: { text: string }) {
  return (
    <div className="space-y-2">
      <p className="text-sm font-semibold">מה להביא למים?</p>
      <p className="whitespace-pre-line text-sm leading-relaxed text-(--color-ink-soft)">
        {text}
      </p>
      <a
        href={SPEEDO_URL}
        target="_blank"
        rel="noreferrer"
        className="inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold text-(--color-sea)"
      >
        לציוד של Speedo
        <span aria-hidden>↗</span>
      </a>
    </div>
  );
}
