import type { GoSurfDay, GoSurfRow } from "./gosurf";

/**
 * "הימים הכי טובים לשחייה" — כמה כוכבים (0–5, קפיצות של חצי) הים
 * מקבל בכל יום, מוערך לשעה 7:00 בבוקר — הזמן שרלוונטי להחלטה על
 * שחייה של Swell — לא "האם אפשר לשחות בו בכלל". הנוסחה, סדר החשיבות
 * של המשתנים, ותקרות הציון (שמונעות מגורם טוב אחד "לכסות" על תנאי
 * בעייתי אחר) הוגדרו במפורש ע"י שיר.
 *
 * GoSurf מפרסם תחזית כל 3 שעות בלבד (06:00, 09:00...), ואין נתון
 * אמיתי ל-7:00 — לכן כל משתנה מספרי מוערך באינטרפולציה ליניארית בין
 * 06:00 ל-09:00 (7:00 הוא שליש הדרך ביניהן), חוץ מכיוון הרוח (קטגורי,
 * לא ניתן לאנטרפולציה) שנלקח מ-06:00, הכי קרוב בפועל.
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

// עוגנים ל-0–100, לפי הקטגוריות המילוליות שהוגדרו לגובה גל/רוח/סוואל.
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

/** רוח מזרחית מרגיעה את הים בחוף ת"א, מערבית מוסיפה תנועה. */
function windDirectionBonus(dir: string | null): number {
  if (!dir) return 0;
  if (dir.includes("מזרח")) return 8;
  if (dir.includes("מערב")) return -8;
  return 0;
}

/** מחזור לא טוב/רע בפני עצמו — משפיע רק כמשתנה משלים ביחס לגודל
 * הסוואל: סוואל קטן = כמעט לא משנה, סוואל משמעותי עם מחזור קצר יוצר
 * תחושת בלגן, עם מחזור ארוך נשאר מאורגן יותר. */
function periodScore(swellCm: number | null, periodSec: number | null): number {
  const swell = swellCm ?? 0;
  if (swell < 30) return 85;
  if (periodSec == null) return 60;
  if (periodSec >= 8) return 80;
  if (periodSec >= 5) return 55;
  return 30;
}

/** רמת chop משוערת: 0 (כמעט ללא) עד 3 (מבולגן מאוד) — שילוב רוח וגובה
 * גלים, עם התאמה לפי כיוון הרוח. */
function chopLevel(windKmh: number | null, heightCm: number | null, windDir: string | null): number {
  const w = windKmh ?? 0;
  const h = heightCm ?? 0;
  let level = w >= 20 || h >= 100 ? 3 : w >= 15 || h >= 90 ? 2 : w >= 10 || h >= 75 ? 1 : 0;
  if (windDir?.includes("מערב")) level = Math.min(3, level + 1);
  else if (windDir?.includes("מזרח")) level = Math.max(0, level - 1);
  return level;
}

/** תקרת כוכבים (0–5) לפי רמת chop. */
const CHOP_CEILING = [5, 4, 3, 2];

type ScoreInputs = {
  heightCm: number | null;
  windKmh: number | null;
  windDir: string | null;
  swellCm: number | null;
  swellPeriodSec: number | null;
};

/** ציון 0–100 ותקרת כוכבים (0–5) מתוך ערכים כבר-מפוענחים (בין אם
 * הגיעו ישירות משורת GoSurf או מאינטרפולציה בין שתי שורות). */
function scoreFromValues(v: ScoreInputs): { score: number; ceiling: number } {
  const waveScore = v.heightCm == null ? 70 : interpolate(v.heightCm, WAVE_POINTS);
  const windScore = Math.max(
    0,
    Math.min(100, interpolate(v.windKmh ?? 0, WIND_POINTS) + windDirectionBonus(v.windDir)),
  );
  const swellScore = interpolate(v.swellCm ?? 0, SWELL_POINTS);
  const perScore = periodScore(v.swellCm, v.swellPeriodSec);

  // 45% גל, 30% רוח, 15% סוואל, 10% מחזור.
  const weighted = 0.45 * waveScore + 0.3 * windScore + 0.15 * swellScore + 0.1 * perScore;

  const chop = chopLevel(v.windKmh, v.heightCm, v.windDir);
  let ceiling = CHOP_CEILING[chop];
  if (v.heightCm != null) {
    if (v.heightCm >= 120) ceiling = Math.min(ceiling, 1);
    else if (v.heightCm >= 100) ceiling = Math.min(ceiling, 2);
    else if (v.heightCm >= 80) ceiling = Math.min(ceiling, 3.5);
  }
  if ((v.windKmh ?? 0) >= 20) ceiling = Math.min(ceiling, 2);

  return { score: weighted, ceiling };
}

/** ערכי כל המשתנים המספריים בשעה 7:00, באינטרפולציה בין 06:00
 * ל-09:00 (שליש הדרך). נופל לשורה הבודדת אם רק אחת מהשעתיים קיימת
 * בתחזית של אותו יום. */
function valuesAt7(row06: GoSurfRow | undefined, row09: GoSurfRow | undefined): ScoreInputs | null {
  if (row06 && row09) {
    const h06 = parseHeightCm(row06.heightCm);
    const h09 = parseHeightCm(row09.heightCm);
    const lerp = (a: number | null, b: number | null) =>
      a == null ? b : b == null ? a : a + (b - a) / 3;
    return {
      heightCm: lerp(h06, h09),
      windKmh: lerp(row06.windKmh, row09.windKmh),
      windDir: row06.windDir,
      swellCm: lerp(row06.swellCm, row09.swellCm),
      swellPeriodSec: lerp(row06.swellPeriodSec, row09.swellPeriodSec),
    };
  }
  const only = row06 ?? row09;
  if (!only) return null;
  return {
    heightCm: parseHeightCm(only.heightCm),
    windKmh: only.windKmh,
    windDir: only.windDir,
    swellCm: only.swellCm,
    swellPeriodSec: only.swellPeriodSec,
  };
}

/** ניקוד כוכבים (0–5) לתנאי הים בשעה 7:00 באותו יום. null אם אין
 * בכלל נתון ל-06:00 או ל-09:00 מ-GoSurf לאותו יום. */
export function computeBestSwimStars(day: GoSurfDay): number | null {
  const row06 = day.rows.find((r) => r.hour === "06");
  const row09 = day.rows.find((r) => r.hour === "09");
  const values = valuesAt7(row06, row09);
  if (!values) return null;

  const { score, ceiling } = scoreFromValues(values);
  const stars = Math.min(score / 20, ceiling);
  return Math.round(Math.max(0, stars) * 2) / 2;
}
