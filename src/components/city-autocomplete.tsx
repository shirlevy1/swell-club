"use client";

import { useState } from "react";
import { ISRAELI_CITIES } from "@/lib/israeli-cities";
import { Input } from "./ui";

const MAX_SUGGESTIONS = 8;

/**
 * הקלדה חופשית עם השלמה, לא גלילה בין מאות ערים. הערך שבאמת נשלח
 * בטופס (השדה החבוי) מתעדכן רק כשבוחרים הצעה מהרשימה — אם רק הקלידו
 * בלי לבחור, השדה נשאר ריק, וה-required הקיים בטופס תופס את זה.
 */
export function CityAutocomplete({
  name,
  defaultValue = "",
}: {
  name: string;
  defaultValue?: string;
}) {
  const [query, setQuery] = useState(defaultValue);
  const [selected, setSelected] = useState(defaultValue);
  const [open, setOpen] = useState(false);

  const trimmed = query.trim();
  const matches = trimmed
    ? ISRAELI_CITIES.filter((city) => city.startsWith(trimmed)).slice(0, MAX_SUGGESTIONS)
    : [];

  function choose(city: string) {
    setQuery(city);
    setSelected(city);
    setOpen(false);
  }

  return (
    <div className="relative">
      <input type="hidden" name={name} value={selected} />
      <Input
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setSelected("");
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        // עיכוב קטן: אחרת ה-blur סוגר את הרשימה לפני שהקליק על הצעה נקלט
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        autoComplete="off"
        placeholder="הקלידו שם עיר"
        role="combobox"
        aria-expanded={open && matches.length > 0}
        aria-autocomplete="list"
      />
      {open && matches.length > 0 && (
        <ul className="absolute z-10 mt-1 w-full overflow-hidden rounded-xl border border-(--color-line) bg-(--color-surface) shadow-lg">
          {matches.map((city) => (
            <li key={city}>
              <button
                type="button"
                onClick={() => choose(city)}
                className="block w-full px-4 py-2.5 text-start text-sm hover:bg-(--color-haze)"
              >
                {city}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
