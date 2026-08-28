const BRAND_DEALS = [
  {
    name: "Speedo",
    discount: "15% הנחה באתר ובחנויות עם הקוד SWELLCLUB.",
    linkLabel: "לציוד של Speedo",
    url: "https://speedo.co.il/",
  },
  {
    name: "Garmin",
    discount: "10% הנחה באתר ובחנויות עם הקוד TRAINER-9860.",
    linkLabel: "לשעונים של Garmin",
    url: "https://www.garmin.co.il/product-category/smart-watch/",
  },
];

/**
 * הטקסט עצמו חופשי ונערך למפגש (ראו lib/agenda.ts), אבל הטבות
 * המותגים קבועות — אי אפשר להפוך קישור אמיתי לחלק מ-textarea חופשי.
 * showLink נשלט בנפרד למפגש (equipment_link_visible), ומכבה את שתי
 * ההטבות ביחד — אין כרגע צורך בכיבוי נפרד לכל מותג.
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
        <div className="space-y-3 pt-1">
          {BRAND_DEALS.map((brand) => (
            <div key={brand.name} className="space-y-1">
              <p className="text-sm font-semibold">{brand.name}</p>
              <p className="text-sm leading-relaxed text-(--color-ink-soft)">
                {brand.discount}
              </p>
              <a
                href={brand.url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold text-(--color-sea)"
              >
                {brand.linkLabel}
                <span aria-hidden>↗</span>
              </a>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
