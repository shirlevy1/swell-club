import Link from "next/link";
import { SwellLogo } from "./swell-logo";

/**
 * סרגל המותג בתוך האפליקציה. בלעדיו הלוגו נראה רק בדף הנחיתה —
 * ובמצב הדגמה עוברים אותו בלחיצה אחת ולא חוזרים אליו.
 *
 * הכתב בלוגו לא קריא בגודל הזה, ולכן השם מופיע גם לצידו כטקסט.
 */
export function AppHeader() {
  return (
    <header className="sticky top-0 z-10 border-b border-(--color-line) bg-(--color-page)/85 backdrop-blur-md">
      {/* השם באנגלית, ולכן הלוקאפ יושב בצד שמאל וקורא משמאל לימין:
          קודם הסמל, אחריו המילה. */}
      <div className="mx-auto flex w-full max-w-md justify-end px-3 py-1">
        {/* min-h-11 ו-px-2: זה קישור הבית של האפליקציה, ובגובה 32px
            הוא היה מטרת מגע שנכשלת בידיים רטובות. */}
        <Link
          href="/events"
          dir="ltr"
          className="flex min-h-11 items-center gap-2.5 rounded-xl px-2"
        >
          <SwellLogo className="w-8" />
          <span className="font-[family-name:var(--font-display)] text-xl font-bold tracking-tight">
            Swell Club
          </span>
        </Link>
      </div>
    </header>
  );
}
