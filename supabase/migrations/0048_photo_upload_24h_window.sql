-- ============================================================================
-- Swell — חברי קהילה מעלים תמונות רק בטווח 24 שעות מתחילת המפגש
-- ============================================================================
-- עד עכשיו כל מי שנכח יכל להעלות תמונה בכל עת, בלי הגבלת זמן. שיר
-- ביקשה שחברי קהילה יוכלו להעלות רק ב-24 השעות שאחרי תחילת המפגש;
-- המנהלת פטורה מהמגבלה ויכולה להעלות תמיד, בדיוק כמו שהיא כבר פטורה
-- מדרישת הנוכחות. אותו דפוס בדיוק כמו TOO_LATE ב-check_in().
-- ============================================================================

create or replace function public.add_event_photo(
  p_event_id     uuid,
  p_storage_path text
)
returns public.event_photos
language plpgsql security definer set search_path = public
as $$
declare
  v_row public.event_photos;
  v_is_organizer boolean;
  v_starts_at timestamptz;
begin
  v_is_organizer := public.is_event_organizer(p_event_id);

  if not (public.has_attended(p_event_id) or v_is_organizer) then
    raise exception 'NOT_ATTENDED';
  end if;

  select starts_at into v_starts_at from public.events where id = p_event_id;

  if not v_is_organizer and now() > v_starts_at + interval '24 hours' then
    raise exception 'UPLOAD_WINDOW_CLOSED';
  end if;

  if split_part(p_storage_path, '/', 1) <> p_event_id::text then
    raise exception 'BAD_PATH';
  end if;

  if not exists (
    select 1 from storage.objects
    where bucket_id = 'event-photos' and name = p_storage_path
  ) then
    raise exception 'FILE_MISSING';
  end if;

  insert into public.event_photos (event_id, storage_path, uploaded_by, status)
  values (
    p_event_id,
    p_storage_path,
    auth.uid(),
    case when v_is_organizer then 'approved' else 'pending' end::public.photo_status
  )
  returning * into v_row;

  return v_row;
end;
$$;

revoke execute on function public.add_event_photo(uuid, text) from public, anon;
grant execute on function public.add_event_photo(uuid, text) to authenticated;
