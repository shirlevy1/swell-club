import type { GoSurfDay, GoSurfRow } from "./gosurf";

/**
 * "Swell Sea Score" — 0 עד 5 כוכבים (קפיצות של חצי), עד כמה הים באותו
 * בוקר מתאים למפגש שחייה חברתי-רגוע של Swell — לא "האם אפשר לשחות
 * בו". מבוסס על שורות 06:00 ו-09:00 מתוך תחזית GoSurf. הנוסחה, סדר
 * החשיבות של המשתנים, ותקרות הציון הוגדרו במפורש ע"י שיר; המספרים
 * המדויקים בתוך כל טווח (איפה בדיוק בין "מצוין" ל"מצוין מאוד") הם
 * פרשנות סבירה שממלאת את הפערים בין הקטגוריות שהיא נתנה.
 *
 * עקרון מרכזי (סעיף 4+18 במסמך): לא ממוצע פשוט. לכל שעה יש גם תקרה
 * (לפי גובה גל/רוח/chop) שמונעת מגורם אחד טוב "לכסות" על תנאי בעייתי
 * אחר — התקרה חלה גם ברמת היום, לא רק ברמת השעה הבודדת.
 */

function interpolate(value: number, points: [number, number][]): number {
  if (value <= points[0][0]) return points[0][1];
  for (let i = 1; i < points.length; i++) {
    const [x0, y0] = points[i - 1];
    const [x1, y1] = points[i];
    if (value <= x1) {
      const t = (value - x0) / (x1 - x0);
      return y0 + t * (y1 - y0);
    }
  }
  return points[points.length - 1][1];
}

/** הגבוה מבין שני קצוות הטווח המדווח ("30 - 50") — קריאה שמרנית,
 * תואמת לעיקרון "לא לתת לגורם טוב לכסות על גורם רע". */
function parseHeightCm(heightCm: string | null): number | null {
  if (!heightCm) return null;
  const nums = heightCm.match(/\d+(\.\d+)?/g);
  if (!nums || nums.length === 0) return null;
  return Math.max(...nums.map(Number));
}

// עוגנים ל-0–100, לפי הקטגוריות המילוליות בסעיפים 6/7/8 במסמך.
const WAVE_POINTS: [number, number][] = [
  [0, 100],
  [20, 92],
  [40, 80],
  [60, 65],
  [80, 45],
  [100, 25],
  [120, 10],
  [150, 0],
];
const WIND_POINTS: [number, number][] = [
  [0, 100],
  [5, 92],
  [10, 78],
  [15, 55],
  [20, 25],
  [30, 0],
];
const SWELL_POINTS: [number, number][] = [
  [0, 100],
  [30, 90],
  [50, 75],
  [70, 55],
  [100, 30],
  [150, 10],
];

/** רוח מזרחית מרגיעה את הים בחוף ת"א, מערבית מוסיפה תנועה (סעיף 7). */
function windDirectionBonus(dir: string | null): number {
  if (!dir) return 0;
  if (dir.includes("מזרח")) return 8;
  if (dir.includes("מערב")) return -8;
  return 0;
}

/**
 * מחזור לא טוב/רע בפני עצמו (סעיף 9) — משפיע רק כמשתנה משלים ביחס
 * לגודל הסוואל: סוואל קטן = כמעט לא משנה, סוואל משמעותי עם מחזור
 * קצר יוצר תחושת בלגן, עם מחזור ארוך נשאר מאורגן יותר.
 */
function periodScore(swellCm: number | null, periodSec: number | null): number {
  const swell = swellCm ?? 0;
  if (swell < 30) return 85;
  if (periodSec == null) return 60;
  if (periodSec >= 8) return 80;
  if (periodSec >= 5) return 55;
  return 30;
}

/** רמת chop משוערת: 0 (כמעט ללא) עד 3 (מבולגן מאוד) — שילוב רוח וגובה
 * גלים (סעיף 10), עם התאמה לפי כיוון הרוח. */
