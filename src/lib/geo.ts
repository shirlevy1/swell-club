/**
 * חישוב מרחק. תאום מדויק של הנוסחה ב-check_in() שב-SQL.
 *
 * הבדיקה כאן היא **נוחות בלבד** — כדי לחסוך מהמשתמש העלאת תמונה
 * כשברור שהוא רחוק. האמת היחידה היא הבדיקה בשרת.
 */
const EARTH_RADIUS_M = 6_371_000;

export type Coords = { lat: number; lng: number };

export function distanceMeters(a: Coords, b: Coords): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return EARTH_RADIUS_M * 2 * Math.asin(Math.sqrt(h));
}

/**
 * קריאת מיקום מהדפדפן.
 * enableHighAccuracy חיוני — בלעדיו iOS מחזיר מיקום סלולרי ברמת שכונה,
 * וכל בדיקת רדיוס של 150 מטר הופכת לרעש.
 */
export function getCurrentPosition(
  timeoutMs = 15_000,
): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    if (!("geolocation" in navigator)) {
      reject(new Error("NO_GEOLOCATION"));
      return;
    }
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: true,
      timeout: timeoutMs,
      maximumAge: 0,
    });
  });
}

/**
 * זיהוי אייפון/אייפד — כדי להציג הנחיית תיקון הרשאה קונקרטית רק שם.
 * באייפון ההרשאות ל-Safari (גם בטאב רגיל וגם באייקון השמור למסך
 * הבית — שניהם אותו מנוע דפדפן) מנוהלות דרך הגדרות המכשיר, לא דרך
 * שום כפתור בתוך האתר עצמו — ולכן "נסו שוב" לא עוזר בכלל, וגם
 * שהאתר "יודע" איזה מצב (סטנדאלון/טאב) לא רלוונטי, כי הנתיב זהה
 * לשניהם. אומת בפועל על מכשיר אמיתי: הגדרות ← Safari ← מצלמה, וכן
 * הגדרות ← Safari ← מיקום — שני מתגים גלובליים תחת אותו תפריט
 * בדיוק (לא רשימה לכל אתר בנפרד, ולא תחת פרטיות ואבטחה הכללי).
 */
export function isIOS(): boolean {
  return /iPhone|iPad|iPod/.test(navigator.userAgent);
}

export function geolocationErrorMessage(err: unknown): string {
  const code = (err as GeolocationPositionError)?.code;
  if (code === 1) {
    return isIOS()
      ? "אין הרשאת מיקום. הגדרות המכשיר ← Safari ← מיקום ← אישור."
      : "אין הרשאת מיקום. צריך לאשר גישה למיקום כדי לסמן הגעה.";
  }
  if (code === 2) return "לא הצלחנו לאתר אתכם. נסו שוב בעוד רגע.";
  if (code === 3) return "איתור המיקום לקח יותר מדי זמן. נסו שוב.";
  return "לא הצלחנו לקרוא את המיקום שלכם.";
}
