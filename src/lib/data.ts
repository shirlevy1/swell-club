import { cache } from "react";
import { headers } from "next/headers";
import { createClient } from "./supabase/server";
import { adminDb } from "./push-server";
import { demoMode, TRUSTED_USER_ID_HEADER } from "./config";
import {
  ageInYears,
  byGender,
  formatDate,
  formatDateTimeNumeric,
  formatDayMonth,
  formatPhone,
  formatTime,
  formatWeekdayName,
  genderLabel,
  normalizeInstagram,
} from "./format";
import { checkInWindow } from "./checkin";
import { swimLevelLabel } from "./swim-level";
import type {
  Attendance,
  Club,
  Gender,
  MemberRole,
  MemberStatus,
  Profile,
  SwellEvent,
  SwimLevel,
} from "./types";
import * as demo from "./demo/store";

const SELFIE_TTL = 60 * 60;

/**
 * מטמון קישורים חתומים בזיכרון התהליך. לא מובטח אמין: Vercel הוא
 * serverless, אז בקשה הבאה עשויה לרוץ על instance אחר בלי הזיכרון
 * הזה — ואז פשוט נופלים ל-fallback הרגיל של יצירת קישור חדש, כמו
 * שהיה קודם. אין חיסרון, רק סיכוי לחסוך הורדה חוזרת של אותה תמונה
 * כשהבקשה כן נופלת על instance חם שכבר יצר לה קישור. שולי הביטחון
 * (SAFETY_MARGIN) מוודא שלא מגישים קישור שעומד לפוג תוך כדי שהדפדפן
 * עדיין טוען אותו.
 */
const signedUrlCache = new Map<string, { url: string; expiresAt: number }>();
const SIGNED_URL_SAFETY_MARGIN_MS = 5 * 60 * 1000;

async function createSignedUrlsCached(
  supabase: Awaited<ReturnType<typeof createClient>>,
  bucket: "selfies" | "event-photos",
  paths: string[],
): Promise<Map<string, string>> {
  const now = Date.now();
  const result = new Map<string, string>();
  const missing: string[] = [];

  // סלפי יכול להתחלף באותו נתיב בדיוק (עריכת סלפי, צ'ק-אין חוזר עם
  // upsert) — קישור חתום שכבר נשמר במטמון מצביע על הנתיב הנכון, אבל
  // לא "יודע" שהקובץ מתחתיו הוחלף, ויכול להמשיך ולשרת את אותו קישור
  // (ולכן את מה שכבר נטען ממנו בדפדפן) עד דקות ארוכות אחרי שהתמונה
  // בפועל כבר התחלפה. לתמונות מפגש (event-photos) זה בטוח כרגיל —
  // נתיב חדש לכל העלאה, אף פעם לא מוחלף באותו נתיב.
  const cacheable = bucket !== "selfies";

  for (const path of paths) {
    const cached = cacheable ? signedUrlCache.get(`${bucket}/${path}`) : undefined;
    if (cached && cached.expiresAt > now) {
      result.set(path, cached.url);
    } else {
      missing.push(path);
    }
  }

  if (missing.length > 0) {
    const { data: signed } = await supabase.storage
      .from(bucket)
      .createSignedUrls(missing, SELFIE_TTL);
    const expiresAt = now + SELFIE_TTL * 1000 - SIGNED_URL_SAFETY_MARGIN_MS;
    for (const s of signed ?? []) {
      if (!s.error && s.signedUrl && s.path) {
        result.set(s.path, s.signedUrl);
        if (cacheable) {
          signedUrlCache.set(`${bucket}/${s.path}`, { url: s.signedUrl, expiresAt });
        }
      }
    }
  }

  return result;
}

export type Viewer = {
  userId: string;
  profile: Profile | null;
  club: Club | null;
  role: MemberRole | null;
  status: MemberStatus | null;
  joinedAt: string | null;
};

/**
 * עד שלושה ניסיונות חוזרים (ארבעה סה"כ) לשאילתה שנכשלה — למשל טלפון
 * שהתעורר משינה ועדיין מתחבר מחדש לרשת, או instance קר של Vercel.
 * בלי זה, כל כשל תקשורת רגעי ב-getViewer() נראה זהה ל"אין חברות
 * בקהילה" (maybeSingle מחזירה data:null גם על הצלחה אמיתית עם 0
 * שורות וגם על שגיאת רשת), ואז נכנס/ת שרואה בטעות את מסך "כבר לא
 * חלק מהקהילה" — כולל מנהלת.
 *
 * ⚠️ שני ניסיונות חוזרים (חלון כולל של פחות מחצי שנייה) לא הספיקו
 * בפועל: שיר דיווחה על המסך הזה שוב אחרי שזה כבר "תוקן" פעם אחת,
 * וזה "תיקן את עצמו" אחרי כמה שניות, לא אחרי חצי שנייה — כלומר
 * ההפרעה בפועל נמשכת לפעמים יותר מהחלון הקודם. עכשיו החלון הכולל
 * ארוך משמעותית (עד כ-1.8 שניות) — בטוח להוסיף, כי זו בדיקה שממילא
 * קורית ברקע, וההשהיה כמעט לעולם לא תורגש (רק כשיש באמת הפרעה, שזה
 * בדיוק המקרה שרוצים לתפוס).
 */
async function withRetry<T extends { error: unknown }>(
  run: () => PromiseLike<T>,
): Promise<T> {
  let last = await run();
  for (let attempt = 0; attempt < 3 && last.error; attempt++) {
    await new Promise((resolve) => setTimeout(resolve, 300 * (attempt + 1)));
    last = await run();
  }
  return last;
}

/** הזהות של מי שמסתכל. כל עמוד ב-(app) מתחיל מכאן. */
/**
 * עטופה ב-React cache(): נקראת פעמיים בכל טעינת עמוד מוגן - פעם
 * אחת ב-(app)/layout.tsx (המעטפת המשותפת), ושוב בכל page.tsx בנפרד
 * (צריך את ה-viewer שוב, לא תמיד אפשר להעביר אותו כ-prop דרך
 * layout). בלי cache(), זו הייתה ממש שאילתה כפולה זהה למסד - פעמיים
 * אותן שתי שאילתות (profiles + club_members) ברצף, בכל טעינת עמוד
 * יחידה, לכל משתמש/ת - זו ה"שאלה" הכי נפוצה באתר. cache() ממדל
 * Request-level (לא Next.js, אלא ה-React המובנה) שומר כאן את
 * ה-promise שכבר הוחזר לקריאה הראשונה, ומחזיר אותו שוב לקריאה
 * השנייה באותה בקשה - בלי לגעת באף אחד מהמקומות שקוראים לפונקציה.
 *
 * ⚠️ בדיוק בגלל זה: בתוך server action אחת (או כל קוד אחר שרץ
 * באותה בקשה), אסור לקרוא ל-getViewer(), לשנות נתון של אותו/ה
 * viewer (role/status וכו'), ואז לקרוא ל-getViewer() שוב ולצפות
 * לתוצאה המעודכנת - הקריאה השנייה תחזיר את הערך הישן מהקאש, לא
 * ישאל את המסד מחדש. אם צריך את הערך אחרי שינוי כזה, להשתמש ישירות
 * בערך החדש שכבר ידוע (זה שכתבתם/ן למסד), לא לקרוא לפונקציה שוב.
 * נכון לעכשיו שום קוד קיים לא עושה את זה (נבדק: כל 20 מקומות
 * הקריאה, כולל lib/actions.ts ו-lib/demo/actions.ts) - זו רק אזהרה
 * לקוד עתידי.
 */
export const getViewer = cache(async (): Promise<Viewer | null> => {
  if (demoMode) {
    // אחרי leaveCommunityAction() בהדגמה: בדיוק כמו club_members שנמחקה
    // באמת — בלי מועדון, בלי תפקיד, ומסך "כבר לא חלק מהקהילה" בשלד.
    if (demo.demoMeRemoved()) {
      return {
        userId: demo.demoMeId,
        profile: demo.demoMe(),
        club: null,
        role: null,
        status: null,
        joinedAt: null,
      };
    }
    return {
      userId: demo.demoMeId,
      profile: demo.demoMe(),
      club: demo.demoClub,
      // ניתן להחלפה במסך הפרופיל — כך ההדגמה מראה גם את צד המנהלת
      // וגם את צד החבר הרגיל, ולא רק אחד מהם.
      role: demo.demoMyRole(),
      // בהדגמה אין מסך "ממתין לאישור" — הכל תמיד מאושר.
      status: "approved",
      joinedAt: null,
    };
  }

  const supabase = await createClient();

  // proxy.ts (middleware.ts) כבר אימת "מי זה" מול Supabase ברגע הזה
  // בדיוק, ומרענן טוקן כשצריך — בלי ה-header הזה כל טעינת עמוד הייתה
  // שואלת את אותה שאלה פעם שנייה, נסיעת רשת מיותרת בכל בקשה. ה-header
  // תמיד נכתב מחדש שם, ולא ניתן לזיוף מהדפדפן (וגם אם הוא היה שגוי
  // בטעות, השאילתות למטה עדיין מוגנות בנפרד ע"י RLS לפי ה-JWT האמיתי
  // בעוגייה, לא לפי המחרוזת הזו) — נופלים חזרה לבדיקה הרגילה רק אם
  // הוא חסר מסיבה כלשהי.
  const trustedUserId = (await headers()).get(TRUSTED_USER_ID_HEADER);
  const userId =
    trustedUserId ??
    (await supabase.auth.getUser()).data.user?.id ??
    null;
  if (!userId) return null;

  const [{ data: profile }, { data: membership }] = await Promise.all([
    withRetry(() =>
      supabase
        .from("profiles")
        // עמודות מפורשות, לא "*" — ראו ההערה המלאה ב-getMemberProfile
        // למטה, אותה סיבה בדיוק. זה הפרופיל של הצופה עצמו/ה, אז אין
        // כאן הגבלה על מה מותר להראות — רק מניעה שעמודה עתידית תודלף
        // בלי החלטה מודעת.
        .select(
          "id, full_name, phone, instagram, birth_date, city, gender, swim_level, waiver_accepted_at, privacy_accepted_at, avatar_path, created_at",
        )
        .eq("id", userId)
        .maybeSingle(),
    ),
    withRetry(() =>
      supabase
        .from("club_members")
        .select("role, status, joined_at, clubs(*)")
        .eq("profile_id", userId)
        .maybeSingle(),
    ),
  ]);

  return {
    userId,
    profile: (profile ?? null) as Profile | null,
    club: (membership?.clubs ?? null) as Club | null,
    role: (membership?.role ?? null) as MemberRole | null,
    status: (membership?.status ?? null) as MemberStatus | null,
    joinedAt: (membership?.joined_at ?? null) as string | null,
  };
});

export type PendingMember = {
  profileId: string;
  fullName: string;
  gender: Gender | null;
  requestedAt: string;
  ageYears: number | null;
  phone: string | null;
  instagram: string | null;
};

/** "left" = עזב/ה בעצמו/ה, "removed" = הוסר/ה ע"י מנהלת, "rejected" =
 * בקשת הצטרפות נדחתה מלכתחילה (אף פעם לא הייתה חברות מאושרת). */
export type RemovedReason = "left" | "removed" | "rejected";

export type RemovedMember = {
  profileId: string;
  fullName: string;
  gender: Gender | null;
  birthDate: string | null;
  city: string | null;
  phone: string | null;
  instagram: string | null;
  swimLevel: SwimLevel | null;
  createdAt: string;
  // תיבת אישור אחת בהרשמה (legal_accepted) שומרת waiver+privacy באותו
  // רגע בדיוק — לכן מספיק שדה אחד כדי לדעת אם האדם אישר את התנאים.
  waiverAcceptedAt: string | null;
  // מ-auth.users, לא מ-profiles — יש רק לייצוא ה-CSV. null בהדגמה.
  email: string | null;
  removedAt: string | null;
  removedReason: RemovedReason | null;
  /** תאריכי כל המפגשים שבהם האדם נכח בפועל בזמן שהיה/הייתה חבר/ה. */
  attendedDates: string[];
};

/**
 * ממתינים לאישור בקהילה. רק המנהלת רואה משהו — RPC חוסם אחרת.
 *
 * למה גיל וטלפון ואינסטגרם כבר כאן, ולא רק אחרי כניסה לפרופיל: מנהלת
 * שמחליטה אם לאשר בקשת הצטרפות צריכה מספיק הקשר לזהות מי זה בלי לפתוח
 * כל בקשה בנפרד — אותו עיקרון של person_card, רק שכאן זו המנהלת שרואה.
 */
export async function getPendingMembers(
  clubId: string,
): Promise<PendingMember[]> {
  if (demoMode) {
    return demo.demoPendingMembers().map((m) => ({
      profileId: m.profileId,
      fullName: m.fullName,
      gender: m.gender,
      requestedAt: m.requestedAt,
      ageYears: ageInYears(m.birthDate),
      phone: m.phone,
      instagram: m.instagram,
    }));
  }

  const supabase = await createClient();
  const { data } = await supabase.rpc("list_pending_members", {
    p_club_id: clubId,
  });

  const rows = (data ?? []) as {
    profile_id: string;
    full_name: string;
    gender: Gender | null;
    requested_at: string;
    birth_date: string | null;
    phone: string | null;
    instagram: string | null;
  }[];

  return rows.map((row) => ({
    profileId: row.profile_id,
    fullName: row.full_name,
    gender: row.gender,
    requestedAt: row.requested_at,
    ageYears: ageInYears(row.birth_date),
    phone: row.phone,
    instagram: row.instagram,
  }));
}

