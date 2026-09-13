"use client";

import type { LocationSuggestion } from "@/lib/actions";
import { Input } from "./ui";
import { XIcon } from "./social-icons";

/**
 * שדה "מיקום המפגש" עצמו, עם כפתור ניקוי (X) שמופיע רק כשיש טקסט —
 * שיר ביקשה את זה אחרי שראתה כמה מסורבל למחוק שם מקום ארוך אות-אות.
 * משותף לשני הטפסים (מפגש חדש ועריכת מפגש), יחד עם LocationSuggestions
 * למטה ו-useEventLocation (src/lib/use-event-location.ts).
 */
export function LocationNameInput({
  value,
  onChange,
  onKeyDown,
}: {
  value: string;
  onChange: (value: string) => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
}) {
  return (
    <div className="relative">
      <Input
        name="location_name"
        required
        autoComplete="off"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={onKeyDown}
        className={value ? "pe-11" : undefined}
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange("")}
          aria-label="ניקוי שדה המיקום"
          className="absolute inset-y-0 end-0 flex size-11 items-center justify-center text-(--color-ink-faint) hover:text-(--color-ink)"
        >
          <XIcon className="size-4" />
        </button>
      )}
    </div>
  );
}

/**
 * תיבת ההצעות שנפתחת מתחת לשדה "מיקום המפגש" תוך כדי הקלדה. חולצה
 * מ-admin/events/new/page.tsx ו-edit-event-schedule-form.tsx יחד עם
 * useEventLocation (src/lib/use-event-location.ts) — ראו שם להסבר
 * המלא על הכפילות שהייתה קודם.
 */
export function LocationSuggestions({
  show,
  searching,
  searchError,
  suggestions,
  highlightedIndex,
  onHighlight,
  onChoose,
}: {
  show: boolean;
  searching: boolean;
  searchError: string | null;
  suggestions: LocationSuggestion[];
  highlightedIndex: number;
  onHighlight: (i: number) => void;
  onChoose: (s: LocationSuggestion) => void;
}) {
  if (!show || !(searching || suggestions.length > 0 || searchError)) {
    return null;
  }

  return (
    <ul className="absolute z-[1200] mt-1 w-full overflow-hidden rounded-xl border border-(--color-line) bg-(--color-surface) shadow-lg">
      {searching && (
        <li className="px-4 py-2.5 text-sm text-(--color-ink-faint)">
          מחפשים…
        </li>
      )}
      {!searching && searchError && (
        <li className="px-4 py-2.5 text-sm text-(--color-fail)">
          {searchError} אפשר להשתמש בכלים הידניים למטה.
        </li>
      )}
      {!searching && !searchError && suggestions.length === 0 && (
        <li className="px-4 py-2.5 text-sm text-(--color-ink-faint)">
          לא נמצאה התאמה. אפשר להשתמש בכלים הידניים למטה.
        </li>
      )}
      {!searching &&
        suggestions.map((s, i) => (
          <li key={`${s.lat},${s.lng},${i}`}>
            <button
              type="button"
              onClick={() => onChoose(s)}
              onMouseEnter={() => onHighlight(i)}
              className={
                "block w-full px-4 py-2.5 text-start text-sm " +
                (i === highlightedIndex
                  ? "bg-(--color-haze)"
                  : "hover:bg-(--color-haze)")
              }
            >
              {s.label}
            </button>
          </li>
        ))}
    </ul>
  );
}
