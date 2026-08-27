import { NextResponse } from "next/server";
import webpush from "web-push";
import { demoMode } from "@/lib/config";
import { createClient } from "@/lib/supabase/server";
import { buildReminderPreview } from "@/lib/push-server";

/**
 * שולחת תזכורת-דוגמה למי שכבר הפעיל התראות, כדי שיראו איך זה נראה
 * לפני שסומכים על זה שהתזכורות האמיתיות (send/route.ts) יעבדו.
 * מקבלת kind ("evening"/"morning") ובונה payload עם buildReminderPreview,
 * כדי שהדוגמה תשקף את הניסוח האמיתי ולא רק טקסט כללי. אם יש מפגש
 * עתידי אמיתי בקהילה — משתמשת בפרטים שלו (שם/שעה/מקום); אחרת נופלת
 * לדוגמה בדויה.
 *
 * בניגוד ל-send/route.ts (שרץ מ-cron בלי משתמש מחובר, ולכן צריך
 * service_role) — כאן יש session אמיתי, אז מספיק הלקוח הרגיל ו-RLS
 * כבר דואג שכל אחד רואה רק את המנוי של עצמו. שולחת רק למי שקורא/ת
 * לה — לא לשידור אמיתי לחבר/ה אחר/ת, ראו notify-test-member לזה.
 */
export async function POST(request: Request) {
  if (demoMode) {
    return NextResponse.json({ error: "not_configured" }, { status: 503 });
  }

  const { kind } = await request.json().catch(() => ({}));
  const reminderKind: "evening" | "morning" =
    kind === "morning" ? "morning" : "evening";

  const vapidPublic = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const vapidPrivate = process.env.VAPID_PRIVATE_KEY;
  const contact = process.env.VAPID_CONTACT ?? "mailto:swell@example.com";
  if (!vapidPublic || !vapidPrivate) {
    return NextResponse.json({ error: "not_configured" }, { status: 503 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { data: subs } = await supabase
    .from("push_subscriptions")
    .select("endpoint, p256dh, auth")
    .eq("profile_id", user.id);

  if (!subs || subs.length === 0) {
    return NextResponse.json({ error: "no_subscription" }, { status: 404 });
  }

  const { data: membership } = await supabase
    .from("club_members")
    .select("club_id")
    .eq("profile_id", user.id)
    .eq("status", "approved")
    .maybeSingle();

  let event = {
    title: "שחיית בוקר",
    starts_at: new Date(
      Date.now() + (reminderKind === "evening" ? 12 : 1) * 3600_000,
    ).toISOString(),
    location_name: "חוף הצוק הדרומי",
  };

  if (membership) {
    const { data: upcoming } = await supabase
      .from("events")
      .select("title, starts_at, location_name")
      .eq("club_id", membership.club_id)
      .gte("starts_at", new Date().toISOString())
      .order("starts_at", { ascending: true })
      .limit(1)
      .maybeSingle();
    if (upcoming) event = upcoming;
  }

  webpush.setVapidDetails(contact, vapidPublic, vapidPrivate);
  const payload = JSON.stringify(buildReminderPreview(reminderKind, event));

  await Promise.all(
    subs.map((s) =>
      webpush
        .sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          payload,
        )
        .catch(() => {
          // בדיקה חד-פעמית — לא מנקה מנויים מתים כמו send/route.ts,
          // זה תפקיד ה-cron האמיתי
        }),
    ),
  );

  return NextResponse.json({ ok: true });
}
