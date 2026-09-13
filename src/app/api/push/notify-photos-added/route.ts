import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { adminDb, sendPushToProfiles } from "@/lib/push-server";

/**
 * נקראת מאלבום המפגש אחרי שהמנהלת מעלה תמונה/ות — פעם אחת בסוף כל
 * סבב העלאה, לא לכל תמונה בנפרד (הקורא סופר כמה תמונות אושרו בבאצ'
 * ושולח את הסכום כאן). נשלחת רק למי שנכח בפועל במפגש הזה.
 */
export async function POST(request: Request) {
  const { event_id, count } = await request.json().catch(() => ({}));
  if (!event_id || !count || count < 1) {
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
    .select("id, club_id, title")
    .eq("id", event_id)
    .maybeSingle();
  if (eventError) {
    console.error("notify-photos-added: event lookup failed", eventError);
  }
  if (!event) return NextResponse.json({ error: "not_found" }, { status: 404 });

  // רק מנהלת של אותה קהילה — הפיצ'ר הזה קיים כי רק תמונות שהמנהלת
  // מעלה נכנסות מאושרות מיד (add_event_photo), ורק על אלה רוצים
  // להודיע למי שנכח. תמונה של חבר/ה רגיל/ה נכנסת "ממתינה" ומטופלת
  // על ידי notify-new-photo (מודיעה למנהלת, לא לנוכחים).
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

  const { data: attendees } = await db
    .from("attendances")
    .select("profile_id")
    .eq("event_id", event.id)
    .neq("profile_id", user.id); // מי שהעלתה את התמונות לא צריכה התראה על עצמה

  await sendPushToProfiles(
    (attendees ?? []).map((a) => a.profile_id),
    {
      title: event.title,
      body:
        count === 1
          ? "עלתה תמונה חדשה. בואו לראות."
          : `עלו ${count} תמונות חדשות. בואו לראות.`,
      // ייחודי לכל סבב העלאה — כדי שכמה סבבים לאותו מפגש (בתוך חלון
      // ה-24 שעות) לא ידרסו זה את זה במגש ההתראות
      tag: `photos-added-${event.id}-${Date.now()}`,
      url: `/events/${event.id}`,
    },
  );

  return NextResponse.json({ ok: true });
}