/**
 * מי שכבר לא בקהילה (הוסרו, עזבו, או נדחו) — מחיקה רכה בלבד
 * (status='removed', migration 0036), לא מחיקת שורה. רק המנהלת רואה
 * משהו — RPC חוסם אחרת. משמשת את התצוגה הנפרדת ב-/admin/removed
 * (שמאפשרת שחזור חברות בלי הרשמה מחדש עם אימייל אחר) וגם את ייצוא
 * האקסל שם — לכן הפרטים המלאים כאן, לא רק שם ותאריך.
 *
 * includeEmail: ברירת מחדל false, אותה סיבה בדיוק כמו ב-getAdminData -
 * מייל עולה פנייה נפרדת לשרת לכל אדם בנפרד. לא עמוד admin/removed
 * ולא כפתור הספירה ב-admin/insights מציגים מייל - רק ייצוא ה-CSV
 * (getAdminRemovedReport) מעביר includeEmail: true במפורש.
 */
export async function getRemovedMembers(
  clubId: string,
  { includeEmail = false }: { includeEmail?: boolean } = {},
): Promise<RemovedMember[]> {
  if (demoMode) {
    return demo.demoListRemovedMembers();
  }

  const supabase = await createClient();
  const { data } = await supabase.rpc("list_removed_members", {
    p_club_id: clubId,
  });

  const rows = (data ?? []) as {
    profile_id: string;
    full_name: string;
    gender: Gender | null;
    birth_date: string | null;
    city: string | null;
    phone: string | null;
    instagram: string | null;
    swim_level: SwimLevel | null;
    created_at: string;
    waiver_accepted_at: string | null;
    privacy_accepted_at: string | null;
    removed_at: string | null;
    removed_reason: RemovedReason | null;
    attended_dates: string[] | null;
  }[];

  const emailByProfileId = includeEmail
    ? await emailsByProfileId(rows.map((row) => row.profile_id))
    : new Map<string, string>();

  return rows.map((row) => ({
    profileId: row.profile_id,
    fullName: row.full_name,
    gender: row.gender,
    birthDate: row.birth_date,
    city: row.city,
    phone: row.phone,
    instagram: row.instagram,
    swimLevel: row.swim_level,
    createdAt: row.created_at,
    waiverAcceptedAt: row.waiver_accepted_at,
    email: emailByProfileId.get(row.profile_id) ?? null,
    removedAt: row.removed_at,
    removedReason: row.removed_reason,
    attendedDates: row.attended_dates ?? [],
  }));
}

/** בדוח ה-CSV בלבד - ניסוח רשמי יותר ("הוסר ע״י מנהלת"). לניסוח
 * הקצר שבתצוגה (admin/removed, admin/members/[id]) ראו removalVerb. */
export function reasonLabel(
  reason: RemovedReason,
  gender: Gender | null,
): string {
  switch (reason) {
    case "left":
      return byGender(gender, "עזב בעצמו", "עזבה בעצמה");
    case "removed":
      return byGender(gender, "הוסר ע״י מנהלת", "הוסרה ע״י מנהלת");
    case "rejected":
      return "בקשת הצטרפות נדחתה";
  }
}

/** ניסוח קצר לשורה בתצוגה - "הוסר ב-12.09.2026", לא "לא בקהילה
 * מאז...". מקור יחיד: גם admin/removed, גם admin/members/[id]. */
export function removalVerb(
  reason: RemovedReason,
  gender: Gender | null,
): string {
  switch (reason) {
    case "left":
      return byGender(gender, "עזב", "עזבה");
    case "removed":
      return byGender(gender, "הוסר", "הוסרה");
    case "rejected":
      return byGender(gender, "נדחה", "נדחתה");
  }
}

/**
 * דוח CSV "מי שכבר לא בקהילה" - נשלף ונבנה רק בלחיצה על כפתור הייצוא,
 * לא כחלק מטעינת עמוד admin/removed עצמו. אותם שדות בדיוק כמו ייצוא
 * "חברים" הרגיל (getAdminMembersReport), ובנוסף תאריכי נוכחות מלאים,
 * תאריך עזיבה, וסיבה.
 */
export async function getAdminRemovedReport(
  clubId: string,
): Promise<string[][]> {
  const [removed, { events }] = await Promise.all([
    getRemovedMembers(clubId, { includeEmail: true }),
    getAdminData(clubId),
  ]);

  // אותו מכנה בדיוק כמו בייצוא "חברים" הרגיל - מפגשים שחלון הצ'ק־אין
  // שלהם כבר נפתח, לא רק מי שהסתיים.
  const heldCount = events.filter(
    (e) => checkInWindow(e).status !== "before",
  ).length;

  return [
    [
      "שם",
      "מגדר",
      "גיל",
      "תאריך לידה",
      "עיר מגורים",
      "טלפון",
      "אימייל",
      "אינסטגרם",
      "רמת שחייה",
      "תאריך הצטרפות",
      "מפגשים",
      "אחוז הגעה",
      "אישרו את תנאי ההצטרפות",
      "תאריכי מפגשים שהגיעו אליהם",
      "תאריך עזיבה",
      "סיבה",
    ],
    ...removed.map((m) => [
      m.fullName,
      genderLabel(m.gender),
      ageInYears(m.birthDate)?.toString() ?? "",
      m.birthDate ?? "",
      m.city ?? "",
      formatPhone(m.phone) ?? "",
      m.email ?? "",
      normalizeInstagram(m.instagram) ?? "",
      swimLevelLabel(m.swimLevel) ?? "",
      formatDate(m.createdAt),
      `${m.attendedDates.length} מתוך ${heldCount}`,
      `${heldCount ? Math.round((m.attendedDates.length / heldCount) * 100) : 0}%`,
      m.waiverAcceptedAt ? "כן" : "",
      m.attendedDates.map((d) => formatDateTimeNumeric(d)).join(" | "),
      m.removedAt ? formatDate(m.removedAt) : "",
      m.removedReason ? reasonLabel(m.removedReason, m.gender) : "",
    ]),
  ];
}

export type PendingEventPhoto = {
  id: string;
  url: string;
  eventId: string;
  eventTitle: string;
  eventStartsAt: string;
  uploaderId: string;
  uploaderName: string;
  storagePath: string | null;
};

/**
 * כל התמונות שממתינות לאישור בכל המפגשים של הקהילה, לא רק מפגש
 * אחד — כדי שעמוד הניהול יראה תור אחד מרוכז במקום שהמנהלת תצטרך
 * להיכנס לכל מפגש בנפרד ולבדוק אם משהו ממתין שם. כוללת גם מי העלה
 * ומתי המפגש עצמו התקיים, כדי שאפשר יהיה לקבץ לפי מפגש ואז לפי
 * מעלה/ת — ביום מפגש אמיתי צפויות הרבה בקשות בבת אחת.
 */
export async function getPendingEventPhotos(
  clubId: string,
): Promise<PendingEventPhoto[]> {
  if (demoMode) {
    return demo.demoAllPendingPhotos().map((p) => {
      const event = demo.demoEvents().find((e) => e.id === p.eventId);
      const uploader = demo
        .demoProfiles()
        .find((profile) => profile.id === p.uploadedBy);
      return {
        id: p.id,
        url: p.url,
        eventId: p.eventId,
        eventTitle: event?.title ?? "",
        eventStartsAt: event?.starts_at ?? "",
        uploaderId: p.uploadedBy,
        uploaderName: uploader?.full_name ?? "חבר קהילה",
        storagePath: null,
      };
    });
  }

  const supabase = await createClient();
  const { data: rows } = await supabase
    .from("event_photos")
    .select(
      "id, storage_path, event_id, uploaded_by, events!inner(title, starts_at, club_id), profiles(full_name)",
    )
    .eq("status", "pending")
    .eq("events.club_id", clubId)
    .order("created_at", { ascending: true });

  if (!rows?.length) return [];

  const paths = rows.map((r) => r.storage_path);
  const urlByPath = await createSignedUrlsCached(supabase, "event-photos", paths);

  return rows.flatMap((r) => {
    const url = urlByPath.get(r.storage_path);
    if (!url) return [];
    const event = r.events as unknown as { title: string; starts_at: string };
    const profile = r.profiles as unknown as { full_name: string } | null;
    return [
      {
        id: r.id,
        url,
        eventId: r.event_id,
        eventTitle: event.title,
        eventStartsAt: event.starts_at,
        uploaderId: r.uploaded_by as string,
        uploaderName: profile?.full_name ?? "חבר קהילה",
        storagePath: r.storage_path as string,
      },
    ];
  });
}

/**
 * ספירה בלבד (לא הרשימה עצמה) — לתג ההתראה בסרגל הניווט. נקראת מ-
 * layout.tsx כערך התחלתי אמיתי, כדי שהתג לא יתחיל תמיד מ"אין כלום
 * ממתין" ויתקן את עצמו רגע אחרי בצד הלקוח. אותה שאילתה בדיוק כמו
 * fetchPendingCounts ב-app-nav.tsx (שם היא ממשיכה לרוץ בצד הלקוח,
 * לרענון realtime אחרי הטעינה הראשונית).
 */
export async function getOrganizerPendingCounts(
  clubId: string,
): Promise<{ members: number; photos: number }> {
  if (demoMode) {
    return {
      members: demo.demoPendingMembers().length,
      photos: demo.demoAllPendingPhotos().length,
    };
  }

  const supabase = await createClient();
  const [{ count: memberCount }, { count: photoCount }] = await Promise.all([
    supabase
      .from("club_members")
      .select("*", { count: "exact", head: true })
      .eq("club_id", clubId)
      .eq("status", "pending"),
    supabase
      .from("event_photos")
      .select("*, events!inner(club_id)", { count: "exact", head: true })
      .eq("status", "pending")
      .eq("events.club_id", clubId),
  ]);

  return { members: memberCount ?? 0, photos: photoCount ?? 0 };
}

// מפגש שהתחיל לפני פחות משעתיים עדיין נחשב "קרוב"
const RECENT_MS = 2 * 3600_000;

export async function getUpcomingEvents(clubId: string) {
  if (demoMode) {
    return demo
      .demoEvents()
      .filter((e) => new Date(e.starts_at).getTime() >= Date.now() - RECENT_MS)
      .sort((a, b) => a.starts_at.localeCompare(b.starts_at));
  }

  const supabase = await createClient();
  const { data } = await supabase
    .from("events")
    .select("*")
    .eq("club_id", clubId)
    .gte("starts_at", new Date(Date.now() - RECENT_MS).toISOString())
    .order("starts_at", { ascending: true });
  return (data ?? []) as SwellEvent[];
}

/**
 * `limit` אופציונלי: עמוד המפגשים הראשי מבקש רק את האחרונים (עם +1
 * כדי לדעת אם יש עוד), ועמוד ההיסטוריה המלאה קורא בלי הגבלה.
 */
export async function getPastEvents(clubId: string, limit?: number) {
  if (demoMode) {
    const sorted = demo
      .demoEvents()
      .filter((e) => new Date(e.starts_at).getTime() < Date.now() - RECENT_MS)
      .sort((a, b) => b.starts_at.localeCompare(a.starts_at));
    return limit ? sorted.slice(0, limit) : sorted;
  }

  const supabase = await createClient();
  let query = supabase
    .from("events")
    .select("*")
    .eq("club_id", clubId)
    .lt("starts_at", new Date(Date.now() - RECENT_MS).toISOString())
    .order("starts_at", { ascending: false });
  if (limit) query = query.limit(limit);
  const { data } = await query;
  return (data ?? []) as SwellEvent[];
}

export async function getEvent(eventId: string) {
  if (demoMode) return demo.demoEvent(eventId);

  const supabase = await createClient();
  const { data } = await supabase
    .from("events")
    .select("*")
    .eq("id", eventId)
    .maybeSingle();
  return (data ?? null) as SwellEvent | null;
}

/** כמה נוכחויות כבר נאספו למפגש הזה — לאזהרה בטופס עריכת מיקום/רדיוס. */
export async function getEventAttendanceCount(eventId: string): Promise<number> {
  if (demoMode) {
    return demo.demoAttendances().filter((a) => a.eventId === eventId).length;
  }

  const supabase = await createClient();
  const { data } = await supabase.rpc("event_attendance_count", {
    p_event_id: eventId,
  });
  return data ?? 0;
}

export async function getMyAttendedEventIds(userId: string) {
  if (demoMode) {
    return new Set(
      demo
        .demoAttendances()
        .filter((a) => a.profileId === demo.demoMeId)
        .map((a) => a.eventId),
    );
  }

  const supabase = await createClient();
  const { data } = await supabase
    .from("attendances")
    .select("event_id")
    .eq("profile_id", userId);
  return new Set((data ?? []).map((a) => a.event_id));
}

/** למה סימנתי שאגיע — כדי שרשימת המפגשים תראה את זה בלי להיכנס פנימה */
export async function getMyGoingEventIds(userId: string) {
  if (demoMode) {
    return new Set(
      demo
        .demoRsvps()
        .filter((r) => r.profileId === demo.demoMeId && r.going)
        .map((r) => r.eventId),
    );
  }

  const supabase = await createClient();
  const { data } = await supabase
    .from("rsvps")
    .select("event_id")
    .eq("profile_id", userId)
    .eq("going", true);
  return new Set((data ?? []).map((r) => r.event_id));
}

/**
 * שמות המתכוונים לכל מפגש, לכמה מפגשים בבת אחת — לכרטיסים ברשימה.
 * המפתח הוא event_id.
 */
