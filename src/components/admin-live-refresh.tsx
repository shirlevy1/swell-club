"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { demoMode } from "@/lib/config";

// רק רשת-ביטחון (ראו ההערה למטה) - לא קצב התגובה האמיתי, שמגיע
// מה-realtime למטה ונשאר מיידי בלי קשר למספר הזה. 15 שניות היה
// הגיוני לעמוד מפגש ביום-אמת (event-live-refresh.tsx) - כאן, בעמוד
// ניהול שנשאר פתוח ברקע לאורך זמן, בקשת-הצטרפות/תמונה שמתעדכנת תוך
// 2 דקות (במקום 15 שניות) במקרה הנדיר שה-realtime נפל זה לגמרי
// מספיק, ומונע טעינה-מחדש מלאה של העמוד (events+pendingMembers+
// pendingPhotos) כל 15 שניות סתם, כל עוד הטאב פתוח.
const SAFETY_NET_INTERVAL_MS = 2 * 60 * 1000;

/**
 * לא מרנדרת כלום — רק דואגת שעמוד הניהול יתעדכן לבד כשמישהו נרשם או
 * מעלה תמונה, בלי שהמנהלת תצטרך לצאת ולהיכנס מחדש. אותה שיטה בדיוק
 * כמו התג בסרגל הניווט ובאלבום המפגש: realtime לתגובה מיידית,
 * ורענון תקופתי כרשת ביטחון (חיבור חי לא תמיד נשאר פתוח באמינות בנייד).
 */
export function AdminLiveRefresh({ clubId }: { clubId: string }) {
  const router = useRouter();

  useEffect(() => {
    if (demoMode) return;
    const supabase = createClient();
    const channel = supabase
      .channel(`admin-live:${clubId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "club_members" },
        () => router.refresh(),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "event_photos" },
        () => router.refresh(),
      )
      .subscribe();

    const interval = setInterval(() => router.refresh(), SAFETY_NET_INTERVAL_MS);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(interval);
    };
  }, [clubId, router]);

  return null;
}
