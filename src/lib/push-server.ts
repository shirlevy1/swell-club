import { createClient } from "@supabase/supabase-js";
import webpush from "web-push";
import { formatTime } from "./format";

/**
 * שליחת Push מיידית (לא מ-cron) — לכל האירועים שקורים בפעולה אחת:
 * מפגש חדש, בקשת חברות, תמונה ממתינה, מישהו סימן שיגיע. בניגוד ל-
 * api/push/send/route.ts (הריצה התקופתית, שבודקת חלונות זמן), אלה
 * נקראות ישירות מהקוד ברגע שהאירוע קורה.
 *
 * לא לייבא את הקובץ הזה מרכיב "use client" — יש בו את מפתח ה-
 * service_role, וזה חייב להישאר בצד השרת בלבד.
 */

export function pushConfigured(): boolean {
  return !!(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.SUPABASE_SERVICE_ROLE_KEY &&
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY &&
    process.env.VAPID_PRIVATE_KEY
  );
}

/** לקוח עם service_role — עוקף RLS. לשימוש רק בתוך הקבצים האלה. */
export function adminDb() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );
}

export type PushPayload = {
  title: string;
  body: string;
  tag: string;
  url: string;
};

/**
 * שולחת ל-profile_id-ים נתונים, ומנקה מנויים מתים (404/410) — אותו
 * ניקוי בדיוק שכבר קיים ב-send/route.ts. שקטה אם push לא מוגדר, כדי
 * שקריאה ל-API route-ים החדשים לא תשבור פעולה עיקרית (יצירת מפגש,
 * RSVP וכו') רק כי מישהו עדיין לא הפעיל תזכורות.
 */
export async function sendPushToProfiles(
  profileIds: string[],
  payload: PushPayload,
): Promise<void> {
  if (!pushConfigured() || profileIds.length === 0) return;

  webpush.setVapidDetails(
    process.env.VAPID_CONTACT ?? "mailto:swell@example.com",
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!,
  );

  const db = adminDb();
  const { data: subs, error: subsError } = await db
    .from("push_subscriptions")
    .select("endpoint, p256dh, auth")
    .in("profile_id", profileIds);
  if (subsError) {
    console.error("sendPushToProfiles: subscriptions lookup failed", subsError);
  }

  const json = JSON.stringify(payload);
  const dead: string[] = [];
  await Promise.all(
    (subs ?? []).map(async (s) => {
      try {
        await webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          json,
        );
      } catch (err) {
        const status = (err as { statusCode?: number })?.statusCode;
        if (status === 404 || status === 410) dead.push(s.endpoint);
      }
    }),
  );
  if (dead.length) {
    await db.from("push_subscriptions").delete().in("endpoint", dead);
  }
}

/**
 * בונה את ה-payload של תזכורת ערב/בוקר — כותרת מודגשת עם יום|שעה|מקום,
 * וגוף עם משפט קצר וקבוע לפי הסוג. משמשת את api/push/send (ה-cron
 * התקופתי). event.id אופציונלי: כשיש, מקשר לעמוד המפגש עצמו.
 */
export function buildReminderPayload(
  kind: "evening" | "morning",
  event: { id?: string; starts_at: string; location_name: string },
): PushPayload {
  const when = kind === "evening" ? "מחר" : "היום";
  const title = `${when} | ${formatTime(event.starts_at)} | ${event.location_name}`;
  const body =
    kind === "evening" ? "נתראה במים" : "הגעתם? סמנו הגעה ותהיו חלק מהגל";
  return {
    title,
    body,
    tag: event.id ? `event-${event.id}` : "swell-test",
    url: event.id ? `/events/${event.id}` : "/events",
  };
}

/** כל ה-profile_id של מנהלות/י הקהילה של club_id נתון. */
export async function getOrganizerIds(
  db: ReturnType<typeof adminDb>,
  clubId: string,
): Promise<string[]> {
  const { data, error } = await db
    .from("club_members")
    .select("profile_id")
    .eq("club_id", clubId)
    .eq("role", "organizer")
    .eq("status", "approved");
  if (error) console.error("getOrganizerIds failed", error);
  return (data ?? []).map((r) => r.profile_id);
}