export async function getGoingNamesByEvent(
  eventIds: string[],
  userId: string,
): Promise<Map<string, GoingPerson[]>> {
  const out = new Map<string, GoingPerson[]>();
  if (eventIds.length === 0) return out;

  const push = (eventId: string, person: GoingPerson) => {
    const list = out.get(eventId);
    if (list) list.push(person);
    else out.set(eventId, [person]);
  };

  if (demoMode) {
    const wanted = new Set(eventIds);
    const byId = new Map(demo.demoProfiles().map((p) => [p.id, p]));
    for (const r of demo.demoRsvps()) {
      if (!r.going || !wanted.has(r.eventId)) continue;
      const profile = byId.get(r.profileId);
      if (!profile) continue;
      // בלי תמונה — כרטיס האירוע מציג רק שמות (goingSummary), לא פנים
      push(r.eventId, {
        profileId: profile.id,
        fullName: profile.full_name,
        swimLevel: profile.swim_level,
        selfieUrl: null,
        faceX: null,
        faceY: null,
        isMe: profile.id === demo.demoMeId,
      });
    }
    return out;
  }

  const supabase = await createClient();
  const { data } = await supabase.rpc("events_going_names", {
    p_event_ids: eventIds,
  });

  for (const r of (data ?? []) as {
    event_id: string;
    profile_id: string;
    full_name: string;
    swim_level: SwimLevel | null;
  }[]) {
    // בלי תמונה כאן — events_going_names() לא מחזירה אותה בכלל
    // (כרטיס האירוע מציג רק שמות)
    push(r.event_id, {
      profileId: r.profile_id,
      fullName: r.full_name,
      swimLevel: r.swim_level,
      selfieUrl: null,
      faceX: null,
      faceY: null,
      isMe: r.profile_id === userId,
    });
  }
  return out;
}


// ------------------------------------------------ היסטוריית הסלפים של אדם

export type SelfieShot = {
  eventId: string;
  eventTitle: string;
  startsAt: string;
  selfieUrl: string | null;
  checkedInAt: string;
  // מרכז הפנים (0–1), לחיתוך ממורכז. ראו lib/face-position.ts
  faceX: number | null;
  faceY: number | null;
};

/**
 * כל הסלפים שאדם צילם, לאורך כל המפגשים. זה הלב של הזיהוי —
 * פנים לאורך זמן, ולא תמונת פרופיל אחת.
 *
 * מי שרשאי לראות: האדם עצמו, ומנהלת הקהילה. נאכף ב-RLS ובמדיניות
 * ה-storage (`is_event_organizer`), לא כאן.
 */
export async function getSelfieHistory(
  profileId: string,
): Promise<SelfieShot[]> {
  if (demoMode) {
    const byId = new Map(demo.demoEvents().map((e) => [e.id, e]));
    return demo
      .demoAttendances()
      .filter((a) => a.profileId === profileId)
      .flatMap((a) => {
        const event = byId.get(a.eventId);
        return event
          ? [
              {
                eventId: a.eventId,
                eventTitle: event.title,
                startsAt: event.starts_at,
                selfieUrl: a.selfie,
                checkedInAt: a.at,
                faceX: a.faceX,
                faceY: a.faceY,
              },
            ]
          : [];
      })
      .sort((x, y) => y.startsAt.localeCompare(x.startsAt));
  }

  const supabase = await createClient();
  // מיון לפי checked_in_at (לא starts_at של המפגש) היה נותן סדר שגוי
  // להוספת נוכחות ידנית: השורה נוצרת ברגע ההוספה, לא ברגע המפגש
  // עצמו, כך ש"קפה בריבה" שנוסף ידנית אחרי "שחיית שקיעה" האמיתית
  // (אבל התרחש לפניה בזמן) היה קופץ להיות ראשון. הסידור הסופי למטה
  // לפי events.starts_at פותר את זה תמיד, כולל בהוספה ידנית.
  const { data } = await supabase
    .from("attendances")
    .select(
      "event_id, selfie_path, checked_in_at, face_x, face_y, events(title, starts_at)",
    )
    .eq("profile_id", profileId);

  const rows = (data ?? []) as unknown as {
    event_id: string;
    selfie_path: string | null;
    checked_in_at: string;
    face_x: number | null;
    face_y: number | null;
    events: { title: string; starts_at: string } | null;
  }[];

  const paths = rows.map((r) => r.selfie_path).filter(Boolean) as string[];
  const urlByPath = await createSignedUrlsCached(supabase, "selfies", paths);

  return rows
    .flatMap((r) =>
      r.events
        ? [
            {
              eventId: r.event_id,
              eventTitle: r.events.title,
              startsAt: r.events.starts_at,
              selfieUrl: r.selfie_path
                ? (urlByPath.get(r.selfie_path) ?? null)
                : null,
              checkedInAt: r.checked_in_at,
              faceX: r.face_x,
              faceY: r.face_y,
            },
          ]
        : [],
    )
    .sort((a, b) => b.startsAt.localeCompare(a.startsAt));
}

export type PersonCard = {
  profileId: string;
  fullName: string;
  /** גלוי תמיד כמו השם — רק לניסוח נכון ("היה/הייתה איתנו"), לא מוצג בפני עצמו */
  gender: Gender | null;
  /** null אם עוד לא הייתם יחד — אז גם אין מה להראות מעבר לשם */
  instagram: string | null;
  /** אותו כלל בדיוק כמו אינסטגרם — נעול עד שהייתם יחד */
  phone: string | null;
  /** אותו כלל בדיוק כמו אינסטגרם — נעול עד שהייתם יחד */
  swimLevel: SwimLevel | null;
  /** בכמה מפגשים הייתם יחד. אפס = עוד לא נפגשתם, והעמוד נעול */
  sharedCount: number;
  attendedCount: number;
};

/**
 * כרטיס של אדם אחר, לעמוד שנפתח מרשימת הכוונות.
 *
 * חבר קהילה רואה שם תמיד, אבל פרטים ופנים — רק אם הייתם יחד. זה אותו
 * כלל שמחזיק את כל המוצר, רק במקום אחר בממשק.
 */
export async function getPersonCard(
  profileId: string,
  viewerId: string,
): Promise<PersonCard | null> {
  if (demoMode) {
    const profile = demo.demoProfiles().find((p) => p.id === profileId);
    if (!profile) return null;

    const attendances = demo.demoAttendances();
    const mine = new Set(
      attendances
        .filter((a) => a.profileId === viewerId)
        .map((a) => a.eventId),
    );
    const theirs = attendances.filter((a) => a.profileId === profileId);
    const sharedCount = theirs.filter((a) => mine.has(a.eventId)).length;
    const isOrganizer = demo.demoMyRole() === "organizer";

    const unlocked = sharedCount > 0 || isOrganizer;
    return {
      profileId,
      fullName: profile.full_name,
      gender: profile.gender,
      instagram: unlocked ? profile.instagram : null,
      phone: unlocked ? profile.phone : null,
      swimLevel: unlocked ? profile.swim_level : null,
      sharedCount,
      attendedCount: theirs.length,
    };
  }

  const supabase = await createClient();
  const { data } = await supabase.rpc("person_card", {
    p_profile_id: profileId,
  });

  const row = ((data ?? []) as {
    full_name: string;
    gender: Gender | null;
    instagram: string | null;
    phone: string | null;
    swim_level: SwimLevel | null;
    shared_count: number;
    attended_count: number;
  }[])[0];
  if (!row) return null;

  return {
    profileId,
    fullName: row.full_name,
    gender: row.gender,
    instagram: row.instagram,
    phone: row.phone,
    swimLevel: row.swim_level,
    sharedCount: row.shared_count,
    attendedCount: row.attended_count,
  };
}

/** פרופיל בודד — לעמוד החבר בצד הניהול */
export async function getMemberProfile(
  profileId: string,
): Promise<Profile | null> {
  if (demoMode) {
    return demo.demoProfiles().find((p) => p.id === profileId) ?? null;
  }

  const supabase = await createClient();
  // עמודות מפורשות, לא "*" — RLS הוא ברמת שורה בלבד, אז "*" על שורה
  // שמותר לקרוא שולח גם כל עמודה עתידית שתתווסף לטבלה, גם אם אף מסך
  // לא מציג אותה. כרגע זה בדיוק כל השדות של Profile (מנהלת רואה הכל
  // על חבר/ה, במכוון) — הרשימה המפורשת לא מגבילה שום דבר שמוצג היום,
  // רק מוודאת שעמודה חדשה תידרש בהחלטה מודעת, לא תידלף בשקט.
  const { data } = await supabase
    .from("profiles")
    .select(
      "id, full_name, phone, instagram, birth_date, city, gender, swim_level, waiver_accepted_at, privacy_accepted_at, avatar_path, created_at",
    )
    .eq("id", profileId)
    .maybeSingle();
  return (data ?? null) as Profile | null;
}

export type Membership = {
  role: MemberRole;
  status: MemberStatus;
  removedAt: string | null;
  removedReason: RemovedReason | null;
};

/** חברות (תפקיד + סטטוס) בקהילה — כדי לדעת בעמוד הפרופיל שלו/ה בצד
 * הניהול גם אם מותר להציג כפתור הסרה (לא על מנהלת, ראו remove-
 * member-button.tsx) וגם אם להציג שהחבר/ה כבר לא בקהילה (status
 * 'removed' - כולל גם עזיבה עצמית וגם דחיית בקשה, ראו removed_reason). */
export async function getMembership(
  clubId: string,
  profileId: string,
): Promise<Membership | null> {
  if (demoMode) {
    const removed = demo
      .demoListRemovedMembers()
      .find((m) => m.profileId === profileId);
    if (removed) {
      return {
        role: "member",
        status: "removed",
        removedAt: removed.removedAt,
        removedReason: removed.removedReason,
      };
    }
    return {
      role: profileId === demo.demoMeId ? demo.demoMyRole() : "member",
      status: "approved",
      removedAt: null,
      removedReason: null,
    };
  }

  const supabase = await createClient();
  const { data } = await supabase
    .from("club_members")
    .select("role, status, removed_at, removed_reason")
    .eq("club_id", clubId)
    .eq("profile_id", profileId)
    .maybeSingle();
  if (!data) return null;
  return {
    role: data.role as MemberRole,
    status: data.status as MemberStatus,
    removedAt: data.removed_at as string | null,
    removedReason: data.removed_reason as RemovedReason | null,
  };
}

// ------------------------------------------------------------- עמוד מפגש

/** בדיוק מה שכרטיס משתתף צריך. מה שלא כאן — לא יוצא מהשרת. */
export type PublicProfile = Pick<
  Profile,
  "id" | "full_name" | "gender" | "phone" | "instagram" | "swim_level"
>;

export type AttendeeCard = {
  profile: PublicProfile;
  selfieUrl: string | null;
  isMe: boolean;
  // מרכז הפנים (0–1), לחיתוך ממורכז. ראו lib/face-position.ts
  faceX: number | null;
  faceY: number | null;
};

/**
 * מי הצהיר שיגיע. שם בלי תמונה — הצהרת כוונה מותרת לפרסום, סלפי לא.
 * המטרה שלה היא מוטיבציה: רואים שחברים מתכננים להגיע ומצטרפים.
 */
export type GoingPerson = {
  profileId: string;
  fullName: string;
  /** undefined במקומות שלא טורחים לשלוף את זה (למשל getGoingNamesByEvent,
   * שמציגה רק שמות בכרטיס האירוע ולא צריכה ניסוח מגדרי). */
  gender?: Gender | null;
  swimLevel: SwimLevel | null;
  // התמונה העדכנית של האדם — null אם עוד לא נכחתם יחד באיזשהו מפגש,
  // גם אם יש לו סלפי. ראו migration 0018.
  selfieUrl: string | null;
  faceX: number | null;
  faceY: number | null;
  isMe: boolean;
  /** בכמה מפגשים כבר נכחנו יחד. undefined במקומות שלא טורחים לחשב
   * את זה (למשל getGoingNamesByEvent, שממילא לא מציגה תמונות). */
  sharedCount?: number;
};

export type EventDetail = {
  myGoing: boolean;
  rsvpCount: number;
  /** השמות מאחורי `rsvpCount`, באותו סדר שבו סימנו */
  going: GoingPerson[];
  hasAttended: boolean;
  /** כמה כבר נכחו. גלוי גם למי שלא נכח — המספר מותר, הזהויות לא. */
  attendedCount: number;
  attendees: AttendeeCard[];
  /** מי מתוך attendees שזו הפעם הראשונה שנכחתם יחד — כבר חתוך ל-FIRST_MEETINGS_LIMIT */
  firstMeetings: AttendeeCard[];
};

/** תקרה ל"מי הכרתם היום" — לא להציף אם יש הרבה פנים חדשות במפגש אחד,
 * ומספיק נמוך כדי שהשורה תמיד תיכנס בלי לשבור לשורה שנייה. */
const FIRST_MEETINGS_LIMIT = 3;

/** מדגם אקראי בגודל count — כשיש יותר פנים חדשות מהתקרה, מי בדיוק
 * מוצג/ת מתחלף בכל טעינה, לא תמיד אותם אנשים ראשונים. */
function sampleRandom<T>(items: T[], count: number): T[] {
  const shuffled = [...items];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled.slice(0, count);
}

