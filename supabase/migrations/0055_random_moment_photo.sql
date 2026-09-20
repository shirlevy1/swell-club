-- ============================================================================
-- Swell — random_moment_photo(): תמונת אלבום אקראית אחת ל"רגעים שלי מסוואל קלאב"
-- ============================================================================
-- בכוונה בלי security definer: הפונקציה רצה בהרשאות המשתמש/ת שקוראת
-- לה (ברירת המחדל ב-Postgres), ולכן ה-RLS הקיים על event_photos
-- (event_photos_select ב-0003) חל עליה בדיוק כמו על שאילתה רגילה —
-- חבר קהילה מקבל רק ממפגשים שנכח בהם, ומנהלת מקבלת מכל המפגשים,
-- בלי לשכפל את הלוגיקה הזו כאן.
-- ============================================================================

create or replace function public.random_moment_photo()
returns table (
  event_id     uuid,
  storage_path text
)
language sql stable
as $$
  select event_id, storage_path
  from public.event_photos
  where status = 'approved'
  order by random()
  limit 1;
$$;

revoke execute on function public.random_moment_photo() from public, anon;
grant execute on function public.random_moment_photo() to authenticated;
