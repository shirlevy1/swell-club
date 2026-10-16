-- ============================================================================
-- Swell — הרייל באינסטגרם בדף הבית ניתן לעריכה ע"י מנהלת הקהילה
-- ============================================================================
-- instagram-reel-showcase.tsx (דף הבית) היה עם קישור+תמונת קאבר קבועים
-- בקוד. עכשיו נשמרים על clubs, עם עמוד ניהול חדש (admin/instagram)
-- לעדכון שניהם. ברירת המחדל (NULL) ממשיכה להציג את מה שכבר בקוד
-- (הקישור + public/instagram-reel-cover.jpg) - ראו getHomeInstagramReel
-- ב-lib/data.ts.
-- ============================================================================

alter table public.clubs
  add column instagram_reel_permalink text,
  add column instagram_reel_cover_path text;

-- --- עדכון דרך פונקציה ממוקדת, לא UPDATE ישיר מהלקוח ---
-- לא policy גורפת על clubs (כמו events_organizer_all) - clubs.slug
-- קריטי לזיהוי הקהילה ב-handle_new_user(), ואין סיבה לפתוח ערוץ
-- כתיבה ישיר אליו מהלקוח רק בשביל שני שדות לא-קשורים.
create or replace function public.update_club_instagram_reel(
  p_club_id   uuid,
  p_permalink text,
  p_cover_path text
)
returns void
language plpgsql security definer set search_path = public
as $$
begin
  if not public.is_club_organizer(p_club_id) then
    raise exception 'NOT_ORGANIZER';
  end if;

  update public.clubs
  set instagram_reel_permalink  = nullif(trim(p_permalink), ''),
      instagram_reel_cover_path = nullif(trim(p_cover_path), '')
  where id = p_club_id;
end;
$$;

revoke execute on function public.update_club_instagram_reel(uuid, text, text) from public, anon;
grant execute on function public.update_club_instagram_reel(uuid, text, text) to authenticated;


-- ============================== אחסון ======================================
-- bucket ציבורי (public=true): תמונת הקאבר מוצגת בדף הבית לכל חברי
-- הקהילה דרך <img> רגיל, בלי סלקטיביות לפי נוכחות במפגש כמו selfies -
-- אין צורך ב-RLS select, וה-CSP img-src כבר מרשה את מקור ה-Supabase.
--
-- נתיב הקובץ הוא {club_id}/{random}.jpg, ייחודי בכל העלאה (לא דריסה
-- של נתיב קבוע) - כדי שלא יהיה קאש מיושן על אותה כתובת URL אחרי
-- החלפת רייל, אותו עיקרון כמו event-photos.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('club-assets', 'club-assets', true, 8388608, array['image/jpeg', 'image/png'])
on conflict (id) do update
  set public             = true,
      file_size_limit    = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

create policy "club_assets_write_organizer" on storage.objects
for insert to authenticated with check (
  bucket_id = 'club-assets'
  and public.is_club_organizer((split_part(name, '/', 1))::uuid)
);

create policy "club_assets_delete_organizer" on storage.objects
for delete to authenticated using (
  bucket_id = 'club-assets'
  and public.is_club_organizer((split_part(name, '/', 1))::uuid)
);
