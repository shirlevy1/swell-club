import Link from "next/link";
import Image from "next/image";

/**
 * סרגל המותג בתוך האפליקציה. בלעדיו הלוגו נראה רק בדף הנחיתה —
 * ובמצב הדגמה עוברים אותו בלחיצה אחת ולא חוזרים אליו.
 *
 * הלוגו כאן הוא גרסה מלבנית של הכתב, לא העיגול — בגודל הזה הכתב
 * כבר קריא בעצמו, ולכן אין צורך גם בטקסט "Swell Club" לצידו.
 */
export function AppHeader() {
  return (
    <header className="sticky top-0 z-10 border-b border-(--color-line) bg-(--color-page)/85 backdrop-blur-md">
      <div className="mx-auto flex w-full max-w-md justify-end px-3 py-1">
        {/* min-h-11: זה קישור הבית של האפליקציה, ובגובה 32px הוא היה
            מטרת מגע שנכשלת בידיים רטובות. */}
        <Link
          href="/events"
          aria-label="Swell Club"
          className="flex min-h-11 items-center rounded-xl px-2"
        >
          <Image
            src="/logo-wordmark.png"
            alt=""
            width={82}
            height={36}
            className="h-9 w-auto rounded-lg"
            priority
          />
        </Link>
      </div>
    </header>
  );
}
