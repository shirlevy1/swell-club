"use server";

import { getViewer } from "./data";
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

export type LocationSuggestion = { label: string; lat: number; lng: number };

/**
 * השלמת כתובות תוך כדי הקלדה, דרך Nominatim (OpenStreetMap) —
 * אותו מקור מפות שכבר מזין את Leaflet באתר, בלי מפתח API ובלי עלות.
 * מדיניות השימוש שלהם דורשת User-Agent מזהה אמיתי ובקשות מהשרת,
 * לא ישירות מהדפדפן.
 */
export async function searchLocationAction(
  query: string,
): Promise<LocationSuggestion[]> {
  const viewer = await getViewer();
  if (!viewer) return [];

  const q = query.trim();
  if (q.length < 3) return [];

  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("q", q);
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("limit", "5");
  url.searchParams.set("countrycodes", "il");
  url.searchParams.set("accept-language", "he");

  try {
    const response = await fetch(url, {
      signal: AbortSignal.timeout(5000),
      headers: {
        "User-Agent": "SwellClub/1.0 (community swim app; Supabase-hosted)",
      },
    });
    if (!response.ok) return [];

    const results = (await response.json()) as {
      display_name: string;
      lat: string;
      lon: string;
    }[];

    return results.map((r) => ({
      label: r.display_name,
      lat: Number(r.lat),
      lng: Number(r.lon),
    }));
  } catch {
    return [];
  }
}
