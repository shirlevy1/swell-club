"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

const INTERVAL_MS = 15_000;

/**
 * רענון אוטומטי תקופתי בעמוד המפגש, רק בזמן שהצ'ק־אין פתוח (שחייה
 * פעילה) — כדי שמי שכבר בעמוד יראה צ'ק־אינים חדשים בלי לגעת בכלום.
 * polling פשוט, לא realtime קבוע: בניגוד ל-/admin שרק מנהלת אחת
 * פותחת, בעמוד מפגש כל מי שנוכח פותח/ת חיבור — polling זול יותר
 * מהחזקת חיבור realtime פתוח אצל כולם בו-זמנית. נעצר לבד כשהחלון
 * נסגר, כי ההורה (event page) כבר לא מרנדר את הרכיב הזה אז.
 */
export function EventLiveRefresh() {
  const router = useRouter();

  useEffect(() => {
    const interval = setInterval(() => router.refresh(), INTERVAL_MS);
    return () => clearInterval(interval);
  }, [router]);

  return null;
}
