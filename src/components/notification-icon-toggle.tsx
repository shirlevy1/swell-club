"use client";

import { useEffect, useState } from "react";
import { demoMode } from "@/lib/config";
import { createClient } from "@/lib/supabase/client";
import { pushSupported, subscribeToPush } from "@/lib/push-client";

/**
 * גרסה מצומצמת של notification-toggle.tsx — אייקון פעמון בגודל
 * אייקון העריכה ליד השם, לא כרטיס עם טקסט הסבר. הכרטיס המלא (עם
 * הסבר ושליחת תזכורת לדוגמה) עדיין קיים בעריכת הפרופיל — זה כאן
 * הוא קיצור דרך מהיר, לא תחליף.
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

  if (state === "loading" || state === "unsupported") return null;

  return (
    <div className="relative">
      <button
        type="button"
        onClick={toggle}
        disabled={pending}
        aria-label={state === "on" ? "כיבוי תזכורות" : "הפעלת תזכורות"}
        aria-pressed={state === "on"}
        className={
          "flex size-9 shrink-0 items-center justify-center rounded-lg border transition " +
          (state === "on"
            ? "border-(--color-sea) bg-(--color-sea) text-white hover:brightness-110"
            : "border-(--color-line) bg-(--color-haze) text-(--color-sea) hover:border-(--color-sea)/50 hover:bg-(--color-sea)/10")
        }
      >
        <BellIcon
          className="size-4"
          filled={state === "on"}
          muted={state !== "on"}
        />
      </button>

      {notice && (
        <div className="absolute start-0 top-full z-10 mt-2 w-56 rounded-xl border border-(--color-line) bg-(--color-surface) p-3 text-xs leading-relaxed text-(--color-ink-soft) shadow-lg">
          {notice}
        </div>
      )}
    </div>
  );
}
