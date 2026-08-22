import type { Gender } from "./types";

const TZ = "Asia/Jerusalem";

/**
 * ניסוח מגדרי לפנייה בגוף שני יחיד. "אחר" נופל על לשון זכר, לא צורה
 * שלישית — כך התבקש. רוב הפעלים בעבר נכתבים זהה לזכר/נקבה בלי ניקוד
 * ("נכחת", "שלך") ולא צריכים בכלל לעבור דרך הפונקציה הזו — היא
 * נחוצה רק בהווה/עתיד, איפה שהכתיב באמת משתנה ("מרים"/"מרימה").
 */
export function byGender(
  gender: Gender | null,
  masculine: string,
  feminine: string,
): string {
  return gender === "female" ? feminine : masculine;
}

/**
 * הקהילה בישראל. קיבוע אזור הזמן מונע הפתעות למי שגולש מחו"ל.
 * פורמט קצר בכוונה — "יום חמישי 20.8 06:45" ולא "יום חמישי, 20
 * באוגוסט בשעה 06:45": זה מה שמופיע ככותרת גדולה בעמוד המפגש,
 * וחודש מאויית שם גולש לשתי שורות.
 */
export function formatDateTime(iso: string): string {
  const date = new Date(iso);
  const weekday = new Intl.DateTimeFormat("he-IL", {
    weekday: "long",
    timeZone: TZ,
  }).format(date);
  const day = new Intl.DateTimeFormat("he-IL", {
    day: "numeric",
    timeZone: TZ,
  }).format(date);
  const month = new Intl.DateTimeFormat("he-IL", {
    month: "numeric",
    timeZone: TZ,
  }).format(date);

  return `${weekday} ${day}.${month} ${formatTime(iso)}`;
}

export function formatTime(iso: string): string {
  return new Intl.DateTimeFormat("he-IL", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: TZ,
  }).format(new Date(iso));
}

export function formatDate(iso: string): string {
  return new Intl.DateTimeFormat("he-IL", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: TZ,
  }).format(new Date(iso));
}

/** כמו formatDate, בלי השנה כשהיא השנה הנוכחית — פחות רעש בכרטיס */
export function formatDateShort(iso: string): string {
  const d = new Date(iso);
  const sameYear = d.getFullYear() === new Date().getFullYear();
  return new Intl.DateTimeFormat("he-IL", {
    day: "numeric",
    month: "long",
    ...(sameYear ? {} : { year: "numeric" }),
    timeZone: TZ,
  }).format(d);
}

export function formatWeekday(iso: string): string {
  return new Intl.DateTimeFormat("he-IL", {
    weekday: "long",
    timeZone: TZ,
  }).format(new Date(iso));
}

/** "עוד 3 ימים" / "לפני שעתיים" */
export function relativeTime(iso: string): string {
  const diffMs = new Date(iso).getTime() - Date.now();
  const rtf = new Intl.RelativeTimeFormat("he", { numeric: "auto" });
  const abs = Math.abs(diffMs);

  const units: [Intl.RelativeTimeFormatUnit, number][] = [
    ["day", 86_400_000],
    ["hour", 3_600_000],
    ["minute", 60_000],
  ];
  for (const [unit, ms] of units) {
    if (abs >= ms) return rtf.format(Math.round(diffMs / ms), unit);
  }
  return "עכשיו";
}

/**
 * משך זמן בעברית טבעית. חלון הצ׳ק־אין ניתן לעריכה בכל מפגש, ולכן
 * אסור לכתוב "רבע שעה" קשיח בממשק — זה יהיה שקר ברגע ששיר תשנה אותו.
 */
export function formatMinutes(min: number): string {
  const NAMED: Record<number, string> = {
    1: "דקה",
    2: "שתי דקות",
    15: "רבע שעה",
    30: "חצי שעה",
    45: "שלושת רבעי שעה",
    60: "שעה",
    90: "שעה וחצי",
    120: "שעתיים",
  };
  if (NAMED[min]) return NAMED[min];
  if (min % 60 === 0) return `${min / 60} שעות`;
  return `${min} דקות`;
}

// ---------------------------------------------------------------- טלפון

/** מנרמל לפורמט בינלאומי בלי סימנים: 0501234567 → 972501234567 */
export function normalizePhone(raw: string | null): string | null {
  if (!raw) return null;
  const digits = raw.replace(/\D/g, "");
  if (!digits) return null;
  if (digits.startsWith("972")) return digits;
  if (digits.startsWith("0")) return "972" + digits.slice(1);
  return digits;
}

export function formatPhone(raw: string | null): string | null {
  if (!raw) return null;
  const d = raw.replace(/\D/g, "");
  const local = d.startsWith("972") ? "0" + d.slice(3) : d;
  if (local.length === 10) {
    return `${local.slice(0, 3)}-${local.slice(3, 6)}-${local.slice(6)}`;
  }
  return raw;
}

export function whatsappUrl(phone: string | null): string | null {
  const n = normalizePhone(phone);
  return n ? `https://wa.me/${n}` : null;
}

export function isValidIsraeliPhone(raw: string): boolean {
  const d = raw.replace(/\D/g, "");
  const local = d.startsWith("972") ? "0" + d.slice(3) : d;
  // נייד: 05X ועוד 7 ספרות. קווי: 0X ועוד 7.
  return /^(05\d{8}|0[23489]\d{7})$/.test(local);
}

// -------------------------------------------------------------------- שם

/**
 * רק אותיות עברית, רווחים, מקף וגרש/גרשיים (בשביל שמות כמו "בן-דוד"
 * או "או'הרה") — לא אותיות לועזיות או ספרות.
 */
export function isHebrewName(raw: string): boolean {
  return /^[א-ת\s'"־-]+$/.test(raw.trim());
}

// ------------------------------------------------------------- אינסטגרם

/**
 * בטופס הקיים של שיר חלק כתבו שם משתמש וחלק הדביקו קישור מלא.
 * מקבלים את שניהם ומחלצים את השם.
 */
export function normalizeInstagram(raw: string | null): string | null {
  if (!raw) return null;
  const t = raw.trim();
  if (!t) return null;

  const fromUrl = t.match(
    /(?:instagram\.com|instagr\.am)\/([A-Za-z0-9._]+)/i,
  )?.[1];
  const handle = (fromUrl ?? t).replace(/^@/, "").split(/[/?#]/)[0];

  return /^[A-Za-z0-9._]{1,30}$/.test(handle) ? handle : null;
}

export function instagramUrl(raw: string | null): string | null {
  const h = normalizeInstagram(raw);
  return h ? `https://instagram.com/${h}` : null;
}
