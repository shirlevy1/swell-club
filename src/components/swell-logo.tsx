import Image from "next/image";
import { cx } from "./ui";

/**
 * הלוגו: עיגול בכחול־הים, ובתוכו "Swell" בכתב זורם עם גלים לבנים.
 * קובץ המקור, `/public/logo.png`, מוצג בכל מקום — לא משנה הגודל.
 *
 * decorative: כשלצד הלוגו כבר יש טקסט (גלוי או sr-only) שאומר
 * "Swell Club" בעצמו — אחרת קורא מסך מכריז את השם פעמיים ברצף.
 */
export function SwellLogo({
  className,
  decorative = false,
}: {
  className?: string;
  decorative?: boolean;
}) {
  return (
    <div
      className={cx(
        "relative aspect-square overflow-hidden rounded-full bg-(--color-sky)",
        className,
      )}
      {...(decorative
        ? { "aria-hidden": true }
        : { role: "img", "aria-label": "Swell Club" })}
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
