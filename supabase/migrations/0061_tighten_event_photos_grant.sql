-- Swell — צמצום ההרשאה הרחבה מדי על event_photos
-- ============================================================================
-- event_photos קיבלה בעבר grant all (כולל insert) ל-anon ו-authenticated
-- (0001_init.sql, 0003_event_photo_approval.sql) - רחבה מדי בהשוואה לכל
-- טבלה אחרת. לא פרצה פעילה: RLS כבר מגן בפועל (אין policy של insert
-- בכלל - הדרך היחידה פנימה היא add_event_photo(), security definer,
-- שלא תלויה ב-grant הזה בכלל). זו הגנה-בעומק, נמצאה ותועדה בביקורת
-- מוכנות ההשקה (SEC-2).
--
-- נבדקו כל ארבעת ה-policies הקיימים בפועל לפני השינוי, כדי לא לשבור
-- כלום בטעות:
--   event_photos_select              (select, to authenticated)
--   event_photos_organizer_update    (update, to authenticated)
--   event_photos_organizer_delete    (delete, to authenticated)
--   event_photos_owner_delete_pending (delete, to authenticated - "להתחרט")
-- כולם מוגבלים ל-authenticated בלבד - אף policy לא מתייחס ל-anon, ואף
-- policy לא דורש insert ברמת הטבלה. לכן: anon לא מקבל שום דבר יותר,
-- ו-authenticated מקבל רק select/update/delete - בדיוק מה שהארבעה
-- האלה צריכים, לא יותר ולא פחות. אפס שינוי בהתנהגות הקיימת.
-- ============================================================================

revoke all on public.event_photos from anon, authenticated;
grant select, update, delete on public.event_photos to authenticated;
