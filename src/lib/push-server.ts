import { createClient } from "@supabase/supabase-js";
import webpush from "web-push";
import { formatTime } from "./format";
import { sendEmail, buildEmailHtml } from "./email-server";

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

const TZ = "Asia/Jerusalem";

/** שעה/דקה/תאריך מקומיים בישראל, בלי תלות ב-timezone של השרת. */
export function israelParts(date: Date) {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const parts = Object.fromEntries(
    fmt.formatToParts(date).map((p) => [p.type, p.value]),
  ) as Record<string, string>;
  return {
    dateStr: `${parts.year}-${parts.month}-${parts.day}`,
    hour: Number(parts.hour),
    minute: Number(parts.minute),
  };
}

/**
 * הרגע (UTC) של 20:00 בישראל, ביום שלפני התאריך המקומי (בישראל) של
 * event.starts_at — תחילת "חלון הערב" של אותו מפגש. משותפת בין
 * api/push/send (בודקת אם הגיע הזמן לשלוח) ו-api/push/notify-new-event
 * (בודק אם החלון כבר עבר בעת היצירה, כדי לא לשכפל את ההזמנה).
 *
 * לא הנחה קבועה של +2/+3 שעות: קוראים את השעון בישראל ברגע המפגש
 * עצמו כדי לחשב את ההפרש מ-UTC בפועל, כולל שעון קיץ — "מתרגמים" 20:00
 * מקומי חזרה ל-UTC לפי אותו הפרש.
 */
export function eveningThresholdBefore(eventStartsAt: string): Date {
  const start = new Date(eventStartsAt);
  const dayBefore = new Date(start.getTime() - 24 * 3600_000);
  const { dateStr: dayBeforeStr } = israelParts(dayBefore);
  const [y, m, d] = dayBeforeStr.split("-").map(Number);

  // ה-offset מ-UTC מחושב ביחס לנקודת הזמן של הסף עצמו (20:00 באותו
  // יום), לא ביחס לזמן תחילת המפגש — אחרת מעבר שעון קיץ/חורף שחל
  // בדיוק בין שתי הנקודות (פעמיים בשנה) היה מסיט את הסף בשעה.
  // אותה שיטה כמו למטה: מניחים לרגע ש-20:00 מקומי הוא UTC, בודקים
  // מה השעה בישראל ברגע ה-UTC המקביל, וההפרש הוא ה-offset האמיתי.
  const approxUTC = Date.UTC(y, m - 1, d, 20, 0);
  const israelAtApprox = israelParts(new Date(approxUTC));
  const asUTC = Date.UTC(
    Number(israelAtApprox.dateStr.slice(0, 4)),
    Number(israelAtApprox.dateStr.slice(5, 7)) - 1,
    Number(israelAtApprox.dateStr.slice(8, 10)),
    israelAtApprox.hour,
    israelAtApprox.minute,
  );
  const offsetMin = Math.round((asUTC - approxUTC) / 60_000);

  return new Date(Date.UTC(y, m - 1, d, 0, 0) + (20 * 60 - offsetMin) * 60_000);
}

/**
 * המייל שמקבל את התראת "משהו שבור במערכת ה-push" (ראו alertPushBroken
 * למטה) — מקובע בקוד בכוונה: מועדון יחיד, בלי חשבונות-על נוספים,
 * ואין טעם במסך הגדרות רק בשביל זה. אותה כתובת כבר מופיעה ב-actions.ts
 * כאיש קשר טכני.
 */
const OPS_ALERT_EMAIL = "shirshir2001@gmail.com";

/**
 * מתריעה במייל כשמשהו במנגנון ה-push עצמו שבור — לא "המנוי הזה פג",
 * אלא "כל השליחות נכשלות מסיבה אחרת". התראת push על כך שה-push שבור
 * לא הגיונית (זה בדיוק הערוץ שהתקלקל), ולכן מייל, לא push. בלי סף/
 * throttling: הקהילה קטנה כרגע, אז תדירות הקריאות לכאן נמוכה מספיק
 * שזה לא צפוי להציף — אם זה ישתנה, שווה להוסיף.
 */
