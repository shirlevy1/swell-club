import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";
import webpush from "web-push";
import { formatTime } from "@/lib/format";

/**
 * שולח תזכורות למפגשים קרובים. נועד להיקרא מתזמן חיצוני (cron).
 *
 * שתי תזכורות לכל מפגש:
 *   evening — בערב שלפני, בערך 12 שעות מראש
 *   morning — כשעה לפני ההתחלה
 *
 * הניסוח הוא **כוונת יישום**: מתי, איפה, ומי כבר בדרך. תזכורת גנרית
 * ("יש מפגש מחר") מזיזה הרבה פחות מאשר תוכנית קונקרטית עם נורמה
 * חברתית — מה שאנשים אחרים בקהילה באמת עושים.
 */

export const dynamic = "force-dynamic";

const WINDOWS = {
  evening: { minH: 10, maxH: 14 },
  morning: { minH: 0.5, maxH: 2 },
} as const;

type Kind = keyof typeof WINDOWS;

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
  const db = createClient(url, serviceKey, {
    auth: { persistSession: false },
  });

  const now = Date.now();
  const sent: Record<string, number> = {};

  for (const kind of Object.keys(WINDOWS) as Kind[]) {
    const { minH, maxH } = WINDOWS[kind];
    const from = new Date(now + minH * 3600_000).toISOString();
    const to = new Date(now + maxH * 3600_000).toISOString();

    const { data: events } = await db
      .from("events")
      .select("id, club_id, title, starts_at, location_name")
      .gte("starts_at", from)
      .lte("starts_at", to);

    for (const event of events ?? []) {
      // ניסיון הוספה קודם: אם השורה כבר קיימת, מישהו כבר שלח.
      // זה מונע כפילות גם אם ה-cron רץ פעמיים במקביל.
      const { error: claimError } = await db
        .from("event_reminders")
        .insert({ event_id: event.id, kind });
      if (claimError) continue;

      const [{ data: going }, { data: members }] = await Promise.all([
        db
          .from("rsvps")
          .select("profile_id, profiles(full_name)")
          .eq("event_id", event.id)
          .eq("going", true),
        db
          .from("club_members")
          .select("profile_id")
          .eq("club_id", event.club_id),
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
      if (ids.length === 0) continue;

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
  }

  return NextResponse.json({ ok: true, sent });
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
