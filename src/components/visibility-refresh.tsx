"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { demoMode } from "@/lib/config";

// לא לרענן פעמיים ברצף כשכמה אירועים יורים על אותה חזרה לאפליקציה
const MIN_GAP_MS = 2000;

/**
 * לא מרנדרת כלום — רק מרעננת את העמוד כשהאפליקציה חוזרת להיות גלויה
 * (חוזרים אליה מאפליקציה אחרת, או מהמסך הראשי). ב-PWA שנשמר למסך
 * הבית אין סרגל דפדפן ואין pull-to-refresh — בלי זה הדרך היחידה
 * לרענן היא לסגור ולפתוח מחדש.
 *
 * ⚠️ `visibilitychange` לבדו לא מספיק: יש לו באג ידוע ב-iOS Safari
 * ב-PWA שנשמר למסך הבית (WebKit #202399) — לפעמים הוא פשוט לא יורה
 * כשחוזרים מאפליקציה אחרת. `pageshow` עם `persisted` הוא האות
 * האמין יותר ל"העמוד קם לתחייה" שם, ו-`focus` הוא רשת ביטחון
 * שלישית. שלושתם ביחד, לא אחד לבד.
 *
 * בלי polling ברקע: כל שלושת האירועים יורים רק על מעבר בפועל,
 * ולכן אין שום עלות כשהאפליקציה סגורה/ברקע — בדיוק כמו רענון ידני,
 * רק אוטומטי. לעדכון חי גם כשלא נוגעים בטלפון בכלל, ראו
 * admin-live-refresh.tsx (realtime + polling, לא כאן).
 */
export function VisibilityRefresh() {
  const router = useRouter();
  const lastRefresh = useRef(0);

  useEffect(() => {
    if (demoMode) return;

    function refresh() {
      const now = Date.now();
      if (now - lastRefresh.current < MIN_GAP_MS) return;
      lastRefresh.current = now;
      router.refresh();
    }

    function handleVisibilityChange() {
      if (document.visibilityState === "visible") refresh();
    }
    function handlePageShow(e: PageTransitionEvent) {
      if (e.persisted) refresh();
    }

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("pageshow", handlePageShow);
    window.addEventListener("focus", refresh);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("pageshow", handlePageShow);
      window.removeEventListener("focus", refresh);
    };
  }, [router]);

  return null;
}
