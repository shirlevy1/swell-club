import Link from "next/link";
import { WaveIcon } from "./social-icons";

/**
 * מסגרת הרשת + מיקום כל תא, לפי כמות התמונות (1 עד 7 — getRandomEventAlbum
 * מציג בדיוק כמה שיש, עד תקרה של 7). 1-4 הן אותן פריסות בדיוק כמו
 * EventThumbnail ב-selfie-history.tsx, לעקביות עם שאר האתר. 5-7:
 * תמיד שתי שורות, בלי חורים ריקים — 5 = תמונה גדולה אחת + 4 קטנות;
 * 6 = רשת אחידה 3×2; 7 = תמונה רחבה אחת למעלה + 2 לידה, ו-4 קטנות
 * למטה.
 */
const LAYOUTS: Record<number, { grid: string; cells: string[] }> = {
  1: {
    grid: "grid-cols-1 grid-rows-1",
    cells: [""],
  },
  2: {
    grid: "grid-cols-2 grid-rows-1",
    cells: ["", ""],
  },
  3: {
    grid: "grid-cols-2 grid-rows-2",
    cells: ["row-span-2", "", ""],
  },
  4: {
    grid: "grid-cols-2 grid-rows-2",
    cells: ["", "", "", ""],
  },
  5: {
    grid: "grid-cols-4 grid-rows-2",
    cells: [
      "col-span-2 row-span-2",
      "col-start-3 row-start-1",
      "col-start-4 row-start-1",
      "col-start-3 row-start-2",
      "col-start-4 row-start-2",
    ],
  },
  6: {
    grid: "grid-cols-3 grid-rows-2",
    cells: ["", "", "", "", "", ""],
  },
  7: {
    grid: "grid-cols-4 grid-rows-2",
    cells: [
      "col-span-2 row-start-1",
      "row-start-1",
      "row-start-1",
      "row-start-2",
      "row-start-2",
      "row-start-2",
      "row-start-2",
    ],
  },
};

/**
 * "רגעים שלי מסוואל קלאב" — קולאז' תמונות מהאלבום של מפגש אחד אקראי
 * שהצופה/ת עצמו/ה נכח/ה בו (getRandomEventAlbum ב-lib/data.ts כבר
 * הגריל גם את המפגש וגם אילו תמונות מתוכו — לא רק "איזו תמונה", אלא
 * "איזה מפגש בכלל" משתנה בכל טעינה). כל התמונות שייכות לאותו מפגש,
 * ולכן כל הקולאז' הוא קישור אחד אליו, עם from=home כדי שהחזרה תחזור
 * לבית. לא מוצג אם אין אף מפגש עם תמונה מאושרת שנכחו בו.
 */
export function RandomEventAlbumCard({
  eventId,
  photoUrls,
}: {
  eventId: string;
  photoUrls: string[];
}) {
  const layout = LAYOUTS[photoUrls.length];
  if (!layout) return null;

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
        רגעים שלי מסוואל קלאב
      </p>

      <Link
        href={`/events/${eventId}?from=home`}
        className={`grid ${layout.grid} aspect-[4/3] gap-1 overflow-hidden rounded-xl bg-(--color-haze)`}
      >
        {photoUrls.map((url, i) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={url}
            src={url}
            alt=""
            loading="lazy"
            className={`size-full object-cover ${layout.cells[i]}`}
          />
        ))}
      </Link>
    </div>
  );
}
