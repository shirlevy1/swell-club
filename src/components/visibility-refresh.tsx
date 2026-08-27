"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { demoMode } from "@/lib/config";

// לא לרענן פעמיים ברצף כשכמה אירועים יורים על אותה חזרה לאפליקציה
const MIN_GAP_MS = 2000;

// אותם שמות בדיוק כמו ב-public/sw.js — זה הערוץ המשותף היחיד בין
// ה-service worker לעמוד, כי Cache Storage (בניגוד ל-localStorage)
// נגיש משני הצדדים.
const NAV_CACHE = "swell-pending-nav";
const NAV_KEY = "/pending-nav";

/**
 * קוראת יעד-ניווט ממתין שה-SW השאיר (ראו sw.js), ומוחקת אותו כדי
 * שלא ינווט שוב בפעם הבאה שהאפליקציה חוזרת להיות גלויה.
 */
async function consumePendingNav(): Promise<string | null> {
  if (!("caches" in window)) return null;
  const cache = await caches.open(NAV_CACHE);
  const res = await cache.match(NAV_KEY);
  if (!res) return null;
  await cache.delete(NAV_KEY);
  return await res.text();
}

/**
 * לא מרנדרת כלום — רק מרעננת את העמוד כשהאפליקציה חוזרת להיות גלויה
 * (חוזרים אליה מאפליקציה אחרת, או מהמסך הראשי). ב-PWA שנשמר למסך
 * הבית אין סרגל דפדפן ואין pull-to-refresh — בלי זה הדרך היחידה
 * לרענן היא לסגור ולפתוח מחדש.
 *
 * גם בודקת יעד-ניווט ממתין בכל חזרה: לחיצה על התראה כשהאפליקציה
 * כבר הייתה פתוחה ברקע לא מצליחה לנווט אותה ישירות מה-service
 * worker (חלון "פתוח" ב-PWA שמור-למסך-הבית הוא בפועל מוקפא, ה-JS
 * שלו לא רץ, אז שום קריאה אליו מה-SW לא נקלטת) — אז ה-SW משאיר
 * יעד ב-Cache Storage, וברגע שהאפליקציה קמה לתחייה (אותם 3 אירועים
 * שכבר משמשים לרענון) זה מה שבפועל מבצע את הניווט.
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

    // הבדיקה האוטומטית של הדפדפן לעדכון service worker לא אמינה
    // ב-PWA שמור-למסך-הבית (אותה משפחת באגים כמו visibilitychange) —
    // בלעדי דחיפה מפורשת כאן, תיקונים ב-sw.js עלולים לא לתפוס לאורך
    // זמן רב אצל מי שכבר הפעיל תזכורות לפני העדכון.
    function checkForSwUpdate() {
      if (!("serviceWorker" in navigator)) return;
      navigator.serviceWorker.getRegistration().then((reg) => reg?.update());
    }

    async function onResume() {
      checkForSwUpdate();
      const pending = await consumePendingNav();
      if (pending) {
        router.push(pending);
        return;
      }
      refresh();
    }

    function handleVisibilityChange() {
      if (document.visibilityState === "visible") onResume();
    }
    function handlePageShow(e: PageTransitionEvent) {
      if (e.persisted) onResume();
    }

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("pageshow", handlePageShow);
    window.addEventListener("focus", onResume);

    // גם בעליית הרכיב עצמו, בלי רענון נלווה: מכסה מצב שה-SW פתח
    // את כל האפליקציה מחדש (openWindow) ואין כאן "חזרה" נפרדת
    // שתפעיל את onResume.
    checkForSwUpdate();
    consumePendingNav().then((pending) => {
      if (pending) router.push(pending);
    });

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("pageshow", handlePageShow);
      window.removeEventListener("focus", onResume);
    };
  }, [router]);

  return null;
}
