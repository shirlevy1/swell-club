"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { demoMode } from "@/lib/config";
import { Card } from "./ui";
import { SignOutButton } from "./sign-out-button";

const RETRY_KEY = "swell-membership-retry-at";
/** אם כבר ניסינו לאחרונה (אותה ביקור, בתוך חלון המניעה), לא מנסים
 * שוב מיד — זה שמונע לולאת רענון אינסופית אם הבעיה אמיתית ונמשכת.
 * אחרי שחלון המניעה עובר, ביקור עתידי עדיין מקבל ניסיון חוזר נקי. */
const RETRY_SUPPRESS_WINDOW_MS = 30_000;

function alreadyRetriedRecently(): boolean {
  try {
    const raw = sessionStorage.getItem(RETRY_KEY);
    if (!raw) return false;
    return Date.now() - Number(raw) < RETRY_SUPPRESS_WINDOW_MS;
  } catch {
    return false;
  }
}

function markRetried(): void {
  try {
    sessionStorage.setItem(RETRY_KEY, String(Date.now()));
  } catch {
    // localStorage/sessionStorage חסום (למשל גלישה פרטית) — לא קריטי,
    // פשוט ינסה רענון בכל פעם מחדש במקום פעם אחת
  }
}

/**
 * מוצג כש-viewer.status הוא null - כלומר לא נמצאה בכלל שורת club_members,
 * לא שורה עם status='removed' (זו מוצגת ישירות ב-layout.tsx, בלי המתנה,
 * כי היא עדות אמיתית וקיימת להסרה מכוונת). "לא נמצאה שום שורה" יכול
 * להיות הסרה אמיתית (חשבון ישן מאוד) - אבל גם להיות בדיוק אותה תקלת
 * רשת רגעית שכבר מתועדת ב-getViewer() (lib/data.ts): "data:null גם על
 * הצלחה אמיתית עם 0 שורות וגם על שגיאת רשת". שיר דיווחה על זה שוב אחרי
 * שזה כבר "תוקן" פעם אחת (הגדלת חלון הניסיונות החוזרים בשרת) - כלומר
 * זה עדיין קורה, וזה תמיד "מתקן את עצמו" אחרי רענון ידני. זה בדיוק
 * מה שהרכיב הזה עושה אוטומטית, לפני שמישהו/י נבהל/ת ושולח/ת צילום מסך.
 */
export function AmbiguousMembershipScreen() {
  const router = useRouter();
  const [phase, setPhase] = useState<"checking" | "final">("checking");

  useEffect(() => {
    // בהדגמה "הוסרתי" הוא דגל קבוע בזיכרון, לא תקלת רשת אמיתית —
    // רענון לעולם לא "יתקן" אותו, אז אין טעם בהמתנה מלאכותית.
    if (demoMode || alreadyRetriedRecently()) {
      // מכוון: קריאה סינכרונית אחת כדי להחליט את מצב ההתחלה האמיתי
      // בצד הלקוח (לא ניתן לדעת את זה בשרת) — לא לולאת סנכרון, רק
      // קביעה חד-פעמית בעלייה.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setPhase("final");
      return;
    }
    const id = setTimeout(() => {
      markRetried();
      router.refresh();
    }, 1500);
    return () => clearTimeout(id);
  }, [router]);

  if (phase === "checking") {
    return (
      <div className="flex flex-1 items-center pt-10">
        <Card className="w-full space-y-4 text-center">
          <h1 className="font-[family-name:var(--font-display)] text-xl font-bold">
            רגע, בודקים את החשבון
          </h1>
          <p className="text-sm leading-relaxed text-(--color-ink-soft)">
            זה ייקח רק כמה שניות.
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-1 items-center pt-10">
      <Card className="w-full space-y-4 text-center">
        <h1 className="font-[family-name:var(--font-display)] text-xl font-bold">
          כבר לא חלק מהקהילה
        </h1>
        <p className="text-sm leading-relaxed text-(--color-ink-soft)">
          החשבון הזה כבר לא חבר בקהילה.
        </p>
        <p className="text-sm leading-relaxed text-(--color-ink-soft)">
          אם זה לא צפוי, פנו למנהלת הקהילה.
        </p>
        <SignOutButton />
      </Card>
    </div>
  );
}
