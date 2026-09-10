import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { formatDateTime } from "@/lib/format";
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
    db
      .from("events")
      .select("club_id, title, starts_at")
      .eq("id", event_id)
      .maybeSingle(),
    db.from("profiles").select("full_name").eq("id", user.id).maybeSingle(),
  ]);
  if (eventError) console.error("notify-rsvp: event lookup failed", eventError);
  if (profileError) {
    console.error("notify-rsvp: profile lookup failed", profileError);
  }
  if (!event || !profile) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  // בלי זה, כל משתמש/ת מחובר/ת (לא רק חברי הקהילה של המפגש הזה) היה/
  // הייתה יכול/ה לקרוא למסלול הזה ישירות עם event_id אמיתי כלשהו, שוב
  // ושוב, ולהציף את המנהלת בהתראות "X מגיע/ה" מזויפות — בלי הגבלת קצב
  // ובלי שום RSVP אמיתי מאחוריהן. שתי הבדיקות דרך ה-client הרגיל (לא
  // adminDb), כי RLS כבר אוכף בדיוק את זה: חברות עצמית ב-club_members,
  // ו-rsvps נעולה לשורה של עצמך. זה נוגע רק להתראה הזו — לא ל-check_in,
  // שממילא לא תלוי ב-rsvp בשום שלב.
  const [{ data: membership }, { data: rsvp }] = await Promise.all([
    supabase
      .from("club_members")
      .select("profile_id")
      .eq("club_id", event.club_id)
      .eq("profile_id", user.id)
      .maybeSingle(),
    supabase
      .from("rsvps")
      .select("going")
      .eq("event_id", event_id)
      .eq("profile_id", user.id)
      .maybeSingle(),
  ]);
  if (!membership || !rsvp?.going) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const organizerIds = (await getOrganizerIds(db, event.club_id)).filter(
    // אם המנהלת עצמה מסמנת הגעה, לא צריך להודיע לה על עצמה
    (id) => id !== user.id,
  );

  // השם בכותרת (מוצג מודגש ע"י הדפדפן/מערכת ההפעלה, לא HTML מאיתנו —
  // התראות דחיפה הן טקסט פשוט בלבד). הפרטים הקטנים יותר בגוף ההודעה.
  await sendPushToProfiles(organizerIds, {
    title: profile.full_name,
    body: `${event.title} · ${formatDateTime(event.starts_at)}`,
    tag: `rsvp-${event_id}-${user.id}`,
    url: `/events/${event_id}`,
  });

  return NextResponse.json({ ok: true });
}