export async function getEventDetail(
  eventId: string,
  userId: string,
  /** מנהלת רואה את רשימת הנוכחים תמיד, גם אם היא עצמה לא נכחה —
   *  כמו שכבר קורה באלבום התמונות. `hasAttended` בהחזרה נשאר "האם
   *  אני עצמי נכחתי" בלבד (קובע RSVP/צ׳ק־אין/עריכת סלפי משלה). */
  isOrganizer = false,
): Promise<EventDetail> {
  if (demoMode) {
    const rsvps = demo.demoRsvps().filter((r) => r.eventId === eventId);
    const attendances = demo
      .demoAttendances()
      .filter((a) => a.eventId === eventId);
    const hasAttended = attendances.some((a) => a.profileId === demo.demoMeId);
    const byId = new Map(demo.demoProfiles().map((p) => [p.id, p]));

    // "נכחתם יחד" בהדגמה — מי שחלק לפחות מפגש אחד עם demoMeId, בכל
    // מפגש שהוא, לא רק זה הנוכחי. אותו תנאי בדיוק כמו ב-SQL האמיתי.
    const allAttendances = demo.demoAttendances();
    const myEventIds = new Set(
      allAttendances
        .filter((a) => a.profileId === demo.demoMeId)
        .map((a) => a.eventId),
    );
    const metProfileIds = new Set(
      allAttendances
        .filter((a) => myEventIds.has(a.eventId))
        .map((a) => a.profileId),
    );
    // הסלפי האחרון שיש לו בפועל — לא הנוכחות האחרונה כשלעצמה. נוכחות
    // שנוספה ידנית (בלי מצלמה) לא אמורה "לדרוס" סלפי אמיתי ממפגש קודם
    // בתור "העדכני ביותר". אותו תיקון בדיוק כמו ב-event_going_list()
    // האמיתית, ראו migration 0024.
    function latestDemoSelfie(profileId: string) {
      const rows = allAttendances
        .filter((a) => a.profileId === profileId && a.selfie)
        .sort((a, b) => b.at.localeCompare(a.at));
      if (!rows.length) return { selfieUrl: null, faceX: null, faceY: null };
      const latest = rows[0];
      return {
        selfieUrl: latest.selfie,
        faceX: latest.faceX,
        faceY: latest.faceY,
      };
    }

    const demoAttendeeCards: AttendeeCard[] =
      hasAttended || isOrganizer
        ? attendances.flatMap((a) => {
            const profile = byId.get(a.profileId);
            return profile
              ? [
                  {
                    profile,
                    selfieUrl: a.selfie,
                    isMe: a.profileId === demo.demoMeId,
                    faceX: a.faceX,
                    faceY: a.faceY,
                  },
                ]
              : [];
          })
        : [];

    return {
      myGoing:
        rsvps.find((r) => r.profileId === demo.demoMeId)?.going ?? false,
      rsvpCount: rsvps.filter((r) => r.going).length,
      going: rsvps
        .filter((r) => r.going)
        .flatMap((r) => {
          const profile = byId.get(r.profileId);
          if (!profile) return [];
          const isMe = profile.id === demo.demoMeId;
          const met = isMe || metProfileIds.has(profile.id);
          const shot = met
            ? latestDemoSelfie(profile.id)
            : { selfieUrl: null, faceX: null, faceY: null };
          const sharedCount = allAttendances.filter(
            (a) => a.profileId === profile.id && myEventIds.has(a.eventId),
          ).length;
          return [
            {
              profileId: profile.id,
              fullName: profile.full_name,
              gender: profile.gender,
              swimLevel: profile.swim_level,
              ...shot,
              isMe,
              sharedCount,
            },
          ];
        }),
      hasAttended,
      attendedCount: attendances.length,
      attendees: demoAttendeeCards,
      // "היום הכרתם" — רק מי שהמפגש הזה הוא המוקדם ביותר מבין כל
      // המפגשים המשותפים בינינו (עובדה קבועה, לא ספירה חיה) — אותו
      // תנאי בדיוק כמו ב-event_first_meetings() האמיתית, ראו שם.
      firstMeetings: hasAttended
        ? sampleRandom(
            demoAttendeeCards.filter((a) => {
              if (a.isMe) return false;
              const sharedStarts = allAttendances
                .filter(
                  (x) => x.profileId === a.profile.id && myEventIds.has(x.eventId),
                )
                .map((x) => demo.demoEvent(x.eventId)?.starts_at)
                .filter((s): s is string => !!s);
              const earliestShared = sharedStarts.sort()[0];
              const thisEventStartsAt = demo.demoEvent(eventId)?.starts_at;
              return !!thisEventStartsAt && earliestShared === thisEventStartsAt;
            }),
            FIRST_MEETINGS_LIMIT,
          )
        : [],
    };
  }

  const supabase = await createClient();
  const [
    { data: myRsvp },
    { data: rsvpCount },
    { data: goingRows },
    { data: attendedCount },
    { data: myAttendance },
  ] = await Promise.all([
    supabase
      .from("rsvps")
      .select("going")
      .eq("event_id", eventId)
      .eq("profile_id", userId)
      .maybeSingle(),
    supabase.rpc("event_rsvp_count", { p_event_id: eventId }),
    supabase.rpc("event_going_list", { p_event_id: eventId }),
    supabase.rpc("event_attendance_count", { p_event_id: eventId }),
    supabase
      .from("attendances")
      .select("*")
      .eq("event_id", eventId)
      .eq("profile_id", userId)
      .maybeSingle(),
  ]);

  const hasAttended = !!myAttendance;
  let attendees: AttendeeCard[] = [];

  if (hasAttended || isOrganizer) {
    // עמודות מפורשות ולא `profiles(*)`. RLS עובד ברמת השורה בלבד, ולכן
    // כוכבית כאן שולחת לדפדפן של כל משתתף כל שדה שיתווסף לטבלה בעתיד,
    // גם אם אף מסך לא מציג אותו. הטלפון כן נשלח, במכוון: כפתור
    // הוואטסאפ ב-attendee-grid הוא הפואנטה של הרשימה.
    const { data } = await supabase
      .from("attendances")
      .select(
        "event_id, profile_id, selfie_path, checked_in_at, face_x, face_y, profiles(id, full_name, gender, phone, instagram, swim_level)",
      )
      .eq("event_id", eventId)
      .order("checked_in_at", { ascending: true });

    const rows = (data ?? []) as unknown as (Attendance & {
      profiles: PublicProfile | null;
    })[];
    const paths = rows.map((r) => r.selfie_path).filter(Boolean) as string[];
    const urlByPath = await createSignedUrlsCached(supabase, "selfies", paths);

    attendees = rows.flatMap((r) =>
      r.profiles
        ? [
            {
              profile: r.profiles,
              selfieUrl: r.selfie_path
                ? (urlByPath.get(r.selfie_path) ?? null)
                : null,
              isMe: r.profile_id === userId,
              faceX: r.face_x,
              faceY: r.face_y,
            },
          ]
        : [],
    );
  }

  // "היום הכרתם" — רק אם אני עצמי נכחתי (אין מה להראות "הכרתי את X"
  // למנהלת שרק צופה בלי נוכחות). event_first_meetings() כבר מחזירה
  // ריק במקרה הזה בכל מקרה, זו רק חיסכון בקריאה מיותרת.
  let firstMeetings: AttendeeCard[] = [];
  if (hasAttended) {
    const { data: firstMeetingRows } = await supabase.rpc(
      "event_first_meetings",
      { p_event_id: eventId },
    );
    const firstMeetingIds = new Set(
      ((firstMeetingRows ?? []) as { profile_id: string }[]).map(
        (r) => r.profile_id,
      ),
    );
    firstMeetings = sampleRandom(
      attendees.filter((a) => firstMeetingIds.has(a.profile.id)),
      FIRST_MEETINGS_LIMIT,
    );
  }

  const goingRowsTyped = (goingRows ?? []) as {
    profile_id: string;
    full_name: string;
    gender: Gender | null;
    swim_level: SwimLevel | null;
    selfie_path: string | null;
    face_x: number | null;
    face_y: number | null;
    shared_count: number;
  }[];

  const goingPaths = goingRowsTyped
    .map((r) => r.selfie_path)
    .filter(Boolean) as string[];
  const goingUrlByPath = await createSignedUrlsCached(supabase, "selfies", goingPaths);

  const going = goingRowsTyped.map((r) => ({
    profileId: r.profile_id,
    fullName: r.full_name,
    gender: r.gender,
    swimLevel: r.swim_level,
    // אם הצופה עוד לא נכח יחד עם r, ה-RPC כבר מחזיר null כאן — לא
    // צריך בדיקה נוספת. אם המדיניות ב-storage תחסום בכל זאת, ה-path
    // פשוט לא יופיע ב-goingUrlByPath וזה ייפול חזרה ל-null.
    selfieUrl: r.selfie_path ? (goingUrlByPath.get(r.selfie_path) ?? null) : null,
    faceX: r.face_x,
    faceY: r.face_y,
    isMe: r.profile_id === userId,
    sharedCount: r.shared_count,
  }));

  return {
    myGoing: myRsvp?.going ?? false,
    rsvpCount: rsvpCount ?? 0,
    going,
    hasAttended,
    attendedCount: attendedCount ?? 0,
    attendees,
    firstMeetings,
  };
}

export type KnownPerson = {
  profileId: string;
  fullName: string;
  selfieUrl: string | null;
  faceX: number | null;
  faceY: number | null;
};

/** תקרה למדור "פנים שהכרתם" בעמוד הבית — מדגם אקראי, לא כל מי שאי-פעם
 * הכרתם (יכול להיות עשרות אנשים אחרי כמה חודשים בקהילה). */
const KNOWN_PEOPLE_LIMIT = 3;

/**
 * מדגם אקראי מכל מי שכבר חלקתם לפחות מפגש אחד — לא מפגש ספציפי, כל
 * ההיסטוריה. מתחלף בכל טעינה (sampleRandom), כדי שבכל פעם שפותחים את
 * האתר יופיעו שלושה אנשים אחרים. הסלפי של כל אחד/ת הוא מהמפגש
 * המשותף האחרון — אותו כלל "תמונה רק אם נפגשנו" כמו בכל מקום אחר.
 */
export async function getMetPeople(userId: string): Promise<KnownPerson[]> {
  if (demoMode) {
    const allAttendances = demo.demoAttendances();
    const myEventIds = new Set(
      allAttendances.filter((a) => a.profileId === userId).map((a) => a.eventId),
    );
    // כמו met_people() האמיתית מאז 0072 - נוכחות היסטורית לא נמחקת
    // כשמישהו עוזב/מוסר/ת, אז בלי הסינון הזה מי שכבר לא בקהילה היה
    // ממשיך להופיע ב"האנשים שלי מסוואל" לנצח.
    const activeIds = new Set(demo.demoActiveProfiles().map((p) => p.id));
    const metIds = new Set(
      allAttendances
        .filter(
          (a) =>
            a.profileId !== userId &&
            myEventIds.has(a.eventId) &&
            activeIds.has(a.profileId),
        )
        .map((a) => a.profileId),
    );
    const byId = new Map(demo.demoProfiles().map((p) => [p.id, p]));

    const known = [...metIds].flatMap((id) => {
      const profile = byId.get(id);
      if (!profile) return [];
      const shared = allAttendances
        .filter((a) => a.profileId === id && a.selfie && myEventIds.has(a.eventId))
        .sort((a, b) => b.at.localeCompare(a.at));
      const latest = shared[0];
      return [
        {
          profileId: id,
          fullName: profile.full_name,
          selfieUrl: latest?.selfie ?? null,
          faceX: latest?.faceX ?? null,
          faceY: latest?.faceY ?? null,
        },
      ];
    });
    return sampleRandom(known, KNOWN_PEOPLE_LIMIT);
  }

  const supabase = await createClient();
  const { data } = await supabase.rpc("met_people");
  const rows = (data ?? []) as {
    profile_id: string;
    full_name: string;
    selfie_path: string | null;
    face_x: number | null;
    face_y: number | null;
  }[];

  const paths = rows.map((r) => r.selfie_path).filter(Boolean) as string[];
  const urlByPath = await createSignedUrlsCached(supabase, "selfies", paths);

  const known = rows.map((r) => ({
    profileId: r.profile_id,
    fullName: r.full_name,
    selfieUrl: r.selfie_path ? (urlByPath.get(r.selfie_path) ?? null) : null,
    faceX: r.face_x,
    faceY: r.face_y,
  }));
  return sampleRandom(known, KNOWN_PEOPLE_LIMIT);
}

/** כמות כוללת של מי שנפגשתם איתם אי-פעם — לפני שגוזרים ל-KNOWN_PEOPLE_LIMIT
 * לתצוגה. לסטטיסטיקת "X אנשים שפגשתי" בדף הבית, מתעדכן בכל טעינה. */
export async function getMetPeopleCount(userId: string): Promise<number> {
  if (demoMode) {
    const allAttendances = demo.demoAttendances();
    const myEventIds = new Set(
      allAttendances.filter((a) => a.profileId === userId).map((a) => a.eventId),
    );
    const activeIds = new Set(demo.demoActiveProfiles().map((p) => p.id));
    const metIds = new Set(
      allAttendances
        .filter(
          (a) =>
            a.profileId !== userId &&
            myEventIds.has(a.eventId) &&
            activeIds.has(a.profileId),
        )
        .map((a) => a.profileId),
    );
    return metIds.size;
  }

  const supabase = await createClient();
  const { data } = await supabase.rpc("met_people");
  return (data ?? []).length;
}

/** כמות חברי הקהילה המאושרים (לא ממתינים/הוסרו) — לסטטיסטיקת "X אנשים
 * בקהילה" בדף הבית. `club_member_count()` (migration 0057) היא
 * security definer כי חבר/ה רגיל/ה רשאי/ת לראות ב-club_members רק
 * את השורה של עצמו/ה (RLS), לא לספור את כל הקהילה. */
export async function getClubMemberCount(): Promise<number> {
  if (demoMode) {
    return demo.demoActiveProfiles().length;
  }

  const supabase = await createClient();
  const { data } = await supabase.rpc("club_member_count");
  return data ?? 0;
}

export type MemberPickerRow = {
  profileId: string;
  fullName: string;
  selfieUrl: string | null;
};

/**
 * חברי הקהילה עם התמונה העדכנית שלהם (מכל מפגש, לא רק זה הנוכחי) —
 * לרשימת הבחירה בהוספת נוכחות ידנית. אותה לוגיקה בדיוק כמו "התמונה
 * העדכנית" ב-getAdminData (מפגשים מהחדש לישן, הסלפי הראשון שנתקלים
 * בו לכל אדם הוא העדכני ביותר), אבל בלי שאר הנתונים הכבדים שהיא
 * מביאה — זו נטענת לפי דרישה מכל עמוד מפגש, לא רק מהניהול.
 */
