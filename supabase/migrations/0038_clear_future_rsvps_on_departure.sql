-- מוחק סימוני "מגיע/ה" (RSVP) למפגשים עתידיים כשמישהו/י מוסר/ת או
-- עוזב/ת, לפי בקשת שיר. בלי זה, event_going_list()/events_going_names()
-- ממשיכות להראות שם שכבר לא חבר/ה ברשימת "מי מגיע" למפגש שעוד לא
-- קרה — מטעה, כי צ'ק־אין דורש חברות פעילה שכבר אין לו/ה. RSVP למפגשים
-- שכבר עברו נשאר בכוונה, כחלק מההיסטוריה (אותו עיקרון כמו שאר
-- migration 0036/0037).
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

  delete from public.rsvps
  where profile_id = p_profile_id
    and event_id in (
      select id from public.events where club_id = v_club and starts_at > now()
    );
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

  delete from public.rsvps
  where profile_id = auth.uid()
    and event_id in (
      select id from public.events where club_id = v_club and starts_at > now()
    );
end;
$$;
