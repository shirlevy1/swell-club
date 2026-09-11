-- "הייתה איתנו ב-X מתוך Y מפגשים החודש" בעמוד /people/[id] סיפר בפועל
-- לא כמה מפגשים האדם עצמו נכח בהם החודש, אלא כמה מפגשים גם הוא/היא
-- וגם הצופה/ת הנוכחי/ת נכחו בהם ביחד — כי attendances_select ב-RLS
-- מרשה לקרוא שורת נוכחות רק למי שנכח/ה באותו מפגש בעצמו/ה
-- (has_attended(event_id)), לא לפי profile_id שמבקשים. אותה מחלה בדיוק
-- שכבר טופלה עבור attended_count הכולל ב-person_card() — כאן צריך את
-- אותו פתרון (security definer) גם לגרסה המצומצמת ל-30 יום אחרונים.
create or replace function public.person_month_attendance_count(
  p_profile_id uuid,
  p_club_id uuid
)
returns integer
language plpgsql security definer stable set search_path = public
as $$
begin
  if not public.is_club_member(p_club_id) then
    return null;
  end if;
  return (
    select count(*)::int
    from public.attendances a
    join public.events e on e.id = a.event_id
    where a.profile_id = p_profile_id
      and e.club_id = p_club_id
      and e.starts_at >= now() - interval '30 days'
      and e.starts_at <= now()
  );
end;
$$;

revoke execute on function public.person_month_attendance_count(uuid, uuid) from public, anon;
grant execute on function public.person_month_attendance_count(uuid, uuid) to authenticated;
