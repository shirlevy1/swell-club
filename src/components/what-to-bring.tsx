const SPEEDO_URL =
  "https://speedo.co.il/?srsltid=AfmBOorW9ylQQUacNxdLh0RptoRXaz0tx-HY0O2EOR1WHGBd7oZ89uN1";

export function WhatToBring() {
  return (
    <div className="space-y-2">
      <p className="text-sm font-semibold">מה להביא למים</p>
      <p className="text-sm leading-relaxed text-(--color-ink-soft)">
        בגד ים · כובע · משקפת · מצוף ים
      </p>
      <p className="text-sm leading-relaxed text-(--color-ink-soft)">
        חסר לכם ציוד?
        <br />
        אפשר להשלים באתר או בחנויות של Speedo עם 15% הנחה בקוד SWELLCLUB.
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
