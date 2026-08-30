-- כותרת "מה להביא למים?" — ניתנת לעריכה כמו equipment_text (0021).
-- ריק נופל על ברירת מחדל מחושבת ב-lib/agenda.ts.
alter table public.events
  add column equipment_heading text;
