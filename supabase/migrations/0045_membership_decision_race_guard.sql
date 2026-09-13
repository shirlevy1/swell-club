-- ============================================================================
-- Swell — הגנה מפני מרוץ באישור/דחיית בקשת הצטרפות
-- ============================================================================
-- approve_member() לא בדקה בכלל שהבקשה עדיין 'pending' לפני שהיא
-- מאשרת אותה — בניגוד ל-reject_member() שכן בדקה. אם דחייה ואישור
-- לאותה בקשה רצות כמעט בו-זמנית (שתי לחיצות, או שתי מנהלות) וה-
-- דחייה מסיימת ראשונה, ה-UPDATE של האישור (שאין לו סינון סטטוס) עדיין
-- מוצא ומעדכן את השורה — מחזיר בטעות לחברות מאושרת בקשה שכבר נדחתה.
--
-- שתי הפונקציות מקבלות עכשיו גם בדיקת rows-affected: אם ה-UPDATE לא
-- שינה אף שורה (כי מישהו אחר כבר טיפל בבקשה רגע קודם), נזרקת שגיאה
-- ברורה במקום "הצלחה" שקטה שלא עשתה כלום. הלקוח כבר מציג הודעת
-- שגיאה כללית על כל rpcError, אין צורך בשינוי בצד האתר.
-- ============================================================================

create or replace function public.approve_member(p_profile_id uuid)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  v_club uuid;
  v_rows int;
begin
  select club_id into v_club from public.club_members where profile_id = p_profile_id;
  if v_club is null or not public.is_club_organizer(v_club) then
    raise exception 'NOT_ORGANIZER';
  end if;

  update public.club_members
  set status = 'approved'
  where profile_id = p_profile_id and club_id = v_club and status = 'pending';

  get diagnostics v_rows = row_count;
  if v_rows = 0 then
    raise exception 'ALREADY_HANDLED';
  end if;
end;
$$;

create or replace function public.reject_member(p_profile_id uuid)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  v_club uuid;
  v_rows int;
begin
  select club_id into v_club from public.club_members where profile_id = p_profile_id;
  if v_club is null or not public.is_club_organizer(v_club) then
    raise exception 'NOT_ORGANIZER';
  end if;

  update public.club_members
  set status = 'removed', removed_at = now(), removed_reason = 'rejected'
  where profile_id = p_profile_id and club_id = v_club and status = 'pending';

  get diagnostics v_rows = row_count;
  if v_rows = 0 then
    raise exception 'ALREADY_HANDLED';
  end if;
end;
$$;
