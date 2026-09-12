"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { demoMode } from "@/lib/config";
import { leaveCommunityAction } from "@/lib/demo/actions";
import { unsubscribeFromPush } from "@/lib/push-client";
import { Notice } from "./ui";

/**
 * עזיבת הקהילה ביוזמת חבר/ת הקהילה עצמו/ה. לא מוחקת שורה — מסמנת
 * אותה 'removed' (מחיקה רכה, migration 0036), כמו בהסרה ע"י מנהלת
 * (ראו remove-member-button). מנהלת יכולה לשחזר את החברות בכל שלב
 * מ"מי שכבר לא בקהילה" — אין דרך עצמית לחזור, רק דרך המנהלת.
 *
 * במצב אמיתי מתנתקים אחרי העזיבה — אין טעם להשאיר מחוברים למסך
 * "כבר לא חלק מהקהילה" כשאפשר פשוט לסיים שם.
 */
export function LeaveCommunityButton() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleLeave() {
    const ok = window.confirm(
      "לעזוב את הקהילה? לא תראו יותר מפגשים או אנשים באפליקציה. אם תרצו לחזור, מנהלת הקהילה תוכל לשחזר את החברות שלכם.",
    );
    if (!ok) return;

    setError(null);
    setPending(true);

    if (demoMode) {
      await leaveCommunityAction();
      router.refresh();
      return;
    }

    try {
      const { error: rpcError } = await createClient().rpc("leave_community");
      if (rpcError) {
        setError("לא הצלחנו לעזוב את הקהילה. נסו שוב.");
        setPending(false);
        return;
      }

      await unsubscribeFromPush();
      await fetch("/auth/signout", { method: "POST" });
      // רענון מלא, לא router.push — כדי שלא יישאר שום מטמון RSC ישן
      // מהסשן שהתנתק ממנו הרגע
      // eslint-disable-next-line @next/next/no-location-assign-relative-destination
      window.location.href = "/";
    } catch {
      setPending(false);
      setError("משהו השתבש. בדקו את החיבור ונסו שוב.");
    }
  }

  return (
    <div className="space-y-2 text-center">
      <button
        type="button"
        onClick={handleLeave}
        disabled={pending}
        className="min-h-11 text-sm text-(--color-fail) disabled:opacity-50"
      >
        {pending ? "עוזבים…" : "עזיבת הקהילה"}
      </button>
      {error && <Notice tone="error">{error}</Notice>}
    </div>
  );
}
