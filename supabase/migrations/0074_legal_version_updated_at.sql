-- ============================================================================
-- Swell — תאריך האישור האחרון של הטקסט המשפטי
-- ============================================================================
-- legal_version (migration 0065) שומר *איזו* גרסה אושרה, אבל לא *מתי*.
-- waiver_accepted_at/privacy_accepted_at לא מתאימים לזה - הם נעולים
-- לרגע האישור הראשון אי-פעם (migration 0031) ולא זזים כשמישהו מאשר
-- מחדש גרסה מעודכנת (legal-update-gate.tsx/legal-update-banner.tsx).
-- העמודה הזו, בניגוד אליהם, *לא* נעולה - מתעדכנת בכל אישור, כולל חוזר.
--
-- ⚠️ Backfill לחשבונות קיימים: אין דרך לדעת את המועד האמיתי שבו אושרה
-- הגרסה האחרונה שכבר נשמרה אצלם (העמודה הזו לא הייתה קיימת אז) - ממלאים
-- עם waiver_accepted_at כהערכה הכי טובה שיש (מועד האישור הראשון שלהם),
-- לא מועד מדויק. מכאן ואילך, כל אישור חדש (כולל חוזר) כן נרשם במדויק.
-- ============================================================================

alter table public.profiles add column legal_version_updated_at timestamptz;

update public.profiles
set legal_version_updated_at = waiver_accepted_at
where legal_version is not null and legal_version_updated_at is null;

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

  insert into public.profiles (id, full_name, phone, birth_date, city, gender, swim_level, waiver_accepted_at, privacy_accepted_at, legal_version, legal_version_updated_at, instagram)
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
    6,
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
