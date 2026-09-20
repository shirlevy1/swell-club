import Link from "next/link";
import type { SwellEvent, Gender } from "@/lib/types";
import { formatWeekdayName, formatTime, relativeTime } from "@/lib/format";
import { checkInWindow } from "@/lib/checkin";
import { WaveIcon } from "./social-icons";
import { HomeRsvpToggle } from "./home-rsvp-toggle";

/**
 * "המפגש הקרוב" — כרזה בראש דף הבית, לא שורת מפגש רגילה כמו בעמוד
 * "מפגשים" (event-card.tsx): הדגש כאן על ספירה לאחור טבעית
 * (relativeTime, בדיוק כמו ב-event-card) כטקסט הכי בולט, לא על שעה
 * מדויקת. `from=home` בקישור כדי שכפתור החזרה בעמוד המפגש יחזיר לכאן,
 * לא ל"כל המפגשים" הכללי (ראו גם events/[id]/page.tsx).
 *
 * ה-Link עוטף רק את הספירה־לאחור/כותרת/פרטים, לא את כל הכרטיס: כפתור
 * ה-RSVP (HomeRsvpToggle) יושב לידו כאח בשורה העליונה, לא בתוכו —
 * עוגן בתוך עוגן (או כפתור בתוך עוגן) הוא HTML לא תקין, אותה מלכדת
 * שכבר פתרנו בשורת חבר בניהול.
 *
 * גל הרקע: gradient פשוט של שתי נקודות (שקוף למעלה, לא-שקוף למטה)
 * על כל גובה הכרטיס — לא רק חלק ממנו — כדי שהוא ידעך ברציפות ולא
 * "יתחיל" בקו חד באמצע. מיקום/שכבה נקבעים ב-style מפורש (לא בקלאס
 * Tailwind ל-z-index) כדי שלא תהיה תלות בסדר הטעינה של הסגנונות.
 *
 * הרקע הכהה בנוי אך ורק מ-sea/deep — שני הכחולים היחידים שקיימים
 * בפלטת סוואל (ראו AGENTS.md: "אין צבע שלישי") — לא כחול-נייבי חדש
 * וכהה יותר משניהם. sea למעלה (בהיר יותר, מאחורי הכותרת) ו-deep למטה
 * (כהה יותר, נותן ניגודיות טובה יותר לגל הבהיר שיושב שם).
 *
 * כשחלון הצ'ק-אין פתוח (checkInWindow, אותה פונקציה בדיוק כמו בעמוד
 * המפגש) הכותרת והשורה הקטנה מתחלפות להזמנה ישירה לסמן הגעה, במקום
 * ספירה לאחור למפגש שכבר קורה עכשיו בפועל.
 */
export function NextEventCard({
  event,
  going,
  gender,
}: {
  event: SwellEvent;
  going: boolean;
  gender: Gender | null;
}) {
  const isCheckInOpen = checkInWindow(event).status === "open";

  return (
    <div
      className="relative overflow-hidden rounded-2xl border border-(--color-sky)/30 p-4 text-white"
      style={{
        background: "linear-gradient(155deg, var(--color-sea) 0%, var(--color-deep) 100%)",
      }}
    >
      <svg
        viewBox="0 0 300 220"
        preserveAspectRatio="none"
        aria-hidden
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          zIndex: 0,
          pointerEvents: "none",
        }}
      >
        <defs>
          <linearGradient id="next-event-wave-back" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#fff" stopOpacity="0" />
            <stop offset="100%" stopColor="#fff" stopOpacity=".28" />
          </linearGradient>
          <linearGradient id="next-event-wave-front" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#fff" stopOpacity="0" />
            <stop offset="100%" stopColor="#fff" stopOpacity=".42" />
          </linearGradient>
        </defs>
        <path
          d="M0,110 C40,85 70,85 110,105 C150,125 180,125 220,103 C250,87 275,87 300,100 L300,220 L0,220 Z"
          fill="url(#next-event-wave-back)"
        />
        <path
          d="M0,145 C45,125 80,125 120,141 C160,157 190,155 230,137 C260,123 280,125 300,135 L300,220 L0,220 Z"
          fill="url(#next-event-wave-front)"
        />
      </svg>

      <div className="relative z-[1] space-y-2">
        <div className="flex items-center justify-between gap-2">
          <p className="flex items-center gap-1.5 text-[0.68rem] font-bold tracking-[0.18em] text-white/90">
            <WaveIcon className="size-3.5 shrink-0" />
            {isCheckInOpen ? (
              <span className="flex items-center gap-1">
                <span className="size-1.5 animate-pulse rounded-full bg-white" />
                הצ׳ק-אין פתוח עכשיו
              </span>
            ) : (
              "המפגש הקרוב"
            )}
          </p>
          <HomeRsvpToggle eventId={event.id} initialGoing={going} gender={gender} />
        </div>

        <Link href={`/events/${event.id}?from=home`} className="block space-y-2">
          <p className="font-[family-name:var(--font-display)] text-2xl font-extrabold leading-tight">
            {isCheckInOpen ? "בואו לסמן שהגעתם!" : relativeTime(event.starts_at)}
          </p>

          <div className="min-w-0">
            <p className="truncate text-sm font-bold">{event.title}</p>
            <p className="truncate text-xs text-white/80">
              {isCheckInOpen ? (
                event.location_name
              ) : (
                <>
                  יום {formatWeekdayName(event.starts_at)},{" "}
                  <span className="ltr-nums">{formatTime(event.starts_at)}</span> ·{" "}
                  {event.location_name}
                </>
              )}
            </p>
          </div>
        </Link>
      </div>
    </div>
  );
}
