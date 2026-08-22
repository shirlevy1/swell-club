-- ============================================================================
-- Swell — הרשמה פתוחה רק לגילאי 20–40
-- ============================================================================
-- ⚠️ זו בדיקה ב-INSERT בלבד (הרשמה), לא constraint על העמודה עצמה.
-- constraint על profiles.birth_date היה נבדק מחדש בכל UPDATE, ולכן
-- חבר/ה שהצטרפו כדין ופשוט הזדקנו מעבר ל-40 תוך כדי חברות היו
-- ננעלים מלשמור שום שינוי עתידי בפרופיל שלהם — בדיוק ההפך ממה
-- שהתבקש ("רק בהרשמה", לא הגבלה מתמשכת על מי שכבר חבר/ה).
--
-- תאריך הלידה לא מאומת (בדיוק כמו הטלפון) — זה חוסם הרשמה בטעות
-- מחוץ לטווח, לא מישהו שממש מתעקש להקליד תאריך שגוי.
-- ============================================================================

create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  v_club uuid;
  v_is_first boolean;
  v_birth_date date;
begin
  v_birth_date := nullif(new.raw_user_meta_data ->> 'birth_date', '')::date;

  if v_birth_date is not null
     and extract(year from age(current_date, v_birth_date)) not between 20 and 40
  then
    raise exception 'AGE_OUT_OF_RANGE';
  end if;

  insert into public.profiles (id, full_name, phone, birth_date, city, gender, swim_level, waiver_accepted_at, instagram)
  values (
    new.id,
    coalesce(nullif(new.raw_user_meta_data ->> 'full_name', ''), 'חבר קהילה'),
    nullif(new.raw_user_meta_data ->> 'phone', ''),
    v_birth_date,
    nullif(new.raw_user_meta_data ->> 'city', ''),
    nullif(new.raw_user_meta_data ->> 'gender', '')::public.gender,
    nullif(new.raw_user_meta_data ->> 'swim_level', '')::public.swim_level,
    now(),
    nullif(new.raw_user_meta_data ->> 'instagram', '')
  );

  select id into v_club from public.clubs where slug = 'swell';
  if v_club is not null then
    perform pg_advisory_xact_lock(hashtext('swell:club:' || v_club::text));

    v_is_first := not exists (
      select 1 from public.club_members where club_id = v_club
    );
    insert into public.club_members (club_id, profile_id, role, status)
    values (
      v_club,
      new.id,
      case when v_is_first then 'organizer' else 'member' end::public.member_role,
      case when v_is_first then 'approved' else 'pending' end::public.member_status
    )
    on conflict do nothing;
  end if;

  return new;
end;
$$;
