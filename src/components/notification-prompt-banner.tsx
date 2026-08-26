"use client";

import { useEffect, useState } from "react";
import { demoMode } from "@/lib/config";
import { pushSupported, subscribeToPush } from "@/lib/push-client";
import { Button, Card } from "./ui";

const VAPID = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

/**
 * הצעה אקטיבית להפעלת תזכורות, בכניסה הראשונה לאפליקציה — לא רק
 * כפתור שמחכה שמישהו ימצא אותו בפרופיל.
 *
 * `Notification.permission === "default"` הוא בעצם "עוד לא נשאל/ה
 * מעולם" — הדפדפן עצמו שומר את זה, ולכן אין צורך בדגל נפרד במסד או
 * ב-localStorage: ברגע שעונים (אישור/סירוב), הערך משתנה לצמיתות
 * ל-"granted"/"denied" והבאנר הזה פשוט לא מציג את עצמו שוב.
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
    if (Notification.permission === "default") setShow(true);
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

  if (!show) return null;

  return (
    <Card className="mb-4 flex items-center justify-between gap-3">
      <p className="min-w-0 text-sm font-semibold text-(--color-ink)">
        רוצים תזכורת לפני כל מפגש?
      </p>
      <div className="flex shrink-0 gap-2">
        <Button
          onClick={() => setShow(false)}
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
