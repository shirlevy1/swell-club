"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { demoMode } from "@/lib/config";

/**
 * לא מרנדרת כלום — רק מרעננת את העמוד כשהאפליקציה חוזרת להיות גלויה
 * (חוזרים אליה מאפליקציה אחרת, או מהמסך הראשי). ב-PWA שנשמר למסך
 * הבית אין סרגל דפדפן ואין pull-to-refresh — בלי זה הדרך היחידה
 * לרענן היא לסגור ולפתוח מחדש.
 *
 * בלי polling ברקע: `visibilitychange` יורה רק על מעבר בפועל
 * ל"גלוי", ולכן אין שום עלות כשהאפליקציה סגורה/ברקע — בדיוק כמו
 * רענון ידני, רק אוטומטי. לעדכון חי גם כשלא נוגעים בטלפון בכלל,
 * ראו admin-live-refresh.tsx (realtime + polling, לא כאן).
 */
export function VisibilityRefresh() {
  const router = useRouter();

  useEffect(() => {
    if (demoMode) return;

    function handleVisibilityChange() {
      if (document.visibilityState === "visible") {
        router.refresh();
      }
    }

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () =>
      document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [router]);

  return null;
}
