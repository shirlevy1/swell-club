"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

const THRESHOLD = 70;
const MAX_PULL = 90;
/** תזוזה כלפי מטה קטנה מזה מתעלמת לגמרי — לא רק לא מפעילה משיכה,
 * אלא גם לא קוראת ל-preventDefault בכלל. בלעדי זה, כל תנועה טבעית
 * ולא-ישרה של אצבע (רועדת מעט מטה לפני שממשיכה למעלה לגלילה רגילה)
 * הייתה "מרעילה" את כל המחווה: ברגע ש-preventDefault נקרא פעם אחת
 * על touchmove ראשון, ספארי באייפון מחליט שהמחווה כולה מטופלת ע"י
 * JS ומסרב לגלול באופן טבעי עד סוף המגע, גם אם ה-touchmove הבאים
 * לא קוראים ל-preventDefault שוב — בדיוק זה גרם לתחושת "דף תקוע". */
const MIN_DELTA_TO_INTERCEPT = 8;

/**
 * משיכה למטה כדי לרענן, כמו באינסטגרם. ב-PWA שמור למסך הבית אין
 * בכלל את המחווה הזו מובנית בדפדפן (ראו visibility-refresh.tsx) —
 * זו הדרך היחידה לרענן בלי לצאת ולחזור לאפליקציה. `router.refresh()`
 * מביא מחדש רק את הנתונים מהשרת, לא רענון מלא של הדף.
 *
 * הרכיב הזה הוא גם *אזור הגלילה עצמו* של תוכן העמוד (ראו app/(app)/
 * layout.tsx): הכותרת וסרגל הניווט התחתון יושבים מחוץ לאזור הזה
 * לגמרי, כדי שספארי באייפון לא "יגע" בהם תוך כדי גלילה — אותה תקלה
 * ידועה של position:fixed שקופץ/נתלש תוך כדי גלילה ב-PWA שמור-למסך-
 * הבית. לכן הבדיקות כאן הן מול הגלילה הפנימית של האלמנט הזה
 * (containerRef.scrollTop), לא מול window.scrollY.
 */
export function PullToRefresh({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [pull, setPull] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const startY = useRef<number | null>(null);
  const pullValue = useRef(0);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    function onTouchStart(e: TouchEvent) {
      if ((container?.scrollTop ?? 0) > 0 || pending) return;
      startY.current = e.touches[0].clientY;
    }

    function onTouchMove(e: TouchEvent) {
      if (startY.current === null) return;
      // התחלנו למעלה, אבל בינתיים גללו — זו גלילה רגילה, לא משיכה
      if ((container?.scrollTop ?? 0) > 0) {
        startY.current = null;
        pullValue.current = 0;
        setPull(0);
        return;
      }
      const delta = e.touches[0].clientY - startY.current;
      if (delta <= MIN_DELTA_TO_INTERCEPT) return;
      e.preventDefault();
      const next = Math.min(delta * 0.5, MAX_PULL);
      pullValue.current = next;
      setPull(next);
    }

    function onTouchEnd() {
      if (startY.current === null) return;
      startY.current = null;
      if (pullValue.current >= THRESHOLD) {
        startTransition(() => router.refresh());
      }
      pullValue.current = 0;
      setPull(0);
    }

    container.addEventListener("touchstart", onTouchStart, { passive: true });
    container.addEventListener("touchmove", onTouchMove, { passive: false });
    container.addEventListener("touchend", onTouchEnd, { passive: true });
    return () => {
      container.removeEventListener("touchstart", onTouchStart);
      container.removeEventListener("touchmove", onTouchMove);
      container.removeEventListener("touchend", onTouchEnd);
    };
  }, [pending, router]);

  const active = pull > 0 || pending;

  return (
    // ⚠️ בלי -webkit-overflow-scrolling:touch בכוונה: בספארי באייפון
    // זה יוצר "הקשר מיקום" חדש לצאצאים, בדיוק כמו transform — ואז
    // מודאלים במסך מלא בתוך התוכן (PhotoLightbox, add-attendance-
    // button) עם fixed inset-0 מתכווצים לגבולות האזור הזה במקום לכסות
    // את כל המסך (הכותרת וה-nav "מציצים" מסביב). ספארי מודרני עושה
    // גלילה חלקה גם בלעדיו.
    <div ref={containerRef} className={className}>
      <div
        className="flex items-center justify-center overflow-hidden"
        style={{
          height: pending ? 44 : pull,
          transition: active ? undefined : "height 200ms var(--ease-swell)",
        }}
        aria-hidden
      >
        {active && (
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            className={
              "size-5 text-(--color-sea) " + (pending ? "animate-spin" : "")
            }
            style={
              pending
                ? undefined
                : {
                    transform: `rotate(${(pull / THRESHOLD) * 360}deg)`,
                    opacity: Math.min(pull / THRESHOLD, 1),
                  }
            }
          >
            <path d="M21 12a9 9 0 1 1-3-6.7" />
            <path d="M21 3v6h-6" />
          </svg>
        )}
      </div>
      {children}
    </div>
  );
}
