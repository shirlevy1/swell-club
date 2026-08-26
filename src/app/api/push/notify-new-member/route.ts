import { NextResponse } from "next/server";
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
  const { data: profile } = await db
    .from("profiles")
    .select("full_name")
    .eq("id", profile_id)
    .maybeSingle();
  if (!profile) return NextResponse.json({ ok: true });

  const { data: membership } = await db
    .from("club_members")
    .select("club_id")
    .eq("profile_id", profile_id)
    .eq("status", "pending")
    .maybeSingle();
  // לא ממתין/ה (למשל כבר אושר/ה, או שהיה/ת הראשון/ה בקהילה) — אין למי להודיע
  if (!membership) return NextResponse.json({ ok: true });

  const organizerIds = await getOrganizerIds(db, membership.club_id);
  await sendPushToProfiles(organizerIds, {
    title: "בקשת הצטרפות חדשה",
    body: `${profile.full_name} ביקש/ה להצטרף לקהילה`,
    tag: "new-member-request",
    url: "/admin",
  });

  return NextResponse.json({ ok: true });
}
