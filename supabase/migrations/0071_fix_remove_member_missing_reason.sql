-- ============================================================================
-- Swell — תיקון רגרסיה: remove_member() הפסיקה לשמור removed_reason
-- ============================================================================
-- 0037 הוסיפה removed_reason ("left"/"removed"/"rejected") ותמיד שמרה
-- אותו נכון. 0062 כתבה מחדש את remove_member() כדי להוסיף הגנת-מירוץ
-- (אותו דפוס כמו 0045 ל-reject_member), אבל ה-UPDATE החדש שם שכח
-- להמשיך לשמור removed_reason='removed' - מאז, כל הסרה דרך הכפתור
-- "הסרה מהקהילה" (remove-member-button.tsx) שומרת תאריך אבל סיבה
-- ריקה. זה בדיוק מה שגרם לשורות "בדיקה שיר" ו"אביה רחמן לוי" בעמוד
-- "אקסים" להופיע בלי סיבה - לא נתונים שנוצרו ידנית, אלא כל הסרה
-- אמיתית מאז 0062.
--
-- להדבקה ב-Supabase → SQL Editor → New query → Run.
-- ============================================================================

create or replace function public.remove_member(p_profile_id uuid)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  v_club uuid;
  v_role text;
  v_rows int;
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
  set status = 'removed', removed_at = now(), removed_reason = 'removed'
  where profile_id = p_profile_id and club_id = v_club and status = 'approved';

  get diagnostics v_rows = row_count;
  if v_rows = 0 then
    raise exception 'ALREADY_HANDLED';
  end if;
end;
$$;

-- השלמה חד-פעמית: כל מי שכבר נפגע מהבאג (status='removed' בלי סיבה) -
-- היחיד שהיה יכול להוביל למצב הזה הוא בדיוק הבאג הזה (עזיבה עצמית
-- ודחייה תמיד שמרו סיבה נכון, גם לפני 0062 וגם אחריה).
update public.club_members
set removed_reason = 'removed'
where status = 'removed' and removed_reason is null;
