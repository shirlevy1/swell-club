-- ============================================================================
-- Swell — מגדר בפרופיל
-- ============================================================================
-- nullable בכוונה, בדיוק כמו phone/birth_date/city — הכפייה ל"חובה"
-- קורית בטופס (ההרשמה ועריכת הפרופיל), לא כאילוץ במסד. אחרת פרופילים
-- קיימים בלי הערך הזה היו שוברים את המיגרציה.
-- ============================================================================

create type public.gender as enum ('female', 'male', 'other');

alter table public.profiles add column gender public.gender;

create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  v_club uuid;
  v_is_first boolean;
begin
  insert into public.profiles (id, full_name, phone, birth_date, city, gender, waiver_accepted_at, instagram)
  values (
    new.id,
    coalesce(nullif(new.raw_user_meta_data ->> 'full_name', ''), 'חבר קהילה'),
    nullif(new.raw_user_meta_data ->> 'phone', ''),
    nullif(new.raw_user_meta_data ->> 'birth_date', '')::date,
    nullif(new.raw_user_meta_data ->> 'city', ''),
    nullif(new.raw_user_meta_data ->> 'gender', '')::public.gender,
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
