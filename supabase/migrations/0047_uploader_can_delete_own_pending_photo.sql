-- ============================================================================
-- Swell — מי שהעלה תמונה יכול למחוק אותה כל עוד היא ממתינה לאישור
-- ============================================================================
-- עד עכשיו רק המנהלת יכלה למחוק תמונה מאלבום מפגש (event_photos_organizer_delete,
-- migration 0003). שיר ביקשה שגם מי שהעלה תמונה יוכל "להתחרט" ולמחוק
-- אותה בעצמו/ה — אבל רק כל עוד היא עדיין 'pending'. ברגע שאושרה, היא
-- הופכת לחלק מהרשומה המשותפת של המפגש ולא ניתנת יותר למחיקה עצמית.
--
-- שתי הרשאות נפרדות (טבלה + storage), כי מחיקת תמונה דורשת גם למחוק
-- את השורה וגם את הקובץ עצמו — אותו רעיון בדיוק כמו שתי ההרשאות
-- המקבילות של המנהלת.
-- ============================================================================

create policy "event_photos_owner_delete_pending" on public.event_photos
for delete to authenticated using (
  uploaded_by = auth.uid() and status = 'pending'
);

create policy "event_photos_delete_own_pending" on storage.objects
for delete to authenticated using (
  bucket_id = 'event-photos'
  and exists (
    select 1 from public.event_photos ep
    where ep.storage_path = storage.objects.name
      and ep.uploaded_by = auth.uid()
      and ep.status = 'pending'
  )
);
