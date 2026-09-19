import { NextResponse, type NextRequest } from "next/server";
import webpush from "web-push";
import {
  adminDb,
  buildReminderPayload,
  eveningThresholdBefore,
} from "@/lib/push-server";

/**
 * שולח תזכורות למפגשים קרובים. נועד להיקרא מתזמן חיצוני (cron) כל שעתיים.
 *
 * שתי תזכורות לכל מפגש, בעלות היגיון שונה בכוונה:
 *   evening — לכל מפגש שקורה למחרת, לכל חברי הקהילה (גם מי שעוד לא
 *     סימן/ה הגעה) — זו הזמנה.
 *   morning — קרוב לתחילת המפגש עצמו, רק למי שכבר סימן/ה "מגיע/ה" —
 *     זו תזכורת לצ'ק־אין, לא הזמנה.
 *
 * ⚠️ שתי התזכורות בנויות כ"חלון פתוח, לא טיק מדויק": במקום לבדוק
 * "האם אנחנו בדיוק עכשיו ברגע הנכון" (ואם הטיק הזה בדיוק מדולג —
 * התזכורת אבודה לצמיתות, כי אף טיק מאוחר יותר לא "זוכר" לבדוק שוב),
 * כל טיק בודק "האם המפגש הזה כבר נכנס לחלון שלו, ועדיין לא נשלחה לו
 * תזכורת" — כך שגם אם GitHub Actions מדלג טיקים או רץ בפערים לא
 * סדירים (זה קורה בפועל, לא רק תיאורטית — ראו נספח 60 הימים למטה),
 * הטיק הבא שכן רץ עדיין תופס ושולח, במקום לפספס לצמיתות.
 * event_reminders (insert-first) עדיין מונע כפילות בדיוק כמו קודם.
 *
 * evening: מהרגע שהשעון בישראל עובר 20:00 בערב שלפני המפגש, ועד
 *   שהמפגש מתחיל — כל טיק בטווח הזה תופס ושולח אם עוד לא נשלח.
 * morning: משלוש שעות לפני תחילת המפגש ועד תחילתו — טווח רחב בכוונה,
 *   כדי לספוג פערים של שעות בין טיקים בפועל. "בערך שעה לפני", לא
 *   בדיוק שעה — זה תואם למה שהוסכם: עדיף תזכורת שמגיעה, גם אם לא
 *   בדיוק בזמן, על פני תזכורת שלא מגיעה בכלל.
 *
 * kind נשאר 'morning' בקוד ובמסד (constraint קיים ב-event_reminders)
 * גם אחרי השינוי הזה — רק המשמעות/הטריגר שלו השתנו, לא הערך עצמו.
 *
 * מפגש שנוצר **אחרי** שהחלון של תזכורת הערב שלו כבר נפתח (למשל מפגש
 * שנוצר באותו יום לשעות הערב) לא מקבל תזכורת ערב כפולה: notify-new-
 * event כבר "תופס" מראש את ה-kind='evening' ב-event_reminders באותו
 * מקרה, כי ההתראה המיידית על יצירת המפגש כבר משמשת כהזמנה. ראו שם.
 *
 * ניסוח ה-payload עצמו (כותרת יום|שעה|מקום מודגשת, גוף עם משפט קצר
 * קבוע לפי הסוג) מוגדר פעם אחת ב-buildReminderPayload, ומשותף גם
 * ל-preview העצמי ולשידור לחבר/ה נבחר/ת — ראו lib/push-server.ts.
 *
 * kind שלישי — photos_ready: "יש כבר תמונות לראות מהיום", למי שנכח
 * בפועל במפגש (לא רק למי שהעלה תמונה — זו נפרדת לגמרי מ-notify-photo-
 * approved ומ-notify-photos-added, ולא מחליפה אותן). נשלחת פעם אחת
 * בלבד לכל מפגש: מ-3 שעות אחרי תחילתו, כל טיק בודק אם כבר יש לפחות
 * תמונה מאושרת אחת באלבום — ברגע שכן, שולחים ומפסיקים לבדוק. אם עברו
 * 13 שעות ועדיין אין אף תמונה, מוותרים לצמיתות על המפגש הזה (חלון
 * הזמן של הבדיקה עצמה כבר לא כולל אותו יותר בטיקים הבאים).
 */

export const dynamic = "force-dynamic";

type Kind = "evening" | "morning";

type EventRow = {
  id: string;
  club_id: string;
  starts_at: string;
  location_name: string;
};

