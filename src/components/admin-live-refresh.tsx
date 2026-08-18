"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { demoMode } from "@/lib/config";

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

    const interval = setInterval(() => router.refresh(), 15_000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(interval);
    };
  }, [clubId, router]);

  return null;
}