export async function getClubMembersWithLatestSelfie(
  clubId: string,
): Promise<MemberPickerRow[]> {
  if (demoMode) {
    const attendances = demo.demoAttendances();
    return demo.demoActiveProfiles().map((profile) => {
      const mine = attendances
        .filter((a) => a.profileId === profile.id)
        .sort((a, b) => b.at.localeCompare(a.at));
      const latest = mine.find((a) => a.selfie);
      return {
        profileId: profile.id,
        fullName: profile.full_name,
        selfieUrl: latest?.selfie ?? null,
      };
    });
  }

  const supabase = await createClient();
  const [{ data: memberRows }, { data: eventRows }] = await Promise.all([
    supabase
      .from("club_members")
      .select("profile_id, profiles(id, full_name)")
      .eq("club_id", clubId)
      .eq("status", "approved"),
    supabase
      .from("events")
      .select("attendances(profile_id, selfie_path)")
      .eq("club_id", clubId)
      .order("starts_at", { ascending: false }),
  ]);

  const latestPathByProfile = new Map<string, string>();
  for (const event of (eventRows ?? []) as unknown as {
    attendances: { profile_id: string; selfie_path: string | null }[];
  }[]) {
    for (const a of event.attendances) {
      if (a.selfie_path && !latestPathByProfile.has(a.profile_id)) {
        latestPathByProfile.set(a.profile_id, a.selfie_path);
      }
    }
  }

  const paths = [...latestPathByProfile.values()];
  const urlByPath = await createSignedUrlsCached(supabase, "selfies", paths);

  return (
    (memberRows ?? []) as unknown as {
      profile_id: string;
      profiles: { id: string; full_name: string } | null;
    }[]
  ).flatMap((m) =>
    m.profiles
      ? [
          {
            profileId: m.profiles.id,
            fullName: m.profiles.full_name,
            selfieUrl: (() => {
              const path = latestPathByProfile.get(m.profile_id);
              return path ? (urlByPath.get(path) ?? null) : null;
            })(),
          },
        ]
      : [],
  );
}

export type EventPhoto = {
  id: string;
  url: string;
  status: "pending" | "approved";
  /** התמונה הזו הועלתה על ידי מי שצופה עכשיו — כדי להראות לה/לו
   * "ממתין לאישור" גם לפני שהמנהלת אישרה, בלי לחשוף תמונות ממתינות
   * של אחרים. */
  isMine: boolean;
  /** מי העלה — כדי שמנהלת שרואה כמה תמונות ממתינות ביחד תדע מי
   * ביקש/ה מה, בלי לפתוח כל תמונה בנפרד. */
  uploaderName: string;
  /** נתיב האחסון — נדרש למחיקה (storage.remove), בלי סבב-הלוך-ושוב
   * נוסף רק כדי לגלות אותו. לא רלוונטי בהדגמה. */
  storagePath: string | null;
};

/**
 * אלבום המפגש. מקור האמת הוא טבלת `event_photos` (סטטוס אישור +
 * מי העלה) — ה-storage מחזיק רק את הבייטים. ה-RLS על שתיהן יחד הוא
 * כל האכיפה: מי שלא רשאי/ת פשוט מקבל/ת רשימה ריקה, לא שגיאה.
 *
 * `download: true` הופך את הקישור לכזה שמוריד למכשיר במקום להיפתח
 * בטאב חדש — זו הדרישה המפורשת, לא ברירת מחדל של הדפדפן.
 */
export async function getEventPhotos(eventId: string): Promise<EventPhoto[]> {
  if (demoMode) {
    return demo.demoEventPhotos(eventId).map((p) => ({
      id: p.id,
      url: p.url,
      status: p.status,
      isMine: p.uploadedBy === demo.demoMeId,
      uploaderName:
        demo.demoProfiles().find((profile) => profile.id === p.uploadedBy)
          ?.full_name ?? "חבר קהילה",
      storagePath: null,
    }));
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: rows } = await supabase
    .from("event_photos")
    .select("id, storage_path, status, uploaded_by, profiles(full_name)")
    .eq("event_id", eventId)
    .order("created_at", { ascending: true });

  if (!rows?.length) return [];

  const paths = rows.map((r) => r.storage_path);
  const { data: signed } = await supabase.storage
    .from("event-photos")
    .createSignedUrls(paths, SELFIE_TTL, { download: true });

  const urlByPath = new Map(
    (signed ?? []).flatMap((s) =>
      !s.error && s.signedUrl && s.path ? [[s.path, s.signedUrl] as const] : [],
    ),
  );

  return rows.flatMap((r) => {
    const url = urlByPath.get(r.storage_path);
    if (!url) return [];
    const profile = r.profiles as unknown as { full_name: string } | null;
    return [
      {
        id: r.id,
        url,
        status: r.status as "pending" | "approved",
        isMine: r.uploaded_by === user?.id,
        uploaderName: profile?.full_name ?? "חבר קהילה",
        storagePath: r.storage_path as string,
      },
    ];
  });
}

/**
 * עד 4 תמונות אלבום *מאושרות* לכל מפגש, לקולאז' בכרטיסי
 * `SelfieHistory` — תמונה שממתינה לאישור לא מוצגת שם כ"זיכרון מהמפגש"
 * לפני שהמנהלת אישרה אותה. שאילתה אחת מרוכזת על כל המפגשים (`.in`)
 * ולא אחת לכל מפגש — אותה תבנית כמו ב-`getAdminData` למעלה באותו קובץ.
 * לא מוסיפה בדיקת הרשאה משלה — ה-RLS על `event_photos` כבר אוכף מי
 * רשאי/ת לראות מה, בלי קשר לצורת השאילתה.
 */
export async function getEventPhotoCollages(
  eventIds: string[],
): Promise<Map<string, string[]>> {
  const unique = [...new Set(eventIds)];
  if (unique.length === 0) return new Map();

  if (demoMode) {
    const lists = await Promise.all(unique.map((id) => getEventPhotos(id)));
    return new Map(
      unique.map((id, i) => [
        id,
        lists[i]
          .filter((p) => p.status === "approved")
          .slice(0, 4)
          .map((p) => p.url),
      ]),
    );
  }

  const supabase = await createClient();
  const { data: rows } = await supabase
    .from("event_photos")
    .select("event_id, storage_path")
    .in("event_id", unique)
    .eq("status", "approved")
    .order("created_at", { ascending: true });

  const urlsByEvent = new Map<string, string[]>(unique.map((id) => [id, []]));
  if (!rows?.length) return urlsByEvent;

  const paths = rows.map((r) => r.storage_path);
  const urlByPath = await createSignedUrlsCached(supabase, "event-photos", paths);

  for (const r of rows) {
    const url = urlByPath.get(r.storage_path);
    const list = urlsByEvent.get(r.event_id);
    if (url && list && list.length < 4) list.push(url);
  }
  return urlsByEvent;
}

export type RandomEventAlbum = {
  eventId: string;
  photoUrls: string[];
};

/** תקרה עליונה — כשיש יותר, בוחרים אקראית בכל טעינה. פחות מזה,
 * מציגים בדיוק כמה שיש (גם תמונה אחת). */
const RANDOM_ALBUM_MAX_PHOTOS = 7;

/**
 * "רגעים שלי מסוואל קלאב" בדף הבית: מגרילים קודם מפגש אחד אקראי
 * מבין המפגשים **שהצופה/ת עצמו/ה נכח/ה בהם**, ורק אז עד 7 תמונות
 * אקראיות מהאלבום של אותו מפגש עצמו — היסטוריה אישית, כמו כרטיס
 * הרצף בעמוד הפרופיל, בכוונה בלי חריג למנהלת (לא כמו met_people).
 * `random_moment_album()` (migration 0056) רצה בלי security definer;
 * `has_attended()` בתוכה כבר security definer ובודקת auth.uid()
 * ישירות. מחזירה null אם אין אף מפגש עבר עם תמונה מאושרת שנכחו בו.
 */
export async function getRandomEventAlbum(): Promise<RandomEventAlbum | null> {
  if (demoMode) {
    const candidates = demo.demoMyAttendedApprovedPhotos();
    if (candidates.length === 0) return null;
    const eventIds = [...new Set(candidates.map((p) => p.eventId))];
    const pickedEventId = eventIds[Math.floor(Math.random() * eventIds.length)];
    const photosForEvent = candidates.filter((p) => p.eventId === pickedEventId);
    return {
      eventId: pickedEventId,
      photoUrls: sampleRandom(photosForEvent, RANDOM_ALBUM_MAX_PHOTOS).map((p) => p.url),
    };
  }

  const supabase = await createClient();
  const { data } = await supabase.rpc("random_moment_album");
  const rows = (data ?? []) as { event_id: string; storage_path: string }[];
  if (rows.length === 0) return null;

  const paths = rows.map((r) => r.storage_path);
  const urlByPath = await createSignedUrlsCached(supabase, "event-photos", paths);
  const photoUrls = rows.flatMap((r) => {
    const url = urlByPath.get(r.storage_path);
    return url ? [url] : [];
  });
  if (photoUrls.length === 0) return null;

  return { eventId: rows[0].event_id, photoUrls };
}

// -------------------------------------------------------------- דף ניהול

export type AdminEvent = SwellEvent & {
  goingCount: number;
  cameCount: number;
  femaleCame: number;
  maleCame: number;
  /** מי בפועל נכח (כולל הוספה ידנית) — למטריצת הנוכחות של כל המפגשים. */
  attendedProfileIds: string[];
};
/**
 * קרובים (מהקרוב ביותר) ושהיו (מהאחרון ביותר), מתוך events שכבר
 * הגיע מ-getAdminData ממוין מהחדש לישן — אותו דפוס בדיוק כמו
 * getUpcomingEvents/getPastEvents, רק בלי שאילתה נפרדת כי כל האירועים
 * כבר בזיכרון עם הסטטיסטיקות שלהם. פונקציה רגילה ולא קומפוננטה, כדי
 * ש-Date.now() לא ייחשב קריאה לא-טהורה בתוך רינדור (react-hooks/purity).
 */
export function splitAdminEvents(events: AdminEvent[], pastLimit?: number) {
  const now = Date.now();
  const upcoming = [...events]
    .filter((e) => new Date(e.starts_at).getTime() >= now)
    .sort((a, b) => a.starts_at.localeCompare(b.starts_at));
  const pastAll = events.filter((e) => new Date(e.starts_at).getTime() < now);
  const past = pastLimit ? pastAll.slice(0, pastLimit) : pastAll;
  return { upcoming, past, pastAll };
}

export type AdminMember = {
  profile: Profile;
  role: MemberRole;
  attendedCount: number;
  /** הסלפי האחרון — כדי שהמנהלת תזהה פנים ברשימה, לא רק שמות */
  latestSelfieUrl: string | null;
  // מרכז הפנים של latestSelfieUrl (0–1). ראו lib/face-position.ts
  latestFaceX: number | null;
  latestFaceY: number | null;
  // מ-auth.users, לא מ-profiles — יש רק לייצוא ה-CSV. null בהדגמה.
  email: string | null;
};

/** אימייל חי רק ב-auth.users (Supabase Auth), לא בטבלת profiles — הדרך
 * היחידה לקרוא אותו היא ה-admin API עם service_role, כמו ב-
 * api/email/notify-restored. נקרא במקביל לכל המזהים כי מספר החברים
 * בקהילה קטן, ואין endpoint לקרוא כמה משתמשים לפי מזהה בבת אחת. */
async function emailsByProfileId(
  profileIds: string[],
): Promise<Map<string, string>> {
  if (profileIds.length === 0) return new Map();
  const db = adminDb();
  const results = await Promise.all(
    profileIds.map((id) => db.auth.admin.getUserById(id)),
  );
  const map = new Map<string, string>();
  results.forEach(({ data }, i) => {
    if (data?.user?.email) map.set(profileIds[i], data.user.email);
  });
  return map;
}

/**
 * includeEmail: ברירת מחדל false בכוונה - מייל עולה פנייה נפרדת
 * לשרת האימייל של Supabase *לכל חבר/ה בנפרד* (emailsByProfileId
 * למטה), לא מגיע חינם באותה שאילתה כמו שאר השדות. אף אחד מ-8 עמודי
 * הרשימה/גרפים שקוראים לפונקציה הזו לא מציג מייל על המסך - רק שני
 * ייצואי ה-CSV ("חברים", "אקסים") שבאמת צריכים אותו מעבירים
 * includeEmail: true במפורש. בקנה מידה גדול (מאות חברים) זה ההבדל
 * בין "0 פניות מיותרות" ל"מאות פניות מיותרות" בכל טעינת עמוד.
 */
