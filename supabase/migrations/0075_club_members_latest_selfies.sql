-- ============================================================================
-- Swell — club_members_latest_selfies(): התמונה העדכנית לכל חבר/ה, יעיל
-- ============================================================================
-- getClubMembersWithLatestSelfie() (data.ts) הייתה שולפת את כל המפגשים
-- וכל רשומות הנוכחות של הקהילה מההתחלה, ומחשבת בקוד מי הסלפי העדכני של
-- כל חבר/ה (ממצא P2 בביקורת מוכנות ההשקה, סעיף יעילות שאילתות). כאן
-- עושים את זה בתוך Postgres: לכל חבר/ה (קבוצה קטנה) — lateral join שמביא
-- רק את הנוכחות האחרונה שלו/ה שיש לה סלפי, ממוין לפי starts_at של
-- המפגש — לא כל ההיסטוריה של הקהילה בכל קריאה.
--
-- security definer כי club_members_select/attendances_select ב-RLS מרשות
-- לארגנת לראות הכל, אבל הפונקציה הזו עוקפת RLS ולכן חייבת לבדוק הרשאה
-- בעצמה — בדיוק כמו admin_add_attendance() — אחרת כל משתמש/ת מחוברת
-- יכולה לקרוא לה עם club_id של קהילה אחרת ולקבל רשימת חברים+תמונות
-- שלא שלה.
--
-- מדלגים על נוכחות בלי סלפי (הוספה ידנית ע"י מנהלת, admin_add_attendance)
-- ומחפשים את הקודמת — אותה מחלה שתוקנה כבר ב-event_going_list()
-- ב-migration 0024.
-- ============================================================================

create or replace function public.club_members_latest_selfies(p_club_id uuid)
returns table (
  profile_id  uuid,
  full_name   text,
  selfie_path text
)
language plpgsql security definer stable set search_path = public
as $$
begin
  if not public.is_club_organizer(p_club_id) then
    raise exception 'NOT_ORGANIZER';
  end if;

  return query
  select m.profile_id, p.full_name, s.selfie_path
  from public.club_members m
  join public.profiles p on p.id = m.profile_id
  left join lateral (
    select a.selfie_path
    from public.attendances a
    join public.events e on e.id = a.event_id
    where a.profile_id = m.profile_id
      and e.club_id = p_club_id
      and a.selfie_path is not null
    order by e.starts_at desc
    limit 1
  ) s on true
  where m.club_id = p_club_id and m.status = 'approved';
end;
$$;

revoke execute on function public.club_members_latest_selfies(uuid) from public, anon;
grant execute on function public.club_members_latest_selfies(uuid) to authenticated;