export async function POST(request: NextRequest) {
  const secret = process.env.PUSH_CRON_SECRET;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const vapidPublic = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const vapidPrivate = process.env.VAPID_PRIVATE_KEY;
  const contact = process.env.VAPID_CONTACT ?? "mailto:swell@example.com";

  if (!secret || !url || !serviceKey || !vapidPublic || !vapidPrivate) {
    return NextResponse.json({ error: "not_configured" }, { status: 503 });
  }
  // השוואה פשוטה מספיקה: הסוד ארוך ואקראי, ואין כאן ערוץ תזמון מעשי
  if (request.headers.get("x-swell-cron") !== secret) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  webpush.setVapidDetails(contact, vapidPublic, vapidPrivate);

  // service_role עוקף RLS — הכרחי כאן, כי אין משתמש מחובר בקריאת cron.
  // המפתח הזה קיים רק בשרת ולעולם לא נשלח לדפדפן.
  const db = adminDb();

  const now = new Date();
  const sent: Record<string, number> = {};

  // ערב לפני — לכל מפגש בטווח, בודקים בנפרד (per-event, לא לפי שעה
  // גלובלית של "עכשיו") האם כבר עברנו את ה-20:00 בישראל של הערב שלפניו.
  // כך זה נכון גם לטיק שרץ אחרי חצות (למשל 01:00) בעקבות טיק שדולג
  // בערך ב-20:00 — "עכשיו >= סף" נשאר אמת גם הרבה אחרי שהסף עבר,
  // בניגוד לבדיקת "שעה נוכחית === 20" שהייתה מפספסת טיקים כאלה.
  const { data: eveningCandidates } = await db
    .from("events")
    .select("id, club_id, starts_at, location_name")
    .gt("starts_at", now.toISOString())
    .lte("starts_at", new Date(now.getTime() + 30 * 3600_000).toISOString());
  for (const event of eveningCandidates ?? []) {
    if (now >= eveningThresholdBefore(event.starts_at)) {
      await sendReminder(db, event, "evening", sent);
    }
  }

  // "בערך שעה לפני" המפגש — בפועל חלון רחב, 3 שעות לפני ועד תחילתו,
  // כדי לספוג פערים בין טיקים בפועל. ראו ההערה למעלה: עדיפה תזכורת
  // שמגיעה קצת לא בדיוק בזמן, על פני תזכורת שלא מגיעה בכלל.
  const REMINDER_WINDOW_MS = 3 * 3600_000;
  const { data: soonCandidates } = await db
    .from("events")
    .select("id, club_id, starts_at, location_name")
    .gt("starts_at", now.toISOString())
    .lte("starts_at", new Date(now.getTime() + REMINDER_WINDOW_MS).toISOString());
  for (const event of soonCandidates ?? []) {
    await sendReminder(db, event, "morning", sent);
  }

  // "תמונות מהיום מוכנות" — ראו הערה למעלה: חלון פתוח בין 3 ל-13 שעות
  // אחרי תחילת המפגש, לא סף מדויק.
  const PHOTOS_READY_MIN_DELAY_MS = 3 * 3600_000;
  const PHOTOS_READY_MAX_DELAY_MS = 13 * 3600_000;
  const { data: photosReadyCandidates } = await db
    .from("events")
    .select("id")
    .gte("starts_at", new Date(now.getTime() - PHOTOS_READY_MAX_DELAY_MS).toISOString())
    .lte("starts_at", new Date(now.getTime() - PHOTOS_READY_MIN_DELAY_MS).toISOString());
  for (const event of photosReadyCandidates ?? []) {
    await sendPhotosReadyReminder(db, event.id, sent);
  }

  return NextResponse.json({ ok: true, sent });
}

