import Link from "next/link";
import type { RandomMoment } from "@/lib/data";
import { WaveIcon } from "./social-icons";

/**
 * "רגעים שלי מסוואל קלאב" — תמונת אלבום אחת, בהגרלה, ממפגש שהצופה/ת
 * רשאי/ת לראות (getRandomMoment ב-lib/data.ts כבר אוכף מי רשאי/ת —
 * לא בודקים כאן שוב). לחיצה על התמונה מובילה למפגש שבו היא צולמה,
 * עם from=home כדי שהחזרה משם תחזור לבית. לא מוצג בכלל אם עדיין אין
 * שום תמונה מאושרת להראות.
 */
export function RandomMomentCard({ moment }: { moment: RandomMoment | null }) {
  if (!moment) return null;

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
        href={`/events/${moment.eventId}?from=home`}
        className="block aspect-[4/3] w-full overflow-hidden rounded-xl border border-(--color-line) bg-(--color-haze) transition hover:brightness-95"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={moment.photoUrl}
          alt=""
          className="size-full object-cover"
          loading="lazy"
        />
      </Link>
    </div>
  );
}
