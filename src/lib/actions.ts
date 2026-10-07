"use server";

import * as Sentry from "@sentry/nextjs";
import {
  getViewer,
  getClubMembersWithLatestSelfie,
  getEventAttendanceReport,
  getAdminMembersReport,
  getAdminEventsReport,
  getAdminAttendanceMatrixReport,
  getAdminRemovedReport,
  type MemberPickerRow,
  type EventAttendanceReportRow,
} from "./data";
import { adminDb } from "./push-server";
import { isGoogleMapsUrl, parseGoogleMapsUrl } from "./maps";

export type ResolveMapsLinkResult =
  | { ok: true; lat: number; lng: number; name: string | null; url: string }
  | { ok: false; error: string };

/**
 * פותר קישור Google Maps שהמנהלת הדביקה לקואורדינטות אמיתיות, כדי
 * שהיא לא תצטרך לסמן נ.צ ידנית. קריאת הרשת חייבת לקרות בשרת —
 * הדפדפן חסום מ-CORS מלפנות ישירות ל-Google Maps.
 *
 * ⚠️ הרשימה הלבנה של דומיינים ב-lib/maps.ts היא לא קישוט: בלעדיה
 * זו נקודת SSRF — כל משתמש מחובר יכול לגרום לשרת לשלוף כל כתובת.
 */
export async function resolveMapsLinkAction(
  rawUrl: string,
): Promise<ResolveMapsLinkResult> {
  const viewer = await getViewer();
  // קיים רק לתמיכה בטופס "מפגש חדש" (מנהלת בלבד) — לא כל חבר/ה מחובר/ת
  if (viewer?.role !== "organizer") {
    return { ok: false, error: "רק מנהלת קהילה יכולה לסמן מיקום מפגש." };
  }

  const url = rawUrl.trim();
  if (!isGoogleMapsUrl(url)) {
    return { ok: false, error: "זה לא נראה כמו קישור Google Maps." };
  }

  let response: Response;
  try {
    response = await fetch(url, {
      redirect: "follow",
      signal: AbortSignal.timeout(8000),
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      },
    });
  } catch (err) {
    console.error("resolveMapsLinkAction: fetch failed", { url }, err);
    Sentry.captureException(err);
    return { ok: false, error: "לא הצלחנו לפתוח את הקישור. בדקו ונסו שוב." };
  }

  // הבדיקה למעלה (`isGoogleMapsUrl(url)`) בודקת רק את הכתובת שהודבקה -
  // לא כל קפיצת הפניה (redirect) בדרך. כתובת קצרה (maps.app.goo.gl)
  // היא בעצמה הפניה, אז בלי הבדיקה הזו על הכתובת הסופית, אין שום
  // אימות שה-fetch לא "נחת" במקום שהוא לא דומיין אמיתי של גוגל.
  if (!isGoogleMapsUrl(response.url)) {
    return {
      ok: false,
      error: "הקישור הוביל לכתובת שלא נראית כמו Google Maps.",
    };
  }

  const parsed = parseGoogleMapsUrl(response.url);
  if (!parsed) {
    return {
      ok: false,
      error: "לא הצלחנו למצוא מיקום מדויק בקישור הזה. אפשר לסמן ידנית על המפה.",
    };
  }

  return { ok: true, ...parsed, url };
}

export type MembersForAttendanceResult =
  | { ok: true; members: MemberPickerRow[] }
  | { ok: false; error: string };

/**
 * חברי הקהילה לבחירה בהוספת נוכחות ידנית — נטענת רק כשמנהלת פותחת
 * את הפאנל, לא כחלק מטעינת עמוד המפגש עצמו. מוגבלת למנהלת הקהילה
 * הזו בלבד; admin_add_attendance() (שנקראת בנפרד מהלקוח) בודקת את
 * זה שוב בעצמה בשרת, זו לא ההגנה היחידה.
 */
export async function getMembersForAttendanceAction(): Promise<MembersForAttendanceResult> {
  const viewer = await getViewer();
  if (!viewer?.club || viewer.role !== "organizer") {
    return { ok: false, error: "רק מנהלת קהילה יכולה לסמן הגעה ידנית." };
  }

  const members = await getClubMembersWithLatestSelfie(viewer.club.id);
  return { ok: true, members };
}

export type EventAttendanceReportResult =
  | { ok: true; rows: EventAttendanceReportRow[] }
  | { ok: false; error: string };

/**
 * דוח RSVP/הגעה/תמונות למפגש ספציפי, שורה לכל חבר/ת קהילה — נשלף
 * רק כשהמנהלת לוחצת על ייצוא, לא כחלק מטעינת עמוד הניהול (שם יש
 * רשימת מפגשים שלמה, ואין טעם לשלוף דוח מלא לכל אחד מהם מראש).
 */
