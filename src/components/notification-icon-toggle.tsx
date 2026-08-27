"use client";

import { useEffect, useState } from "react";
import { demoMode } from "@/lib/config";
import { createClient } from "@/lib/supabase/client";
import { pushSupported, subscribeToPush } from "@/lib/push-client";

/**
 * אייקון פעמון קומפקטי (בגודל אייקון עריכה), לא כרטיס עם טקסט הסבר —
 * כדי לא לתפוס מקום בשורת הכותרת של /events. "בדיקה" ליד הפעמון
 * פותחת פאנל קטן לשליחת תזכורת-דוגמה, רק כשההתראות דלוקות.
 */

const VAPID = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

type State = "loading" | "unsupported" | "needs-install" | "off" | "on";

async function detectState(): Promise<State> {
  if (demoMode || !VAPID) return "unsupported";

  if (!pushSupported()) {
    return /iPhone|iPad|iPod/.test(navigator.userAgent)
      ? "needs-install"
      : "unsupported";
  }

  try {
    const reg = await navigator.serviceWorker.getRegistration();
    const sub = await reg?.pushManager.getSubscription();
    return sub ? "on" : "off";
  } catch {
    return "off";
  }
}

/**
 * שני צבעים לא מספיקים כדי להבחין בין דלוק לכבוי (זה נראה כמו "יש
 * התראה חדשה" בהרבה אפליקציות) — פעמון עם קו חוצה למצב כבוי הוא
 * הסימן הכי מוכר לזה בכל מקום (וואטסאפ, סלאק וכו').
 */
function BellIcon({
  className,
  filled,
  muted,
}: {
  className?: string;
  filled?: boolean;
  muted?: boolean;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <path d="M6 9a6 6 0 1 1 12 0c0 4 1.5 5.5 2 6.5H4c.5-1 2-2.5 2-6.5Z" />
      <path d="M9.5 18.5a2.5 2.5 0 0 0 5 0" />
      {muted && <path d="M3.5 3.5 20 20" />}
    </svg>
  );
}

export function NotificationIconToggle() {
  const [state, setState] = useState<State>("loading");
  const [pending, setPending] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [showTests, setShowTests] = useState(false);
  const [testSent, setTestSent] = useState<"evening" | "morning" | null>(
    null,
  );

  useEffect(() => {
    let cancelled = false;
    detectState().then((next) => {
      if (!cancelled) setState(next);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  async function toggle() {
    setNotice(null);

    if (state === "needs-install") {
      setNotice(
        "באייפון צריך קודם לשמור את האתר למסך הבית (בספארי: כפתור השיתוף ← הוסף למסך הבית), ואז לפתוח אותו משם.",
      );
      return;
    }

    setPending(true);
    try {
      if (state === "on") {
        const reg = await navigator.serviceWorker.getRegistration();
        const sub = await reg?.pushManager.getSubscription();
        if (sub) {
          await createClient()
            .from("push_subscriptions")
            .delete()
            .eq("endpoint", sub.endpoint);
          await sub.unsubscribe();
        }
        setState("off");
      } else {
        const permission = await Notification.requestPermission();
        if (permission !== "granted") {
          setNotice("ההתראות נחסמו. אפשר לפתוח אותן שוב בהגדרות האתר בדפדפן.");
        } else {
          await subscribeToPush(VAPID!);
          setState("on");
        }
      }
    } catch {
      setNotice("משהו השתבש. נסו שוב.");
    }
    setPending(false);
  }

  async function sendTest(kind: "evening" | "morning") {
    setTestSent(null);
    setPending(true);
    try {
      const res = await fetch("/api/push/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind }),
      });
      if (!res.ok) throw new Error();
      setTestSent(kind);
    } catch {
      setNotice("לא הצלחנו לשלוח תזכורת לדוגמה. נסו שוב.");
    }
    setPending(false);
  }

  if (state === "loading" || state === "unsupported") return null;

  return (
    <div className="relative flex items-center gap-1">
      <button
        type="button"
        onClick={toggle}
        disabled={pending}
        aria-label={state === "on" ? "כיבוי תזכורות" : "הפעלת תזכורות"}
        aria-pressed={state === "on"}
        className={
          "flex size-8 shrink-0 items-center justify-center rounded-lg border transition " +
          (state === "on"
            ? "border-(--color-sea) bg-(--color-sea) text-white hover:brightness-110"
            : "border-(--color-line) bg-(--color-haze) text-(--color-sea) hover:border-(--color-sea)/50 hover:bg-(--color-sea)/10")
        }
      >
        <BellIcon
          className="size-3.5"
          filled={state === "on"}
          muted={state !== "on"}
        />
      </button>

      {state === "on" && (
        <button
          type="button"
          onClick={() => setShowTests((v) => !v)}
          className="text-xs text-(--color-sea) underline decoration-dotted underline-offset-2"
        >
          בדיקה
        </button>
      )}

      {notice && (
        <div className="absolute start-0 top-full z-10 mt-2 w-56 rounded-xl border border-(--color-line) bg-(--color-surface) p-3 text-xs leading-relaxed text-(--color-ink-soft) shadow-lg">
          {notice}
        </div>
      )}

      {showTests && (
        <div className="absolute start-0 top-full z-10 mt-2 w-64 space-y-2 rounded-xl border border-(--color-line) bg-(--color-surface) p-3 shadow-lg">
          <p className="text-xs leading-relaxed text-(--color-ink-soft)">
            שולח תזכורת-דוגמה לטלפון הזה, בניסוח האמיתי שישמש בפועל.
          </p>
          {testSent && (
            <p className="text-xs font-semibold text-(--color-sea)">
              נשלחה תזכורת {testSent === "evening" ? "ערב" : "בוקר"} — אמורה
              להופיע תוך כמה שניות.
            </p>
          )}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => sendTest("evening")}
              disabled={pending}
              className="flex-1 rounded-lg border border-(--color-line) px-2 py-1.5 text-xs text-(--color-ink) hover:border-(--color-sea)/50"
            >
              תזכורת ערב
            </button>
            <button
              type="button"
              onClick={() => sendTest("morning")}
              disabled={pending}
              className="flex-1 rounded-lg border border-(--color-line) px-2 py-1.5 text-xs text-(--color-ink) hover:border-(--color-sea)/50"
            >
              תזכורת בוקר
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
