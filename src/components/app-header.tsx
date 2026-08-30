import Link from "next/link";
import Image from "next/image";

/**
 * סרגל המותג בתוך האפליקציה. בלעדיו הלוגו נראה רק בדף הנחיתה —
 * ובמצב הדגמה עוברים אותו בלחיצה אחת ולא חוזרים אליו.
 *
 * הרקע של הסרגל עצמו הוא כחול הלוגו (sky) עד הקצוות, והתמונה היא רק
 * הכתב הלבן על שקיפות (logo-wordmark-white.png) — לא תמונה מלבנית עם
 * רקע כחול משלה. ככה אין "תפר" בין התמונה לרקע, בכל רוחב מסך.
 */
export function AppHeader() {
  return (
    <header className="sticky top-0 z-10 bg-(--color-sky)">
      <div className="mx-auto flex w-full max-w-md justify-center px-3 py-2.5">
        {/* min-h-11: זה קישור הבית של האפליקציה, ובגובה 32px הוא היה
            מטרת מגע שנכשלת בידיים רטובות. */}
        <Link
          href="/events"
          aria-label="Swell Club"
          className="flex min-h-11 items-center"
        >
          <Image
            src="/logo-wordmark-white.png"
            alt=""
            width={452}
            height={158}
            className="h-8 w-auto"
            priority
          />
        </Link>
      </div>
    </header>
  );
}
