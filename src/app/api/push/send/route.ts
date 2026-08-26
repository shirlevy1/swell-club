import { NextResponse, type NextRequest } from "next/server";
import webpush from "web-push";
import { formatTime } from "@/lib/format";
import { adminDb } from "@/lib/push-server";

/**
 * שולח תזכורות למפגשים קרובים. נועד להיקרא מתזמן חיצוני (cron) כל 30 דק'.
 *
 * שתי תזכורות לכל מפגש, בשתי סמנטיקות שונות בכוונה:
 *   evening — שעה קבועה, 20:00 שעון ישראל, לכל מפגש שקורה למחרת. זו
 *             לא תזכורת "יחסית לשעת המפגש" — היא זמן נוח קבוע לבדוק
 *             מה קורה מחר, בלי קשר אם המפגש עצמו ב-6:00 או ב-21:00.
 *   morning — יחסית לשעת המפגש עצמו: כשעה לפניו. יש כאן חלון בטיחות
 *             של 45-75 דק' כדי לא לפספס בין שתי בדיקות ה-cron (כל 30
 *             דק'); בפועל היא תישלח בטיק הקרוב ביותר ל-60 דק' לפני.
 *
 * הניסוח הוא **כוונת יישום**: מתי, איפה, ומי כבר בדרך. תזכורת גנרית
 * ("יש מפגש מחר") מזיזה הרבה פחות מאשר תוכנית קונקרטית עם נורמה
 * חברתית — מה שאנשים אחרים בקהילה באמת עושים.
 */

export const dynamic = "force-dynamic";

const TZ = "Asia/Jerusalem";

type Kind = "evening" | "morning";

type EventRow = {
  id: string;
  club_id: string;
  title: string;
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
      .select("id, club_id, title, starts_at, location_name")
      .gte("starts_at", now.toISOString())
      .lte("starts_at", new Date(now.getTime() + 48 * 3600_000).toISOString());
    const tomorrowEvents = (candidates ?? []).filter(
      (e) => israelParts(new Date(e.starts_at)).dateStr === tomorrowStr,
    );
    for (const event of tomorrowEvents) {
      await sendReminder(db, event, "evening", sent);
    }
  }

  // בוקר המפגש — כשעה לפני, עם חלון בטיחות שתופס כל מפגש בין שני
  // טיקים גם אם שעת ההתחלה לא נופלת בול על :00/:30.
  const { data: morningCandidates } = await db
    .from("events")
    .select("id, club_id, title, starts_at, location_name")
    .gte("starts_at", new Date(now.getTime() + 45 * 60_000).toISOString())
    .lte("starts_at", new Date(now.getTime() + 75 * 60_000).toISOString());
  for (const event of morningCandidates ?? []) {
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
      .select("profile_id, profiles(full_name)")
      .eq("event_id", event.id)
      .eq("going", true),
    db.from("club_members").select("profile_id").eq("club_id", event.club_id),
  ]);

  const goingRows = (going ?? []) as unknown as {
    profile_id: string;
    profiles: { full_name: string } | null;
  }[];
  const names = goingRows
    .map((r) => r.profiles?.full_name)
    .filter(Boolean) as string[];

  const body = reminderBody(kind, event, names);
  // ערב לפני — כולם, גם מי שעוד לא סימן/ה שמגיע/ה (זו הזמנה).
  // בוקר של המפגש — רק מי שכבר סימן/ה, כתזכורת לסמן הגעה בפועל.
  const ids =
    kind === "morning"
      ? goingRows.map((r) => r.profile_id)
      : (members ?? []).map((m) => m.profile_id);
  if (ids.length === 0) return;

  const { data: subs } = await db
    .from("push_subscriptions")
    .select("endpoint, p256dh, auth")
    .in("profile_id", ids);

  const payload = JSON.stringify({
    title: event.title,
    body,
    tag: `event-${event.id}`,
    url: `/events/${event.id}`,
  });

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

function reminderBody(
  kind: Kind,
  event: { starts_at: string; location_name: string },
  names: string[],
): string {
  const when =
    kind === "evening"
      ? `מחר ${formatTime(event.starts_at)}`
      : `היום ${formatTime(event.starts_at)}`;
  const where = event.location_name;

  // נורמה תיאורית: שמות אמיתיים של אנשים שכבר סימנו, לא מספר יבש.
  // "בדרך" ולא "סימן/סימנה" — כל פועל כאן מניח מגדר של אדם אחר.
  let who = "";
  if (names.length === 1) who = ` ${names[0]} בדרך.`;
  else if (names.length === 2) who = ` ${names[0]} ו${names[1]} בדרך.`;
  else if (names.length > 2)
    who = ` ${names[0]}, ${names[1]} ועוד ${names.length - 2} בדרך.`;

  // בבוקר המפגש התזכורת יוצאת רק למי שכבר סימן/ה שמגיע/ה, ולכן
  // מזכירה במפורש לסמן הגעה בפועל במקום — לא רק מתי ואיפה.
  if (kind === "morning") {
    return `${when}, ${where}.${who} אל תשכחו לסמן הגעה כשתגיעו.`;
  }

  return `${when}, ${where}.${who}`;
}
