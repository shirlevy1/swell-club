-- ============================================================================
-- Swell — "מי הכרתם היום?" (event_first_meetings)
-- ============================================================================
-- לכל מי שנכח באותו מפגש כמוני, האם המפגש הזה הוא הפעם הראשונה
-- שנכחנו יחד — אותו חישוב shared_count בדיוק כמו ב-person_card(), רק
-- שכאן בודקים "==1" (המפגש הנוכחי הוא היחיד) במקום ">0" (אי-פעם).
-- security definer כי היא קוראת נוכחויות במפגשים אחרים של האדם השני
-- שלא בהכרח נכחתי בהם בעצמי — RLS על attendances (attendances_select)
-- מרשה לראות מפגש רק אם נכחתי בו, לא היסטוריה שלמה של מישהו אחר.
-- ============================================================================

create or replace function public.event_first_meetings(p_event_id uuid)
returns table (profile_id uuid)
language plpgsql security definer stable set search_path = public
as $$
declare
  v_club uuid;
begin
  if not public.has_attended(p_event_id) then
    return;
  end if;

  select club_id into v_club from public.events where id = p_event_id;
  if v_club is null then
    return;
  end if;

  return query
    select a.profile_id
    from public.attendances a
    where a.event_id = p_event_id
      and a.profile_id <> auth.uid()
      and (
        select count(*)::int
        from public.attendances a2
        join public.events e2 on e2.id = a2.event_id
        where a2.profile_id = a.profile_id
          and e2.club_id = v_club
          and public.has_attended(a2.event_id)
      ) = 1;
end;
$$;

revoke execute on function public.event_first_meetings(uuid) from public, anon;
grant execute on function public.event_first_meetings(uuid) to authenticated;
