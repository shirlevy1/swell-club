"use client";

import { useEffect } from "react";
import {
  consumeJustCheckedIn,
  JUST_CHECKED_IN_EVENT,
} from "@/lib/checkin-scroll";

function scrollToGridIfMarked() {
  if (!consumeJustCheckedIn()) return;
  document
    .getElementById("attendee-grid")
    ?.scrollIntoView({ behavior: "smooth", block: "start" });
}

/**
 * לא מציג שום דבר — רק מגלגל את המסך לרשימת הנוכחים (#attendee-grid)
 * מיד אחרי צ'ק־אין מוצלח.
 *
 * שני מקרים שונים, ולכן שתי בדיקות: אצל חבר/ת קהילה רגיל/ה, הרכיב
 * הזה נולד בעמוד בפעם הראשונה רק אחרי הצ'ק־אין (הבדיקה ב-mount
 * מספיקה). אצל מנהלת (או בהדגמה, שמתחילה כמנהלת) הרשימה כבר מוצגת
 * גם *לפני* צ'ק־אין — הרכיב כבר mounted מקודם, ולכן צריך גם להקשיב
 * לאירוע החי כדי לתפוס צ'ק־אין שקורה אחרי שהוא כבר קיים בעמוד.
 */
export function ScrollToAttendees() {
  useEffect(scrollToGridIfMarked, []);

  useEffect(() => {
    window.addEventListener(JUST_CHECKED_IN_EVENT, scrollToGridIfMarked);
    return () => {
      window.removeEventListener(JUST_CHECKED_IN_EVENT, scrollToGridIfMarked);
    };
  }, []);

  return null;
}
