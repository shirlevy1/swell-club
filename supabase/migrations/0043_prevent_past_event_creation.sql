-- "מפגש בעבר לא ניתן" נבדק עד היום רק בטופס (JS בדפדפן) — קריאת API
-- ישירה עם JWT של מנהלת יכלה להכניס מפגש עם starts_at בעבר. מוגבל
-- למנהלת בלבד (לא חור הרשאות), אבל פוגע בשלמות דוחות/נתוני נוכחות.
--
-- רק על INSERT, לא UPDATE: מנהלת צריכה להיות מסוגלת לתקן פרטים של
-- מפגש היסטורי שכבר קרה (למשל מיקום שגוי) בלי שהתאריך שלו עצמו
-- ייחסם.
create or replace function public.prevent_past_event_creation()
returns trigger
language plpgsql set search_path = public
as $$
begin
  if new.starts_at < now() then
    raise exception 'EVENT_IN_PAST';
  end if;
  return new;
end;
$$;

create trigger events_no_past_insert
  before insert on public.events
  for each row execute function public.prevent_past_event_creation();

revoke execute on function public.prevent_past_event_creation() from public, anon, authenticated;