function chopLevel(windKmh: number | null, heightCm: number | null, windDir: string | null): number {
  const w = windKmh ?? 0;
  const h = heightCm ?? 0;
  // הרף לא נשען על גובה גל לבדו בעוצמה נמוכה — 40–60 ס"מ עם רוח כמעט
  // אפסית הוא בדיוק הדוגמה של יום כמעט-מושלם במסמך (סעיף 23), לא chop.
  let level = w >= 20 || h >= 100 ? 3 : w >= 15 || h >= 90 ? 2 : w >= 10 || h >= 75 ? 1 : 0;
  if (windDir?.includes("מערב")) level = Math.min(3, level + 1);
  else if (windDir?.includes("מזרח")) level = Math.max(0, level - 1);
  return level;
}

/** תקרת כוכבים (0–5) לפי רמת chop, סעיף 10/18. */
const CHOP_CEILING = [5, 4, 3, 2];

/** ציון 0–100 ותקרת כוכבים (0–5) לשורת שעה בודדת (סעיפים 6–11+18). */
function scoreHour(row: GoSurfRow): { score: number; ceiling: number } {
  const heightCm = parseHeightCm(row.heightCm);
  const waveScore = heightCm == null ? 70 : interpolate(heightCm, WAVE_POINTS);
  const windScore = Math.max(
    0,
    Math.min(100, interpolate(row.windKmh ?? 0, WIND_POINTS) + windDirectionBonus(row.windDir)),
  );
  const swellScore = interpolate(row.swellCm ?? 0, SWELL_POINTS);
  const perScore = periodScore(row.swellCm, row.swellPeriodSec);

  // 45% גל, 30% רוח, 15% סוואל, 10% מחזור — סעיף 19.
  const weighted = 0.45 * waveScore + 0.3 * windScore + 0.15 * swellScore + 0.1 * perScore;

  const chop = chopLevel(row.windKmh, heightCm, row.windDir);
  let ceiling = CHOP_CEILING[chop];
  if (heightCm != null) {
    if (heightCm >= 120) ceiling = Math.min(ceiling, 1);
    else if (heightCm >= 100) ceiling = Math.min(ceiling, 2);
    else if (heightCm >= 80) ceiling = Math.min(ceiling, 3.5);
  }
  if ((row.windKmh ?? 0) >= 20) ceiling = Math.min(ceiling, 2);

  return { score: weighted, ceiling };
}

/**
 * ניקוד Swell Score ליום שלם: 40% שעה 06:00, 40% שעה 09:00, 20%
 * יציבות ביניהן (סעיף 17) — ואז תקרת היום היא המחמירה מבין תקרות שתי
 * השעות (סעיף 18). מחזירה null אם אין נתונים לאף אחת מהשעות.
 */
export function computeSwellScore(day: GoSurfDay): number | null {
  const row06 = day.rows.find((r) => r.hour === "06");
  const row09 = day.rows.find((r) => r.hour === "09");
  if (!row06 && !row09) return null;

  const h06 = row06 ? scoreHour(row06) : null;
  const h09 = row09 ? scoreHour(row09) : null;

  let dailyScore: number;
  let ceiling: number;
  if (h06 && h09) {
    const diff = Math.abs(h06.score - h09.score);
    const stability = Math.max(0, 100 - diff * 1.5);
    dailyScore = 0.4 * h06.score + 0.4 * h09.score + 0.2 * stability;
    ceiling = Math.min(h06.ceiling, h09.ceiling);
  } else {
    const only = (h06 ?? h09)!;
    dailyScore = only.score;
    ceiling = only.ceiling;
  }

  const stars = Math.min(dailyScore / 20, ceiling);
  return Math.round(Math.max(0, stars) * 2) / 2;
}

/** גוון אחד בתוך פלטת הכחולים של Swell, כהה יותר ככל שהים רגוע יותר. */
export function seaScoreColor(stars: number): string {
  if (stars >= 4.5) return "#23405a";
  if (stars >= 3.5) return "#2f5470";
  if (stars >= 2.5) return "#3d6685";
  if (stars >= 1.5) return "#6f93ab";
  if (stars >= 0.5) return "#9aa9b3";
  return "#b7c2c9";
}
