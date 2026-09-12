import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { adminDb } from "@/lib/push-server";
import { sendEmail, loginUrl, buildEmailHtml } from "@/lib/email-server";

/**
 * נקראת מ-RestoreMemberButton מיד אחרי restore_member() מוצלח. זה
 * המייל היחיד באתר שהוא לא מייל מערכת של Supabase Auth — "שוחזרת"
 * הוא תוכן חופשי שאין לו תבנית מובנית בהתחברות/איפוס סיסמה.
 */
export async function POST(request: Request) {
  const { profile_id } = await request.json().catch(() => ({}));
  if (!profile_id) {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const db = adminDb();

  const { data: target } = await db
    .from("club_members")
    .select("club_id")
    .eq("profile_id", profile_id)
    .maybeSingle();
  if (!target) return NextResponse.json({ error: "not_found" }, { status: 404 });

  // רק מנהלת הקהילה של האדם הזה יכולה לעורר את המייל — לא כל חבר/ה.
  const { data: membership } = await supabase
    .from("club_members")
    .select("profile_id")
    .eq("club_id", target.club_id)
    .eq("profile_id", user.id)
    .eq("role", "organizer")
    .maybeSingle();
  if (!membership) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const [{ data: profile }, { data: authUser, error: authError }] =
    await Promise.all([
      db.from("profiles").select("full_name").eq("id", profile_id).maybeSingle(),
      db.auth.admin.getUserById(profile_id),
    ]);
  const email = authUser?.user?.email;
  if (authError || !email) {
    console.error("notify-restored: auth user lookup failed", authError);
    return NextResponse.json({ ok: true });
  }

  await sendEmail(
    email,
    "החשבון שלכם שוחזר",
    buildEmailHtml({
      title: "החשבון שלכם שוחזר",
      bodyHtml: `<p style="direction:rtl; text-align:right; font-family:'Assistant', -apple-system, 'Segoe UI', Arial, sans-serif; font-size:15px; line-height:1.7; color:#42596e; margin:0 0 12px;">
        שלום ${profile?.full_name ?? ""},
      </p>
      <p style="direction:rtl; text-align:right; font-family:'Assistant', -apple-system, 'Segoe UI', Arial, sans-serif; font-size:15px; line-height:1.7; color:#42596e; margin:0 0 12px;">
        טוב שחזרתם.
      </p>
      <p style="direction:rtl; text-align:right; font-family:'Assistant', -apple-system, 'Segoe UI', Arial, sans-serif; font-size:15px; line-height:1.7; color:#42596e; margin:0 0 24px;">
        התחברו לאתר והגישו שוב בקשה להצטרף לקהילה. מנהלת הקהילה תאשר
        את הבקשה, ואז תחזרו לראות הכל כרגיל.
      </p>`,
      buttonText: "התחברות",
      buttonUrl: loginUrl(),
    }),
  );

  return NextResponse.json({ ok: true });
}
