import { NextResponse } from "next/server";
import { byGender } from "@/lib/format";
import { adminDb, getOrganizerIds, sendPushToProfiles } from "@/lib/push-server";

/**
 * נקראת מעמוד ההרשמה מיד אחרי signUp() מוצלח. בלי בדיקת session —
 * זה קורה לפני שיש התחברות, ולכן מקבלת profile_id (מזהה אמיתי
 * שהלקוח קיבל הרגע מ-signUp, לא קלט חופשי) ומאמתת הכל מולו בשרת.
 */
export async function POST(request: Request) {
  const { profile_id } = await request.json().catch(() => ({}));
  if (!profile_id) {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }

  const db = adminDb();
  const { data: profile, error: profileError } = await db
    .from("profiles")
    .select("full_name, gender")
    .eq("id", profile_id)
    .maybeSingle();
  if (profileError) {
    console.error("notify-new-member: profile lookup failed", profileError);
  }
  if (!profile) return NextResponse.json({ ok: true });

  const { data: membership, error: membershipError } = await db
    .from("club_members")
    .select("club_id")
    .eq("profile_id", profile_id)
    .eq("status", "pending")
    .maybeSingle();
  if (membershipError) {
    console.error("notify-new-member: membership lookup failed", membershipError);
  }
  // לא ממתין/ה (למשל כבר אושר/ה, או שהיה/ת הראשון/ה בקהילה) — אין למי להודיע
  if (!membership) return NextResponse.json({ ok: true });

  const organizerIds = await getOrganizerIds(db, membership.club_id);
  await sendPushToProfiles(organizerIds, {
    title: profile.full_name,
    body: byGender(profile.gender, "ביקש להצטרף לקהילה", "ביקשה להצטרף לקהילה"),
    // ייחודי לכל מבקש/ת — אחרת בקשה שנייה מוחקת מהמגש את ההתראה על
    // הראשונה, במקום שתישאר בנפרד לצידה (ראו rsvp לאותו דפוס)
    tag: `new-member-${profile_id}`,
    url: "/admin",
  });

  return NextResponse.json({ ok: true });
}
