import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { byGender } from "@/lib/format";
import { adminDb, getOrganizerIds, sendPushToProfiles } from "@/lib/push-server";

/**
 * נקראת מאלבום המפגש אחרי סבב העלאה של חבר/ה רגיל/ה (לא מנהלת) —
 * פעם אחת בסוף כל הסבב, לא לכל תמונה בנפרד (הקורא סופר כמה תמונות
 * נכנסו "ממתינות" בבאצ' ושולח את הסכום כאן). אותו דפוס בדיוק כמו
 * notify-photos-added, רק שהיעד כאן הוא המנהלת, לא שאר הנוכחים.
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
    console.error("notify-new-photo: event lookup failed", eventError);
  }
  if (!event) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const { data: uploader } = await db
    .from("profiles")
    .select("full_name, gender")
    .eq("id", user.id)
    .maybeSingle();

  const organizerIds = await getOrganizerIds(db, event.club_id);
  await sendPushToProfiles(organizerIds, {
    title: uploader?.full_name ?? "מישהו",
    body:
      count === 1
        ? byGender(uploader?.gender ?? null, "העלה תמונה מ", "העלתה תמונה מ") +
          event.title
        : byGender(
            uploader?.gender ?? null,
            `העלה ${count} תמונות מ`,
            `העלתה ${count} תמונות מ`,
          ) + event.title,
    // ייחודי לכל סבב העלאה — כדי שכמה סבבים לאותו מפגש לא ידרסו זה
    // את זה במגש ההתראות (אותו דפוס כמו notify-photos-added)
    tag: `new-photo-${event_id}-${user.id}-${Date.now()}`,
    url: "/admin",
  });

  return NextResponse.json({ ok: true });
}