export async function getEventAttendanceReportAction(
  eventId: string,
): Promise<EventAttendanceReportResult> {
  const viewer = await getViewer();
  if (!viewer?.club || viewer.role !== "organizer") {
    return { ok: false, error: "רק מנהלת קהילה יכולה לייצא דוח." };
  }

  const rows = await getEventAttendanceReport(eventId, viewer.club.id);
  return { ok: true, rows };
}

export type AdminReportResult =
  | { ok: true; rows: string[][] }
  | { ok: false; error: string };

/**
 * שלושת דוחות ה-CSV של עמוד הניהול (חברים/מפגשים/מטריצת הגעה) -
 * נשלפים ונבנים רק בלחיצה על כפתור הייצוא הרלוונטי, לא כחלק מטעינת
 * עמוד הניהול עצמו. אותו עיקרון בדיוק כמו getEventAttendanceReportAction
 * למעלה.
 */
export async function getAdminMembersReportAction(): Promise<AdminReportResult> {
  const viewer = await getViewer();
  if (!viewer?.club || viewer.role !== "organizer") {
    return { ok: false, error: "רק מנהלת קהילה יכולה לייצא דוח." };
  }
  const rows = await getAdminMembersReport(viewer.club.id);
  return { ok: true, rows };
}

export async function getAdminEventsReportAction(): Promise<AdminReportResult> {
  const viewer = await getViewer();
  if (!viewer?.club || viewer.role !== "organizer") {
    return { ok: false, error: "רק מנהלת קהילה יכולה לייצא דוח." };
  }
  const rows = await getAdminEventsReport(viewer.club.id);
  return { ok: true, rows };
}

export async function getAdminAttendanceMatrixReportAction(): Promise<AdminReportResult> {
  const viewer = await getViewer();
  if (!viewer?.club || viewer.role !== "organizer") {
    return { ok: false, error: "רק מנהלת קהילה יכולה לייצא דוח." };
  }
  const rows = await getAdminAttendanceMatrixReport(viewer.club.id);
  return { ok: true, rows };
}

export async function getAdminRemovedReportAction(): Promise<AdminReportResult> {
  const viewer = await getViewer();
  if (!viewer?.club || viewer.role !== "organizer") {
    return { ok: false, error: "רק מנהלת קהילה יכולה לייצא דוח." };
  }
  const rows = await getAdminRemovedReport(viewer.club.id);
  return { ok: true, rows };
}

export type LocationSuggestion = {
  /** הכתובת המלאה — מוצגת ברשימת ההצעות, לצורך הבחנה בין תוצאות דומות. */
  label: string;
  /** רחוב+מספר, עיר — מה שנשמר בפועל בתור שם המקום אחרי בחירה. */
  shortLabel: string;
  lat: number;
  lng: number;
};

export type LocationSearchResult =
  | { ok: true; suggestions: LocationSuggestion[] }
  | { ok: false; error: string };

/**
 * השלמת כתובות תוך כדי הקלדה, דרך Nominatim (OpenStreetMap) —
 * אותו מקור מפות שכבר מזין את Leaflet באתר, בלי מפתח API ובלי עלות.
 * מדיניות השימוש שלהם דורשת User-Agent מזהה אמיתי ובקשות מהשרת,
 * לא ישירות מהדפדפן.
 *
 * מחזירה מצב שגיאה נפרד מ"אין תוצאות" בכוונה: שירותי geocoding
 * חינמיים לפעמים חוסמים או מגבילים כתובות IP משותפות של פלטפורמות
 * ענן (Vercel וכו') בגלל שימוש כבד של אפליקציות אחרות על אותה כתובת —
 * בלי ההבחנה הזו, חסימה כזו הייתה נראית זהה ל"לא נמצא כלום", ואי
 * אפשר היה לדעת מה קורה בפועל.
 */
