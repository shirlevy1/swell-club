-- ============================================================================
-- Swell — מגדר ב-person_card(), לניסוח נכון בעמוד אדם
-- ============================================================================
-- gender גלוי תמיד (כמו full_name), לא נעול עד שנכחתם יחד — הוא לא
-- מוצג כעובדה בפני עצמה, רק משמש לבחור בין "היה איתנו"/"הייתה איתנו"
-- בטקסט. בלעדיו העמוד נופל תמיד ללשון זכר, גם כשמדובר באישה.
-- ============================================================================

drop function if exists public.person_card(uuid);

create or replace function public.person_card(p_profile_id uuid)
returns table (
  full_name      text,
  gender         public.gender,
  instagram      text,
  phone          text,
  swim_level     public.swim_level,
  shared_count   integer,
  attended_count integer
)
language plpgsql security definer stable set search_path = public
as $$
declare
  v_shared int;
  v_organizer boolean;
begin
  if not exists (
    select 1
    from public.club_members me
    join public.club_members them on them.club_id = me.club_id
    where me.profile_id = auth.uid() and them.profile_id = p_profile_id
  ) then
    return;
  end if;

  select count(*)::int into v_shared
  from public.attendances a
  where a.profile_id = p_profile_id and public.has_attended(a.event_id);

  select exists (
    select 1 from public.club_members cm
    where cm.profile_id = p_profile_id
      and public.is_club_organizer(cm.club_id)
  ) into v_organizer;

  return query
    select
      p.full_name,
      p.gender,
      case when v_shared > 0 or v_organizer then p.instagram else null end,
      case when v_shared > 0 or v_organizer then p.phone else null end,
      case when v_shared > 0 or v_organizer then p.swim_level else null end,
      v_shared,
      (select count(*)::int from public.attendances a
        where a.profile_id = p_profile_id)
    from public.profiles p
    where p.id = p_profile_id;
end;
$$;

revoke execute on function public.person_card(uuid) from public, anon;
grant execute on function public.person_card(uuid) to authenticated;
