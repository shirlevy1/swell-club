import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { byGender } from "@/lib/format";
import { adminDb, getOrganizerIds, sendPushToProfiles } from "@/lib/push-server";

/**
 * נקראת מ-leave-community-button.tsx מיד אחרי leave_community() מוצלחת.
 * מבדילה בין עזיבה עצמית לבין הסרה/דחייה ע"י מנהלת דרך removed_reason —
 * שתי הפעולות האחרות מוכרות למנהלת כי היא זו שיזמה אותן, ולא צריכות
 * התראה על עצמן.
 */
export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const db = adminDb();
  const { data: membership, error: membershipError } = await db
    .from("club_members")
    .select("club_id")
    .eq("profile_id", user.id)
    .eq("status", "removed")
    .eq("removed_reason", "left")
    .maybeSingle();
  if (membershipError) {
    console.error("notify-member-left: membership lookup failed", membershipError);
  }
  if (!membership) return NextResponse.json({ ok: true });

  const { data: profile } = await db
    .from("profiles")
    .select("full_name, gender")
    .eq("id", user.id)
    .maybeSingle();

  const organizerIds = await getOrganizerIds(db, membership.club_id);
  await sendPushToProfiles(organizerIds, {
    title: profile?.full_name ?? "מישהו",
    body: byGender(profile?.gender ?? null, "עזב את הקהילה", "עזבה את הקהילה"),
    tag: `member-left-${user.id}`,
    url: "/admin/removed",
  });

  return NextResponse.json({ ok: true });
}
