import { createClient } from "@/lib/supabase/client";

/**
 * לוגיקת המנוי המשותפת — נקראת גם מכפתור "הפעלת תזכורות" בפרופיל
 * וגם מהצעה אוטומטית בכניסה הראשונה לאפליקציה (notification-prompt-
 * banner.tsx), כדי שלא תהיה כפילות בין השניים.
 */

function urlBase64ToUint8Array(base64: string): Uint8Array<ArrayBuffer> {
  const padded = (base64 + "=".repeat((4 - (base64.length % 4)) % 4))
    .replace(/-/g, "+")
    .replace(/_/g, "/");
  const raw = atob(padded);
  const bytes = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
  return bytes;
}

/**
 * נרשמת ל-push דרך ה-service worker ושומרת את המנוי במסד. מניחה
 * שהרשאת הדפדפן כבר אושרה (Notification.requestPermission) — זו
 * חייבת להיקרא קודם, בתגובה ישירה ללחיצה, לא כאן.
 */
export async function subscribeToPush(vapidPublicKey: string): Promise<void> {
  const reg = await navigator.serviceWorker.register("/sw.js");
  await navigator.serviceWorker.ready;

  const sub = await reg.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
  });

  const json = sub.toJSON();
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("no session");

  const { error } = await supabase.from("push_subscriptions").upsert(
    {
      endpoint: sub.endpoint,
      profile_id: user.id,
      p256dh: json.keys?.p256dh ?? "",
      auth: json.keys?.auth ?? "",
    },
    { onConflict: "endpoint" },
  );
  if (error) throw error;
}

/** תמיכה כללית — לא כולל את מקרה אייפון-בלי-התקנה, שנבדק בנפרד. */
export function pushSupported(): boolean {
  return (
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}
