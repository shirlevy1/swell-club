import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { byGender } from "@/lib/format";
import { adminDb, getOrganizerIds, sendPushToProfiles } from "@/lib/push-server";

/** נקראת מאלבום המפגש מיד אחרי add_event_photo(), רק כשהתמונה נכנסה ל"ממתין". */
export async function POST(request: Request) {
  const { photo_id } = await request.json().catch(() => ({}));
  if (!photo_id) {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const db = adminDb();
  const { data: photo, error: photoError } = await db
    .from("event_photos")
    .select("status, uploaded_by, events(club_id, title)")
    .eq("id", photo_id)
    .maybeSingle();
  if (photoError) {
    console.error("notify-new-photo: photo lookup failed", photoError);
  }

  // מוודאים שהמתקשר/ת הוא/היא באמת מי שהעלה/תה את התמונה הזו, ושהיא
  // עדיין ממתינה — לא מאפשרים "לעורר" התראה על תמונה של מישהו אחר
  if (!photo || photo.status !== "pending" || photo.uploaded_by !== user.id) {
    return NextResponse.json({ error: "not_found_or_not_pending" }, { status: 404 });
  }

  const event = photo.events as unknown as {
    club_id: string;
    title: string;
  } | null;
  if (!event) return NextResponse.json({ ok: true });

  const { data: uploader } = await db
    .from("profiles")
    .select("full_name, gender")
    .eq("id", user.id)
    .maybeSingle();

  const organizerIds = await getOrganizerIds(db, event.club_id);
  await sendPushToProfiles(organizerIds, {
    title: uploader?.full_name ?? "מישהו",
    body:
      byGender(uploader?.gender ?? null, "העלה תמונה מ", "העלתה תמונה מ") +
      event.title,
    tag: "new-photo-pending",
    url: "/admin",
  });

  return NextResponse.json({ ok: true });
}
