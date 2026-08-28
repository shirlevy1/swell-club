import { NextResponse, type NextRequest } from "next/server";
import webpush from "web-push";
import { adminDb, buildReminderPayload } from "@/lib/push-server";

/**
 * שולח תזכורות למפגשים קרובים. נועד להיקרא מתזמן חיצוני (cron) כל 15 דק'.
 *
 * שתי תזכורות לכל מפגש, בעלות היגיון שונה בכוונה:
 *   evening — שעה קבועה בשעון ישראל (20:00), לכל מפגש שקורה למחרת,
 *     לכל חברי הקהילה (גם מי שעוד לא סימן/ה הגעה) — זו הזמנה.
 *   morning — **שעה בדיוק לפני תחילת המפגש עצמו** (לא שעה קבועה), רק
 *     למי שכבר סימן/ה "מגיע/ה" — זו תזכורת לצ'ק־אין, לא הזמנה. נבדק
 *     בכל טיק אילו מפגשים נכנסים לחלון "בעוד שעה" ביחס לרזולוציית
 *     ה-cron (15 דק'), כדי לתפוס גם שעות לא עגולות (מפגש ב-6:45 →
 *     תזכורת ב-5:45), ולא רק שעות עגולות.
 *
 * kind נשאר 'morning' בקוד ובמסד (constraint קיים ב-event_reminders)
 * גם אחרי השינוי הזה — רק המשמעות/הטריגר שלו השתנו, לא הערך עצמו.
 *
 * ניסוח ה-payload עצמו (כותרת יום|שעה|מקום מודגשת, גוף עם משפט קצר
 * קבוע לפי הסוג) מוגדר פעם אחת ב-buildReminderPayload, ומשותף גם
 * ל-preview העצמי ולשידור לחבר/ה נבחר/ת — ראו lib/push-server.ts.
 */

export const dynamic = "force-dynamic";

const TZ = "Asia/Jerusalem";

type Kind = "evening" | "morning";

type EventRow = {
  id: string;
  club_id: string;
  starts_at: string;
  location_name: string;
};

/** שעה/דקה/תאריך מקומיים בישראל, בלי תלות ב-timezone של השרת. */
function israelParts(date: Date) {
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

export async function POST(request: NextRequest) {
  const secret = process.env.PUSH_CRON_SECRET;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const vapidPublic = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const vapidPrivate = process.env.VAPID_PRIVATE_KEY;
  const contact = process.env.VAPID_CONTACT ?? "mailto:swell@example.com";

  if (!secret || !url || !serviceKey || !vapidPublic || !vapidPrivate) {
    return NextResponse.json({ error: "not_configured" }, { status: 503 });
  }
  // השוואה פשוטה מספיקה: הסוד ארוך ואקראי, ואין כאן ערוץ תזמון מעשי
  if (request.headers.get("x-swell-cron") !== secret) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  webpush.setVapidDetails(contact, vapidPublic, vapidPrivate);

  // service_role עוקף RLS — הכרחי כאן, כי אין משתמש מחובר בקריאת cron.
  // המפתח הזה קיים רק בשרת ולעולם לא נשלח לדפדפן.
  const db = adminDb();

  const now = new Date();
  const sent: Record<string, number> = {};

  // ערב לפני — רק בטיק שנופל ב-20:00-20:29 שעון ישראל.
  const { hour: nowHour, minute: nowMinute } = israelParts(now);
  if (nowHour === 20 && nowMinute < 30) {
    const { dateStr: tomorrowStr } = israelParts(
      new Date(now.getTime() + 24 * 3600_000),
    );
    const { data: candidates } = await db
      .from("events")
      .select("id, club_id, starts_at, location_name")
      .gte("starts_at", now.toISOString())
      .lte("starts_at", new Date(now.getTime() + 48 * 3600_000).toISOString());
    const tomorrowEvents = (candidates ?? []).filter(
      (e) => israelParts(new Date(e.starts_at)).dateStr === tomorrowStr,
    );
    for (const event of tomorrowEvents) {
      await sendReminder(db, event, "evening", sent);
    }
  }

  // שעה לפני המפגש — מפגשים שנכנסים עכשיו לחלון "בעוד שעה", ביחס
  // לרזולוציית ה-cron (15 דק'): כל מפגש ש-(שעת ההתחלה שלו - שעה)
  // נופל בין הטיק הקודם לטיק הזה מקבל את התזכורת עכשיו. כך גם מפגש
  // ב-6:45 מקבל תזכורת ב-5:45 בדיוק, לא רק שעות עגולות.
  const REMINDER_LEAD_MS = 60 * 60_000;
  const TICK_MS = 15 * 60_000;
  const { data: soonCandidates } = await db
    .from("events")
    .select("id, club_id, starts_at, location_name")
    .gt(
      "starts_at",
      new Date(now.getTime() + REMINDER_LEAD_MS - TICK_MS).toISOString(),
    )
    .lte("starts_at", new Date(now.getTime() + REMINDER_LEAD_MS).toISOString());
  for (const event of soonCandidates ?? []) {
    await sendReminder(db, event, "morning", sent);
  }

  return NextResponse.json({ ok: true, sent });
}

async function sendReminder(
  db: ReturnType<typeof adminDb>,
  event: EventRow,
  kind: Kind,
  sent: Record<string, number>,
) {
  // ניסיון הוספה קודם: אם השורה כבר קיימת, מישהו כבר שלח. זה מונע
  // כפילות גם אם ה-cron רץ פעמיים במקביל, וגם אם מפגש נכנס לחלון
  // הבטיחות ביותר מטיק אחד.
  const { error: claimError } = await db
    .from("event_reminders")
    .insert({ event_id: event.id, kind });
  if (claimError) return;

  const [{ data: going }, { data: members }] = await Promise.all([
    db
      .from("rsvps")
      .select("profile_id")
      .eq("event_id", event.id)
      .eq("going", true),
    db.from("club_members").select("profile_id").eq("club_id", event.club_id),
  ]);

  // ערב לפני — כולם, גם מי שעוד לא סימן/ה שמגיע/ה (זו הזמנה).
  // בוקר של המפגש — רק מי שכבר סימן/ה, כתזכורת לסמן הגעה בפועל.
  const ids =
    kind === "morning"
      ? (going ?? []).map((r) => r.profile_id)
      : (members ?? []).map((m) => m.profile_id);
  if (ids.length === 0) return;

  const { data: subs } = await db
    .from("push_subscriptions")
    .select("endpoint, p256dh, auth")
    .in("profile_id", ids);

  const payload = JSON.stringify(buildReminderPayload(kind, event));

  const dead: string[] = [];
  await Promise.all(
    (subs ?? []).map(async (s) => {
      try {
        await webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          payload,
        );
        sent[kind] = (sent[kind] ?? 0) + 1;
      } catch (err) {
        // 404/410 = המנוי בוטל בצד הדפדפן. לנקות, אחרת הטבלה
        // מתמלאת ביעדים מתים וכל ריצה מנסה אותם שוב.
        const status = (err as { statusCode?: number })?.statusCode;
        if (status === 404 || status === 410) dead.push(s.endpoint);
      }
    }),
  );

  if (dead.length) {
    await db.from("push_subscriptions").delete().in("endpoint", dead);
  }
}
