-- ============================================================================
-- Swell — הרשמה פתוחה רק מגיל 21 ומעלה
-- ============================================================================
-- עלה בביקורת משפטית לפני השקה: בלי רף גיל, ואין מנגנון הסכמת הורה/
-- אפוטרופוס, כתב הוויתור על פעילות פיזית בים פתוח (0001_init.sql) חשוף
-- עם קטין/ה. הוחלט לנעול רף תחתון בלבד - לא טווח (בניגוד ל-0014/0015
-- שהגבילו 20-40 וממש בוטלו).
--
-- ⚠️ אותו דפוס בדיוק כמו 0014: בדיקה ב-INSERT בלבד (הרשמה), לא
-- constraint על העמודה עצמה. גיל רק עולה עם הזמן - אין כאן את הבעיה
-- שהייתה ב-0014 (חברים שהזדקנו מעבר לרף העליון תוך כדי חברות וננעלו
-- מעריכת הפרופיל) - אבל נשארים עקביים עם אותה גישה: לא לבדוק מחדש
-- בכל UPDATE, רק בהרשמה.
--
-- תאריך הלידה לא מאומת (בדיוק כמו הטלפון) - זה חוסם הרשמה בטעות
-- מתחת לגיל, לא מישהו/י שממש מתעקש/ת להקליד תאריך שגוי.
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
     and extract(year from age(current_date, v_birth_date)) < 21
  then
    raise exception 'AGE_UNDER_MINIMUM';
  end if;

  insert into public.profiles (id, full_name, phone, birth_date, city, gender, swim_level, waiver_accepted_at, privacy_accepted_at, instagram)
  values (
    new.id,
    coalesce(nullif(new.raw_user_meta_data ->> 'full_name', ''), 'חבר קהילה'),
    nullif(new.raw_user_meta_data ->> 'phone', ''),
    v_birth_date,
    nullif(new.raw_user_meta_data ->> 'city', ''),
    nullif(new.raw_user_meta_data ->> 'gender', '')::public.gender,
    nullif(new.raw_user_meta_data ->> 'swim_level', '')::public.swim_level,
    now(),
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
