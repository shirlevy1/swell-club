"use client";

const GENDER_OPTIONS = [
  { value: "female", label: "אישה" },
  { value: "male", label: "גבר" },
  { value: "other", label: "אחר" },
] as const;

export function GenderInput({
  name,
  defaultValue = "",
}: {
  name: string;
  defaultValue?: string;
}) {
  return (
    <div className="flex gap-2">
      {GENDER_OPTIONS.map((opt) => (
        <label
          key={opt.value}
          className="flex min-h-12 flex-1 cursor-pointer items-center justify-center rounded-xl border border-(--color-line) bg-(--color-surface) px-2 text-sm font-semibold text-(--color-ink) has-[:checked]:border-(--color-sea) has-[:checked]:bg-(--color-sea)/10 has-[:checked]:text-(--color-sea)"
        >
          <input
            type="radio"
            name={name}
            value={opt.value}
            defaultChecked={defaultValue === opt.value}
            required
            className="sr-only"
          />
          {opt.label}
        </label>
      ))}
    </div>
  );
}
