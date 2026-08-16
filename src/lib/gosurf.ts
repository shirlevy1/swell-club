import * as cheerio from "cheerio";

/**
 * תחזית ים מ-GoSurf. כרגע כל המפגשים הם על חוף תל אביב, ולכן אזור
 * התחזית קבוע. אם תתווסף קהילה עם מפגשים בעיר אחרת, זה המקום להוסיף
 * מיפוי בין location_name לסלאג של GoSurf.
 */
const GOSURF_LOCATION_SLUG = "tel-aviv";

export type GoSurfRow = {
  hour: string; // "06", "09"
  /** טווח גובה גלים, כמו שמופיע באתר: "30 - 50" (ס״מ) */
  heightCm: string | null;
  /** תיאור מילולי כמו "ים גלי" */
  waveDesc: string | null;
  windKmh: number | null;
  windDir: string | null; // "צפון מזרחית"
  swellCm: number | null;
  swellPeriodSec: number | null;
  swellDir: string | null; // "מערבי"
};

export type GoSurfDay = {
  /** YYYY-MM-DD */
  dateISO: string;
  dayName: string; // "חמישי"
  rows: GoSurfRow[];
};

function parseGoSurfHtml(html: string): GoSurfDay[] {
  const $ = cheerio.load(html);
  const days: GoSurfDay[] = [];

  $(".day.fw").each((_, dayEl) => {
    const $day = $(dayEl);
    const $h2 = $day.find("h2").first();
    if (!$h2.length) return;

    const dateText = $h2.find("span").first().text().trim();
    const m = dateText.match(/(\d{2})\/(\d{2})\/(\d{4})/);
    if (!m) return;
    const [, dd, mm, yyyy] = m;

    // שם היום הוא הטקסט של ה-h2 בלי ה-span עם התאריך
    const dayName = $h2.clone().children("span").remove().end().text().trim();

    const rows: GoSurfRow[] = [];
    $day.find("tr.chart_tr").each((_, trEl) => {
      const $tr = $(trEl);
      const hour = $tr.find(".hour").first().text().trim();
      if (!hour) return;

      const heightCm = $tr.find("td.waves span").first().text().trim() || null;
      const waveDesc = $tr.find("td.wave_height_desc").first().text().trim() || null;

      // ה-td הפעיל של הרוח: cheerio לא מפרש תגיות בתוך הערות HTML
      // כאלמנטים, אז זה תמיד נופל על הגרסה הפעילה ולא הישנה שמוערת.
      const windText = $tr.find("td.wind span").first().text().trim();
      const windNum = Number(windText);
      const windDir = $tr.find("td.wind_dir_desc").first().text().trim() || null;

      // שלושת תאי הסוואל באים מיד אחרי wind_dir_desc, ומשתפים class
      // "cell" עם wind_dir_desc עצמו — nextAll הוא מה שמפריד ביניהם.
      const $swellCells = $tr.find("td.wind_dir_desc").nextAll("td.cell");
      const swellCmText = $swellCells.eq(0).contents().first().text().trim();
      const swellPeriodText = $swellCells.eq(1).contents().first().text().trim();
      const swellDir = $swellCells.eq(2).find("span").first().text().trim() || null;

      const swellCm = Number(swellCmText);
      const swellPeriodSec = Number(swellPeriodText);

      rows.push({
        hour,
        heightCm,
        waveDesc,
        windKmh: Number.isFinite(windNum) ? windNum : null,
        windDir,
        swellCm: Number.isFinite(swellCm) ? swellCm : null,
        swellPeriodSec: Number.isFinite(swellPeriodSec) ? swellPeriodSec : null,
        swellDir,
      });
    });

    days.push({ dateISO: `${yyyy}-${mm}-${dd}`, dayName, rows });
  });

  return days;
}

/**
 * שולף את כל ימי התחזית מ-GoSurf. `revalidate` מבטיח שהעמוד לא ישלוף
 * מהאתר בכל טעינה (מכבד את השרת שלהם), אבל גם לא יתקע על נתון ישן —
 * זה בדיוק מה שנותן את ה"מתעדכן אוטומטית" שהתבקש.
 */
async function fetchGoSurfDays(): Promise<GoSurfDay[]> {
  const res = await fetch(`https://gosurf.co.il/forecast/${GOSURF_LOCATION_SLUG}`, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    },
    next: { revalidate: 1800 },
  });
  if (!res.ok) throw new Error(`gosurf.co.il responded ${res.status}`);
  return parseGoSurfHtml(await res.text());
}

/**
 * GoSurf מפרסם שורה כל 3 שעות (00, 03, 06 ... 21). "רלוונטי למפגש"
 * הוא השורה שהכי קרובה לתחילתו (מעוגלת למטה) והשורה שאחריה — כדי
 * שיראו גם איך זה בהתחלה וגם איך זה מתפתח תוך כדי המפגש.
 */
function forecastHoursFor(startsAtISO: string): [string, string] {
  const hour = Number(
    new Intl.DateTimeFormat("en-US", {
      hour: "numeric",
      hourCycle: "h23",
      timeZone: "Asia/Jerusalem",
    }).format(new Date(startsAtISO)),
  );
  const slot = Math.floor(hour / 3) * 3;
  const nextSlot = (slot + 3) % 24;
  const pad = (n: number) => String(n).padStart(2, "0");
  return [pad(slot), pad(nextSlot)];
}

/**
 * התחזית ליום מפגש ספציפי, מצומצמת לשעות הרלוונטיות לשעת ההתחלה
 * בפועל (לא שעות בוקר קבועות). `startsAtISO` הוא UTC (כמו ש-starts_at
 * נשמר) — ההמרה לתאריך ולשעה ישראליים חייבת להיות timezone-aware,
 * לא slice נאיבי על המחרוזת, אחרת מפגש סמוך לחצות עלול ליפול על
 * התאריך הלא נכון.
 *
 * מחזיר null בכל כשל — GoSurf למטה לא אמור להפיל את עמוד המפגש.
 */
export async function getSeaForecastForEvent(
  startsAtISO: string,
): Promise<GoSurfDay | null> {
  try {
    const eventDateISO = new Date(startsAtISO).toLocaleDateString("en-CA", {
      timeZone: "Asia/Jerusalem",
    });
    const hours = forecastHoursFor(startsAtISO);

    const days = await fetchGoSurfDays();
    const day = days.find((d) => d.dateISO === eventDateISO);
    if (!day) return null;

    const rows = day.rows.filter((r) => hours.includes(r.hour));
    if (!rows.length) return null;

    return { ...day, rows };
  } catch {
    return null;
  }
}
