-- מחיקה רכה של חברות: הסרה/עזיבה/דחייה כבר לא מוחקות את שורת
-- club_members — הן מסמנות אותה 'removed'. זה פותר שני דברים בבת אחת:
--
-- (1) profiles_select חזרה "לזכור" חברים שהוסרו: התנאי של מנהלת שם
--     בודק רק שקיימת שורת club_members עבור הפרופיל הנצפה, לא את
--     הסטטוס שלה — כל עוד השורה לא נמחקת, מנהלת חוזרת לראות פרופיל
--     והיסטוריה מלאים של כל מי שהיה אי-פעם בקהילה, גם בלי שנכחה איתו/ה
--     אישית באף מפגש (כמו שכבר קורה נכון ל-person_card, migration 0027).
-- (2) פותח דלת לשחזור חברות (restore_member) בלי הרשמה מחדש עם אימייל
--     אחר.
--
-- is_club_member() כבר בודקת status='approved' בלבד (migration 0002),
-- אז 'removed' לא נחשבת חברות פעילה בשום מקום אחר באתר — בלי לגעת
-- באף policy נוסף.
--
-- reject_member() אוחדה עם אותה לוגיקה בדיוק (removed, לא מחיקה) —
-- לפי בקשת שיר: דחיית בקשה צריכה להיות הפיכה באותה דרך בדיוק כמו
-- הסרה, לא מנגנון נפרד. גם מי שנדחה/תה יכול/ה להישחזר מאותה תצוגה.
alter table public.club_members add column removed_at timestamptz;

create or replace function public.remove_member(p_profile_id uuid)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  v_club uuid;
  v_role text;
begin
  select club_id, role into v_club, v_role
    from public.club_members
    where profile_id = p_profile_id;

  if v_club is null or not public.is_club_organizer(v_club) then
    raise exception 'NOT_ORGANIZER';
  end if;
  if v_role = 'organizer' then
    raise exception 'CANNOT_REMOVE_ORGANIZER';
  end if;

  update public.club_members
  set status = 'removed', removed_at = now()
  where profile_id = p_profile_id and club_id = v_club and status = 'approved';
end;
$$;

create or replace function public.leave_community()
returns void
language plpgsql security definer set search_path = public
as $$
declare
  v_club uuid;
  v_role text;
begin
  select club_id, role into v_club, v_role
    from public.club_members
    where profile_id = auth.uid();

  if v_club is null then
    raise exception 'NOT_A_MEMBER';
  end if;
  if v_role = 'organizer' then
    raise exception 'CANNOT_REMOVE_ORGANIZER';
  end if;

  update public.club_members
  set status = 'removed', removed_at = now()
  where profile_id = auth.uid() and club_id = v_club and status = 'approved';
end;
$$;

create or replace function public.reject_member(p_profile_id uuid)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  v_club uuid;
begin
  select club_id into v_club from public.club_members where profile_id = p_profile_id;
  if v_club is null or not public.is_club_organizer(v_club) then
    raise exception 'NOT_ORGANIZER';
  end if;

  update public.club_members
  set status = 'removed', removed_at = now()
  where profile_id = p_profile_id and club_id = v_club and status = 'pending';
end;
$$;

-- שחזור: הופך 'removed' בחזרה ל-'pending' — עובר שוב את תהליך האישור
-- הרגיל (מופיע ב-list_pending_members, כמו כל בקשת הצטרפות חדשה),
-- לפי בקשה מפורשת: אף אחד לא חוזר אוטומטית בלי בדיקה נוספת של מנהלת.
create or replace function public.restore_member(p_profile_id uuid)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  v_club uuid;
begin
  select club_id into v_club
    from public.club_members
    where profile_id = p_profile_id and status = 'removed';

  if v_club is null or not public.is_club_organizer(v_club) then
    raise exception 'NOT_ORGANIZER';
  end if;

  update public.club_members
  set status = 'pending', removed_at = null
  where profile_id = p_profile_id and club_id = v_club;
end;
$$;

-- מי שכבר לא בקהילה (הוסרו/עזבו/נדחו) — לתצוגה הנפרדת בעמוד הניהול.
create or replace function public.list_removed_members(p_club_id uuid)
returns table (profile_id uuid, full_name text, removed_at timestamptz)
language plpgsql security definer stable set search_path = public
as $$
begin
  if not public.is_club_organizer(p_club_id) then
    return;
  end if;

  return query
    select p.id, p.full_name, cm.removed_at
    from public.club_members cm
    join public.profiles p on p.id = cm.profile_id
    where cm.club_id = p_club_id and cm.status = 'removed'
    order by cm.removed_at desc;
end;
$$;

revoke execute on function
  public.restore_member(uuid),
  public.list_removed_members(uuid)
from public, anon;

grant execute on function
  public.restore_member(uuid),
  public.list_removed_members(uuid)
to authenticated;
