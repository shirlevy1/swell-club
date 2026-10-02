-- ============================================================================
-- Swell — gender ב-event_going_list() וב-list_pending_members()
-- ============================================================================
-- נדרש לניסוח נכון (byGender(), לא סימון "/") בהודעות הכרזה שקטות
-- לקוראי מסך שנוספו לרענון חי ("X הצטרף/ה", "X ביקש/ה להצטרף") —
-- האתר כבר יודע את המגדר של כל אחד/ת (נבחר בהרשמה), רק שתי השאילתות
-- האלה לא שלפו אותו עד עכשיו. אותו דפוס בדיוק כמו gender ב-person_card
-- (migration 0019): גלוי תמיד, לא נעול, משמש רק לניסוח.
--
-- שינוי טור פלט לא נתמך ע"י create or replace — צריך למחוק את
-- החתימה הישנה קודם, אותו תהליך כמו ב-0052 וב-0019.
-- ============================================================================

drop function if exists public.event_going_list(uuid);

create function public.event_going_list(p_event_id uuid)
returns table (
  profile_id   uuid,
  full_name    text,
  gender       public.gender,
  swim_level   public.swim_level,
  selfie_path  text,
  face_x       double precision,
  face_y       double precision,
  shared_count integer
)
language plpgsql security definer stable set search_path = public
as $$
declare
  v_club uuid;
begin
  select club_id into v_club from public.events where id = p_event_id;
  if v_club is null or not public.is_club_member(v_club) then
    return;
  end if;

  return query
    select
      p.id,
      p.full_name,
      p.gender,
      p.swim_level,
      latest.selfie_path,
      latest.face_x,
      latest.face_y,
      shared.cnt
    from public.rsvps r
    join public.profiles p on p.id = r.profile_id
    cross join lateral (
      select count(*)::int as cnt
      from public.attendances mine
      join public.attendances theirs on theirs.event_id = mine.event_id
      where mine.profile_id = auth.uid() and theirs.profile_id = p.id
    ) shared
    -- הסלפי העדכני ביותר של p, מכל מפגש — אבל מצטרף רק אם כבר נכחנו
    -- יחד באיזשהו מפגש בעבר (shared.cnt > 0).
    left join lateral (
      select a.selfie_path, a.face_x, a.face_y
      from public.attendances a
      where a.profile_id = p.id
        and a.selfie_path is not null
      order by a.checked_in_at desc
      limit 1
    ) latest
      on shared.cnt > 0
    where r.event_id = p_event_id and r.going
    order by r.created_at;
end;
$$;

revoke execute on function public.event_going_list(uuid) from public, anon;
grant execute on function public.event_going_list(uuid) to authenticated;

drop function if exists public.list_pending_members(uuid);

create function public.list_pending_members(p_club_id uuid)
returns table (
  profile_id   uuid,
  full_name    text,
  gender       public.gender,
  requested_at timestamptz,
  birth_date   date,
  phone        text,
  instagram    text
)
language plpgsql security definer stable set search_path = public
as $$
begin
  if not public.is_club_organizer(p_club_id) then
    return;
  end if;

  return query
    select p.id, p.full_name, p.gender, cm.joined_at, p.birth_date, p.phone, p.instagram
    from public.club_members cm
    join public.profiles p on p.id = cm.profile_id
    where cm.club_id = p_club_id and cm.status = 'pending'
    order by cm.joined_at;
end;
$$;

revoke execute on function public.list_pending_members(uuid) from public, anon;
grant execute on function public.list_pending_members(uuid) to authenticated;
