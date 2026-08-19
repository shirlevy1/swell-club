-- ============================================================================
-- Swell — עריכת סלפי מוגבלת לחלון הצ'ק־אין
-- ============================================================================
-- selfies_update_own (0001) כבר מאפשרת דריסה חוזרת של נתיב הסלפי —
-- זה מה שמאפשר ניסיון חוזר תוך כדי הצ'ק־אין עצמו כשההעלאה הראשונה
-- הצליחה אבל check_in() נכשל (למשל TOO_FAR). עד עכשיו זה היה פתוח בלי
-- הגבלת זמן: מבחינת ה-storage, אפשר היה לדרוס את הסלפי גם ימים אחרי
-- המפגש. עכשיו זה מוגבל לאותו חלון זמן בדיוק שהמנהלת קבעה למפגש —
-- זהות ל-check_in() עצמו, לא חלון נפרד.
--
-- להדבקה ב-Supabase → SQL Editor → New query → Run.
-- ============================================================================

create or replace function public.is_checkin_window_open(p_event_id uuid)
returns boolean
language sql security definer stable set search_path = public
as $$
  select exists (
    select 1 from public.events e
    where e.id = p_event_id
      and now() >= e.starts_at - make_interval(mins => e.checkin_opens_before_min)
      and now() <= e.starts_at + make_interval(mins => e.checkin_closes_after_min)
  );
$$;

revoke execute on function public.is_checkin_window_open(uuid) from public, anon;
grant execute on function public.is_checkin_window_open(uuid) to authenticated;

drop policy if exists "selfies_update_own" on storage.objects;

create policy "selfies_update_own" on storage.objects
for update to authenticated
using (
  bucket_id = 'selfies'
  and split_part(name, '/', 2) = auth.uid()::text || '.jpg'
  and public.is_checkin_window_open((split_part(name, '/', 1))::uuid)
)
with check (
  bucket_id = 'selfies'
  and split_part(name, '/', 2) = auth.uid()::text || '.jpg'
  and public.is_checkin_window_open((split_part(name, '/', 1))::uuid)
);
