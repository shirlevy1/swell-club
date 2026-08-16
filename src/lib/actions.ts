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