export async function getAdminData(
  clubId: string,
  { includeEmail = false }: { includeEmail?: boolean } = {},
) {
  if (demoMode) {
    const rsvps = demo.demoRsvps();
    const attendances = demo.demoAttendances();
    const profileById = new Map(demo.demoProfiles().map((p) => [p.id, p]));

    const events: AdminEvent[] = demo
      .demoEvents()
      .sort((a, b) => b.starts_at.localeCompare(a.starts_at))
      .map((e) => {
        const eventAttendances = attendances.filter((a) => a.eventId === e.id);
        return {
          ...e,
          goingCount: rsvps.filter((r) => r.eventId === e.id && r.going).length,
          cameCount: eventAttendances.length,
          femaleCame: eventAttendances.filter(
            (a) => profileById.get(a.profileId)?.gender === "female",
          ).length,
          maleCame: eventAttendances.filter(
            (a) => profileById.get(a.profileId)?.gender === "male",
          ).length,
          attendedProfileIds: eventAttendances.map((a) => a.profileId),
        };
      });

    const eventOrder = new Map(
      demo.demoEvents().map((e) => [e.id, e.starts_at]),
    );
    const toAdminMember = (profile: Profile): AdminMember => {
      const mine = attendances
        .filter((a) => a.profileId === profile.id)
        .sort((x, y) =>
          (eventOrder.get(y.eventId) ?? "").localeCompare(
            eventOrder.get(x.eventId) ?? "",
          ),
        );
      const latest = mine.find((a) => a.selfie);
      return {
        profile,
        role: profile.id === demo.demoMeId ? demo.demoMyRole() : "member",
        attendedCount: mine.length,
        latestSelfieUrl: latest?.selfie ?? null,
        latestFaceX: latest?.faceX ?? null,
        latestFaceY: latest?.faceY ?? null,
        email: null,
      };
    };

    // demoProfiles() כולל גם מי שכבר הוסר/עזב (הפרופיל לא נמחק, ראו
    // הערה על removedMemberIds ב-lib/demo/store.ts) — בדיוק הקבוצה
    // הדרושה לדוחות ההיסטוריים. demoActiveProfiles() מסנן אותם/ן
    // החוצה, לרשימת "חברי הקהילה" הפעילה בלבד.
    const members: AdminMember[] = demo
      .demoActiveProfiles()
      .map(toAdminMember);
    const historicalMembers: AdminMember[] = demo
      .demoProfiles()
      .map(toAdminMember);

    return { events, members, historicalMembers };
  }

  const supabase = await createClient();
  const [{ data: eventRows }, { data: memberRows }] = await Promise.all([
    supabase
      .from("events")
      .select(
        "*, rsvps(profile_id, going), attendances(profile_id, selfie_path, checked_in_at, face_x, face_y, profiles(gender))",
      )
      .eq("club_id", clubId)
      .order("starts_at", { ascending: false }),
    supabase
      .from("club_members")
      // עמודות מפורשות, לא "*" — אותה סיבה כמו ב-getMemberProfile:
      // "*" על profiles הייתה שולחת גם כל עמודה עתידית שתתווסף לטבלה
      // בלי החלטה מודעת. הרשימה כאן היא בדיוק מה שבאמת בשימוש היום
      // (בכרטיסי רשימה ובדוחות ה-CSV) - לא avatar_path/privacy_accepted_at/
      // legal_version, שאף אחד לא קורא דרך AdminMember.profile בשום מקום.
      .select(
        "profile_id, role, status, profiles(id, full_name, phone, instagram, birth_date, city, gender, swim_level, waiver_accepted_at, created_at)",
      )
      // ממתינים לאישור לא "חברים" עדיין — יש להם סעיף נפרד
      // (getPendingMembers) עם כפתורי אישור/דחייה, לא רשימה עם 0 נוכחויות.
      // מי שהוסר/ה כן נכלל/ת כאן (לא מסונן/ת ב-SQL) — צריך אותם/ן
      // בהמשך לדוחות ההיסטוריים (attendanceMatrixCsv), גם אם לא ברשימת
      // "חברי הקהילה" הפעילה עצמה. הסינון בפועל קורה למטה, בקוד.
      .eq("club_id", clubId)
      .neq("status", "pending"),
  ]);

  const rows = (eventRows ?? []) as unknown as (SwellEvent & {
    rsvps: { profile_id: string; going: boolean }[];
    attendances: {
      profile_id: string;
      selfie_path: string | null;
      checked_in_at: string;
      face_x: number | null;
      face_y: number | null;
      profiles: { gender: Gender | null } | null;
    }[];
  })[];

  // המפגשים כבר ממוינים מהחדש לישן, ולכן הסלפי הראשון שנתקלים בו
  // לכל אדם הוא העדכני ביותר
  const latestPathByProfile = new Map<string, string>();
  const latestFaceByProfile = new Map<
    string,
    { x: number | null; y: number | null }
  >();
  for (const event of rows) {
    for (const a of event.attendances) {
      if (a.selfie_path && !latestPathByProfile.has(a.profile_id)) {
        latestPathByProfile.set(a.profile_id, a.selfie_path);
        latestFaceByProfile.set(a.profile_id, { x: a.face_x, y: a.face_y });
      }
    }
  }

  const latestPaths = [...latestPathByProfile.values()];
  const urlByLatestPath = await createSignedUrlsCached(supabase, "selfies", latestPaths);

  const attendedByProfile = new Map<string, number>();
  for (const event of rows) {
    for (const a of event.attendances) {
      attendedByProfile.set(
        a.profile_id,
        (attendedByProfile.get(a.profile_id) ?? 0) + 1,
      );
    }
  }

  const events: AdminEvent[] = rows.map((e) => ({
    ...e,
    goingCount: e.rsvps.filter((r) => r.going).length,
    cameCount: e.attendances.length,
    femaleCame: e.attendances.filter((a) => a.profiles?.gender === "female")
      .length,
    maleCame: e.attendances.filter((a) => a.profiles?.gender === "male")
      .length,
    attendedProfileIds: e.attendances.map((a) => a.profile_id),
  }));

  const memberRowsTyped = (memberRows ?? []) as unknown as {
    profile_id: string;
    role: MemberRole;
    status: MemberStatus;
    profiles: Profile | null;
  }[];

  const emailByProfileId = includeEmail
    ? await emailsByProfileId(memberRowsTyped.map((m) => m.profile_id))
    : new Map<string, string>();

  const toAdminMember = (m: (typeof memberRowsTyped)[number]): AdminMember[] =>
    m.profiles
      ? [
          {
            profile: m.profiles,
            role: m.role,
            attendedCount: attendedByProfile.get(m.profile_id) ?? 0,
            latestSelfieUrl: (() => {
              const path = latestPathByProfile.get(m.profile_id);
              return path ? (urlByLatestPath.get(path) ?? null) : null;
            })(),
            latestFaceX: latestFaceByProfile.get(m.profile_id)?.x ?? null,
            latestFaceY: latestFaceByProfile.get(m.profile_id)?.y ?? null,
            email: emailByProfileId.get(m.profile_id) ?? null,
          },
        ]
      : [];

  // club_members לא מגיעה עם order() — בלי מיון מפורש הסדר תלוי
  // בהתנהגות פנימית של Postgres, לא בהצטרפות בפועל. החדשים קודם.
  const byJoinDateDesc = (a: AdminMember, b: AdminMember) =>
    b.profile.created_at.localeCompare(a.profile.created_at);

  // "חברי הקהילה" הפעילים — הרשימה בעמוד עצמו, וגם ייצוא ה"חברים"
  // (פרטי קשר של מי שבאמת חבר/ה היום, לא מי שכבר עזב/הוסר).
  const members: AdminMember[] = memberRowsTyped
    .filter((m) => m.status === "approved")
    .flatMap(toAdminMember)
    .sort(byJoinDateDesc);

  // חברים פעילים + מי שהוסר/עזב — למטריצת הנוכחות ההיסטורית
  // (attendanceMatrixCsv) ולדוח נוכחות למפגש ספציפי. מי שנכח/ה בעבר
  // אמור/ה להישאר בדוחות האלה גם אחרי שכבר לא חבר/ה בקהילה — אחרת
  // ההיסטוריה נעלמת מהדוחות בדיוק כמו שכמעט נעלמה מעמוד הפרופיל (BIZ-1).
  const historicalMembers: AdminMember[] = memberRowsTyped
    .flatMap(toAdminMember)
    .sort(byJoinDateDesc);

  return { events, members, historicalMembers };
}

export type RecentEventStats = {
  eventId: string;
  startsAt: string;
  locationName: string;
  maleCount: number;
  femaleCount: number;
  /** כמה סימנו "אני בא/ה" (RSVP going=true) - לא רק מי שבאמת הגיע/ה. */
  goingCount: number;
  /** סה"כ נוכחות אמיתית - כולל gender='other', בניגוד ל-male+femaleCount. */
  attendedCount: number;
};

/**
 * סטטיסטיקה לכל אחד מה-N המפגשים האחרונים שכבר קרו - משותף לכמה
 * גרפים ב-admin/insights (לפי מגדר, RSVP מול הגעה בפועל וכו'), כדי
 * שלא כל גרף ישלוף את אותם N מפגשים בנפרד. בכוונה **לא** דרך
 * getAdminData: זו שאילתה צרה ומוגבלת (רק N מפגשים), לא "להביא את
 * כל ההיסטוריה ולחתוך בג'אווהסקריפט" - בדיוק העיקרון שהוצע בהצעת
 * הדשבורד עצמה. מחזירה מהחדש לישן (שיר ביקשה שה"היום" יהיה בצד
 * ימין של הגרף - במסמך RTL, האיבר הראשון במערך מוצג הכי ימני).
 *
 * maleCount/femaleCount לא כוללים gender='other' - גרף המגדר מציג
 * במפורש רק שני טורים, לא "סה"כ כולל" עם קטגוריה שלישית נסתרת.
 */
export async function getRecentEventStats(
  clubId: string,
  limit = 8,
): Promise<RecentEventStats[]> {
  if (demoMode) {
    const attendances = demo.demoAttendances();
    const rsvps = demo.demoRsvps();
    const profileById = new Map(demo.demoProfiles().map((p) => [p.id, p]));
    const now = Date.now();

    const recent = demo
      .demoEvents()
      .filter((e) => new Date(e.starts_at).getTime() < now)
      .sort((a, b) => b.starts_at.localeCompare(a.starts_at))
      .slice(0, limit);

    return recent.map((e) => {
      const eventAttendances = attendances.filter((a) => a.eventId === e.id);
      return {
        eventId: e.id,
        startsAt: e.starts_at,
        locationName: e.location_name,
        maleCount: eventAttendances.filter(
          (a) => profileById.get(a.profileId)?.gender === "male",
        ).length,
        femaleCount: eventAttendances.filter(
          (a) => profileById.get(a.profileId)?.gender === "female",
        ).length,
        goingCount: rsvps.filter((r) => r.eventId === e.id && r.going).length,
        attendedCount: eventAttendances.length,
      };
    });
  }

  const supabase = await createClient();
  const { data } = await supabase
    .from("events")
    .select(
      "id, starts_at, location_name, attendances(profiles(gender)), rsvps(going)",
    )
    .eq("club_id", clubId)
    .lt("starts_at", new Date().toISOString())
    .order("starts_at", { ascending: false })
    .limit(limit);

  const rows = (data ?? []) as unknown as {
    id: string;
    starts_at: string;
    location_name: string;
    attendances: { profiles: { gender: Gender | null } | null }[];
    rsvps: { going: boolean }[];
  }[];

  return rows.map((e) => ({
    eventId: e.id,
    startsAt: e.starts_at,
    locationName: e.location_name,
    maleCount: e.attendances.filter((a) => a.profiles?.gender === "male")
      .length,
    femaleCount: e.attendances.filter((a) => a.profiles?.gender === "female")
      .length,
    goingCount: e.rsvps.filter((r) => r.going).length,
    attendedCount: e.attendances.length,
  }));
}

export type NewVsReturningStats = {
  eventId: string;
  startsAt: string;
  locationName: string;
  /** זו הפעם הראשונה אי-פעם שהאדם הזה נכח/ה בכל מפגש שהוא. */
  newCount: number;
  returningCount: number;
};

/**
 * גרף 3: כמה מהמגיעים לכל אחד מה-N המפגשים האחרונים חדשים (לא נכחו
 * מעולם לפני כן) מול חוזרים. שני שלבים, שניהם מוגבלים בהיקף בכוונה
 * (לא "להביא את כל ההיסטוריה"): (1) רק N המפגשים האחרונים ומי שנכח
 * בהם, (2) רק ההיסטוריה המלאה של **אותם אנשים ספציפית** (כדי לדעת
 * מתי הייתה הפעם הראשונה שלהם), לא של כל חברי הקהילה.
 */
export async function getNewVsReturningByEvent(
  clubId: string,
  limit = 8,
): Promise<NewVsReturningStats[]> {
  if (demoMode) {
    const attendances = demo.demoAttendances();
    const now = Date.now();
    const eventStartsById = new Map(
      demo.demoEvents().map((e) => [e.id, e.starts_at]),
    );

    const recent = demo
      .demoEvents()
      .filter((e) => new Date(e.starts_at).getTime() < now)
      .sort((a, b) => b.starts_at.localeCompare(a.starts_at))
      .slice(0, limit);

    const firstAttendanceByProfile = new Map<string, string>();
    for (const a of attendances) {
      const startsAt = eventStartsById.get(a.eventId);
      if (!startsAt) continue;
      const existing = firstAttendanceByProfile.get(a.profileId);
      if (!existing || startsAt < existing) {
        firstAttendanceByProfile.set(a.profileId, startsAt);
      }
    }

    return recent.map((e) => {
      const eventAttendances = attendances.filter((a) => a.eventId === e.id);
      let newCount = 0;
      let returningCount = 0;
      for (const a of eventAttendances) {
        if (firstAttendanceByProfile.get(a.profileId) === e.starts_at) {
          newCount++;
        } else {
          returningCount++;
        }
      }
      return {
        eventId: e.id,
        startsAt: e.starts_at,
        locationName: e.location_name,
        newCount,
        returningCount,
      };
    });
  }

  const supabase = await createClient();
  const { data: eventRows } = await supabase
    .from("events")
    .select("id, starts_at, location_name, attendances(profile_id)")
    .eq("club_id", clubId)
    .lt("starts_at", new Date().toISOString())
    .order("starts_at", { ascending: false })
    .limit(limit);

  const events = (eventRows ?? []) as unknown as {
    id: string;
    starts_at: string;
    location_name: string;
    attendances: { profile_id: string }[];
  }[];
  if (events.length === 0) return [];

  const profileIds = [
    ...new Set(events.flatMap((e) => e.attendances.map((a) => a.profile_id))),
  ];
  if (profileIds.length === 0) {
    return events.map((e) => ({
      eventId: e.id,
      startsAt: e.starts_at,
      locationName: e.location_name,
      newCount: 0,
      returningCount: 0,
    }));
  }

  // רק ההיסטוריה של מי שבאמת נכח/ה באחד מה-N המפגשים - לא של כל
  // חברי הקהילה - כדי למצוא מתי הייתה הפעם הראשונה של כל אחד/ת מהם.
  const { data: historyRows } = await supabase
    .from("attendances")
    .select("profile_id, events(starts_at)")
    .in("profile_id", profileIds);

  const history = (historyRows ?? []) as unknown as {
    profile_id: string;
    events: { starts_at: string } | null;
  }[];

  const firstAttendanceByProfile = new Map<string, string>();
  for (const row of history) {
    const startsAt = row.events?.starts_at;
    if (!startsAt) continue;
    const existing = firstAttendanceByProfile.get(row.profile_id);
    if (!existing || startsAt < existing) {
      firstAttendanceByProfile.set(row.profile_id, startsAt);
    }
  }

  return events.map((e) => {
    let newCount = 0;
    let returningCount = 0;
    for (const a of e.attendances) {
      if (firstAttendanceByProfile.get(a.profile_id) === e.starts_at) {
        newCount++;
      } else {
        returningCount++;
      }
    }
    return {
      eventId: e.id,
      startsAt: e.starts_at,
      locationName: e.location_name,
      newCount,
      returningCount,
    };
  });
}