export async function searchLocationAction(
  query: string,
): Promise<LocationSearchResult> {
  const viewer = await getViewer();
  // קיים רק לתמיכה בטופס "מפגש חדש" (מנהלת בלבד) — לא כל חבר/ה מחובר/ת
  if (viewer?.role !== "organizer") {
    return { ok: false, error: "רק מנהלת קהילה יכולה לחפש מיקום מפגש." };
  }

  const q = query.trim();
  if (q.length < 3) return { ok: true, suggestions: [] };

  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("q", q);
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("limit", "5");
  url.searchParams.set("countrycodes", "il");
  url.searchParams.set("accept-language", "he");
  url.searchParams.set("addressdetails", "1");

  try {
    const response = await fetch(url, {
      signal: AbortSignal.timeout(5000),
      headers: {
        "User-Agent": "SwellClub/1.0 (contact: shirshir2001@gmail.com)",
      },
    });
    if (!response.ok) {
      return {
        ok: false,
        error: `שירות החיפוש הגיב עם שגיאה (${response.status}).`,
      };
    }

    const results = (await response.json()) as {
      display_name: string;
      lat: string;
      lon: string;
      name?: string;
      address?: {
        road?: string;
        house_number?: string;
        city?: string;
        town?: string;
        village?: string;
        suburb?: string;
        county?: string;
      };
    }[];

    return {
      ok: true,
      suggestions: results.map((r) => {
        const addr = r.address ?? {};
        const street = [addr.road, addr.house_number].filter(Boolean).join(" ");
        const city = addr.city ?? addr.town ?? addr.village ?? addr.suburb ?? addr.county;
        // מקום בעל שם בלי כתובת רחוב (חוף, פארק, אתר) — Nominatim מחזיר
        // את השם שלו ב-r.name, לא תחת road/house_number. בלי הנפילה
        // הזו ל-r.name, shortLabel היה מאבד את השם לגמרי ונשאר עם
        // שם העיר בלבד (זה מה שקרה בפועל עם "חוף מציצים" → "תל אביב").
        //
        // רחוב "מנצח" את השם רק כשיש גם מספר בית — זו כתובת מדויקת
        // וממוקדת (כמו "דיזנגוף 50"), ואז הוא באמת הכי שימושי. בלי
        // מספר בית, רחוב הוא רק שיוך כללי וחלש (לפעמים ממש מקרי) —
        // ואז השם עצמו עדיף. בלעדי זה, מקום בעל שם שיש לו גם רחוב
        // משויך בלי מספר (למשל תחנת שכירת אופניים הקרויה על שם חוף,
        // שיושבת על רחוב כלשהו) היה מאבד את השם המזהה שלו לטובת שם
        // הרחוב התמים-לגמרי-לא-קשור שעליו היא יושבת בפועל.
        const primary = addr.house_number ? street || r.name : r.name || street;
        const shortLabel = [primary, city].filter(Boolean).join(", ") || r.display_name;
        return {
          label: r.display_name,
          shortLabel,
          lat: Number(r.lat),
          lng: Number(r.lon),
        };
      }),
    };
  } catch (err) {
    console.error("searchLocationAction: failed", err);
    Sentry.captureException(err);
    return {
      ok: false,
      error:
        (err as { name?: string } | null)?.name === "TimeoutError"
          ? "שירות החיפוש לא הגיב בזמן."
          : "לא הצלחנו להתחבר לשירות החיפוש.",
    };
  }
}

export type DeleteEventResult = { ok: true } | { ok: false; error: string };

/**
 * מוחקת מפגש, אחרי שניקתה קודם את קבצי התמונה שלו מה-storage (סלפים
 * + תמונות אלבום) — לא רק את השורות עליהן במסד. מחיקת events מפעילה
 * on delete cascade על attendances/rsvps/event_photos/event_reminders
 * (ראו 0001_init.sql), אבל זה מנקה רק שורות, לא קבצים בפועל ב-storage
 * - בלעדי זה, הקבצים נשארים שם לצמיתות, בלתי נגישים (RLS תלוי בשורות
 * שכבר נמחקו) אבל עדיין תופסים מקום. נמצא בביקורת מוכנות ההשקה (DATA-2).
 *
 * כל הפעולה (ניקוי storage + מחיקת המפגש עצמו) עוברת לכאן, לשרת: מחיקת
 * סלפי של מישהו/י אחר/ת דורשת service_role - אין policy RLS שמתירה
 * למנהלת למחוק סלפי שלא שלה, ולא מוסיפים כזו (היתר רחב מדי, לא נחוץ
 * בשום מקום אחר) - adminDb() עוקפת RLS, אבל רק כאן, אחרי בדיקת
 * ההרשאה הידנית למטה.
 */
export async function deleteEventAction(
  eventId: string,
): Promise<DeleteEventResult> {
  const viewer = await getViewer();
  if (viewer?.role !== "organizer") {
    return { ok: false, error: "רק מנהלת קהילה יכולה למחוק מפגש." };
  }

  const db = adminDb();

  const [{ data: attendances }, { data: photos }] = await Promise.all([
    db.from("attendances").select("selfie_path").eq("event_id", eventId),
    db.from("event_photos").select("storage_path").eq("event_id", eventId),
  ]);

  const selfiePaths = (attendances ?? [])
    .map((a) => a.selfie_path)
    .filter((p): p is string => !!p);
  const photoPaths = (photos ?? []).map((p) => p.storage_path);

  // כישלון ניקוי storage לא אמור לחסום את מחיקת המפגש עצמה - עדיף
  // מפגש שנמחק עם כמה קבצים יתומים (אותה תוצאה כמו לפני התיקון הזה)
  // מאשר מנהלת שתקועה בלי יכולת למחוק מפגש בכלל.
  await Promise.all([
    selfiePaths.length > 0
      ? db.storage.from("selfies").remove(selfiePaths)
      : null,
    photoPaths.length > 0
      ? db.storage.from("event-photos").remove(photoPaths)
      : null,
  ]);

  const { error } = await db.from("events").delete().eq("id", eventId);
  if (error) {
    return { ok: false, error: "לא הצלחנו למחוק את המפגש. נסו שוב." };
  }

  return { ok: true };
}
