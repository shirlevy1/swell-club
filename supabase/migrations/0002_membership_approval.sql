-- ============================================================================
-- Swell — אישור הצטרפות ידני
-- ============================================================================
-- הצטרפות פתוחה הוחלפה: כל הרשמה חדשה ממתינה לאישור מנהלת הקהילה, לפני
-- שהיא מקבלת גישה לתוכן (מפגשים, נוכחויות, אנשים). מי שכבר היה חבר לפני
-- המיגרציה הזו נשאר מאושר — אין אישור רטרואקטיבי (ברירת המחדל 'approved'
-- חלה גם על שורות קיימות).
--
-- להדבקה ב-Supabase → SQL Editor → New query → Run.
-- ============================================================================

create type public.member_status as enum ('pending', 'approved');

alter table public.club_members
  add column status public.member_status not null default 'approved';


-- ----------------------------- is_club_member -------------------------------
-- "חברות" מכאן ואילך פירושה חברות מאושרת. זו הפונקציה שמזינה כמעט כל
-- policy באפליקציה (events, rsvps, attendances וכו') — שינוי אחד כאן סוגר
-- אוטומטית גישה לממתינים בכל מקום, בלי לגעת בעשרות policies בנפרד.
create or replace function public.is_club_member(p_club_id uuid)
returns boolean
language sql security definer stable set search_path = public
as $$
  select exists (
    select 1 from public.club_members
    where club_id = p_club_id and profile_id = auth.uid() and status = 'approved'
  );
$$;


-- ---------------------------- handle_new_user --------------------------------
-- מי שנרשם/ת ראשון/ה עדיין הופך/ת אוטומטית למנהל/ת ומאושר/ת מיד — אין
-- טעם לחסום את המנהלת הראשונה מהקהילה שהיא עצמה הקימה.
create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  v_club uuid;
  v_is_first boolean;
begin
  insert into public.profiles (id, full_name, phone, birth_date, city, waiver_accepted_at, instagram)
  values (
    new.id,
    coalesce(nullif(new.raw_user_meta_data ->> 'full_name', ''), 'חבר קהילה'),
    nullif(new.raw_user_meta_data ->> 'phone', ''),
    nullif(new.raw_user_meta_data ->> 'birth_date', '')::date,
    nullif(new.raw_user_meta_data ->> 'city', ''),
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


-- ------------------------------ ניהול הממתינים -------------------------------

create or replace function public.list_pending_members(p_club_id uuid)
returns table (profile_id uuid, full_name text, requested_at timestamptz)
language plpgsql security definer stable set search_path = public
as $$
begin
  if not public.is_club_organizer(p_club_id) then
    return;
  end if;

  return query
    select p.id, p.full_name, cm.joined_at
    from public.club_members cm
    join public.profiles p on p.id = cm.profile_id
    where cm.club_id = p_club_id and cm.status = 'pending'
    order by cm.joined_at;
end;
$$;

create or replace function public.approve_member(p_profile_id uuid)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  v_club uuid;
begin
  select club_id into v_club from public.club_members where profile_id = p_profile_id;
  if v_club is null or not public.is_club_organizer(v_club) then
    raise exception 'NOT_ORGANIZER';
  end if;

  update public.club_members
  set status = 'approved'
  where profile_id = p_profile_id and club_id = v_club;
end;
$$;

-- דחייה מוחקת את השורה — לא "חוסמת" לצמיתות. אם המנהלת התחרטה, אפשר
-- להזמין את האדם להירשם שוב ולפתוח בקשה חדשה.
create or replace function public.reject_member(p_profile_id uuid)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  v_club uuid;
begin
  select club_id into v_club from public.club_members where profile_id = p_profile_id;
  if v_club is null or not public.is_club_organizer(v_club) then
    raise exception 'NOT_ORGANIZER';
  end if;

  delete from public.club_members
  where profile_id = p_profile_id and club_id = v_club and status = 'pending';
end;
$$;

revoke execute on function
  public.list_pending_members(uuid),
  public.approve_member(uuid),
  public.reject_member(uuid)
from public, anon;

grant execute on function
  public.list_pending_members(uuid),
  public.approve_member(uuid),
  public.reject_member(uuid)
to authenticated;
