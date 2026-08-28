"use server";

import {
  getViewer,
  getClubMembersWithLatestSelfie,
  getEventAttendanceReport,
  type MemberPickerRow,
  type EventAttendanceReportRow,
} from "./data";
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
  if (!viewer) return { ok: false, error: "צריך להתחבר." };

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
  } catch {
    return { ok: false, error: "לא הצלחנו לפתוח את הקישור. בדקו ונסו שוב." };
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
    return { ok: false, error: "רק מנהלת קהילה יכולה להוסיף נוכחות." };
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
  if (!viewer) return { ok: false, error: "צריך להתחבר." };

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
        const shortLabel = [street, city].filter(Boolean).join(", ") || r.display_name;
        return {
          label: r.display_name,
          shortLabel,
          lat: Number(r.lat),
          lng: Number(r.lon),
        };
      }),
    };
  } catch (err) {
    return {
      ok: false,
      error:
        (err as { name?: string } | null)?.name === "TimeoutError"
          ? "שירות החיפוש לא הגיב בזמן."
          : "לא הצלחנו להתחבר לשירות החיפוש.",
    };
  }
}
