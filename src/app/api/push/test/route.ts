import { NextResponse } from "next/server";
import webpush from "web-push";
import { demoMode } from "@/lib/config";
import { createClient } from "@/lib/supabase/server";

/**
 * שולחת תזכורת-דוגמה למי שכבר הפעיל התראות, כדי שיראו איך זה נראה
 * לפני שסומכים על זה שהתזכורות האמיתיות (send/route.ts) יעבדו.
 *
 * בניגוד ל-send/route.ts (שרץ מ-cron בלי משתמש מחובר, ולכן צריך
 * service_role) — כאן יש session אמיתי, אז מספיק הלקוח הרגיל ו-RLS
 * כבר דואג שכל אחד רואה רק את המנוי של עצמו.
 */
export async function POST() {
  if (demoMode) {
    return NextResponse.json({ error: "not_configured" }, { status: 503 });
  }

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

  webpush.setVapidDetails(contact, vapidPublic, vapidPrivate);

  const payload = JSON.stringify({
    title: "תזכורת לדוגמה",
    body: "ככה תיראה תזכורת אמיתית — עם שעה, מקום, ומי כבר בדרך למפגש.",
    tag: "swell-test",
    url: "/events",
  });

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
