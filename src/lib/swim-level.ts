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

/** שלוש עוצמות של אותו כחול — לא צבע שלישי, רק דרגתיות בתוך הפלטה. */
export const SWIM_LEVEL_COLOR: Record<string, string> = {
  entering: "var(--color-sky)",
  flowing: "var(--color-sea)",
  deepening: "var(--color-deep)",
};