export type GenderBreakdown = { maleCount: number; femaleCount: number };

/**
 * חלוקת כל חברי הקהילה הפעילים (לא רק 8 המפגשים האחרונים) לפי מגדר -
 * לתרשים העוגה "נשים מול גברים". שאילתה שטוחה שלא תלויה בהיסטוריית
 * מפגשים - גדלה עם מספר החברים (איטי), לא עם מספר המפגשים (מצטבר
 * כל שבוע) - לכן לא זקוקה לאותה הגבלת-היקף כמו גרפי האירועים.
 * לא כולל gender='other', כמו גרף 1 - שני טורים בלבד בכוונה.
 */
export async function getGenderBreakdown(
  clubId: string,
): Promise<GenderBreakdown> {
  if (demoMode) {
    const profiles = demo.demoActiveProfiles();
    return {
      maleCount: profiles.filter((p) => p.gender === "male").length,
      femaleCount: profiles.filter((p) => p.gender === "female").length,
    };
  }

  const supabase = await createClient();
  const { data } = await supabase
    .from("club_members")
    .select("profiles(gender)")
    .eq("club_id", clubId)
    .eq("status", "approved");

  const rows = (data ?? []) as unknown as {
    profiles: { gender: Gender | null } | null;
  }[];
  return {
    maleCount: rows.filter((r) => r.profiles?.gender === "male").length,
    femaleCount: rows.filter((r) => r.profiles?.gender === "female").length,
  };
}

export type TenureBreakdown = {
  /** אושרו כחברים, אבל מעולם לא נכחו באף מפגש. */
  ghostCount: number;
  oneTimeCount: number;
  occasionalCount: number;
  regularCount: number;
};

export type TenureBucket = "ghost" | "oneTime" | "occasional" | "regular";

/** אותם סיפים בדיוק בכל מקום שצריך לדעת "לאיזה דלי ותק שייך X" - גם
 * כאן (לעוגה), גם בעמוד הפירוט admin/insights/tenure שמסנן לפיהם. */
export function tenureBucket(attendedCount: number): TenureBucket {
  if (attendedCount === 0) return "ghost";
  if (attendedCount === 1) return "oneTime";
  if (attendedCount <= 3) return "occasional";
  return "regular";
}

function bucketTenure(counts: number[]): TenureBreakdown {
  const result: TenureBreakdown = {
    ghostCount: 0,
    oneTimeCount: 0,
    occasionalCount: 0,
    regularCount: 0,
  };
  for (const c of counts) {
    const bucket = tenureBucket(c);
    if (bucket === "ghost") result.ghostCount++;
    else if (bucket === "oneTime") result.oneTimeCount++;
    else if (bucket === "occasional") result.occasionalCount++;
    else result.regularCount++;
  }
  return result;
}

/**
 * ותק חברים: לכל חבר/ה מאושר/ת, כמה פעמים נכח/ה אי-פעם - לא רק
 * ב-8 המפגשים האחרונים, זו שאלה על הוותק המלא. 4 דליים, כולל
 * "רוח רפאים" (אושרו אך מעולם לא נכחו) - דלי שלא היה בהצעה
 * המקורית (3 דליים בלבד).
 *
 * ⚠️ בשונה מגרפי "8 המפגשים האחרונים": זו מדידת-אורך-חיים מטבעה
 * (אי אפשר להגביל אותה ל"8 אחרונים" בלי לשנות את המשמעות שלה), אז
 * השאילתה גדלה עם סך-כל הנוכחויות אי-פעם, לא עם מספר המפגשים
 * שבדקנו - שולפת רק עמודת profile_id (בלי join) כדי שזה יישאר כמה
 * שיותר זול. בקנה מידה גדול בהרבה (אלפי נוכחויות בשנה) כדאי לשקול
 * מעבר לספירה בצד המסד (RPC) במקום שליפת כל השורות - לא נדרש כרגע.
 */
export async function getTenureBreakdown(
  clubId: string,
): Promise<TenureBreakdown> {
  if (demoMode) {
    const profiles = demo.demoActiveProfiles();
    const attendances = demo.demoAttendances();
    const countByProfile = new Map<string, number>();
    for (const a of attendances) {
      countByProfile.set(a.profileId, (countByProfile.get(a.profileId) ?? 0) + 1);
    }
    return bucketTenure(profiles.map((p) => countByProfile.get(p.id) ?? 0));
  }

  const supabase = await createClient();
  const { data: memberRows } = await supabase
    .from("club_members")
    .select("profile_id")
    .eq("club_id", clubId)
    .eq("status", "approved");
  const memberIds = (memberRows ?? []).map((r) => r.profile_id as string);
  if (memberIds.length === 0) {
    return { ghostCount: 0, oneTimeCount: 0, occasionalCount: 0, regularCount: 0 };
  }

  const { data: attendanceRows } = await supabase
    .from("attendances")
    .select("profile_id")
    .in("profile_id", memberIds);

  const countByProfile = new Map<string, number>();
  for (const row of (attendanceRows ?? []) as { profile_id: string }[]) {
    countByProfile.set(row.profile_id, (countByProfile.get(row.profile_id) ?? 0) + 1);
  }

  return bucketTenure(memberIds.map((id) => countByProfile.get(id) ?? 0));
}

export type ActiveMembersTrend = {
  current: number;
  diff: number;
  sparkline: number[];
};

/**
 * כמה חברי קהילה שונים הגיעו לפחות למפגש אחד ב-30 הימים האחרונים,
 * עם מגמה מול 30 הימים שלפני כן וגרף-זרם שבועי (8 נקודות). שאילתה
 * אחת מוגבלת ל-79 יום אחורה בלבד (49 לנקודות הגרף + 30 לחלון
 * הגלילה הראשון שלו) - לא כל ההיסטוריה, בדיוק כמו גרפי "8 המפגשים
 * האחרונים".
 */
export async function getActiveMembersTrend(
  clubId: string,
): Promise<ActiveMembersTrend> {
  const now = new Date();
  const since = new Date(now);
  since.setDate(since.getDate() - 79);

  let rows: { profileId: string; startsAtMs: number }[];
  if (demoMode) {
    const eventStartsById = new Map(
      demo.demoEvents().map((e) => [e.id, e.starts_at]),
    );
    rows = demo
      .demoAttendances()
      .map((a) => {
        const startsAt = eventStartsById.get(a.eventId);
        return { profileId: a.profileId, startsAtMs: startsAt ? new Date(startsAt).getTime() : NaN };
      })
      .filter((r) => !Number.isNaN(r.startsAtMs) && r.startsAtMs >= since.getTime());
  } else {
    const supabase = await createClient();
    const { data } = await supabase
      .from("attendances")
      .select("profile_id, events!inner(starts_at, club_id)")
      .eq("events.club_id", clubId)
      .gte("events.starts_at", since.toISOString());

    rows = (
      (data ?? []) as unknown as {
        profile_id: string;
        events: { starts_at: string } | null;
      }[]
    )
      .filter((r) => r.events?.starts_at)
      .map((r) => ({
        profileId: r.profile_id,
        startsAtMs: new Date(r.events!.starts_at).getTime(),
      }));
  }

  const activeCount = (windowEnd: Date) => {
    const windowStartMs = windowEnd.getTime() - 30 * 24 * 60 * 60 * 1000;
    const windowEndMs = windowEnd.getTime();
    const ids = new Set(
      rows
        .filter((r) => r.startsAtMs > windowStartMs && r.startsAtMs <= windowEndMs)
        .map((r) => r.profileId),
    );
    return ids.size;
  };

  const current = activeCount(now);
  const previousEnd = new Date(now);
  previousEnd.setDate(previousEnd.getDate() - 30);
  const previous = activeCount(previousEnd);

  const sparkline = Array.from({ length: 8 }, (_, i) => {
    const end = new Date(now);
    end.setDate(end.getDate() - 7 * (7 - i));
    return activeCount(end);
  });

  return { current, diff: current - previous, sparkline };
}

export type ReturnRateTrend = {
  current: number;
  sparkline: number[];
};

/**
 * אחוז ממי שהגיע/ה לראשונה אי-פעם שחזר/ה שוב בכל שלב (לא רק מיד).
 * "זכאי/ת להיבדק" רק מי שכבר התקיימו 2 מפגשים אחרי הראשון שלו/ה -
 * ציר-מפגשים, לא ימים בלוח (לפי שיר: מפגשים תלויים בתנאי ים, לא
 * בלו"ז שבועי קבוע, אז "שבועיים" יכול להיות גם אפס מפגשים וגם
 * שלושה). אבל בשונה מגרסה קודמת: חזרה מאוחרת *כן* "מתקנת" את
 * הסטטוס - מי שפספס/ה את שני המפגשים הבאים אבל כן חזר/ה אחר כך
 * נספר/ת כ"חזר/ה", לא נשאר/ת "לא חזר/ה" לצמיתות. ה-2 המפגשים
 * קובעים רק *מתי מותר לשפוט* (אחרת כל טרי/ה "מוריד/ה" את האחוז סתם
 * כי עוד לא הספיק/ה), לא *מה* נספר כחזרה. ⚠️ כמו getTenureBreakdown
 * למעלה: שואבת את כל היסטוריית המפגשים/הנוכחות (לא רק 8 אחרונים) כי
 * "הפעם הראשונה אי-פעם" היא מדידת-אורך-חיים מטבעה.
 */
export async function getReturnRateTrend(
  clubId: string,
): Promise<ReturnRateTrend> {
  const now = Date.now();

  let events: { id: string; startsAtMs: number }[];
  let attendances: { profileId: string; eventId: string }[];

  if (demoMode) {
    events = demo
      .demoEvents()
      .map((e) => ({ id: e.id, startsAtMs: new Date(e.starts_at).getTime() }));
    attendances = demo
      .demoAttendances()
      .map((a) => ({ profileId: a.profileId, eventId: a.eventId }));
  } else {
    const supabase = await createClient();
    const [{ data: eventRows }, { data: attendanceRows }] = await Promise.all([
      supabase.from("events").select("id, starts_at").eq("club_id", clubId),
      supabase
        .from("attendances")
        .select("profile_id, event_id, events!inner(club_id)")
        .eq("events.club_id", clubId),
    ]);
    events = ((eventRows ?? []) as { id: string; starts_at: string }[]).map(
      (e) => ({ id: e.id, startsAtMs: new Date(e.starts_at).getTime() }),
    );
    attendances = (
      (attendanceRows ?? []) as unknown as {
        profile_id: string;
        event_id: string;
      }[]
    ).map((a) => ({ profileId: a.profile_id, eventId: a.event_id }));
  }

  // רק מפגשים שכבר קרו, ממוינים כרונולוגית - "שני המפגשים הבאים"
  // אחרי מפגש כלשהו לא יכולים להיות מפגשים עתידיים שעוד לא התקיימו.
  const pastEvents = events
    .filter((e) => e.startsAtMs <= now)
    .sort((a, b) => a.startsAtMs - b.startsAtMs);
  const eventIndexById = new Map(pastEvents.map((e, i) => [e.id, i]));

  const attendedIndexesByProfile = new Map<string, number[]>();
  for (const a of attendances) {
    const idx = eventIndexById.get(a.eventId);
    if (idx === undefined) continue;
    const list = attendedIndexesByProfile.get(a.profileId) ?? [];
    list.push(idx);
    attendedIndexesByProfile.set(a.profileId, list);
  }
  for (const list of attendedIndexesByProfile.values()) list.sort((a, b) => a - b);

  // cutoff מדמה "כמה מפגשים קיימים" בנקודת-בדיקה נתונה - ציר המפגשים
  // עצמו, לא תאריך בלוח (לנקודות הגרף, ראו למטה). זכאי/ת להיבדק רק
  // מי שגם המפגש הראשון שלו/ה וגם שני המפגשים שאחריו כבר בתוך ה-cutoff -
  // אבל "חזר/ה" נבדק מול כל ההיסטוריה הגלויה עד cutoff, לא רק אותם
  // שני מפגשים - חזרה מאוחרת יותר כן סופרת.
  const rateAtCutoff = (cutoff: number) => {
    let eligible = 0;
    let returned = 0;
    for (const indexes of attendedIndexesByProfile.values()) {
      const visible = indexes.filter((i) => i <= cutoff);
      if (visible.length === 0) continue;
      const first = visible[0];
      if (first + 2 > cutoff) continue;
      eligible++;
      if (visible.length >= 2) returned++;
    }
    return eligible === 0 ? 0 : Math.round((returned / eligible) * 100);
  };

  const lastIndex = pastEvents.length - 1;
  const current = lastIndex >= 0 ? rateAtCutoff(lastIndex) : 0;

  // עד 8 נקודות על ציר המפגשים (לא על ציר הזמן בלוח) - דורש לפחות 3
  // מפגשים שהיו כדי שתהיה אפילו נקודת-זכאות אפשרית אחת.
  const sparkline: number[] = [];
  if (lastIndex >= 2) {
    const start = 2;
    const pointCount = Math.min(8, lastIndex + 1 - start);
    const step = (lastIndex - start) / Math.max(pointCount - 1, 1);
    for (let i = 0; i < pointCount; i++) {
      sparkline.push(rateAtCutoff(Math.round(start + step * i)));
    }
  }

  return { current, sparkline };
}

