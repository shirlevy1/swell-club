-- מיקום הפנים בכל סלפי (אחוזים, 0–1), כדי שתמונות פרופיל עגולות/
-- ריבועיות באתר יוכלו להיחתך סביב הפנים במקום סביב מרכז התמונה
-- הגולמי. הזיהוי כבר רץ בכל צ'ק־אין (photoHasFace, בדפדפן) — כאן רק
-- שומרים איפה בתמונה זה קרה, בלי לרוץ שוב ובלי עלות נוספת.
alter table public.attendances
  add column face_x double precision,
  add column face_y double precision,
  add constraint attendances_face_x_valid check (face_x is null or face_x between 0 and 1),
  add constraint attendances_face_y_valid check (face_y is null or face_y between 0 and 1);

-- מרחיבה את check_in() בשני פרמטרים אופציונליים חדשים. drop קודם כי
-- שינוי רשימת הפרמטרים משנה את חתימת הפונקציה — create or replace
-- לא היה מחליף את הגרסה הקיימת, אלא יוצר עוד עומס־יתר (overload) לצידה,
-- ופותח לעמימות בין שתי הגרסאות בקריאה עם 5 ארגומנטים בדיוק.
drop function if exists public.check_in(uuid, double precision, double precision, double precision, text);

create or replace function public.check_in(
  p_event_id    uuid,
  p_lat         double precision,
  p_lng         double precision,
  p_accuracy_m  double precision,
  p_selfie_path text,
  p_face_x      double precision default null,
  p_face_y      double precision default null
)
returns public.attendances
language plpgsql security definer set search_path = public
as $$
declare
  v_event public.events;
  v_dist  double precision;
  v_row   public.attendances;
  v_path  text;
begin
  select * into v_event from public.events where id = p_event_id;
  if not found then
    raise exception 'EVENT_NOT_FOUND';
  end if;

  if not public.is_club_member(v_event.club_id) then
    raise exception 'NOT_A_MEMBER';
  end if;

  -- ורפיקציה 1: חלון הזמן
  if now() < v_event.starts_at - make_interval(mins => v_event.checkin_opens_before_min) then
    raise exception 'TOO_EARLY';
  end if;
  if now() > v_event.starts_at + make_interval(mins => v_event.checkin_closes_after_min) then
    raise exception 'TOO_LATE';
  end if;

  -- ורפיקציה 2: מרחק (Haversine, מטרים)
  v_dist := 6371000 * 2 * asin(sqrt(
      power(sin(radians(p_lat - v_event.lat) / 2), 2)
    + cos(radians(v_event.lat)) * cos(radians(p_lat))
    * power(sin(radians(p_lng - v_event.lng) / 2), 2)
  ));

  if v_dist > v_event.checkin_radius_m then
    raise exception 'TOO_FAR';
  end if;

  -- ורפיקציה 3: הסלפי קיים באמת.
  v_path := p_event_id::text || '/' || auth.uid()::text || '.jpg';
  if p_selfie_path is distinct from v_path then
    raise exception 'BAD_SELFIE_PATH';
  end if;
  if not exists (
    select 1 from storage.objects
    where bucket_id = 'selfies' and name = v_path
  ) then
    raise exception 'SELFIE_MISSING';
  end if;

  insert into public.attendances
    (event_id, profile_id, selfie_path, lat, lng, accuracy_m, distance_m, face_x, face_y)
  values
    (p_event_id, auth.uid(), v_path, p_lat, p_lng, p_accuracy_m, v_dist, p_face_x, p_face_y)
  on conflict (event_id, profile_id) do nothing
  returning * into v_row;

  if v_row is null then
    raise exception 'ALREADY_CHECKED_IN';
  end if;

  return v_row;
end;
$$;

-- מעדכנת מיקום פנים כשעורכים סלפי אחרי הצ'ק־אין (edit-selfie-button) —
-- זה לא קורא שוב ל-check_in(), רק מחליף את קובץ התמונה, ולכן צריך דרך
-- נפרדת לעדכן את מיקום הפנים החדש. אותה בדיקת חלון זמן בדיוק כמו
-- selfies_update_own ב-storage, כדי שלא יהיה פער בין "מותר להעלות
-- תמונה חדשה" ל"מותר לעדכן את מיקום הפנים שלה".
create or replace function public.update_selfie_face_position(
  p_event_id uuid,
  p_face_x   double precision,
  p_face_y   double precision
)
returns void
language plpgsql security definer set search_path = public
as $$
begin
  if not public.is_checkin_window_open(p_event_id) then
    raise exception 'TOO_LATE';
  end if;

  update public.attendances
  set face_x = p_face_x, face_y = p_face_y
  where event_id = p_event_id and profile_id = auth.uid();
end;
$$;

revoke execute on function
  public.check_in(uuid, double precision, double precision, double precision, text, double precision, double precision),
  public.update_selfie_face_position(uuid, double precision, double precision)
from public, anon;

grant execute on function
  public.check_in(uuid, double precision, double precision, double precision, text, double precision, double precision),
  public.update_selfie_face_position(uuid, double precision, double precision)
to authenticated;
