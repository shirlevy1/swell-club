-- "מה להביא למים?" — טקסט חופשי לכל מפגש, בדיוק כמו agenda_text
-- (0008). ריק נופל על ברירת מחדל מחושבת ב-lib/agenda.ts.
alter table public.events
  add column equipment_text text;