export type OutreachMember = AdminMember & {
  /** המפגש האחרון שבו נכח/ה בפועל - העוגן של "כבר דיברתי איתו/ה". */
  lastAttendedEventId: string;
  contacted: boolean;
};

/**
 * חברי קהילה שהגיעו לפחות פעם אחת אי-פעם, אבל לא הגיעו לאף אחד משני
 * המפגשים האחרונים שהיו - "צריך ליצור איתם קשר", לפי שיר (עמוד
 * admin/outreach, "אורחים"). מחושבת מחדש בכל טעינה, לא דגל שמור -
 * ברגע שמישהו חוזר הוא פשוט לא מופיע יותר ברשימה, וחוזר להופיע אם
 * שוב לא הגיע לשני מפגשים - בלי שום לוגיקת-מצב נפרדת. רק חברים
 * מאושרים כרגע - מי שכבר עזב/הוסר לא רלוונטי כאן, שיר מטפלת בהם
 * דרך "אקסים". לא שאילתה נוספת לרשימה עצמה - `getAdminData` כבר
 * מביאה `attendedProfileIds` לכל מפגש.
 *
 * `contacted`: סימון "דיברתי איתו/ה" (outreach_contacts, 0070) -
 * תקף רק אם ה-eventId שנשמר בזמן הסימון תואם בדיוק את המפגש האחרון
 * שבו האדם נכח *כרגע*. אם האדם הגיע למפגש חדש מאז הסימון (אפילו אם
 * חזר אחר כך להיעדר ושוב מופיע ברשימה) - העוגן הישן כבר לא תואם,
 * אז `contacted` חוזר להיות false אוטומטית, בלי לנקות שום דבר ידנית.
 */
/**
 * חברי קהילה מאושרים שמעולם לא הגיעו לאף מפגש - "רוח רפאים",
 * לפי ההצעה המקורית ב"הצעה לארכיטקטורה" (עמוד admin/ghosts). שונה
 * מ"אורחים": אורחים הגיעו בעבר ופסקו, כאן מדובר במי שנרשם/ה ומעולם
 * לא הגיע/ה בכלל - אותה קטגוריה בדיוק כמו "רוח רפאים" בעוגת הוותק
 * (tenureBucket), רק כרשימת שמות במקום אחוז. לא שאילתה נוספת -
 * מסננת את ה-members שכבר מגיעים מ-getAdminData.
 */
export async function getGhostMembers(clubId: string): Promise<AdminMember[]> {
  const { members } = await getAdminData(clubId);
  return members.filter((m) => tenureBucket(m.attendedCount) === "ghost");
}

export async function getNeedsOutreachMembers(
  clubId: string,
): Promise<OutreachMember[]> {
  const { events, members } = await getAdminData(clubId);

  const now = Date.now();
  const pastEventsDesc = events
    .filter((e) => new Date(e.starts_at).getTime() <= now)
    .sort((a, b) => b.starts_at.localeCompare(a.starts_at));
  if (pastEventsDesc.length < 2) return [];

  const recentAttendeeIds = new Set(
    pastEventsDesc.slice(0, 2).flatMap((e) => e.attendedProfileIds),
  );

  const candidates = members.filter(
    (m) => m.attendedCount > 0 && !recentAttendeeIds.has(m.profile.id),
  );
  if (candidates.length === 0) return [];

  const lastAttendedEventId = new Map<string, string>();
  for (const event of pastEventsDesc) {
    for (const profileId of event.attendedProfileIds) {
      if (!lastAttendedEventId.has(profileId)) {
        lastAttendedEventId.set(profileId, event.id);
      }
    }
  }

  const contactedEventIdByProfile = new Map<string, string>();
  if (demoMode) {
    for (const m of candidates) {
      const stored = demo.demoGetOutreachContact(m.profile.id);
      if (stored) contactedEventIdByProfile.set(m.profile.id, stored);
    }
  } else {
    const supabase = await createClient();
    const { data } = await supabase
      .from("outreach_contacts")
      .select("profile_id, last_attended_event_id")
      .eq("club_id", clubId);
    for (const row of (data ?? []) as {
      profile_id: string;
      last_attended_event_id: string;
    }[]) {
      contactedEventIdByProfile.set(row.profile_id, row.last_attended_event_id);
    }
  }

  return candidates.map((m) => {
    const anchor = lastAttendedEventId.get(m.profile.id) ?? "";
    return {
      ...m,
      lastAttendedEventId: anchor,
      contacted: contactedEventIdByProfile.get(m.profile.id) === anchor,
    };
  });
}

/**
 * שלושת דוחות ה-CSV של עמוד הניהול (חברים/מפגשים/מטריצת הגעה) —
 * נשלפים ונבנים רק כשבאמת לוחצים על כפתור הייצוא הרלוונטי, לא בכל
 * טעינה של עמוד הניהול (ראו דיון ביצועים ב"ביקורת הביצועים והתשתית").
 * כל פונקציה כאן עצמאית (קוראת ל-getAdminData בעצמה), באותו דפוס
 * בדיוק כמו getEventAttendanceReport למטה.
 */
export async function getAdminMembersReport(
  clubId: string,
): Promise<string[][]> {
  const { events, members } = await getAdminData(clubId, { includeEmail: true });

  // המכנה של אחוז ההגעה הוא מפגשים שכבר אפשר היה לסמן בהם נוכחות
  // (חלון הצ'ק-אין נפתח), לא רק מפגשים שהסתיימו - אחרת מי שסימן
  // הגעה למפגש שנפתח עכשיו מקבל "3 מתוך 2".
  const heldCount = events.filter(
    (e) => checkInWindow(e).status !== "before",
  ).length;

  return [
    [
      "שם",
      "מגדר",
      "גיל",
      "תאריך לידה",
      "עיר מגורים",
      "טלפון",
      "אימייל",
      "אינסטגרם",
      "רמת שחייה",
      "תאריך הצטרפות",
      "מפגשים",
      "אחוז הגעה",
      "אישרו את תנאי ההצטרפות",
    ],
    // members כבר ממוין לפי תאריך הצטרפות ב-getAdminData
    ...members.map((m) => [
      m.profile.full_name,
      genderLabel(m.profile.gender),
      ageInYears(m.profile.birth_date)?.toString() ?? "",
      m.profile.birth_date ?? "",
      m.profile.city ?? "",
      formatPhone(m.profile.phone) ?? "",
      m.email ?? "",
      // מנורמל: בטופס אנשים הכניסו גם קישורים מלאים וגם שמות משתמש
      normalizeInstagram(m.profile.instagram) ?? "",
      swimLevelLabel(m.profile.swim_level) ?? "",
      formatDate(m.profile.created_at),
      // "X מתוך Y" ולא "X/Y": אקסל וגוגל שיטס קוראים "16/30" כתאריך
      // (יוני 2030!) ולא כטקסט, למרות שזה בכלל לא תאריך.
      `${m.attendedCount} מתוך ${heldCount}`,
      `${heldCount ? Math.round((m.attendedCount / heldCount) * 100) : 0}%`,
      // תיבת אישור אחת בהרשמה (legal_accepted) שומרת waiver+privacy
      // באותו רגע בדיוק - שני העמודים תמיד זהים, ולכן עמודה אחת מספיקה.
      m.profile.waiver_accepted_at ? "כן" : "",
    ]),
  ];
}

export async function getAdminEventsReport(
  clubId: string,
): Promise<string[][]> {
  const { events, historicalMembers } = await getAdminData(clubId);

  const eventsChronological = [...events].sort((a, b) =>
    a.starts_at.localeCompare(b.starts_at),
  );
  // מי שכבר היה חלק מהקהילה ביום נתון - כולל מי שכבר עזב/הוסר מאז,
  // כי זה גודל הקהילה שהיה נכון היסטורית באותו תאריך, לא היום.
  const memberCountAtDate = (iso: string) =>
    historicalMembers.filter((m) => m.profile.created_at <= iso).length;

  return [
    [
      "כותרת",
      "יום בשבוע",
      "תאריך",
      "שעה",
      "מיקום",
      "סימנו שיגיעו",
      "הגיעו בפועל",
      "אחוז הגעה מתוך חברי הקהילה",
      "אחוז הגעה מתוך מי שסימן הגעה",
      "אחוז נשים",
      "אחוז גברים",
    ],
    ...eventsChronological.map((e) => {
      // מי שהגיע נספר כאן גם אם לא סימן שהוא מתכוון להגיע - cameCount
      // הוא סך הנוכחויות בפועל, לא מותנה ב-RSVP קודם.
      const clubSize = memberCountAtDate(e.starts_at);
      const rateOfClub = clubSize
        ? Math.round((e.cameCount / clubSize) * 100)
        : 0;
      const rateOfGoing = e.goingCount
        ? Math.round((e.cameCount / e.goingCount) * 100)
        : 0;
      const female = e.cameCount
        ? Math.round((e.femaleCame / e.cameCount) * 100)
        : 0;
      const male = e.cameCount
        ? Math.round((e.maleCame / e.cameCount) * 100)
        : 0;
      return [
        e.title,
        formatWeekdayName(e.starts_at),
        formatDayMonth(e.starts_at),
        formatTime(e.starts_at),
        e.location_name,
        String(e.goingCount),
        String(e.cameCount),
        `${rateOfClub}%`,
        `${rateOfGoing}%`,
        `${female}%`,
        `${male}%`,
      ];
    }),
  ];
}

export async function getAdminAttendanceMatrixReport(
  clubId: string,
): Promise<string[][]> {
  const { events, historicalMembers } = await getAdminData(clubId);
  const eventsChronological = [...events].sort((a, b) =>
    a.starts_at.localeCompare(b.starts_at),
  );

  // שורה לכל מי שהיה/הייתה חבר/ה אי-פעם (גם מי שכבר עזב/הוסר, לא רק
  // חברים פעילים היום), עמודה לכל מפגש, "כן" איפה שנכח/ה בפועל (כולל
  // הוספה ידנית) - כדי לראות בבת אחת מי הגיע/ה לאילו מפגשים לאורך
  // זמן, בלי שההיסטוריה תיעלם כשמישהו/י עוזב/ת.
  return [
    [
      "שם",
      "טלפון",
      ...eventsChronological.map((e) => formatDayMonth(e.starts_at)),
    ],
    ...historicalMembers.map((m) => [
      m.profile.full_name,
      formatPhone(m.profile.phone) ?? "",
      ...eventsChronological.map((e) =>
        e.attendedProfileIds.includes(m.profile.id) ? "כן" : "",
      ),
    ]),
  ];
}

export type EventAttendanceReportRow = {
  fullName: string;
  /** null = לא נגע/ה בכלל בכפתור ה-RSVP למפגש הזה */
  going: boolean | null;
  attended: boolean;
  /** נוספה ע"י המנהלת (admin_add_attendance), לא צ׳ק־אין אמיתי. */
  addedManually: boolean;
};

/**
 * שורה לכל חבר/ת קהילה (מאושרים) למפגש נתון — לא רק למי שהיה מעורב/ת,
 * כדי שהקובץ יראה גם מי שלא סימן/ה ולא הגיע/ה.
 */
export async function getEventAttendanceReport(
  eventId: string,
  clubId: string,
): Promise<EventAttendanceReportRow[]> {
  if (demoMode) {
    const rsvps = demo.demoRsvps().filter((r) => r.eventId === eventId);
    const attendances = demo
      .demoAttendances()
      .filter((a) => a.eventId === eventId);
    return demo.demoProfiles().map((p) => {
      const rsvp = rsvps.find((r) => r.profileId === p.id);
      const attendance = attendances.find((a) => a.profileId === p.id);
      return {
        fullName: p.full_name,
        going: rsvp ? rsvp.going : null,
        attended: !!attendance,
        // אין added_manually בהדגמה — כל הנוכחויות שם "אמיתיות"
        addedManually: false,
      };
    });
  }

  const supabase = await createClient();
  const [{ data: memberRows }, { data: rsvpRows }, { data: attendanceRows }] =
    await Promise.all([
      // מי שהוסר/ה מהקהילה בינתיים עדיין נכלל/ת — דוח מפגש הוא רשומה
      // היסטורית, ומי שבאמת נכח/ה אז לא אמור/ה להיעלם מהדוח רק כי
      // כבר לא חבר/ה היום (אותו עיקרון כמו attendanceMatrixCsv).
      supabase
        .from("club_members")
        .select("profile_id, profiles(full_name)")
        .eq("club_id", clubId)
        .neq("status", "pending"),
      supabase
        .from("rsvps")
        .select("profile_id, going")
        .eq("event_id", eventId),
      supabase
        .from("attendances")
        .select("profile_id, added_manually")
        .eq("event_id", eventId),
    ]);

  const goingByProfile = new Map(
    (rsvpRows ?? []).map((r) => [r.profile_id, r.going] as const),
  );
  const attendanceByProfile = new Map(
    (attendanceRows ?? []).map((a) => [a.profile_id, a] as const),
  );

  return (
    (memberRows ?? []) as unknown as {
      profile_id: string;
      profiles: { full_name: string } | null;
    }[]
  ).flatMap((m) => {
    const attendance = attendanceByProfile.get(m.profile_id);
    return m.profiles
      ? [
          {
            fullName: m.profiles.full_name,
            going: goingByProfile.has(m.profile_id)
              ? (goingByProfile.get(m.profile_id) ?? null)
              : null,
            attended: !!attendance,
            addedManually: attendance?.added_manually ?? false,
          },
        ]
      : [];
  });
}
