"use client";

import type { LocationSuggestion } from "@/lib/actions";

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
