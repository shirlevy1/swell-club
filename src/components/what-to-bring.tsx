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
 * הלוגואים עצמם (public/speedo_logo.png, public/garmin_logo.png)
 * מגיעים בצבע המקורי שלהם על רקע שקוף — brightness-0 invert הופך
 * כל פיקסל לא-שקוף ללבן אחיד, בלי צורך לערוך את קובצי המקור.
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
        <div className="flex justify-center gap-8 pt-1">
          {BRAND_DEALS.map((brand) => (
            <a
              key={brand.name}
              href={brand.url}
              target="_blank"
              rel="noreferrer"
              aria-label={`הטבת ${brand.name}`}
              className="flex flex-col items-center gap-1.5"
            >
              <span className="flex size-12 items-center justify-center rounded-full bg-(--color-sea) transition hover:brightness-110">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={brand.logo}
                  alt={brand.name}
                  className="h-5 w-auto max-w-[70%] object-contain brightness-0 invert"
                />
              </span>
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
