-- סימון אם קישור הספידו ב"מה להביא למים?" מוצג למפגש הזה. ברירת
-- מחדל true (מוצג) — התיבה מסומנת מראש בטופס, ומי שלא רוצה מבטלת.
alter table public.events
  add column equipment_link_visible boolean not null default true;
