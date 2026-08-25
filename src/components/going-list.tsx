import Link from "next/link";
import type { GoingPerson } from "@/lib/data";
import { facePositionStyle } from "@/lib/face-position";
import {
  swimLevelLabel,
  SWIM_LEVEL_COLOR,
  swimLevelBadgeStyle,
} from "@/lib/swim-level";
import { WaveIcon } from "./streak-card";
import { Card } from "./ui";

/**
 * אות אחת מהשם הפרטי — הפנים עצמן הן הפרס על נוכחות, ולא נחשפות כאן.
 *
 * אות אחת ולא שתיים בכוונה: "שיר לוי" נותן "של" ו"יונתן שגב" נותן "יש",
 * ובעברית זה נקרא כמילה ולא כראשי תיבות.
 */
function initial(name: string): string {
  return name.trim()[0] ?? "";
}

/**
 * מי סימן שיגיע למפגש הקרוב, בשמות.
 *
 * זה מה שמייצר את המוטיבציה: מספר יבש ("6 מתכוונים") לא משכנע אף אחד
 * לקום בשש בבוקר, אבל לראות ששלושה אנשים שאתם מכירים כבר סימנו — כן.
 *
 * ⚠️ תמונה מוצגת רק למי שכבר נכחתם איתו יחד באיזשהו מפגש בעבר —
 * מי שעוד לא נכחתם יחד מוצג עם אות ראשונית בלבד. אין כאן וואטסאפ או
 * אינסטגרם בכל מקרה: אלה נחשפים רק אחרי צ׳ק־אין מאומת. ראו migration
 * 0018 ואת selfies_read_met_before ב-storage.
 */
export function GoingList({
  people,
  myGoing,
}: {
  people: GoingPerson[];
  myGoing: boolean;
}) {
  if (people.length === 0) return null;

  // "אתם" תמיד ראשון — משם קל לקרוא את השאר
  const sorted = [...people].sort(
    (a, b) => Number(b.isMe) - Number(a.isMe),
  );

  return (
    <Card className="space-y-3">
      <div className="space-y-0.5">
        <h2 className="text-xs font-bold tracking-[0.2em] text-(--color-sea)">
          מי מתכוון להגיע
        </h2>
        <p className="text-xs text-(--color-ink-faint)">
          {myGoing
            ? "סימנתם גם אתם. נתראה בים."
            : "הצהרת כוונה, לא נוכחות — מי שעוד לא נכחתם איתם מוצגים בלי תמונה."}
        </p>
      </div>

      <ul className="flex flex-wrap gap-2">
        {sorted.map((person) => (
          <li key={person.profileId}>
            {/* "אתם" מוביל לפרופיל, כל השאר לעמוד האדם. מטרת מגע של
                44px גם בידיים רטובות בחוף. */}
            <Link
              href={person.isMe ? "/profile" : `/people/${person.profileId}`}
              className={
                "flex min-h-11 items-center gap-2 rounded-full border py-1 ps-1 pe-3 transition hover:border-(--color-sea) hover:bg-(--color-haze) " +
                (person.isMe
                  ? "border-(--color-sea) bg-(--color-haze)"
                  : "border-(--color-line)")
              }
            >
              <div
                aria-hidden
                // flex ולא grid: grid+place-items-center מתעקש עם
                // object-position על ה-img (מלכודת שכבר שילמנו עליה
                // בעיצוב הפרופיל). לבן על sky הוא 2.3:1 — sky בהיר
                // מדי לשאת טקסט, גם לבן.
                className="flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-(--color-sea) text-sm font-bold text-white"
              >
                {person.selfieUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={person.selfieUrl}
                    alt={person.fullName}
                    className="size-full object-cover"
                    style={facePositionStyle(person.faceX, person.faceY)}
                  />
                ) : (
                  initial(person.fullName)
                )}
              </div>
              <span className="text-sm font-semibold">
                {person.isMe ? "אתם" : person.fullName}
              </span>
              {person.swimLevel && (
                <span
                  className="flex shrink-0 items-center gap-1 rounded-full border px-1.5 py-0.5 text-[0.65rem] font-semibold text-(--color-ink)"
                  style={swimLevelBadgeStyle(person.swimLevel)}
                >
                  <WaveIcon
                    className="size-2.5"
                    style={{ color: SWIM_LEVEL_COLOR[person.swimLevel] }}
                  />
                  {swimLevelLabel(person.swimLevel)}
                </span>
              )}
              <span aria-hidden className="text-xs text-(--color-ink-faint)">
                ←
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </Card>
  );
}
