-- ============================================================================
-- Swell — "מי הכרתם היום?": תיקון ההגדרה של "פגישה ראשונה"
-- ============================================================================
-- event_first_meetings() (migration 0050) בדקה "האם יש בדיוק מפגש
-- משותף אחד בינינו, נכון לעכשיו" — הגדרה שמשתנה עם הזמן: ברגע
-- שנפגשתם עוד פעם, המפגש הישן "מפסיק" להיות פגישה ראשונה, וחוזרים
-- אליו מאוחר יותר כבר לא רואים את הרגע ההוא (נמצא בבדיקה בפועל: מפגש
-- שהיה בהחלט הפעם הראשונה בין שני אנשים הפסיק להופיע אחרי שהם נפגשו
-- שוב באירועים מאוחרים יותר).
--
-- "פגישה ראשונה" היא עובדה היסטורית קבועה, לא ספירה חיה — התיקון:
-- המפגש הזה הוא פגישה ראשונה אם ורק אם הוא המוקדם ביותר מבין כל
-- המפגשים המשותפים בינינו, לא משנה כמה עוד נפגשנו מאז.
-- ============================================================================

create or replace function public.event_first_meetings(p_event_id uuid)
returns table (profile_id uuid)
language plpgsql security definer stable set search_path = public
as $$
declare
  v_club uuid;
  v_starts_at timestamptz;
begin
  if not public.has_attended(p_event_id) then
    return;
  end if;

  select club_id, starts_at into v_club, v_starts_at
    from public.events where id = p_event_id;
  if v_club is null then
    return;
  end if;

  return query
    select a.profile_id
    from public.attendances a
    where a.event_id = p_event_id
      and a.profile_id <> auth.uid()
      and v_starts_at = (
        select min(e2.starts_at)
        from public.attendances a2
        join public.events e2 on e2.id = a2.event_id
        where a2.profile_id = a.profile_id
          and e2.club_id = v_club
          and public.has_attended(a2.event_id)
      );
end;
$$;

revoke execute on function public.event_first_meetings(uuid) from public, anon;
grant execute on function public.event_first_meetings(uuid) to authenticated;
