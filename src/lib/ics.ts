import type { SwellEvent } from "./types";

function icsDate(d: Date): string {
  return d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

/** RFC 5545 דורש שבירת שורות ובריחה של פסיקים ונקודות-פסיק. */
function esc(text: string): string {
  return text.replace(/([,;\\])/g, "\\$1").replace(/\n/g, "\\n");
}

export function buildIcs(event: SwellEvent, durationMin = 90): string {
  const start = new Date(event.starts_at);
  const end = new Date(start.getTime() + durationMin * 60_000);

  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Swell//HE",
    "CALSCALE:GREGORIAN",
    "BEGIN:VEVENT",
    `UID:${event.id}@swell`,
    `DTSTAMP:${icsDate(new Date())}`,
    `DTSTART:${icsDate(start)}`,
    `DTEND:${icsDate(end)}`,
    `SUMMARY:${esc(event.title)}`,
    `LOCATION:${esc(event.location_name)}`,
    `GEO:${event.lat};${event.lng}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
}

export function downloadIcs(event: SwellEvent) {
  const blob = new Blob([buildIcs(event)], {
    type: "text/calendar;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${event.title.replace(/[^\p{L}\p{N} -]/gu, "")}.ics`;
  a.click();
  URL.revokeObjectURL(url);
}
