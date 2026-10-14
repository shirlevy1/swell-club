"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { AttendeeCard as AttendeeCardData } from "@/lib/data";
import type { Gender } from "@/lib/types";
import { demoMode } from "@/lib/config";
import { removeAttendanceAction } from "@/lib/actions";
import { removeAttendanceAction as removeAttendanceActionDemo } from "@/lib/demo/actions";
import { byGender, instagramUrl, whatsappUrl } from "@/lib/format";
import { facePositionStyle } from "@/lib/face-position";
import {
  swimLevelLabel,
  SWIM_LEVEL_COLOR,
  swimLevelBadgeStyle,
} from "@/lib/swim-level";
import {
  InstagramIcon,
  SwimmerIcon,
  TrashIcon,
  WaveIcon,
  WhatsAppIcon,
} from "./social-icons";
import { cx, Notice } from "./ui";
import { useConfirmDialog } from "./confirm-dialog";
import { useNewLiveIds } from "./live-refresh-context";

/** נוכחות שנוספה ידנית (הוספת נוכחות ידנית) — אין לה סלפי בכלל. */
function NoSelfieFallback() {
  return (
    <div className="flex size-full items-center justify-center bg-(--color-line)/40">
      <SwimmerIcon className="size-10 text-(--color-ink-faint)" />
    </div>
  );
}

