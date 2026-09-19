import Link from "next/link";
import type { AttendeeCard } from "@/lib/data";
import { facePositionStyle } from "@/lib/face-position";
import { WaveIcon, SwimmerIcon } from "./social-icons";

function NoSelfieFallback() {
  return (
    <div className="flex size-full items-center justify-center bg-(--color-line)/50">
      <SwimmerIcon className="size-6 text-(--color-ink-faint)" />
    </div>
  );
}

/**
 * "מי הכרתם היום" — מדור מודגש מעל הרשת הרגילה, רק למי שזו הפעם
 * הראשונה שנכחתם יחד (ראו event_first_meetings() ב-lib/data.ts).
 * חתוך כבר ל-FIRST_MEETINGS_LIMIT לפני שהגיע לכאן — לא להציף אם יש
 * הרבה פנים חדשות במפגש אחד.
 */
export function FirstMeetings({
  people,
  eventId,
}: {
  people: AttendeeCard[];
  eventId: string;
}) {
  if (people.length === 0) return null;

  return (
    <div
      className="space-y-3 rounded-2xl border border-(--color-sea)/20 p-4"
      style={{
        background:
          "radial-gradient(120% 140% at 15% 0%, rgba(146,173,197,.35), transparent 60%), linear-gradient(155deg, #eef5fa 0%, #e2eef5 55%, #d8e9f1 100%)",
      }}
    >
      <p className="flex items-center gap-1.5 font-[family-name:var(--font-display)] text-sm font-bold text-(--color-deep)">
        <WaveIcon className="size-4 shrink-0" />
        מי הכרתם היום?
      </p>

      <ul className="flex gap-4 overflow-x-auto pb-0.5">
        {people.map(({ profile, selfieUrl, faceX, faceY }) => (
          <li key={profile.id} className="w-[68px] shrink-0 text-center">
            <Link href={`/people/${profile.id}?from=${eventId}`}>
              <div className="mx-auto mb-1.5 flex size-16 items-center justify-center overflow-hidden rounded-full border border-(--color-line) bg-(--color-haze)">
                {selfieUrl ? (
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
              <p className="truncate text-xs font-bold text-(--color-ink)">
                {profile.full_name}
              </p>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
