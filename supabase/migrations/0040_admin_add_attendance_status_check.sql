-- admin_add_attendance() בדקה רק "יש שורת חברות" בלי סטטוס — בדיוק אותה
-- מחלה כמו person_card() לפני migration 0039. בפועל לא נגיש כרגע כי
-- הרשימה בממשק (getClubMembersWithLatestSelfie) כבר מסוננת לחברים
-- מאושרים בלבד — זה חיזוק הגנת-עומק בשרת, לא תיקון של תקלה קיימת.
create or replace function public.admin_add_attendance(
  p_event_id   uuid,
  p_profile_id uuid
)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  v_club uuid;
  v_opens_at timestamptz;
begin
  select club_id, starts_at - (checkin_opens_before_min || ' minutes')::interval
    into v_club, v_opens_at
    from public.events where id = p_event_id;
  if v_club is null then
    raise exception 'EVENT_NOT_FOUND';
  end if;
  if not public.is_club_organizer(v_club) then
    raise exception 'NOT_ORGANIZER';
  end if;
  if not exists (
    select 1 from public.club_members
    where club_id = v_club and profile_id = p_profile_id and status = 'approved'
  ) then
    raise exception 'NOT_A_MEMBER';
  end if;
  if now() < v_opens_at then
    raise exception 'EVENT_NOT_OPEN_YET';
  end if;

  insert into public.attendances (event_id, profile_id, added_manually)
  values (p_event_id, p_profile_id, true)
  on conflict (event_id, profile_id) do nothing;
end;
$$;
