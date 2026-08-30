import type { ReactNode } from "react";
import type { GoingPerson } from "@/lib/data";
import type { Gender, SwellEvent } from "@/lib/types";
import {
  byGender,
  formatWeekday,
  formatTime,
  formatDateShort,
  relativeTime,
} from "@/lib/format";
import { checkInWindow } from "@/lib/checkin";
import { Card, cx } from "./ui";

export function EventCard({
  event,
  attended,
  going = false,
  goingPeople = [],
  past = false,
  gender,
}: {
  event: SwellEvent;
  attended: boolean;
  going?: boolean;
  /** מי סימן שיגיע — השמות, לא רק המספר. זה מה שמושך להיכנס למפגש. */
  goingPeople?: GoingPerson[];
  past?: boolean;
  gender: Gender | null;
}) {
  const { status } = checkInWindow(event);

  return (
    <Card
      className={cx(
        "flex items-center gap-4 transition hover:border-(--color-sky)",
        past && "opacity-75",
      )}
    >
      {/* עמודת הזמן — מה שמסתכלים עליו קודם */}
      <div className="shrink-0 text-center">
        <p className="text-[0.7rem] font-semibold text-(--color-ink-faint)">
          {formatWeekday(event.starts_at)}
        </p>
        <p className="ltr-nums font-[family-name:var(--font-display)] text-2xl font-bold text-(--color-sea)">
          {formatTime(event.starts_at)}
        </p>
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate font-[family-name:var(--font-display)] text-lg font-bold">
          {event.title}
        </p>
        <p className="truncate text-sm text-(--color-ink-soft)">
          {event.location_name}
        </p>
        {/* בלי ltr-nums: המחרוזת מעורבת ("10 באוגוסט"), וכפיית LTR
            עליה הופכת את סדר המילים. */}
        <p className="mt-0.5 truncate text-xs text-(--color-ink-faint)">
          {formatDateShort(event.starts_at)} · {relativeTime(event.starts_at)}
        </p>
        {!past && goingPeople.length > 0 && (
          <p className="mt-1 truncate text-xs font-semibold text-(--color-sea)">
            בדרך: {goingSummary(goingPeople)}
          </p>
        )}
      </div>

      {attended ? (
        <Badge tone="verified">הייתם איתנו</Badge>
      ) : status === "open" ? (
        <Badge tone="live">פתוח עכשיו</Badge>
      ) : going ? (
        <Badge tone="going">
          {byGender(gender, "מתכנן להגיע", "מתכננת להגיע")}
        </Badge>
      ) : null}
    </Card>
  );
}

/**
 * שני שמות ואחריהם היתר במספר. בלי פעלים ("מתכוון"/"מתכוונת") — כל צורה
 * כזאת מניחה מגדר, ו"בדרך" נכון לכל מספר ולכל אדם.
 */
function goingSummary(people: GoingPerson[]): ReactNode {
  // "אתם" ראשון: קודם כל מוודאים שסימנתם, ורק אז מי עוד
  const names = [...people]
    .sort((a, b) => Number(b.isMe) - Number(a.isMe))
    .map((p) => (p.isMe ? "אתם" : p.fullName));

  const shown = names.slice(0, 2);
  const rest = names.length - shown.length;
  if (rest === 0) return shown.join(", ");
  if (rest === 1) return `${shown.join(", ")} ועוד אחד`;
  return (
    <>
      {shown.join(", ")} ועוד <span className="ltr-nums">{rest}</span>
    </>
  );
}

function Badge({
  tone,
  children,
}: {
  tone: "verified" | "live" | "going";
  children: React.ReactNode;
}) {
  const tones = {
    verified: "bg-(--color-verified)/15 text-(--color-verified)",
    live: "animate-pulse bg-(--color-sea) text-white",
    going: "border border-(--color-sky) text-(--color-sea)",
  };
  return (
    <span
      className={cx(
        "shrink-0 rounded-full px-3 py-1 text-[0.7rem] font-bold",
        tones[tone],
      )}
    >
      {children}
    </span>
  );
}