async function alertPushBroken(detail: string): Promise<void> {
  try {
    await sendEmail(
      OPS_ALERT_EMAIL,
      "התראות Push לא נשלחות בסוואל",
      buildEmailHtml({
        title: "התראות Push לא נשלחות",
        bodyHtml: `<p style="direction:rtl; text-align:right; font-family:'Assistant', -apple-system, 'Segoe UI', Arial, sans-serif; font-size:15px; line-height:1.7; color:#42596e; margin:0 0 12px;">
          ${detail}
        </p>
        <p style="direction:rtl; text-align:right; font-family:'Assistant', -apple-system, 'Segoe UI', Arial, sans-serif; font-size:15px; line-height:1.7; color:#42596e; margin:0;">
          כדאי לבדוק את מפתחות ה-VAPID ומשתני הסביבה בשרת.
        </p>`,
      }),
    );
  } catch (err) {
    console.error("alertPushBroken: failed to send alert email", err);
  }
}

/**
 * הליבה המשותפת של שליחת push לרשימת מנויים: שולחת, מנקה מנויים מתים
 * (404/410), ומתריעה אם כל השליחות נכשלו מסיבה אחרת. משמשת גם את
 * sendPushToProfiles למטה וגם את שני נתיבי ה-cron ב-api/push/send —
 * קודם כל אחד שכפל את הלולאה הזו בעצמו, מה שהשאיר את נתיב ה-cron
 * בלי הלוג ובלי ההתראה שיש כאן.
 */
export async function sendWebPushBatch(
  db: ReturnType<typeof adminDb>,
  subs: { endpoint: string; p256dh: string; auth: string }[],
  payload: PushPayload,
): Promise<{ successCount: number }> {
  const json = JSON.stringify(payload);
  const dead: string[] = [];
  let successCount = 0;
  let hardFailureCount = 0;

  await Promise.all(
    subs.map(async (s) => {
      try {
        await webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          json,
        );
        successCount++;
      } catch (err) {
        const status = (err as { statusCode?: number })?.statusCode;
        if (status === 404 || status === 410) {
          dead.push(s.endpoint);
          return;
        }
        // כל כשל אחר (לא "המנוי הזה כבר לא קיים") היה נבלע בשקט —
        // בלי זה, כשל אמיתי בשליחה (למשל מפתחות שגויים, תקלה זמנית
        // אצל הדפדפן) לא משאיר שום עקבה שאפשר לבדוק אחר כך.
        hardFailureCount++;
        console.error("sendWebPushBatch: send failed", {
          endpoint: s.endpoint,
          status,
          message: (err as { message?: string })?.message,
        });
      }
    }),
  );

  if (dead.length) {
    await db.from("push_subscriptions").delete().in("endpoint", dead);
  }

  // כל השליחות נכשלו, ולא כי המנויים פגי-תוקף (אלה כבר סוננו ל-dead
  // למעלה) — סימן שמשהו במנגנון עצמו שבור, לא רק שאף אחד לא מחובר.
  if (subs.length > 0 && hardFailureCount === subs.length) {
    await alertPushBroken(
      `${hardFailureCount} מתוך ${subs.length} שליחות push נכשלו ברצף (לא בגלל מנוי שפג תוקף).`,
    );
  }

  return { successCount };
}

/**
 * שולחת ל-profile_id-ים נתונים. שקטה אם push לא מוגדר, כדי שקריאה
 * ל-API route-ים החדשים לא תשבור פעולה עיקרית (יצירת מפגש, RSVP וכו')
 * רק כי מישהו עדיין לא הפעיל תזכורות.
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
  if (!subs || subs.length === 0) return;

  await sendWebPushBatch(db, subs, payload);
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
    kind === "evening"
      ? "מחר במים. נתראה שם."
      : "מגיעים? סמנו הגעה ותהיו חלק מהגל.";
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
