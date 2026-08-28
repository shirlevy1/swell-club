const SPEEDO_URL = "https://speedo.co.il/";

/**
 * הטקסט עצמו חופשי ונערך למפגש (ראו lib/agenda.ts), אבל קישור
 * הספידו קבוע — אי אפשר להפוך קישור אמיתי לחלק מ-textarea חופשי.
 * showLink נשלט בנפרד למפגש (equipment_link_visible).
 */
export function WhatToBring({
  text,
  showLink,
}: {
  text: string;
  showLink: boolean;
}) {
  return (
    <div className="space-y-2">
      <p className="text-sm font-semibold">מה להביא למים?</p>
      <p className="whitespace-pre-line text-sm leading-relaxed text-(--color-ink-soft)">
        {text}
      </p>
      {showLink && (
        <a
          href={SPEEDO_URL}
          target="_blank"
          rel="noreferrer"
          className="inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold text-(--color-sea)"
        >
          לציוד של Speedo
          <span aria-hidden>↗</span>
        </a>
      )}
    </div>
  );
}
