"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { demoMode } from "@/lib/config";
import { Button, Card, Notice } from "./ui";

/**
 * הרשמה לתזכורות.
 *
 * הלולאה של המוצר תלויה בכך שאנשים יקומו ב-6:45. קובץ יומן דורש פעולה
 * ידנית שרוב האנשים לא יעשו; תזכורת בזמן היא מה שמעביר כוונה לפעולה.
 *
 * ⚠️ באייפון זה עובד **רק** כשהאפליקציה שמורה למסך הבית (מ-iOS 16.4).
 * בספארי רגיל ה-API פשוט לא קיים, ולכן צריך להסביר במקום להיכשל.
 */

const VAPID = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

function urlBase64ToUint8Array(base64: string): Uint8Array<ArrayBuffer> {
  const padded = (base64 + "=".repeat((4 - (base64.length % 4)) % 4))
    .replace(/-/g, "+")
    .replace(/_/g, "/");
  const raw = atob(padded);
  const bytes = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
  return bytes;
}

type State = "loading" | "unsupported" | "needs-install" | "off" | "on";

/** מה המצב ההתחלתי. אסינכרוני, כי צריך לשאול את ה-service worker. */
async function detectState(): Promise<State> {
  if (demoMode || !VAPID) return "unsupported";

  const supported =
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window;

  if (!supported) {
    // אייפון בספארי רגיל: ה-API קיים רק באפליקציה מותקנת
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

export function NotificationToggle() {
  const [state, setState] = useState<State>("loading");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [testSent, setTestSent] = useState(false);

  // המצב ההתחלתי הוא תמיד "loading" — כך הרנדר בשרת ובלקוח זהים
  // ואין אי-התאמה בהידרציה. הזיהוי קורה אחריו.
  useEffect(() => {
    let cancelled = false;
    detectState().then((next) => {
      if (!cancelled) setState(next);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  async function enable() {
    setError(null);
    setPending(true);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setPending(false);
        return setError(
          "ההתראות נחסמו. אפשר לפתוח אותן שוב בהגדרות האתר בדפדפן.",
        );
      }

      const reg = await navigator.serviceWorker.register("/sw.js");
      await navigator.serviceWorker.ready;

      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID!),
      });

      const json = sub.toJSON();
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("no session");

      const { error: dbError } = await supabase
        .from("push_subscriptions")
        .upsert(
          {
            endpoint: sub.endpoint,
            profile_id: user.id,
            p256dh: json.keys?.p256dh ?? "",
            auth: json.keys?.auth ?? "",
          },
          { onConflict: "endpoint" },
        );
      if (dbError) throw dbError;

      setState("on");
    } catch {
      setError("לא הצלחנו להפעיל תזכורות. נסו שוב.");
    }
    setPending(false);
  }

  async function disable() {
    setPending(true);
    try {
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
    } catch {
      setError("לא הצלחנו לכבות. נסו שוב.");
    }
    setPending(false);
  }

  async function sendTest() {
    setError(null);
    setTestSent(false);
    setPending(true);
    try {
      const res = await fetch("/api/push/test", { method: "POST" });
      if (!res.ok) throw new Error();
      setTestSent(true);
    } catch {
      setError("לא הצלחנו לשלוח תזכורת לדוגמה. נסו שוב.");
    }
    setPending(false);
  }

  if (state === "loading" || state === "unsupported") return null;

  return (
    <Card className="space-y-3">
      <div className="space-y-1">
        <h2 className="text-xs font-bold tracking-[0.2em] text-(--color-sea)">
          תזכורות
        </h2>
        <p className="text-sm leading-relaxed text-(--color-ink-soft)">
          {state === "on"
            ? "נשלח תזכורת בערב שלפני המפגש, ושוב בבוקר."
            : "תזכורת בערב שלפני המפגש ובבוקר עצמו, עם מי כבר סימן שיגיע."}
        </p>
      </div>

      {state === "needs-install" ? (
        <Notice>
          באייפון התראות עובדות רק כשהאפליקציה שמורה למסך הבית. בספארי:
          כפתור השיתוף ← ״הוסף למסך הבית״, ואז לפתוח אותה משם.
        </Notice>
      ) : (
        <>
          {error && <Notice tone="error">{error}</Notice>}
          {testSent && (
            <Notice tone="good">
              נשלחה תזכורת לדוגמה — אמורה להופיע בטלפון תוך כמה שניות.
            </Notice>
          )}
          <Button
            onClick={state === "on" ? disable : enable}
            disabled={pending}
            variant={state === "on" ? "secondary" : "primary"}
            className="w-full"
          >
            {pending
              ? "רגע…"
              : state === "on"
                ? "כיבוי תזכורות"
                : "הפעלת תזכורות"}
          </Button>
          {state === "on" && (
            <Button
              onClick={sendTest}
              disabled={pending}
              variant="ghost"
              className="w-full"
            >
              שליחת תזכורת לדוגמה
            </Button>
          )}
        </>
      )}
    </Card>
  );
}
