-- ============================================================================
-- Swell — תעודת זהות וכתובת מגורים (רחוב+עיר) בהרשמה, וגרסת טקסט
-- משפטי 9 (גילוי איסוף תעודת זהות וכתובת)
-- ============================================================================
-- תעודת זהות ורחוב נשמרים בטבלה **נפרדת** מ-profiles, לא כעמודות
-- נוספות עליה - בכוונה. profiles_select מרשה לכל מי שנכח יחד איתך
-- במפגש לקרוא את כל השורה (RLS הוא ברמת שורה, לא עמודה - ראו
-- ה"מלכודות" ב-AGENTS.md) - וזה בסדר לשם/תמונה, אבל לא למספר תעודת
-- זהות. טבלה נפרדת עם RLS משלה (רק את/ה עצמך, או מנהלת) מבטיחה
-- שהמידע הזה לא יחשף לחברי קהילה אחרים בשום תרחיש עתידי, גם לא
-- בטעות (לא תלוי במשמעת "לבחור עמודות מפורשות" בכל שאילתה חדשה
-- שתיכתב על profiles).
--
-- עיר מגורים כבר הייתה בטופס ההרשמה (profiles.city) - רק הרחוב חדש
-- כאן, אבל הוא נשמר יחד עם תעודת הזהות, לא על profiles, מאותה סיבה.
-- ============================================================================

create table public.profile_private_info (
  profile_id uuid primary key references public.profiles(id) on delete cascade,
  id_number  text,
  street     text,
  updated_at timestamptz not null default now()
);

alter table public.profile_private_info enable row level security;

create policy "profile_private_info_select" on public.profile_private_info
for select to authenticated using (
  profile_id = auth.uid()
  or exists (
    select 1 from public.club_members cm
    where cm.profile_id = profile_private_info.profile_id
      and public.is_club_organizer(cm.club_id)
  )
);

create policy "profile_private_info_insert_own" on public.profile_private_info
for insert to authenticated with check (profile_id = auth.uid());

create policy "profile_private_info_update_own" on public.profile_private_info
for update to authenticated using (profile_id = auth.uid()) with check (profile_id = auth.uid());


-- ============================================================================
-- handle_new_user(): גם יוצר שורת profile_private_info עם תעודת הזהות
-- והרחוב מההרשמה, גם מעלה את גרסת הטקסט המשפטי ל-9 (components/legal-text.tsx,
-- PrivacyPolicyBody עודכנה עם גילוי איסוף תעודת הזהות והכתובת).
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
    9,
    now(),
    nullif(new.raw_user_meta_data ->> 'instagram', '')
  );

  insert into public.profile_private_info (profile_id, id_number, street)
  values (
    new.id,
    nullif(new.raw_user_meta_data ->> 'id_number', ''),
    nullif(new.raw_user_meta_data ->> 'street', '')
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
