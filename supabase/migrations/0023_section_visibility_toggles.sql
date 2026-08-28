-- שתי תיבות סימון נוספות, לכל מפגש: להציג את הלו"ז ולהציג את
-- "מה להביא למים?" בכלל (לא רק את הקישור בתוכו — זה כבר קיים,
-- equipment_link_visible מ-0022). שתיהן מסומנות מראש.
alter table public.events
  add column agenda_visible boolean not null default true,
  add column equipment_visible boolean not null default true;
