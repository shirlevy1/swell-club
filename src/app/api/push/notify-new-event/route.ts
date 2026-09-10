import { NextResponse } from "next/server";
import { formatDayMonth, formatTime, formatWeekdayName } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import {
  adminDb,
  eveningThresholdBefore,
  sendPushToProfiles,
} from "@/lib/push-server";

/** נקראת מטופס יצירת מפגש (admin/events/new) מיד אחרי יצירה מוצלחת. */
export async function POST(request: Request) {
  const { event_id } = await request.json().catch(() => ({}));
  if (!event_id) {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const db = adminDb();
  const { data: event, error: eventError } = await db
    .from("events")
    .select("id, club_id, starts_at, location_name")
    .eq("id", event_id)
    .maybeSingle();
  if (eventError) {
    console.error("notify-new-event: event lookup failed", eventError);
  }
  if (!event) return NextResponse.json({ error: "not_found" }, { status: 404 });

  // רק מנהלת של אותה קהילה יכולה להפעיל את זה — לא כל חבר/ה, כי
  // המסלול הזה שולח לכל הקהילה, ואמור לרוץ רק בעקבות יצירת מפגש
  // אמיתית ע"י מנהלת (admin/events/new), לא בקריאה ישירה מכל אחד/ת
  const { data: membership } = await supabase
    .from("club_members")
    .select("profile_id")
    .eq("club_id", event.club_id)
    .eq("profile_id", user.id)
    .eq("role", "organizer")
    .maybeSingle();
  if (!membership) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const { data: members } = await db
    .from("club_members")
    .select("profile_id")
    .eq("club_id", event.club_id)
    .eq("status", "approved")
    .neq("profile_id", user.id); // מי שיצר/ה את המפגש לא צריך/ה התראה על עצמו/ה

  await sendPushToProfiles(
    (members ?? []).map((m) => m.profile_id),
    {
      title: `${formatWeekdayName(event.starts_at)} | ${formatDayMonth(event.starts_at)} | ${formatTime(event.starts_at)} | ${event.location_name}`,
      body: "יש סוואל. אתם באים?",
      tag: `new-event-${event.id}`,
      url: `/events/${event.id}`,
    },
  );

  // אם חלון תזכורת הערב כבר פתוח ברגע היצירה (מפגש שנוצר לשעות הערב
  // של אותו יום) — ההתראה המיידית שלמעלה כבר משמשת כהזמנה. "תופסים"
  // את kind='evening' מראש כדי ש-api/push/send לא ישלח עוד הזמנה
  // כפולה על אותו מפגש בטיק הבא שלו.
  if (new Date() >= eveningThresholdBefore(event.starts_at)) {
    await db.from("event_reminders").insert({ event_id: event.id, kind: "evening" });
  }

  return NextResponse.json({ ok: true });
}
