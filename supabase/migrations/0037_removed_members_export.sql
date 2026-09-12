-- מוסיף את הסיבה להסרה (עזב/ה בעצמו/ה, הוסר/ה ע"י מנהלת, או בקשה
-- שנדחתה) לצד removed_at הקיים, ומרחיב את list_removed_members עם כל
-- הפרטים הדרושים לייצוא אקסל מלא — כולל תאריכי כל המפגשים שבהם
-- האדם באמת נכח, לפי בקשת שיר.
alter table public.club_members
  add column removed_reason text
    check (removed_reason in ('left', 'removed', 'rejected'));

create or replace function public.remove_member(p_profile_id uuid)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  v_club uuid;
  v_role text;
begin
  select club_id, role into v_club, v_role
    from public.club_members
    where profile_id = p_profile_id;

  if v_club is null or not public.is_club_organizer(v_club) then
    raise exception 'NOT_ORGANIZER';
  end if;
  if v_role = 'organizer' then
    raise exception 'CANNOT_REMOVE_ORGANIZER';
  end if;

  update public.club_members
  set status = 'removed', removed_at = now(), removed_reason = 'removed'
  where profile_id = p_profile_id and club_id = v_club and status = 'approved';
end;
$$;

create or replace function public.leave_community()
returns void
language plpgsql security definer set search_path = public
as $$
declare
  v_club uuid;
  v_role text;
begin
  select club_id, role into v_club, v_role
    from public.club_members
    where profile_id = auth.uid();

  if v_club is null then
    raise exception 'NOT_A_MEMBER';
  end if;
  if v_role = 'organizer' then
    raise exception 'CANNOT_REMOVE_ORGANIZER';
  end if;

  update public.club_members
  set status = 'removed', removed_at = now(), removed_reason = 'left'
  where profile_id = auth.uid() and club_id = v_club and status = 'approved';
end;
$$;

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

  update public.club_members
  set status = 'removed', removed_at = now(), removed_reason = 'rejected'
  where profile_id = p_profile_id and club_id = v_club and status = 'pending';
end;
$$;

create or replace function public.restore_member(p_profile_id uuid)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  v_club uuid;
begin
  select club_id into v_club
    from public.club_members
    where profile_id = p_profile_id and status = 'removed';

  if v_club is null or not public.is_club_organizer(v_club) then
    raise exception 'NOT_ORGANIZER';
  end if;

  update public.club_members
  set status = 'pending', removed_at = null, removed_reason = null
  where profile_id = p_profile_id and club_id = v_club;
end;
$$;

-- שינוי טיפוס ה-OUT parameters מחייב drop קודם (כמו ב-0027) — create
-- or replace לבדו לא מאפשר את זה.
drop function if exists public.list_removed_members(uuid);

create or replace function public.list_removed_members(p_club_id uuid)
returns table (
  profile_id uuid,
  full_name text,
  gender public.gender,
  birth_date date,
  city text,
  phone text,
  instagram text,
  swim_level public.swim_level,
  created_at timestamptz,
  waiver_accepted_at timestamptz,
  privacy_accepted_at timestamptz,
  removed_at timestamptz,
  removed_reason text,
  attended_dates timestamptz[]
)
language plpgsql security definer stable set search_path = public
as $$
begin
  if not public.is_club_organizer(p_club_id) then
    return;
  end if;

  return query
    select
      p.id,
      p.full_name,
      p.gender,
      p.birth_date,
      p.city,
      p.phone,
      p.instagram,
      p.swim_level,
      p.created_at,
      p.waiver_accepted_at,
      p.privacy_accepted_at,
      cm.removed_at,
      cm.removed_reason,
      array(
        select e.starts_at
        from public.attendances a
        join public.events e on e.id = a.event_id
        where a.profile_id = p.id and e.club_id = p_club_id
        order by e.starts_at
      )
    from public.club_members cm
    join public.profiles p on p.id = cm.profile_id
    where cm.club_id = p_club_id and cm.status = 'removed'
    order by cm.removed_at desc;
end;
$$;

revoke execute on function public.list_removed_members(uuid) from public, anon;
grant execute on function public.list_removed_members(uuid) to authenticated;
