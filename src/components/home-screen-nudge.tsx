"use client";

import { useState, useSyncExternalStore } from "react";
import { usePathname } from "next/navigation";
import { WaveIcon, XIcon } from "./social-icons";

function subscribeStandalone(callback: () => void) {
  const mql = window.matchMedia("(display-mode: standalone)");
  mql.addEventListener("change", callback);
  return () => mql.removeEventListener("change", callback);
}

function getStandaloneSnapshot() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as unknown as { standalone?: boolean }).standalone === true
  );
}

// השרת לא יכול לדעת את זה — מניחים "לא standalone" עד שהלקוח מתקן
// את עצמו, ראו useSyncExternalStore (בלי זה, קריאת window ב-render
// הראשון הייתה קורסת ב-SSR).
function getStandaloneServerSnapshot() {
  return false;
}

/**
 * תזכורת עדינה לפתוח מהאייקון השמור במסך הבית, כשהעמוד נפתח מחוץ
 * לאפליקציה השמורה (למשל קישור מפגש ש-WhatsApp פתח בדפדפן הרגיל —
 * אין דרך טכנית לגרום לקישור חיצוני לפתוח ישירות את האפליקציה
 * השמורה, לא באייפון ולא באנדרואיד, ראו דיון בצ'אט).
 *
 * אין דרך לדעת אם המכשיר כבר שמר את האייקון או לא (האחסון מבודד
 * לגמרי בין הדפדפן הרגיל/WhatsApp/האפליקציה השמורה) — לכן הניסוח
 * בשאלה, לא בהנחה.
 *
 * לפי בקשה מפורשת: מוצג תמיד, בכל עמוד, בלי זיכרון בין ביקורים —
 * גם סגירה חוזרת בניווט הבא. האיפוס קורה בזמן רינדור (לא ב-useEffect
 * עם setState — זה היה גורם ל-render מיותר ונתפס ע"י כלל ה-lint
 * react-hooks/set-state-in-effect), בדיוק הדפוס הרשמי של React
 * ל"איפוס state כש-prop משתנה".
 */
export function HomeScreenNudge() {
  const pathname = usePathname();
  const isStandalone = useSyncExternalStore(
    subscribeStandalone,
    getStandaloneSnapshot,
    getStandaloneServerSnapshot,
  );
  const [dismissedFor, setDismissedFor] = useState<string | null>(null);

  if (dismissedFor !== pathname && dismissedFor !== null) {
    setDismissedFor(null);
  }

  if (isStandalone || dismissedFor === pathname) return null;

  return (
    <div className="mb-4 flex items-center gap-3 rounded-xl border border-(--color-line) bg-(--color-haze) p-3">
      <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-(--color-sea) to-(--color-deep) text-white">
        <WaveIcon className="size-5" />
      </div>
      <p className="min-w-0 flex-1 text-sm leading-snug">
        <span className="block font-bold text-(--color-ink)">
          Swell Club שמור לכם במסך הבית?
        </span>
        <span className="block text-(--color-ink-soft)">
          פתחו משם לחוויה הכי טובה
        </span>
      </p>
      <button
        type="button"
        onClick={() => setDismissedFor(pathname)}
        aria-label="סגירה"
        className="flex size-6 shrink-0 items-center justify-center rounded-full text-(--color-ink-faint)"
      >
        <XIcon className="size-3.5" />
      </button>
    </div>
  );
}
