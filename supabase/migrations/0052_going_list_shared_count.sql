-- ============================================================================
-- Swell — event_going_list(): מחזירה גם shared_count
-- ============================================================================
-- עד עכשיו רק exists() בוליאני שקבע אם להראות תמונה. עכשיו count(*)
-- אמיתי — אותו סימון בדיוק קובע גם אם יש תמונה (shared_count > 0),
-- וגם מאפשר למיין ברשימת "מי מגיע?" כך שמי שנפגשתם איתם הכי הרבה
-- פעמים עולה קודם, לא רק "נפגשנו/לא נפגשנו".
-- ============================================================================

create or replace function public.event_going_list(p_event_id uuid)
returns table (
  profile_id   uuid,
  full_name    text,
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
