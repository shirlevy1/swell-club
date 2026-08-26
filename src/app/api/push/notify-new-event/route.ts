import { NextResponse } from "next/server";
import { formatDateTime } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import { adminDb, sendPushToProfiles } from "@/lib/push-server";

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
    .select("id, club_id, title, starts_at, location_name")
    .eq("id", event_id)
    .maybeSingle();
  if (eventError) {
    console.error("notify-new-event: event lookup failed", eventError);
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

  const { data: members } = await db
    .from("club_members")
    .select("profile_id")
    .eq("club_id", event.club_id)
    .eq("status", "approved")
    .neq("profile_id", user.id); // מי שיצר/ה את המפגש לא צריך/ה התראה על עצמו/ה

  await sendPushToProfiles(
    (members ?? []).map((m) => m.profile_id),
    {
      title: "מפגש חדש של Swell Club",
      body: `${event.title} · ${formatDateTime(event.starts_at)} · ${event.location_name}`,
      tag: `new-event-${event.id}`,
      url: `/events/${event.id}`,
    },
  );

  return NextResponse.json({ ok: true });
}