async function sendPhotosReadyReminder(
  db: ReturnType<typeof adminDb>,
  eventId: string,
  sent: Record<string, number>,
) {
  // כבר נשלחה למפגש הזה בעבר — אין מה לבדוק שוב.
  const { data: existing } = await db
    .from("event_reminders")
    .select("event_id")
    .eq("event_id", eventId)
    .eq("kind", "photos_ready")
    .maybeSingle();
  if (existing) return;

  const { count } = await db
    .from("event_photos")
    .select("id", { count: "exact", head: true })
    .eq("event_id", eventId)
    .eq("status", "approved");
  // עדיין אין אף תמונה מאושרת — לא תופסים כלום, מנסים שוב בטיק הבא.
  if (!count || count < 1) return;

  // ניסיון תפיסה: אם השורה כבר קיימת (טיק מקביל שהספיק קודם), מישהו
  // כבר שלח. אותו דפוס בדיוק כמו sendReminder למעלה.
  const { error: claimError } = await db
    .from("event_reminders")
    .insert({ event_id: eventId, kind: "photos_ready" });
  if (claimError) return;

  try {
    const { data: attendees } = await db
      .from("attendances")
      .select("profile_id")
      .eq("event_id", eventId);
    const ids = (attendees ?? []).map((a) => a.profile_id);
    if (ids.length === 0) return;

    const { data: subs } = await db
      .from("push_subscriptions")
      .select("endpoint, p256dh, auth")
      .in("profile_id", ids);
    if (!subs || subs.length === 0) return;

    const payload = JSON.stringify({
      title: "הרגעים מסוואל מוכנים",
      body: "התמונות מהבוקר מחכות לכם באפליקציה.",
      tag: `photos-ready-${eventId}`,
      url: `/events/${eventId}`,
    });

    const dead: string[] = [];
    let successCount = 0;
    await Promise.all(
      subs.map(async (s) => {
        try {
          await webpush.sendNotification(
            { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
            payload,
          );
          successCount++;
          sent.photos_ready = (sent.photos_ready ?? 0) + 1;
        } catch (err) {
          const status = (err as { statusCode?: number })?.statusCode;
          if (status === 404 || status === 410) dead.push(s.endpoint);
        }
      }),
    );

    if (dead.length) {
      await db.from("push_subscriptions").delete().in("endpoint", dead);
    }

    // אף שליחה לא הצליחה בפועל — לא משאירים את התפיסה נעולה, כדי שטיק
    // מאוחר יותר עדיין ינסה (למשל אחרי שמישהו יחדש הרשאת התראות).
    if (successCount === 0) {
      await db
        .from("event_reminders")
        .delete()
        .eq("event_id", eventId)
        .eq("kind", "photos_ready");
    }
  } catch {
    await db
      .from("event_reminders")
      .delete()
      .eq("event_id", eventId)
      .eq("kind", "photos_ready");
  }
}

async function sendReminder(
  db: ReturnType<typeof adminDb>,
  event: EventRow,
  kind: Kind,
  sent: Record<string, number>,
) {
  // ניסיון הוספה קודם: אם השורה כבר קיימת, מישהו כבר שלח. זה מונע
  // כפילות גם אם ה-cron רץ פעמיים במקביל, וגם אם מפגש נכנס לחלון
  // הבטיחות ביותר מטיק אחד.
  const { error: claimError } = await db
    .from("event_reminders")
    .insert({ event_id: event.id, kind });
  if (claimError) return;

  // התפיסה למעלה כבר קרתה — אם משהו כאן נכשל (או שכל השליחות
  // נכשלו), משחררים אותה בסוף כדי שהטיק הבא ינסה שוב, במקום לאבד
  // את התזכורת לצמיתות בשקט.
  try {
    const [{ data: going }, { data: members }] = await Promise.all([
      db
        .from("rsvps")
        .select("profile_id")
        .eq("event_id", event.id)
        .eq("going", true),
      db
        .from("club_members")
        .select("profile_id")
        .eq("club_id", event.club_id)
        .eq("status", "approved"),
    ]);

    // ערב לפני — כולם, גם מי שעוד לא סימן/ה שמגיע/ה (זו הזמנה).
    // בוקר של המפגש — רק מי שכבר סימן/ה, כתזכורת לסמן הגעה בפועל.
    const ids =
      kind === "morning"
        ? (going ?? []).map((r) => r.profile_id)
        : (members ?? []).map((m) => m.profile_id);
    if (ids.length === 0) return;

    const { data: subs } = await db
      .from("push_subscriptions")
      .select("endpoint, p256dh, auth")
      .in("profile_id", ids);
    if (!subs || subs.length === 0) return;

    const payload = JSON.stringify(buildReminderPayload(kind, event));

    const dead: string[] = [];
    let successCount = 0;
    await Promise.all(
      subs.map(async (s) => {
        try {
          await webpush.sendNotification(
            { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
            payload,
          );
          successCount++;
          sent[kind] = (sent[kind] ?? 0) + 1;
        } catch (err) {
          // 404/410 = המנוי בוטל בצד הדפדפן. לנקות, אחרת הטבלה
          // מתמלאת ביעדים מתים וכל ריצה מנסה אותם שוב.
          const status = (err as { statusCode?: number })?.statusCode;
          if (status === 404 || status === 410) dead.push(s.endpoint);
        }
      }),
    );

    if (dead.length) {
      await db.from("push_subscriptions").delete().in("endpoint", dead);
    }

    // היו מכשירים לשלוח אליהם, אבל אף שליחה לא הצליחה — לא באמת
    // "נשלחה תזכורת", אז לא משאירים את התפיסה נעולה.
    if (successCount === 0) {
      await db
        .from("event_reminders")
        .delete()
        .eq("event_id", event.id)
        .eq("kind", kind);
    }
  } catch {
    await db
      .from("event_reminders")
      .delete()
      .eq("event_id", event.id)
      .eq("kind", kind);
  }
}
