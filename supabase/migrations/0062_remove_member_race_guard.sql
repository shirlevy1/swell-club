-- ============================================================================
-- Swell — הגנת מירוץ ל-remove_member, באותו דפוס כמו approve/reject_member (0045)
-- ============================================================================
-- remove_member() לא בדקה rows-affected אחרי ה-UPDATE - אם מישהו/י כבר
-- הוסר/ה רגע קודם (למשל שני טאבים/מכשירים של אותה מנהלת, אחד מהם לא
-- התעדכן עדיין דרך admin-live-refresh), הפעולה "מצליחה" בשקט בלי לשנות
-- כלום, במקום להודיע שזה כבר טופל. הלקוח כבר מציג הודעת שגיאה כללית על
-- כל rpcError ("לא הצלחנו להסיר. נסו שוב."), אין צורך בשינוי בצד האתר.
--
-- restore_member לא קיבלה את אותו תיקון בכוונה: גם היום, כל rpcError
-- שלה כבר מוצג כאותה הודעה כללית ("לא הצלחנו לשחזר. נסו שוב.") בלי
-- קשר לקוד השגיאה הפנימי - אז לתיקון שם אין שום השפעה נראית למשתמשת.
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
  set status = 'removed', removed_at = now()
  where profile_id = p_profile_id and club_id = v_club and status = 'approved';

  get diagnostics v_rows = row_count;
  if v_rows = 0 then
    raise exception 'ALREADY_HANDLED';
  end if;
end;
$$;
