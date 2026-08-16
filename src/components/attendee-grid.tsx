import Link from "next/link";
import type { AttendeeCard } from "@/lib/data";
import { instagramUrl, whatsappUrl } from "@/lib/format";
import { InstagramIcon, WhatsAppIcon } from "./social-icons";
import { cx } from "./ui";

function Initials({ name }: { name: string }) {
  const initials = name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0])
    .join("");
  return (
    <div className="flex size-full items-center justify-center bg-(--color-line)/40">
      <span className="font-[family-name:var(--font-display)] text-3xl font-bold text-(--color-ink-faint)">
        {initials}
      </span>
    </div>
  );
}

export function AttendeeGrid({
  attendees,
  eventId,
}: {
  attendees: AttendeeCard[];
  /** למה שכל אחד יראה אצלו: הסלפי מהמפגש הזה בדיוק, לא הכי עדכני */
  eventId: string;
}) {
  if (attendees.length === 0) {
    return (
      <p className="text-sm text-(--color-ink-faint)">
        אתם הראשונים שסימנו הגעה.
      </p>
    );
  }

  return (
    <ul className="grid grid-cols-2 gap-3">
      {attendees.map(({ profile, selfieUrl, isMe }) => {
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
              />
            ) : (
              <Initials name={profile.full_name} />
            )}
          </div>
        );

        return (
          <li
            key={profile.id}
            className={cx(
              "overflow-hidden rounded-2xl border bg-(--color-surface)/50",
              isMe
                ? "border-(--color-sea) ring-1 ring-(--color-sea)/30"
                : "border-(--color-line)/70",
            )}
          >
            {/* קישור לפרופיל רק על התמונה, לא על כל הכרטיס — כפתורי
                וואטסאפ/אינסטגרם למטה הם קישורים בפני עצמם, ועוגן בתוך
                עוגן שובר את שניהם (כבר קרה פעם, ב-admin). ?from מבטיח
                שהתמונה שתיפתח שם היא הסלפי מהמפגש הזה, לא הכי עדכני. */}
            {isMe ? (
              photo
            ) : (
              <Link href={`/people/${profile.id}?from=${eventId}`}>
                {photo}
              </Link>
            )}

            <div className="space-y-2 p-3">
              <p className="truncate text-sm font-bold">
                {profile.full_name}
                {isMe && (
                  <span className="ms-1 text-[0.7rem] font-semibold text-(--color-sea)">
                    (אתם)
                  </span>
                )}
              </p>

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
          </li>
        );
      })}
    </ul>
  );
}
