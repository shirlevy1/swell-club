"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

const INTERVAL_MS = 15_000;

/**
 * רענון אוטומטי תקופתי בעמוד המפגש, כל עוד חלון הצ'ק־אין לא נסגר —
 * גם לפני שהוא נפתח (RSVP-ים שנכנסים לפני המפגש) וגם בזמן שהוא פתוח
 * (צ'ק־אינים בזמן אמת) — כדי שמי שכבר בעמוד יראה עדכונים בלי לגעת
 * בכלום. polling פשוט, לא realtime קבוע: בניגוד ל-/admin שרק מנהלת
 * אחת פותחת, בעמוד מפגש כל מי שנוכח פותח/ת חיבור — polling זול יותר
 * מהחזקת חיבור realtime פתוח אצל כולם בו-זמנית. נעצר לבד אחרי שהחלון
 * נסגר, כי ההורה (event page) כבר לא מרנדר את הרכיב הזה אז — אין
 * טעם לרענן מפגש שכבר הסתיים.
 */
export function EventLiveRefresh() {
  const router = useRouter();

  useEffect(() => {
    const interval = setInterval(() => router.refresh(), INTERVAL_MS);
    return () => clearInterval(interval);
  }, [router]);

  return null;
}
