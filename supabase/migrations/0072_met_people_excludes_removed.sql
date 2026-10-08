-- ============================================================================
-- Swell — met_people() ("האנשים שלי מסוואל") הציגה גם מי שכבר לא בקהילה
-- ============================================================================
-- הפונקציה שאבה את "מי נכח/ה איתי באותו מפגש" ישירות מ-attendances,
-- בלי לבדוק אם האדם עדיין חבר/ה מאושר/ת בקהילה. attendances לא נמחקת
-- כשמישהו עוזב/מוסר/ת (זה בכוונה - ההיסטוריה נשארת), אז מי שהוסר/ה
-- המשיך/ה להופיע ב"האנשים שלי מסוואל" בעמוד הבית לנצח. עכשיו יש גם
-- בדיקה ש-club_members.status='approved' לאדם שפגשת, לא רק לך.
--
-- להדבקה ב-Supabase → SQL Editor → New query → Run.
-- ============================================================================

create or replace function public.met_people()
returns table (
  profile_id uuid,
  full_name  text,
  selfie_path text,
  face_x     double precision,
  face_y     double precision
)
language plpgsql security definer stable set search_path = public
as $$
declare
  v_club uuid;
begin
  select cm.club_id into v_club from public.club_members cm
    where cm.profile_id = auth.uid() and cm.status = 'approved'
    limit 1;
  if v_club is null then
    return;
  end if;

  return query
    select
      p.id,
      p.full_name,
      latest.selfie_path,
      latest.face_x,
      latest.face_y
    from (
      select distinct a2.profile_id
      from public.attendances a2
      join public.events e2 on e2.id = a2.event_id
      where e2.club_id = v_club
        and a2.profile_id <> auth.uid()
        and public.has_attended(a2.event_id)
    ) met
    join public.club_members mcm
      on mcm.profile_id = met.profile_id
      and mcm.club_id = v_club
      and mcm.status = 'approved'
    join public.profiles p on p.id = met.profile_id
    left join lateral (
      select a.selfie_path, a.face_x, a.face_y
      from public.attendances a
      where a.profile_id = met.profile_id
        and a.selfie_path is not null
        and exists (
          select 1 from public.attendances mine
          where mine.event_id = a.event_id and mine.profile_id = auth.uid()
        )
      order by a.checked_in_at desc
      limit 1
    ) latest on true;
end;
$$;
