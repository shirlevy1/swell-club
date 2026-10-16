-- ============================================================================
-- Swell — קישור לקבוצת הוואטסאפ, ניתן לעריכה ע"י מנהלת הקהילה
-- ============================================================================
-- אותו דפוס בדיוק כמו 0079 (הרייל באינסטגרם): עמודה על clubs, פונקציית
-- עדכון ממוקדת (לא policy גורפת - אותה סיבה כמו ב-0079, clubs.slug
-- קריטי ואין סיבה לפתוח ערוץ כתיבה ישיר אליו). מוצג בדף הבית
-- (whatsapp-group-card.tsx) מתחת לכרטיס האינסטגרם, ונערך באותו עמוד
-- ניהול (admin/instagram) מתחת לרייל. NULL = לא הוגדר קישור - הכרטיס
-- לא מוצג בדף הבית בכלל.
-- ============================================================================

alter table public.clubs
  add column whatsapp_group_link text;

create or replace function public.update_club_whatsapp_link(
  p_club_id uuid,
  p_link    text
)
returns void
language plpgsql security definer set search_path = public
as $$
begin
  if not public.is_club_organizer(p_club_id) then
    raise exception 'NOT_ORGANIZER';
  end if;

  update public.clubs
  set whatsapp_group_link = nullif(trim(p_link), '')
  where id = p_club_id;
end;
$$;

revoke execute on function public.update_club_whatsapp_link(uuid, text) from public, anon;
grant execute on function public.update_club_whatsapp_link(uuid, text) to authenticated;
