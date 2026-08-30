import Link from "next/link";
import Image from "next/image";

/**
 * סרגל המותג בתוך האפליקציה. בלעדיו הלוגו נראה רק בדף הנחיתה —
 * ובמצב הדגמה עוברים אותו בלחיצה אחת ולא חוזרים אליו.
 *
 * הלוגו כאן הוא גרסה מלבנית של הכתב, לא העיגול — בגודל הזה הכתב
 * כבר קריא בעצמו, ולכן אין צורך גם בטקסט "Swell Club" לצידו.
 * פרוס על כל רוחב המסך (w-full h-auto, בלי padding בצדדים) — היחס
 * המקורי של התמונה נשמר, ולכן הסרגל גבוה יותר מסרגל ניווט רגיל.
 */
export function AppHeader() {
  return (
    <header className="sticky top-0 z-10 border-b border-(--color-line) bg-(--color-page)/85 backdrop-blur-md">
      <div className="mx-auto w-full max-w-md">
        <Link href="/events" aria-label="Swell Club" className="block">
          <Image
            src="/logo-wordmark.png"
            alt=""
            width={980}
            height={430}
            className="h-auto w-full"
            priority
          />
        </Link>
      </div>
    </header>
  );
}
