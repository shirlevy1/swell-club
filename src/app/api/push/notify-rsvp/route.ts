import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { adminDb, getOrganizerIds, sendPushToProfiles } from "@/lib/push-server";

/**
 * נקראת מכפתור ה-RSVP רק כשמסמנים "מגיע/ה" (לא כשמבטלים). בכוונה על
 * כל אדם שמסמן — לא רק הראשון, ולא סיכום — כך התבקש.
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
  const [
    { data: event, error: eventError },
    { data: profile, error: profileError },
  ] = await Promise.all([
    db.from("events").select("club_id, title").eq("id", event_id).maybeSingle(),
    db.from("profiles").select("full_name, gender").eq("id", user.id).maybeSingle(),
  ]);
  if (eventError) console.error("notify-rsvp: event lookup failed", eventError);
  if (profileError) {
    console.error("notify-rsvp: profile lookup failed", profileError);
  }
  if (!event || !profile) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const organizerIds = (await getOrganizerIds(db, event.club_id)).filter(
    // אם המנהלת עצמה מסמנת הגעה, לא צריך להודיע לה על עצמה
    (id) => id !== user.id,
  );

  const verb = profile.gender === "female" ? "סימנה" : "סימן";
  await sendPushToProfiles(organizerIds, {
    title: "מישהו/י בדרך",
    body: `${profile.full_name} ${verb} שמגיע/ה ל${event.title}`,
    tag: `rsvp-${event_id}-${user.id}`,
    url: `/events/${event_id}`,
  });

  return NextResponse.json({ ok: true });
}
