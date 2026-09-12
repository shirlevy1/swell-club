import { NextResponse, type NextRequest } from "next/server";
import webpush from "web-push";
import {
  adminDb,
  buildReminderPayload,
  eveningThresholdBefore,
} from "@/lib/push-server";

/**
 * שולח תזכורות למפגשים קרובים. נועד להיקרא מתזמן חיצוני (cron) כל 15 דק'.
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

  return NextResponse.json({ ok: true, sent });
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

  const payload = JSON.stringify(buildReminderPayload(kind, event));

  const dead: string[] = [];
  await Promise.all(
    (subs ?? []).map(async (s) => {
      try {
        await webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          payload,
        );
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
}
