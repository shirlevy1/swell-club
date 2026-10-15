import { InstagramIcon } from "./social-icons";

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
        <p className="flex items-center gap-1.5 text-sm font-semibold">
          <InstagramIcon className="size-4 text-(--color-sea)" />
          האינסטגרם שלנו — אפשרות 2
        </p>
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
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/0 to-transparent" />
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="flex size-14 items-center justify-center rounded-full bg-white/90 shadow-lg transition group-hover:bg-white">
            <svg viewBox="0 0 24 24" className="size-6 translate-x-0.5 fill-(--color-deep)">
              <path d="M8 5v14l11-7z" />
            </svg>
          </div>
        </div>
        <p className="absolute inset-x-0 bottom-0 flex items-center gap-1.5 px-3 pb-2.5 pt-8 text-sm font-semibold text-white">
          <InstagramIcon className="size-4" />
          לצפייה ברייל באינסטגרם
        </p>
      </a>
    </div>
  );
}
