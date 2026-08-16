import Image from "next/image";
import { cx } from "./ui";

/**
 * הלוגו: עיגול בכחול־הים, ובתוכו "Swell" בכתב זורם עם גלים לבנים.
 * קובץ המקור, `/public/logo.png`, מוצג בכל מקום — לא משנה הגודל.
 */
export function SwellLogo({ className }: { className?: string }) {
  return (
    <div
      className={cx(
        "relative aspect-square overflow-hidden rounded-full bg-(--color-sky)",
        className,
      )}
      role="img"
      aria-label="Swell Club"
    >
      <Image
        src="/logo.png"
        alt=""
        fill
        sizes="160px"
        className="object-cover"
        priority
      />
    </div>
  );
}
