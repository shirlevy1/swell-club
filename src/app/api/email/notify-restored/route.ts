import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { adminDb } from "@/lib/push-server";
import { sendEmail, loginUrl, logoUrl } from "@/lib/email-server";

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
    `<div dir="rtl" style="font-family:Arial,sans-serif;">
<div style="text-align:center;margin-bottom:24px;">
  <img src="${logoUrl()}" alt="Swell Club" width="64" height="64" style="border-radius:12px;" />
</div>
<p>שלום ${profile?.full_name ?? ""},</p>
<p>החשבון שלכם ב-Swell Club שוחזר. התחברו לאתר כדי להמשיך — הבקשה
שלכם תעבור עוד פעם קצרה לאישור מנהלת הקהילה, ואז תחזרו לראות הכל
כרגיל.</p>
<p><a href="${loginUrl()}">התחברות ל-Swell Club</a></p>
<p>בגלים,<br>צוות Swell Club</p>
</div>`,
  );

  return NextResponse.json({ ok: true });
}
