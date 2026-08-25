"use client";

import { useEffect, useState } from "react";
import { Select } from "./ui";

const MONTHS = [
  "ינואר", "פברואר", "מרץ", "אפריל", "מאי", "יוני",
  "יולי", "אוגוסט", "ספטמבר", "אוקטובר", "נובמבר", "דצמבר",
];

function daysInMonth(month: number, year: number): number {
  if (!month || !year) return 31;
  return new Date(year, month, 0).getDate();
}

const pad = (n: number) => String(n).padStart(2, "0");

/**
 * שישה בחירות פשוטות במקום input type="datetime-local" — אותה בעיה
 * בדיוק כמו בתאריך הלידה: הבקרה המובנית של הדפדפן מתעקמת בעמוד RTL,
 * ובאייפון זה בולט במיוחד. ראו birth-date-input.tsx לאותו פתרון.
 *
 * `defaultValue` מגיע מבחוץ ולא מחושב כאן, כי "עכשיו" צריך להיקבע
 * פעם אחת בצד הלקוח בלבד (אחרת יש פער בין מה שהשרת מרנדר למה
 * שהדפדפן מחשב) — העמוד הקורא כבר עושה את זה ב-useEffect משלו.
 */
export function EventDateTimeInput({
  name,
  defaultValue,
}: {
  name: string;
  defaultValue: Date | null;
}) {
  const [year, setYear] = useState<number | "">("");
  const [month, setMonth] = useState<number | "">("");
  const [day, setDay] = useState<number | "">("");
  const [hour, setHour] = useState<number | "">("");
  const [minute, setMinute] = useState<number | "">("");

  useEffect(() => {
    if (!defaultValue) return;
    setYear(defaultValue.getFullYear());
    setMonth(defaultValue.getMonth() + 1);
    setDay(defaultValue.getDate());
    setHour(defaultValue.getHours());
    setMinute(defaultValue.getMinutes());
  }, [defaultValue]);

  const currentYear = new Date().getFullYear();
  const years = [currentYear, currentYear + 1, currentYear + 2];
  const maxDay = daysInMonth(Number(month) || 0, Number(year) || 0);
  const days = Array.from({ length: maxDay }, (_, i) => i + 1);
  const hours = Array.from({ length: 24 }, (_, i) => i);
  const minutes = Array.from({ length: 60 }, (_, i) => i);

  const value =
    year && month && day && hour !== "" && minute !== ""
      ? `${year}-${pad(month)}-${pad(day)}T${pad(Number(hour))}:${pad(Number(minute))}`
      : "";

  return (
    <div className="space-y-2">
      <input type="hidden" name={name} value={value} />

      <div className="grid grid-cols-3 gap-2">
        <Select
          aria-label="שנה"
          required
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
        <Select
          aria-label="חודש"
          required
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
          aria-label="יום"
          required
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
      </div>

      <div className="grid grid-cols-2 gap-2">
        {/* דקה קודם במקור, שעה אחריה — בעברית (RTL) הראשון ב-DOM
            נופל מימין, ולכן זה מה שמציב את השעה משמאל ואת הדקה מימין. */}
        <Select
          aria-label="דקה"
          required
          dir="ltr"
          value={minute}
          onChange={(e) => setMinute(e.target.value ? Number(e.target.value) : "")}
        >
          <option value="">דקה</option>
          {minutes.map((m) => (
            <option key={m} value={m}>
              {pad(m)}
            </option>
          ))}
        </Select>
        <Select
          aria-label="שעה"
          required
          dir="ltr"
          value={hour}
          onChange={(e) => setHour(e.target.value ? Number(e.target.value) : "")}
        >
          <option value="">שעה</option>
          {hours.map((h) => (
            <option key={h} value={h}>
              {pad(h)}
            </option>
          ))}
        </Select>
      </div>
    </div>
  );
}
