-- ============================================================================
-- Swell — random_moment_album(): קולאז' אקראי ממפגש אקראי שנכחתי בו
-- ============================================================================
-- מחליפה את random_moment_photo() (0055): במקום תמונה בודדת מתוך כל
-- התמונות שמותר לראות, קודם בוחרים מפגש אחד אקראי מבין המפגשים
-- שהמשתמש/ת עצמו/ה נכח/ה בהם (has_attended, לא is_event_organizer —
-- זו היסטוריה אישית, בכוונה בלי חריג למנהלת, בדיוק כמו
-- getLastAttendedEventAlbum), ורק אז עד 7 תמונות מאושרות אקראיות מתוך
-- האלבום של אותו מפגש עצמו.
--
-- בלי security definer, בכוונה: has_attended() כבר security definer
-- ובודקת auth.uid() ישירות, וה-RLS על event_photos (0003) מאפשר בדיוק
-- את מה שהשאילתה כבר מסננת — אין תלות סמויה ב-RLS מעבר למה שכתוב כאן.
-- ============================================================================

drop function if exists public.random_moment_photo();

create or replace function public.random_moment_album()
returns table (
  event_id     uuid,
  storage_path text
)
language sql stable
as $$
  with candidate_event as (
    select ep.event_id
    from public.event_photos ep
    where ep.status = 'approved'
      and public.has_attended(ep.event_id)
    group by ep.event_id
    order by random()
    limit 1
  )
  select ep.event_id, ep.storage_path
  from public.event_photos ep
  join candidate_event ce on ce.event_id = ep.event_id
  where ep.status = 'approved'
  order by random()
  limit 7;
$$;

revoke execute on function public.random_moment_album() from public, anon;
grant execute on function public.random_moment_album() to authenticated;
