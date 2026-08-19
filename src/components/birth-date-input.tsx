"use client";

import { useState } from "react";
import { Select } from "./ui";

const MONTHS = [
  "ינואר", "פברואר", "מרץ", "אפריל", "מאי", "יוני",
  "יולי", "אוגוסט", "ספטמבר", "אוקטובר", "נובמבר", "דצמבר",
];

function daysInMonth(month: number, year: number): number {
  if (!month || !year) return 31;
  return new Date(year, month, 0).getDate();
}

/**
 * שלוש בחירות פשוטות במקום input type="date" — הבקרה המובנית של
 * הדפדפן לתאריך התעקמה בעמוד RTL בכל ניסיון תיקון ב-CSS. שלושה
 * <select> רגילים לא יכולים "להתעקם" — הם נראים בדיוק כמו כל שדה
 * אחר באתר.
 */
export function BirthDateInput({
  name,
  defaultValue = "",
}: {
  name: string;
  defaultValue?: string;
}) {
  const [defYear, defMonth, defDay] = defaultValue
    ? defaultValue.split("-").map(Number)
    : [undefined, undefined, undefined];

  const [day, setDay] = useState<number | "">(defDay ?? "");
  const [month, setMonth] = useState<number | "">(defMonth ?? "");
  const [year, setYear] = useState<number | "">(defYear ?? "");

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 100 }, (_, i) => currentYear - i);
  const maxDay = daysInMonth(Number(month) || 0, Number(year) || 0);
  const days = Array.from({ length: maxDay }, (_, i) => i + 1);

  const value =
    day && month && year
      ? `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`
      : "";

  return (
    <div className="grid grid-cols-3 gap-2">
      <input type="hidden" name={name} value={value} />
      <Select
        aria-label="יום"
        value={day}
        onChange={(e) => {
          const v = e.target.value ? Number(e.target.value) : "";
          setDay(v && maxDay && Number(v) > maxDay ? maxDay : v);
        }}
      >
        <option value="">יום</option>
        {days.map((d) => (
          <option key={d} value={d}>
            {d}
          </option>
        ))}
      </Select>
      <Select
        aria-label="חודש"
        value={month}
        onChange={(e) => setMonth(e.target.value ? Number(e.target.value) : "")}
      >
        <option value="">חודש</option>
        {MONTHS.map((m, i) => (
          <option key={m} value={i + 1}>
            {m}
          </option>
        ))}
      </Select>
      <Select
        aria-label="שנה"
        value={year}
        onChange={(e) => setYear(e.target.value ? Number(e.target.value) : "")}
      >
        <option value="">שנה</option>
        {years.map((y) => (
          <option key={y} value={y}>
            {y}
          </option>
        ))}
      </Select>
    </div>
  );
}
