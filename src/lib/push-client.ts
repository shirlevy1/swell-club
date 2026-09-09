import { createClient } from "@/lib/supabase/client";

/**
 * לוגיקת המנוי המשותפת — נקראת גם מכפתור "הפעלת תזכורות" בפרופיל
 * וגם מהצעה אוטומטית בכניסה הראשונה לאפליקציה (notification-prompt-
 * banner.tsx), כדי שלא תהיה כפילות בין השניים.
 */

/**
 * שני הרכיבים (הפעמון וההצעה האוטומטית) הם עצמאיים לגמרי, בלי state
 * משותף — בלי האירוע הזה, הפעלת תזכורות מההצעה האוטומטית לא מעדכנת
 * את צבע הפעמון עד רענון ידני, כי הוא כבר קבע את המצב שלו ב-mount.
 */
export const PUSH_SUBSCRIBED_EVENT = "swell-push-subscribed";
/** אותו רעיון בדיוק כמו PUSH_SUBSCRIBED_EVENT, בשביל "לא תודה" —
 * שהפעמון (אם כבר מוצג באותו עמוד) יעבור מיד ל"כבוי" בלי רענון ידני. */
export const PUSH_DECLINED_EVENT = "swell-push-declined";

/**
 * "לא תודה" בהצעה האוטומטית לא נוגע בהרשאת הדפדפן בכלל (אתר לא יכול
 * לחסום הרשאה בעצמו — רק המשתמש/ת דרך הודעת המערכת האמיתית) ולכן
 * צריך זיכרון נפרד כדי שהבחירה הזו תיחשב "החלטה" ולא תישאל שוב.
 * שמור בדפדפן הספציפי (לא בחשבון) — מכשיר/דפדפן אחר ישאל מחדש.
 */
const DECLINED_KEY = "swell-push-declined";

export function markPushDeclined(): void {
  try {
    localStorage.setItem(DECLINED_KEY, "1");
  } catch {
    // מצב פרטי/localStorage חסום — לא קריטי, פשוט יישאל שוב בפעם הבאה
  }
  window.dispatchEvent(new Event(PUSH_DECLINED_EVENT));
}

/** true אם כבר יש החלטה כלשהי — הרשאה אמיתית של הדפדפן (ניתנה/נחסמה),
 * או "לא תודה" שנשמר. משותף להצעה האוטומטית ולפעמון, כדי ששניהם
 * יסכימו על "האם כבר שאלנו" בלי לשכפל את הלוגיקה. */
export function hasDecidedAboutPush(): boolean {
  if (Notification.permission !== "default") return true;
  try {
    return localStorage.getItem(DECLINED_KEY) === "1";
  } catch {
    return false;
  }
}

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
  window.dispatchEvent(new Event(PUSH_SUBSCRIBED_EVENT));
}

/** תמיכה כללית — לא כולל את מקרה אייפון-בלי-התקנה, שנבדק בנפרד. */
export function pushSupported(): boolean {
  return (
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

/**
 * מבטלת את מנוי ה-push של המכשיר הזה, בלי קשר לחשבון שמחובר. נקראת
 * לפני התנתקות (ראו sign-out-button.tsx) — המנוי הוא תכונה של
 * הדפדפן/המכשיר, לא של החשבון, ולכן לא מתבטל לבד רק כי יוצאים
 * מהחשבון. בלי זה, מכשיר משותף שמתחברים בו אחר כך לחשבון אחר ממשיך
 * לקבל התראות שנועדו לחשבון הקודם. שקטה בכשלים — זה ניקוי מונע,
 * לא פעולה קריטית; אם היא נכשלת, השורה הישנה תתנקה ממילא בפעם הבאה
 * שניסיון שליחה אליה ייכשל (404/410), כמו כל מנוי מת אחר.
 */
export async function unsubscribeFromPush(): Promise<void> {
  if (!pushSupported()) return;
  try {
    const reg = await navigator.serviceWorker.getRegistration();
    const sub = await reg?.pushManager.getSubscription();
    await sub?.unsubscribe();
  } catch {
    // לא קריטי — ראו הערה למעלה.
  }
}
