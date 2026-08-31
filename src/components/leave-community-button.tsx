"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { demoMode } from "@/lib/config";
import { leaveCommunityAction } from "@/lib/demo/actions";
import { Notice } from "./ui";

/**
 * עזיבת הקהילה ביוזמת חבר/ת הקהילה עצמו/ה. מוחקת רק את שורת החברות —
 * הפרופיל, הסלפים וההיסטוריה נשארים (כמו בהסרה ע"י מנהלת, ראו
 * remove-member-button). בכוונה אין דרך לחזור מלבד הרשמה כמשתמש/ת
 * חדש/ה לגמרי — משימה עתידית.
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
      "לעזוב את הקהילה? לא תראו יותר מפגשים או אנשים באפליקציה. אין דרך אוטומטית לחזור — רק הרשמה כמשתמשים חדשים לגמרי.",
    );
    if (!ok) return;

    setError(null);
    setPending(true);

    if (demoMode) {
      await leaveCommunityAction();
      router.refresh();
      return;
    }

    const { error: rpcError } = await createClient().rpc("leave_community");
    if (rpcError) {
      setError("לא הצלחנו לעזוב את הקהילה. נסו שוב.");
      setPending(false);
      return;
    }

    await fetch("/auth/signout", { method: "POST" });
    // רענון מלא, לא router.push — כדי שלא יישאר שום מטמון RSC ישן
    // מהסשן שהתנתק ממנו הרגע
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination
    window.location.href = "/";
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
