-- ============================================================================
-- Swell — event_going_list(): "התמונה העדכנית" מתעלמת מנוכחות בלי סלפי
-- ============================================================================
-- באג: הלוגיקה ב-migration 0018 בחרה את הנוכחות העדכנית ביותר בזמן
-- (order by checked_in_at desc limit 1) בלי להתחשב אם יש לה סלפי בכלל.
-- נוכחות שנוספה ידנית ע"י מנהלת (admin_add_attendance) לא עוברת בכלל
-- דרך זרימת המצלמה, ולכן ה-selfie_path שלה הוא null — ואם זו הנוכחות
-- הכי עדכנית של אדם, event_going_list() מחזירה null גם אם יש לו סלפים
-- אמיתיים ממפגשים קודמים. התיקון: מדלגים על שורות בלי סלפי בתת-השאילתה,
-- כך שנבחר הסלפי האחרון שכן קיים, לא הנוכחות האחרונה כשלעצמה.
-- ============================================================================

drop function if exists public.event_going_list(uuid);

create or replace function public.event_going_list(p_event_id uuid)
returns table (
  profile_id  uuid,
  full_name   text,
  swim_level  public.swim_level,
  selfie_path text,
  face_x      double precision,
  face_y      double precision
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
      latest.face_y
    from public.rsvps r
    join public.profiles p on p.id = r.profile_id
    -- הסלפי העדכני ביותר של p, מכל מפגש — אבל מצטרף רק אם מי שקורא
    -- לפונקציה (auth.uid()) כבר נכח יחד עם p באיזשהו מפגש בעבר.
    left join lateral (
      select a.selfie_path, a.face_x, a.face_y
      from public.attendances a
      where a.profile_id = p.id
        and a.selfie_path is not null
      order by a.checked_in_at desc
      limit 1
    ) latest
      on exists (
        select 1
        from public.attendances mine
        join public.attendances theirs on theirs.event_id = mine.event_id
        where mine.profile_id = auth.uid() and theirs.profile_id = p.id
      )
    where r.event_id = p_event_id and r.going
    order by r.created_at;
end;
$$;

revoke execute on function public.event_going_list(uuid) from public, anon;
grant execute on function public.event_going_list(uuid) to authenticated;
