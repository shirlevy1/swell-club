/**
 * מיקום ברירת המחדל למפגש חדש. חוף הצוק הדרומי, עם קישור Google Maps
 * מדויק — לא נ.צ גולמי — שנבדק ידנית מול הקישור שהתקבל מהמנהלת.
 */
export const DEFAULT_EVENT_LOCATION = {
  name: "חוף הצוק הדרומי",
  lat: 32.1401,
  lng: 34.7909,
  mapsUrl: "https://maps.app.goo.gl/4HT6dMXL4qpUfoN8A",
} as const;

/** דומיינים שדרכם Google בפועל משתפים קישורי מפה. שום דבר אחר לא נשלף. */
const ALLOWED_MAPS_HOSTS = new Set([
  "maps.app.goo.gl",
  "goo.gl",
  "www.google.com",
  "google.com",
  "maps.google.com",
]);

export function isGoogleMapsUrl(raw: string): boolean {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return false;
  }
  return (
    (url.protocol === "https:" || url.protocol === "http:") &&
    ALLOWED_MAPS_HOSTS.has(url.hostname)
  );
}

export type ParsedMapsLocation = {
  lat: number;
  lng: number;
  name: string | null;
};

/**
 * מחלץ קואורדינטות ושם מקום מכתובת Google Maps **אחרי** שהרשת פתרה
 * את כל הפניות ה-redirect (הכתובת הארוכה הסופית). לא עושה קריאת רשת.
 *
 * מעדיף את הסמן המדויק של המקום (`!3d!4d`) על פני מרכז המפה (`@lat,lng`),
 * כי השניים לא תמיד זהים — וההבדל הוא בדיוק בין "המקום עצמו" ל"איפשהו לידו".
 */
export function parseGoogleMapsUrl(resolvedUrl: string): ParsedMapsLocation | null {
  let href = resolvedUrl;
  try {
    href = decodeURIComponent(resolvedUrl);
  } catch {
    // כתובת עם % לא תקין — ממשיכים עם הגרסה הלא-מפוענחת
  }

  let lat: number | null = null;
  let lng: number | null = null;

  const precise = href.match(/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/);
  const center = href.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
  const query = href.match(/[?&](?:q|query)=(-?\d+\.\d+),(-?\d+\.\d+)/);
  const point = precise ?? center ?? query;

  if (point) {
    lat = Number(point[1]);
    lng = Number(point[2]);
  }

  if (
    lat == null ||
    lng == null ||
    !Number.isFinite(lat) ||
    !Number.isFinite(lng) ||
    lat < -90 ||
    lat > 90 ||
    lng < -180 ||
    lng > 180
  ) {
    return null;
  }

  const placeMatch = href.match(/\/maps\/place\/([^/@]+)/);
  const name = placeMatch ? placeMatch[1].replace(/\+/g, " ").trim() : null;

  return { lat, lng, name: name || null };
}
