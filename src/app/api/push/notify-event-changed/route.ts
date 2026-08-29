import { NextResponse } from "next/server";
import { formatDayMonth, formatTime, formatWeekdayName } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import { adminDb, sendPushToProfiles } from "@/lib/push-server";

/**
 * נקראת מטופס עריכת מפגש (edit-event-schedule-form) מיד אחרי שמירה
 * מוצלחת — אבל רק כששעה/תאריך או מיקום השתנו בפועל, לא על כל שמירה
 * (הקורא בודק את זה לפני הקריאה). נשלחת רק למי שכבר סימן/ה "מגיע/ה",
 * כי אלה היחידים שתכננו להגיע לפי הפרטים הישנים.
 */
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
    console.error("notify-event-changed: event lookup failed", eventError);
  }
  if (!event) return NextResponse.json({ error: "not_found" }, { status: 404 });

  // רק חבר/ה באותה קהילה יכול/ה להפעיל את זה — לא כל משתמש מחובר
  const { data: membership } = await supabase
    .from("club_members")
    .select("profile_id")
    .eq("club_id", event.club_id)
    .eq("profile_id", user.id)
    .maybeSingle();
  if (!membership) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const { data: going } = await db
    .from("rsvps")
    .select("profile_id")
    .eq("event_id", event.id)
    .eq("going", true)
    .neq("profile_id", user.id); // מי שערך/ה את המפגש לא צריך/ה התראה על עצמו/ה

  await sendPushToProfiles(
    (going ?? []).map((r) => r.profile_id),
    {
      title: `${formatWeekdayName(event.starts_at)} | ${formatDayMonth(event.starts_at)} | ${formatTime(event.starts_at)} | ${event.location_name}`,
      body: "יש עדכון קטן למפגש. בדקו שעדיין מתאים לכם.",
      tag: `event-changed-${event.id}`,
      url: `/events/${event.id}`,
    },
  );

  return NextResponse.json({ ok: true });
}
