import { NextResponse } from "next/server";
import { demoMode } from "@/lib/config";
import { createClient } from "@/lib/supabase/server";
import {
  adminDb,
  buildReminderPreview,
  sendPushToProfiles,
} from "@/lib/push-server";

/**
 * שידור אמיתי (לא preview עצמי כמו api/push/test) של תזכורת ערב/בוקר
 * לחבר/ת קהילה ספציפי/ת לפי שם — כדי לבדוק איך זה נראה אצל חבר/ה
 * בפועל, לא רק אצל המנהלת. מוגבל למנהלות/י קהילה בלבד: זו התראה
 * אמיתית שיוצאת למישהו אחר, לא תצוגה מקדימה אצל השולח/ת.
 */
export async function POST(request: Request) {
  if (demoMode) {
    return NextResponse.json({ error: "not_configured" }, { status: 503 });
  }

  const { kind, member_name } = await request.json().catch(() => ({}));
  const reminderKind: "evening" | "morning" =
    kind === "morning" ? "morning" : "evening";
  const name = typeof member_name === "string" ? member_name.trim() : "";
  if (!name) {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { data: membership } = await supabase
    .from("club_members")
    .select("club_id, role")
    .eq("profile_id", user.id)
    .eq("status", "approved")
    .maybeSingle();
  if (!membership || membership.role !== "organizer") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const db = adminDb();
  const { data: members, error: membersError } = await db
    .from("club_members")
    .select("profile_id, profiles(full_name)")
    .eq("club_id", membership.club_id)
    .eq("status", "approved");
  if (membersError) {
    console.error("notify-test-member: members lookup failed", membersError);
  }

  const match = (members ?? []).find(
    (m) =>
      (
        m.profiles as unknown as { full_name: string } | null
      )?.full_name?.trim() === name,
  );
  if (!match) {
    return NextResponse.json({ error: "member_not_found" }, { status: 404 });
  }

  const { data: upcoming } = await db
    .from("events")
    .select("title, starts_at, location_name")
    .eq("club_id", membership.club_id)
    .gte("starts_at", new Date().toISOString())
    .order("starts_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  const event = upcoming ?? {
    title: "שחיית בוקר",
    starts_at: new Date(
      Date.now() + (reminderKind === "evening" ? 12 : 1) * 3600_000,
    ).toISOString(),
    location_name: "חוף הצוק הדרומי",
  };

  await sendPushToProfiles(
    [match.profile_id],
    buildReminderPreview(reminderKind, event),
  );

  return NextResponse.json({ ok: true });
}
