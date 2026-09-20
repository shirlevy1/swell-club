import Link from "next/link";
import type { SwellEvent } from "@/lib/types";
import { formatWeekdayName, formatTime, relativeTime } from "@/lib/format";
import { ChevronIcon, CheckIcon } from "./social-icons";

/**
 * "המפגש הקרוב" — כרזה בראש דף הבית, לא שורת מפגש רגילה כמו בעמוד
 * "מפגשים" (event-card.tsx): הדגש כאן על ספירה לאחור טבעית
 * (relativeTime, בדיוק כמו ב-event-card) כטקסט הכי בולט, לא על שעה
 * מדויקת. `from=home` בקישור כדי שכפתור החזרה בעמוד המפגש יחזיר
 * לכאן, לא ל"כל המפגשים" הכללי (ראו גם events/[id]/page.tsx).
 */
export function NextEventCard({
  event,
  going,
}: {
  event: SwellEvent;
  going: boolean;
}) {
  return (
    <Link
      href={`/events/${event.id}?from=home`}
      className="block space-y-2 rounded-2xl border border-(--color-deep)/30 p-4 text-white transition hover:brightness-110"
      style={{
        background:
          "radial-gradient(130% 160% at 100% 0%, rgba(146,173,197,.4), transparent 55%), linear-gradient(155deg, #1e3a52 0%, #23405a 55%, #2c4d6b 100%)",
      }}
    >
      <div className="flex items-center justify-between gap-2">
        <p className="text-[0.68rem] font-bold tracking-[0.18em] text-(--color-sky)">
          המפגש הקרוב
        </p>
        {going && (
          <span className="flex shrink-0 items-center gap-1 rounded-full bg-white/15 px-2 py-0.5 text-[0.66rem] font-bold text-white">
            <CheckIcon className="size-2.5" />
            אתם מגיעים
          </span>
        )}
      </div>

      <p className="font-[family-name:var(--font-display)] text-2xl font-extrabold leading-tight">
        {relativeTime(event.starts_at)}
      </p>

      <div className="flex items-end justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-bold">{event.title}</p>
          <p className="truncate text-xs text-white/80">
            יום {formatWeekdayName(event.starts_at)},{" "}
            <span className="ltr-nums">{formatTime(event.starts_at)}</span> ·{" "}
            {event.location_name}
          </p>
        </div>
        <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-white/15">
          <ChevronIcon className="size-4 rotate-180" />
        </span>
      </div>
    </Link>
  );
}
