-- selfies_upload_own/selfies_update_own בדקו רק שהחלק השני בנתיב
-- (שם הקובץ) הוא שלכם — לא בדקו בכלל שהחלק הראשון (התיקייה, אמורה
-- להיות event_id) הוא מפגש אמיתי. כל חשבון מחובר, כולל חבר/ה שעדיין
-- ממתין/ה לאישור, יכול היה להעלות קובץ לתיקייה בדויה לגמרי — וקטור
-- ניפוח עלות אחסון בלי גבול. הרשאת הקריאה (selfies_read_co_attendees)
-- כבר בדקה את זה נכון; רק ההעלאה פספסה את הבדיקה המקבילה.
--
-- אי אפשר לדרוש "כבר נכחתם" (כמו בקריאה) — הסלפי מועלה *לפני* ש-
-- check_in() מאשר נוכחות, אז זו הייתה חוסמת גם העלאה ראשונה לגיטימית.
-- הבדיקה הנכונה: "זה מפגש אמיתי, ואתם חברי קהילה מאושרים שלו" — בדיוק
-- שתי הבדיקות הראשונות שכבר קיימות בתוך check_in() עצמה.
drop policy if exists "selfies_upload_own" on storage.objects;
drop policy if exists "selfies_update_own" on storage.objects;

create policy "selfies_upload_own" on storage.objects
for insert to authenticated with check (
  bucket_id = 'selfies'
  and split_part(name, '/', 2) = auth.uid()::text || '.jpg'
  and public.is_club_member(
    (select club_id from public.events where id = (split_part(name, '/', 1))::uuid)
  )
);

create policy "selfies_update_own" on storage.objects
for update to authenticated
using (
  bucket_id = 'selfies'
  and split_part(name, '/', 2) = auth.uid()::text || '.jpg'
  and public.is_club_member(
    (select club_id from public.events where id = (split_part(name, '/', 1))::uuid)
  )
)
with check (
  bucket_id = 'selfies'
  and split_part(name, '/', 2) = auth.uid()::text || '.jpg'
  and public.is_club_member(
    (select club_id from public.events where id = (split_part(name, '/', 1))::uuid)
  )
);
