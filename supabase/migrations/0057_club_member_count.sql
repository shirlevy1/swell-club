-- ============================================================================
-- Swell — club_member_count(): כמה חברים מאושרים יש בקהילה של הצופה/ת
-- ============================================================================
-- security definer בכוונה: club_members_select (0001) מרשה לחבר/ה רגיל/ה
-- לראות רק את השורה של עצמו/ה, ולכן ספירה של כל הקהילה חייבת לעקוף
-- את ה-RLS הזה — בדיוק כמו met_people()/person_card().
-- ============================================================================

create or replace function public.club_member_count()
returns integer
language sql security definer stable set search_path = public
as $$
  select count(*)::int
  from public.club_members cm
  where cm.status = 'approved'
    and cm.club_id = (
      select mine.club_id
      from public.club_members mine
      where mine.profile_id = auth.uid() and mine.status = 'approved'
      limit 1
    )
$$;

revoke execute on function public.club_member_count() from public, anon;
grant execute on function public.club_member_count() to authenticated;
