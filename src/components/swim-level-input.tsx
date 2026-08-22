"use client";

const SWIM_LEVEL_OPTIONS = [
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

export function SwimLevelInput({
  name,
  defaultValue = "",
}: {
  name: string;
  defaultValue?: string;
}) {
  return (
    <div className="space-y-2">
      {SWIM_LEVEL_OPTIONS.map((opt) => (
        <label
          key={opt.value}
          className="flex min-h-12 cursor-pointer items-start gap-3 rounded-xl border border-(--color-line) bg-(--color-surface) p-3 has-[:checked]:border-(--color-sea) has-[:checked]:bg-(--color-sea)/10"
        >
          <input
            type="radio"
            name={name}
            value={opt.value}
            defaultChecked={defaultValue === opt.value}
            required
            className="mt-0.5 size-5 shrink-0 accent-(--color-sea)"
          />
          <span className="space-y-0.5">
            <span className="block text-sm font-bold text-(--color-ink)">
              {opt.label}
            </span>
            <span className="block text-xs leading-relaxed text-(--color-ink-soft)">
              {opt.description}
            </span>
          </span>
        </label>
      ))}
    </div>
  );
}
