-- מפגשים לא-ימיים (למשל מפגש חברתי ביבשה) לא צריכים תחזית גלים.
-- ברירת המחדל true כי רוב מפגשי הקהילה הם בים.
alter table public.events
  add column is_sea boolean not null default true;
