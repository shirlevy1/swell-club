"use client";

import { unsubscribeFromPush } from "@/lib/push-client";
import { Button } from "./ui";

/**
 * כפתור התנתקות משותף לכל המקומות שמציגים אותו (עמוד פרופיל, ומסכי
 * "ממתין/ה לאישור" / "כבר לא חלק מהקהילה" ב-layout). לפני שמתנתקים,
 * מבטל את מנוי ה-push של המכשיר הזה — בלי זה, מכשיר משותף שמתחברים
 * בו בהמשך לחשבון אחר ממשיך לקבל התראות שנועדו לחשבון הקודם, כי מנוי
 * ה-push הוא תכונה של המכשיר/הדפדפן ולא מתנתק לבד רק כי מתנתקים
 * מהאתר. זה קרה בפועל: מכשיר שהוגדר בעבר עם התראות כמנהלת המשיך
 * לקבל התראות RSVP גם אחרי שהתחברו בו לחשבון חבר/ה רגיל/ה.
 */
export function SignOutButton() {
  async function handleSignOut() {
    await unsubscribeFromPush();
    await fetch("/auth/signout", { method: "POST" });
    // רענון מלא, לא router.push — כדי שלא יישאר שום מטמון RSC ישן
    // מהסשן שהתנתק ממנו הרגע (אותו דפוס בדיוק כמו leave-community-button.tsx)
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination
    window.location.href = "/";
  }

  return (
    <Button type="button" variant="ghost" className="w-full" onClick={handleSignOut}>
      התנתקות
    </Button>
  );
}
