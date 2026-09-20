import Link from "next/link";
import type { KnownPerson } from "@/lib/data";
import { facePositionStyle } from "@/lib/face-position";
import { WaveIcon, SwimmerIcon } from "./social-icons";
import { cx } from "./ui";

function NoSelfieFallback() {
  return (
    <div className="flex size-full items-center justify-center bg-(--color-line)/50">
      <SwimmerIcon className="size-6 text-(--color-ink-faint)" />
    </div>
  );
}

/**
 * "פנים מוכרות מ-Swell" — מדור בעמוד הבית, מדגם אקראי של שלושה אנשים
 * מכל מי שאי-פעם חלקתם איתם מפגש (לא קשור למפגש ספציפי) — כבר מדוגם
 * אקראית ל-KNOWN_PEOPLE_LIMIT בשרת (ראו getMetPeople ב-lib/data.ts),
 * אז כל טעינה מראה שלושה אחרים. אותו פורמט בדיוק כמו "מי הכרתם היום"
 * (first-meetings.tsx), רק בלי הקשר של מפגש ספציפי.
 */
export function KnownPeopleStrip({ people }: { people: KnownPerson[] }) {
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
        פנים מוכרות מ-Swell
      </p>

      <ul
        className={cx(
          "flex flex-wrap gap-4",
          people.length > 1 && "justify-center",
        )}
      >
        {people.map(({ profileId, fullName, selfieUrl, faceX, faceY }) => (
          <li key={profileId} className="w-[68px] text-center">
            <Link href={`/people/${profileId}`}>
              <div className="mx-auto mb-1.5 flex size-16 items-center justify-center overflow-hidden rounded-full border border-(--color-line) bg-(--color-haze)">
                {selfieUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={selfieUrl}
                    alt={fullName}
                    className="size-full object-cover"
                    loading="lazy"
                    style={facePositionStyle(faceX, faceY)}
                  />
                ) : (
                  <NoSelfieFallback />
                )}
              </div>
              <p className="truncate text-xs font-bold text-(--color-ink)">
                {fullName}
              </p>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
