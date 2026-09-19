import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { adminDb, sendPushToProfiles } from "@/lib/push-server";

/**
 * נקראת אחרי שמנהלת מאשרת תמונה/ות ממתינות (event-photo-album.tsx
 * ו-pending-photo-group.tsx, גם אישור בודד וגם "אישור הכל"). מי
 * שהעלה/תה מקבל/ת התראה אחת בלבד לכל סבב אישור — לא אחת לכל תמונה —
 * באותו דפוס בדיוק כמו notify-photos-added.
 */
export async function POST(request: Request) {
  const { photo_ids } = await request.json().catch(() => ({}));
  if (!Array.isArray(photo_ids) || photo_ids.length === 0) {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const db = adminDb();
  const { data: photos, error } = await db
    .from("event_photos")
    .select("event_id, uploaded_by, status, events(club_id)")
    .in("id", photo_ids);
  if (error) {
    console.error("notify-photo-approved: photo lookup failed", error);
  }
  if (!photos || photos.length === 0) return NextResponse.json({ ok: true });

  const event = photos[0].events as unknown as { club_id: string } | null;
  if (!event) return NextResponse.json({ ok: true });

  // רק מנהלת של אותה קהילה — אותה בדיקה בדיוק כמו notify-photos-added,
  // כי גם כאן שולחים לכל מי שהעלה/תה, לא רק לקורא/ת עצמו/ה.
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

  // סופרים לפי מעלה/ה: כל אחד/ת מקבל/ת התראה אחת עם המספר האמיתי
  // שלו/ה, גם אם photo_ids כלל תמונות של כמה אנשים בבת אחת.
  const byUploader = new Map<string, { count: number; eventId: string }>();
  for (const p of photos) {
    if (p.status !== "approved" || p.uploaded_by === user.id) continue;
    const entry = byUploader.get(p.uploaded_by);
    if (entry) entry.count += 1;
    else byUploader.set(p.uploaded_by, { count: 1, eventId: p.event_id });
  }

  await Promise.all(
    [...byUploader.entries()].map(([uploaderId, { count, eventId }]) =>
      sendPushToProfiles([uploaderId], {
        title: count === 1 ? "התמונה עלתה" : "התמונות עלו",
        body:
          count === 1
            ? "התמונה שהעלית פורסמה בהצלחה"
            : "התמונות שהעלית פורסמו בהצלחה",
        tag: `photo-approved-${uploaderId}-${Date.now()}`,
        url: `/events/${eventId}`,
      }),
    ),
  );

  return NextResponse.json({ ok: true });
}
