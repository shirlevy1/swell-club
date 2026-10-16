import { SwellLogo } from "./swell-logo";

/**
 * רייל נבחר ידנית מאינסטגרם של Swell Club, בתחתית דף הבית - כרטיס
 * בעיצוב עצמאי שלנו (לא הווידג'ט הרשמי של אינסטגרם, שנמרח בתצוגה
 * רחבה - ראו שיחה עם שיר): תמונה שאנחנו מארחים, עם כפתור הפעלה
 * וקישור לרייל. להחלפה לרייל אחר: צריך גם קישור חדש (REEL_PERMALINK)
 * וגם תמונה חדשה (public/instagram-reel-cover.jpg) - אין הבאה
 * אוטומטית כמו שהייתה בווידג'ט הרשמי.
 */
const REEL_PERMALINK =
  "https://www.instagram.com/reel/DcOCMDcsu5H/?utm_source=ig_embed&utm_campaign=loading";
const PROFILE_LINK = "https://www.instagram.com/swell__club/";

export function InstagramReelShowcase() {
  return (
    <div className="space-y-3 rounded-2xl border border-(--color-line) bg-(--color-surface) p-4">
      <div className="flex items-center justify-between gap-2">
        <a
          href={PROFILE_LINK}
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-2"
        >
          <SwellLogo className="size-9" decorative />
          <span
            className="text-sm font-bold text-(--color-ink)"
            style={{ letterSpacing: "-0.04em" }}
          >
            swell__club
          </span>
        </a>
        <a
          href={PROFILE_LINK}
          target="_blank"
          rel="noreferrer"
          className="text-xs font-semibold text-(--color-sea) hover:underline"
        >
          הצגת הפרופיל
        </a>
      </div>

      <a
        href={REEL_PERMALINK}
        target="_blank"
        rel="noreferrer"
        className="group relative block overflow-hidden rounded-xl bg-(--color-haze)"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/instagram-reel-cover.jpg"
          alt="רייל מתוך האינסטגרם של Swell Club"
          loading="lazy"
          className="aspect-[2/3] w-full object-cover transition group-active:scale-[0.98]"
        />
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
          <svg
            viewBox="0 0 24 24"
            className="size-28 translate-x-1.5 drop-shadow-[0_2px_6px_rgba(0,0,0,0.5)] transition group-hover:scale-110"
          >
            <path
              d="M8 5v14l11-7z"
              fill="white"
              stroke="white"
              strokeWidth="2"
              strokeLinejoin="round"
            />
          </svg>
          <p className="rounded-full bg-black/30 px-3 py-1 text-lg font-semibold text-white shadow-[0_2px_8px_rgba(0,0,0,0.4)]">
            לצפייה באינסטגרם
          </p>
        </div>
      </a>
    </div>
  );
}