export function AttendeeGrid({
  attendees,
  eventId,
  isOrganizer = false,
}: {
  attendees: AttendeeCardData[];
  /** למה שכל אחד יראה אצלו: הסלפי מהמפגש הזה בדיוק, לא הכי עדכני */
  eventId: string;
  /** מציג כפתור הסרה על כל אריח — גם למי שנכח/ה באמת וגם למי שנוסף/ה
   * ידנית. אין הבדל בממשק בין השניים, בדיוק כמו שאין הבדל בהרשאה. */
  isOrganizer?: boolean;
}) {
  const router = useRouter();
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { confirm, dialog } = useConfirmDialog();

  // hook חייב לרוץ בכל render, גם כשהרשימה ריקה — לכן לפני ה-return
  // המוקדם למטה, לא אחריו.
  const newIds = useNewLiveIds(
    `attendees:${eventId}`,
    attendees.map((a) => a.profile.id),
  );

  async function handleRemove(
    profileId: string,
    fullName: string,
    gender: Gender | null,
  ) {
    const ok = await confirm({
      title: `להסיר את ${fullName} מהמפגש?`,
      body: `${byGender(gender, "הוא לא יוצג", "היא לא תוצג")} יותר כמי ש${byGender(gender, "נכח", "נכחה")} במפגש הזה. אפשר להוסיף ${byGender(gender, "אותו", "אותה")} בחזרה בכל שלב.`,
      confirmText: "כן, להסיר",
      tone: "danger",
    });
    if (!ok) return;

    setError(null);
    setRemovingId(profileId);
    try {
      if (demoMode) {
        await removeAttendanceActionDemo(eventId, profileId);
      } else {
        const result = await removeAttendanceAction(eventId, profileId);
        if (!result.ok) {
          setError(result.error);
          return;
        }
      }
      router.refresh();
    } catch {
      setError("משהו השתבש. בדקו את החיבור ונסו שוב.");
    } finally {
      setRemovingId(null);
    }
  }

  // מי שלא נכח/ה בעצמו/ה (למשל מנהלת שצופה לפני שהחלון נפתח) יכול/ה
  // לראות רשימה ריקה — הרכיב מוצג גם למי שלא נכח, ראו events/[id]/page.tsx.
  // לכן זו לא יכולה להיות טענה על מי שצופה ("אתם הראשונים") — היא
  // ניטרלית ונכונה בכל מקרה.
  if (attendees.length === 0) {
    return (
      <p className="text-sm text-(--color-ink-faint)">
        הגל עוד מחכה למצטרפים.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {error && <Notice tone="error">{error}</Notice>}
      <ul className="grid grid-cols-2 gap-3">
        {attendees.map((attendee) => (
          <AttendeeTile
            key={attendee.profile.id}
            attendee={attendee}
            eventId={eventId}
            isNew={newIds.has(attendee.profile.id)}
            isOrganizer={isOrganizer}
            removing={removingId === attendee.profile.id}
            onRemove={() =>
              handleRemove(
                attendee.profile.id,
                attendee.profile.full_name,
                attendee.profile.gender,
              )
            }
          />
        ))}
      </ul>
      {dialog}
    </div>
  );
}

function AttendeeTile({
  attendee: { profile, selfieUrl, isMe, faceX, faceY },
  eventId,
  isNew,
  isOrganizer,
  removing,
  onRemove,
}: {
  attendee: AttendeeCardData;
  eventId: string;
  isNew: boolean;
  isOrganizer: boolean;
  removing: boolean;
  onRemove: () => void;
}) {
  const ig = instagramUrl(profile.instagram);
  const wa = whatsappUrl(profile.phone);

  const photo = (
    <div className="aspect-square w-full overflow-hidden">
      {selfieUrl ? (
        // התצוגה לא ממראה. התצוגה המקדימה במצלמה כן — זו המוסכמה
        // שמרגישה טבעית בצילום — אבל התמונה השמורה היא הכיוון
        // האמיתי, וזה מה שמשרת זיהוי של אנשים.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={selfieUrl}
          alt={profile.full_name}
          className="size-full object-cover"
          loading="lazy"
          style={facePositionStyle(faceX, faceY)}
        />
      ) : (
        <NoSelfieFallback />
      )}
    </div>
  );

  return (
    <li
      className={cx(
        "relative overflow-hidden rounded-2xl border bg-(--color-surface)/50",
        isMe
          ? "border-(--color-sea) ring-1 ring-(--color-sea)/30"
          : "border-(--color-line)/70",
        isNew && !isMe && "live-highlight",
      )}
    >
      {/* קישור לפרופיל רק על התמונה, לא על כל הכרטיס — כפתורי
          וואטסאפ/אינסטגרם למטה הם קישורים בפני עצמם, ועוגן בתוך
          עוגן שובר את שניהם (כבר קרה פעם, ב-admin). ?from מבטיח
          שהתמונה שתיפתח שם היא הסלפי מהמפגש הזה, לא הכי עדכני.
          האריח של עצמך מוביל ישר ל-/profile, לא ל-/people/[id] —
          גם ככה הוא היה מפנה לשם (people/[id]/page.tsx בודק
          id === viewer.userId), רק בלי הקפיצה המיותרת. */}
      {isMe ? (
        <Link href="/profile">{photo}</Link>
      ) : (
        <Link href={`/people/${profile.id}?from=${eventId}`}>
          {photo}
        </Link>
      )}

      {/* כפתור נפרד, לא בתוך ה-Link - עוגן בתוך עוגן שובר את שניהם.
          תמיד זמין למנהלת, גם למי שנכח/ה באמת וגם למי שנוסף/ה ידנית -
          אין הבדל בממשק כמו שאין הבדל בהרשאה. */}
      {isOrganizer && (
        <button
          type="button"
          onClick={onRemove}
          disabled={removing}
          aria-label={`הסרת ${profile.full_name} מהמפגש`}
          className="absolute end-1 top-1 flex size-[26px] items-center justify-center rounded-full bg-black/55 text-white disabled:opacity-40"
        >
          <TrashIcon className="size-[15px]" />
        </button>
      )}

      <div className="space-y-2 p-3">
        <div className="flex items-center gap-2">
          <p className="min-w-0 flex-1 truncate text-sm font-bold">
            {profile.full_name}
            {isMe && (
              <span className="ms-1 text-[0.7rem] font-semibold text-(--color-sea)">
                (אתם)
              </span>
            )}
          </p>

          {profile.swim_level && (
            <span
              className="flex shrink-0 items-center gap-1 rounded-full border px-1.5 py-0.5 text-[0.65rem] font-semibold text-(--color-ink)"
              style={swimLevelBadgeStyle(profile.swim_level)}
            >
              <WaveIcon
                className="size-2.5"
                style={{ color: SWIM_LEVEL_COLOR[profile.swim_level] }}
              />
              {swimLevelLabel(profile.swim_level)}
            </span>
          )}
        </div>

        {!isMe && (ig || wa) && (
          <div className="flex gap-2">
            {wa && (
              <a
                href={wa}
                target="_blank"
                rel="noreferrer"
                aria-label={`וואטסאפ עם ${profile.full_name}`}
                className="flex h-9 flex-1 items-center justify-center rounded-lg border border-(--color-line) bg-(--color-haze) text-(--color-verified) transition hover:border-(--color-verified)/50 hover:bg-(--color-verified)/10"
              >
                <WhatsAppIcon className="size-4" />
              </a>
            )}
            {ig && (
              <a
                href={ig}
                target="_blank"
                rel="noreferrer"
                aria-label={`אינסטגרם של ${profile.full_name}`}
                className="flex h-9 flex-1 items-center justify-center rounded-lg border border-(--color-line) bg-(--color-haze) text-(--color-sea) transition hover:border-(--color-sea)/50 hover:bg-(--color-sea)/10"
              >
                <InstagramIcon className="size-4" />
              </a>
            )}
          </div>
        )}
      </div>

      {isNew && !isMe && (
        <p className="sr-only" role="status">
          {profile.full_name} {byGender(profile.gender, "הצטרף", "הצטרפה")} עכשיו.
        </p>
      )}
    </li>
  );
}
