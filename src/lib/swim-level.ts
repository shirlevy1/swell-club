export const SWIM_LEVEL_OPTIONS = [
  {
    value: "entering",
    label: "נכנסים",
    description: "למי שעושים את הצעדים הראשונים שלהם בשחייה בים.",
  },
  {
    value: "flowing",
    label: "זורמים",
    description: "למי שכבר מרגישים בטוחים במים ומצאו את הקצב שלהם.",
  },
  {
    value: "deepening",
    label: "מעמיקים",
    description: "למי שמרגישים בבית במים ורוצים לקחת את השחייה רחוק יותר.",
  },
] as const;

export function swimLevelLabel(value: string | null): string | null {
  return SWIM_LEVEL_OPTIONS.find((o) => o.value === value)?.label ?? null;
}

/**
 * שלוש עוצמות של אותו כחול — לא צבע שלישי, רק דרגתיות בתוך הפלטה.
 * לא sky/sea/deep המשותפים (אלה משמשים גם במקומות אחרים באתר, כמו
 * אנימציית האופק והפוקוס של כפתורים) — כאן טווח רחב יותר במיוחד,
 * כדי שההבדל בין שלוש הרמות יישאר ברור גם בשמש חזקה על החוף, שם
 * הבדלי-בהירות עדינים נוטים "להישטף". ראו ההדמיה שאושרה.
 */
export const SWIM_LEVEL_COLOR: Record<string, string> = {
  entering: "#a9c1d6",
  flowing: "var(--color-sea)",
  deepening: "#0f2231",
};

/**
 * מסגרת דקה לא הספיקה — sky ו-sea קרובים מדי זה לזה בעין כדי להבחין
 * ביניהם בקו של פיקסל אחד. צביעת הרקע כולו (בדילול) הופכת את ההבדל
 * לברור בלי לצאת מהפלטה: color-mix ולא הקסדצימלי מקודד, כדי שזה
 * ימשיך להיגזר מאותו משתנה CSS יחיד.
 */
export function swimLevelBadgeStyle(level: string): {
  borderColor: string;
  backgroundColor: string;
} {
  const color = SWIM_LEVEL_COLOR[level];
  return {
    borderColor: color,
    backgroundColor: `color-mix(in srgb, ${color} 20%, white)`,
  };
}
