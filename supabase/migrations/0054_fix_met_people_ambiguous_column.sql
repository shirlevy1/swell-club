-- ============================================================================
-- Swell — תיקון met_people(): "column reference profile_id is ambiguous"
-- ============================================================================
-- לפונקציה יש טור פלט בשם profile_id, שהופך למשתנה זמין בכל גוף
-- הפונקציה (כמו כל טור OUT ב-PL/pgSQL) — בשורת "מצא את הקהילה שלי"
-- הייתה השוואה לא-מכוונת ("where profile_id = auth.uid()") בלי לציין
-- מאיזו טבלה, אז פוסטגרס לא הצליח להבחין בין עמודת club_members.profile_id
-- לבין המשתנה. זה גרם לכל קריאה אמיתית לפונקציה (לא רק לוגיקה מדומה
-- בעורך ה-SQL) להיכשל בשקט, אף שהבדיקות הידניות של הלוגיקה עצמה
-- (עם שמות במקום auth.uid()) עברו בהצלחה.
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

revoke execute on function public.met_people() from public, anon;
grant execute on function public.met_people() to authenticated;
