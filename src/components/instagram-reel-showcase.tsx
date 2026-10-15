import { SwellLogo } from "./swell-logo";

/**
 * גרסה חלופית ל-InstagramReelCard, לצורך השוואה בלבד (ראו שיחה עם
 * שיר) - כרטיס בעיצוב עצמאי שלנו במקום הווידג'ט הרשמי של אינסטגרם:
 * תמונה שאנחנו מארחים (לא תלויה בחישוב הגובה/רוחב של אינסטגרם, ולכן
 * בלי המריחה), עם כפתור הפעלה וקישור לרייל בדיוק כמו היום. להחלפה
 * לרייל אחר: צריך גם קישור חדש וגם תמונה חדשה (מודבקים כאן ישירות,
 * אין הבאה אוטומטית כמו בווידג'ט הרשמי).
 *
 * ⚠️ זמני: ברגע ששיר בוחרת בין שתי הגרסאות, למחוק את הכרטיס שלא נבחר
 * (ואת instagram-reel-cover.jpg אם זו הגרסה שיורדת) - לא להשאיר את
 * שניהם בפרודקשן.
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
            className="size-20 translate-x-1 drop-shadow-[0_2px_6px_rgba(0,0,0,0.5)] transition group-hover:scale-110"
          >
            <path
              d="M8 5v14l11-7z"
              fill="white"
              stroke="white"
              strokeWidth="2"
              strokeLinejoin="round"
            />
          </svg>
          <p className="text-sm font-semibold text-white drop-shadow-[0_1px_4px_rgba(0,0,0,0.6)]">
            לצפייה באינסטגרם
          </p>
        </div>
      </a>
    </div>
  );
}
