"use client";

import { useEffect, useState } from "react";
import { demoMode } from "@/lib/config";
import {
  hasDecidedAboutPush,
  markPushDeclined,
  pushSupported,
  subscribeToPush,
} from "@/lib/push-client";
import { Button, Card } from "./ui";

const VAPID = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

/**
 * הצעה אקטיבית להפעלת תזכורות, בכניסה הראשונה לאפליקציה — לא רק
 * כפתור שמחכה שמישהו ימצא אותו בפרופיל.
 *
 * מוצגת רק כל עוד `hasDecidedAboutPush()` false, כדי שלא תופיע יחד
 * עם הפעמון (notification-icon-toggle.tsx) — שני ממשקים לאותה
 * החלטה בדיוק על אותו מסך. "כן"/"לא" כאן שניהם נחשבים החלטה סופית:
 * "כן" משנה בפועל את הרשאת הדפדפן; "לא" לא יכול לגעת בהרשאה עצמה
 * (אתר לא יכול לחסום הרשאה בשם המשתמש/ת), ולכן נשמר ב-localStorage
 * דרך `markPushDeclined()` — אחרת הבאנר היה חוזר לשאול בכל כניסה.
 *
 * לא מבקשת הרשאה אוטומטית בלי לחיצה — זה גם נחסם/מוגבל בדפדפנים
 * רבים, וגם פחות מנומס. הכפתור כאן הוא הלחיצה הנדרשת.
 */
export function NotificationPromptBanner() {
  const [show, setShow] = useState(false);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (demoMode || !VAPID) return;
    if (!pushSupported()) return; // כולל אייפון בלי התקנה למסך הבית
    if (!hasDecidedAboutPush()) setShow(true);
  }, []);

  async function accept() {
    setPending(true);
    try {
      const permission = await Notification.requestPermission();
      if (permission === "granted") await subscribeToPush(VAPID!);
    } catch {
      // שקטה בכוונה — זו הצעה, לא פעולה קריטית. אפשר תמיד להפעיל
      // מהפרופיל בהמשך אם זה נכשל כאן.
    }
    setShow(false);
    setPending(false);
  }

  function decline() {
    markPushDeclined();
    setShow(false);
  }

  if (!show) return null;

  return (
    <Card className="mb-4 flex items-center justify-between gap-3">
      <p className="min-w-0 text-sm font-semibold text-(--color-ink)">
        רוצים תזכורת לפני כל מפגש?
      </p>
      <div className="flex shrink-0 gap-2">
        <Button
          onClick={decline}
          disabled={pending}
          variant="ghost"
          className="min-h-9 px-3 text-xs"
        >
          לא תודה
        </Button>
        <Button
          onClick={accept}
          disabled={pending}
          className="min-h-9 px-3 text-xs"
        >
          {pending ? "רגע…" : "כן, תזכירו לי"}
        </Button>
      </div>
    </Card>
  );
}
