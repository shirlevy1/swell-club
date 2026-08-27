"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

const THRESHOLD = 70;
const MAX_PULL = 90;

/**
 * משיכה למטה כדי לרענן, כמו באינסטגרם. ב-PWA שמור למסך הבית אין
 * בכלל את המחווה הזו מובנית בדפדפן (ראו visibility-refresh.tsx) —
 * זו הדרך היחידה לרענן בלי לצאת ולחזור לאפליקציה. `router.refresh()`
 * מביא מחדש רק את הנתונים מהשרת, לא רענון מלא של הדף.
 */
export function PullToRefresh({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [pull, setPull] = useState(0);
  const startY = useRef<number | null>(null);
  const pullValue = useRef(0);

  useEffect(() => {
    function onTouchStart(e: TouchEvent) {
      if (window.scrollY > 0 || pending) return;
      startY.current = e.touches[0].clientY;
    }

    function onTouchMove(e: TouchEvent) {
      if (startY.current === null) return;
      // התחלנו למעלה, אבל בינתיים גללו — זו גלילה רגילה, לא משיכה
      if (window.scrollY > 0) {
        startY.current = null;
        pullValue.current = 0;
        setPull(0);
        return;
      }
      const delta = e.touches[0].clientY - startY.current;
      if (delta <= 0) return;
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

    document.addEventListener("touchstart", onTouchStart, { passive: true });
    document.addEventListener("touchmove", onTouchMove, { passive: false });
    document.addEventListener("touchend", onTouchEnd, { passive: true });
    return () => {
      document.removeEventListener("touchstart", onTouchStart);
      document.removeEventListener("touchmove", onTouchMove);
      document.removeEventListener("touchend", onTouchEnd);
    };
  }, [pending, router]);

  const active = pull > 0 || pending;

  return (
    <>
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
    </>
  );
}
