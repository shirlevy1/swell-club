-- ============================================================================
-- Swell — סדר ב"מי רואה מה ומתי"
-- ============================================================================
-- שלושה שינויי חשיפה, לפי החלטה מוצרית מפורשת:
--
-- 1. מי שסימן הגעה (לפני שנכחו) — רואים שם + רמת שחייה של כל אחד.
--    event_going_list() ו-events_going_names() מחזירות עכשיו גם swim_level.
--    (עדיין בלי תמונות/וואטסאפ/אינסטגרם — אלה נשארים פרס על נוכחות מוכחת.)
--
-- 2. מי שנכחו יחד — נשאר כמו שהיה (person_card כבר מחזירה swim_level
--    מגרסה 0012), רק attendee-grid בצד הלקוח לא הציגה את זה. אין שינוי
--    ב-SQL כאן, רק בקוד.
--
-- 3. מנהלת שמאשרת בקשת הצטרפות — רואה עכשיו גם תאריך לידה (לחישוב גיל
--    בצד הלקוח), טלפון ואינסטגרם, לא רק שם. list_pending_members() מחזירה
--    את השדות האלה בנוסף למה שהייתה מחזירה.
--
-- כל שלוש הפונקציות משתמשות ב-drop לפני create or replace, כי שינוי
-- רשימת העמודות המוחזרות (RETURNS TABLE) הוא שינוי סוג החזרה ש-Postgres
-- מסרב להחליף בלי מחיקה קודמת — ולכן חובה revoke/grant מחדש בסוף, אחרת
-- הפונקציה נשארת פתוחה ל-anon כברירת המחדל של Postgres.
-- ============================================================================

drop function if exists public.event_going_list(uuid);

create or replace function public.event_going_list(p_event_id uuid)
returns table (profile_id uuid, full_name text, swim_level public.swim_level)
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
    select p.id, p.full_name, p.swim_level
    from public.rsvps r
    join public.profiles p on p.id = r.profile_id
    where r.event_id = p_event_id and r.going
    order by r.created_at;
end;
$$;

drop function if exists public.events_going_names(uuid[]);

create or replace function public.events_going_names(p_event_ids uuid[])
returns table (event_id uuid, profile_id uuid, full_name text, swim_level public.swim_level)
language plpgsql security definer stable set search_path = public
as $$
begin
  if p_event_ids is null or array_length(p_event_ids, 1) > 100 then
    raise exception 'TOO_MANY_EVENTS';
  end if;

  return query
    select r.event_id, p.id, p.full_name, p.swim_level
    from public.rsvps r
    join public.events e on e.id = r.event_id
    join public.profiles p on p.id = r.profile_id
    where r.event_id = any (p_event_ids)
      and r.going
      and public.is_club_member(e.club_id)
    order by r.event_id, r.created_at;
end;
$$;

drop function if exists public.list_pending_members(uuid);

create or replace function public.list_pending_members(p_club_id uuid)
returns table (
  profile_id   uuid,
  full_name    text,
  requested_at timestamptz,
  birth_date   date,
  phone        text,
  instagram    text
)
language plpgsql security definer stable set search_path = public
as $$
begin
  if not public.is_club_organizer(p_club_id) then
    return;
  end if;

  return query
    select p.id, p.full_name, cm.joined_at, p.birth_date, p.phone, p.instagram
    from public.club_members cm
    join public.profiles p on p.id = cm.profile_id
    where cm.club_id = p_club_id and cm.status = 'pending'
    order by cm.joined_at;
end;
$$;

revoke execute on function
  public.event_going_list(uuid),
  public.events_going_names(uuid[]),
  public.list_pending_members(uuid)
from public, anon;

grant execute on function
  public.event_going_list(uuid),
  public.events_going_names(uuid[]),
  public.list_pending_members(uuid)
to authenticated;
