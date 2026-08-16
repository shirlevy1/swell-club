import Link from "next/link";
import type { GoingPerson } from "@/lib/data";
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
 * ⚠️ שמות בלבד. אין כאן תמונות, בכוונה: סלפי נוצר רק בצ׳ק־אין מאומת,
 * והצגתו למי שלא נכח באותו מפגש שוברת את הכלל המרכזי של המוצר.
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
            : "הצהרת כוונה, לא נוכחות — את הפנים רואים רק אחרי צ׳ק־אין במקום."}
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
              <span
                aria-hidden
                // לבן על sky הוא 2.3:1 — sky בהיר מדי לשאת טקסט, גם לבן
                className="grid size-9 place-items-center rounded-full bg-(--color-sea) text-sm font-bold text-white"
              >
                {initial(person.fullName)}
              </span>
              <span className="text-sm font-semibold">
                {person.isMe ? "אתם" : person.fullName}
              </span>
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
