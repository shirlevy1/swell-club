const BRAND_DEALS = [
  {
    name: "Speedo",
    percent: "15%",
    code: "SWELLCLUB",
    url: "https://speedo.co.il/",
    logo: "/speedo_logo.png",
  },
  {
    name: "Garmin",
    percent: "10%",
    code: "TRAINER-9860",
    url: "https://www.garmin.co.il/product-category/smart-watch/",
    logo: "/garmin_logo.png",
  },
];

/**
 * הטקסט עצמו חופשי ונערך למפגש (ראו lib/agenda.ts), אבל הטבות
 * המותגים קבועות — אי אפשר להפוך קישור אמיתי לחלק מ-textarea חופשי.
 * showLink נשלט בנפרד למפגש (equipment_link_visible), ומכבה את שתי
 * ההטבות ביחד — אין כרגע צורך בכיבוי נפרד לכל מותג.
 *
 * הלוגואים מוצגים בצבעים המקוריים שלהם, לא מאולצים לצבע אחיד:
 * speedo_logo.png שקוף (סימן אדום בלבד), אבל garmin_logo.png אטום
 * לגמרי (ריבוע שחור מלא) — brightness-0/invert על קובץ בלי שקיפות
 * הופך את כל הריבוע לצבע אחיד ומוחק את הלוגו, לא רק "צובע" אותו.
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
        <div className="flex gap-3 pt-1">
          {BRAND_DEALS.map((brand) => (
            <a
              key={brand.name}
              href={brand.url}
              target="_blank"
              rel="noreferrer"
              aria-label={`הטבת ${brand.name}`}
              className="flex flex-1 flex-col items-center gap-2 rounded-xl border border-(--color-line) bg-(--color-surface) p-3 text-center transition active:scale-[0.98] hover:border-(--color-sea)/50 hover:bg-(--color-haze)"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={brand.logo}
                alt={brand.name}
                className="h-9 w-full object-contain"
              />
              <span className="text-xs font-semibold text-(--color-ink-soft)">
                <span className="ltr-embed">{brand.percent}</span>
                {" · "}
                <span className="ltr-embed">{brand.code}</span>
              </span>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
