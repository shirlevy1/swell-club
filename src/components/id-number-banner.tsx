import Link from "next/link";

/**
 * גרסת מנהלת ל-id-number-gate.tsx - לא חוסמת, אותה סיבה בדיוק כמו
 * legal-update-banner.tsx: חסימה מלאה של המנהלת היחידה שמנהלת את
 * הקהילה הייתה מסוכנת יותר ממה שהיא שווה. בשונה מהבאנר המשפטי - כאן
 * אין "אישור" בלחיצת כפתור, כי בפועל צריך למלא ערכים אמיתיים, לא רק
 * להתעדכן על שינוי טקסט. מקשר לעריכת הפרופיל, שם הטופס האמיתי כבר קיים.
 */
export function IdNumberBanner() {
  return (
    <Link
      href="/profile/edit"
      className="mb-3 flex items-center justify-between gap-3 rounded-xl border border-(--color-line) bg-(--color-haze) px-3 py-2.5 text-sm"
    >
      <span className="text-(--color-ink-soft)">
        חסרים לכם תעודת זהות וכתובת מגורים בפרופיל.
      </span>
      <span className="shrink-0 font-bold text-(--color-sea)">השלמה</span>
    </Link>
  );
}
