-- תיאור אופציונלי ולו״ז ניתן לעריכה לכל מפגש. RLS קיים כבר: events_organizer_all
-- מרשה למנהלת קהילה לעדכן כל עמודה בטבלה, כולל אלה — אין צורך במדיניות חדשה.
--
-- agenda ריק ([]) אומר "לא הוגדר לו״ז מפורש" — העמוד נופל אז על הלו״ז
-- הקבוע המחושב מ-starts_at (ראו src/lib/agenda.ts), בדיוק כמו שהתנהג עד
-- עכשיו. מפגשים חדשים שנוצרים דרך הטופס תמיד שומרים לו״ז מפורש.
alter table public.events
  add column description text,
  add column agenda jsonb not null default '[]'::jsonb,
  add column agenda_closing text;
