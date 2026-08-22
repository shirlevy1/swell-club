-- ============================================================================
-- Swell — טלפון ייחודי לחשבון
-- ============================================================================
-- אימייל כבר אכוף אוטומטית ע"י auth.users (Supabase לא מרשה שני
-- חשבונות עם אותו אימייל). זה מוסיף את אותה אכיפה לטלפון.
--
-- הטלפון נשמר כמו שהוקלד (לא מנורמל) — ולכן ההשוואה חייבת לעבור דרך
-- normalize_phone(), אחרת "050-1234567" ו-"0501234567" היו נחשבים
-- שני מספרים שונים. אותו היגיון בדיוק כמו normalizePhone() ב-lib/format.ts.
--
-- ⚠️ הטלפון עצמו לא מאומת (בלי SMS — הוחלט מוקדם יותר בפרויקט). זה
-- חוסם הרשמה כפולה בטעות, לא מישהו שממש מתעקש להקליד מספר בדוי.
-- ============================================================================

create or replace function public.normalize_phone(p_phone text)
returns text
language sql immutable set search_path = public
as $$
  select case
    when p_phone is null then null
    when regexp_replace(p_phone, '[^0-9]', '', 'g') = '' then null
    when left(regexp_replace(p_phone, '[^0-9]', '', 'g'), 3) = '972'
      then regexp_replace(p_phone, '[^0-9]', '', 'g')
    when left(regexp_replace(p_phone, '[^0-9]', '', 'g'), 1) = '0'
      then '972' || substring(regexp_replace(p_phone, '[^0-9]', '', 'g') from 2)
    else regexp_replace(p_phone, '[^0-9]', '', 'g')
  end;
$$;

-- רשת ביטחון ברמת המסד — סוגר מרוץ בין שתי הרשמות בו-זמניות עם אותו
-- מספר. הבדיקה ב-is_phone_available() למטה היא מה שבאמת נותן הודעת
-- שגיאה ברורה; זו רק מונעת מצב שבו שתיהן עוברות את הבדיקה בו-זמנית.
create unique index profiles_phone_normalized_key
  on public.profiles (public.normalize_phone(phone))
  where phone is not null;

-- ⚠️ גישה ל-anon כאן היא בכוונה, לא שכחה — זה חייב לרוץ *לפני*
-- הרשמה, כשעוד אין session. מחזירה true/false בלבד, לא שום פרט אחר
-- מהפרופיל, כדי לצמצם את מה שאפשר "לחקור" בלי להתחבר.
create or replace function public.is_phone_available(
  p_phone text,
  p_exclude_profile_id uuid default null
)
returns boolean
language sql security definer stable set search_path = public
as $$
  select not exists (
    select 1 from public.profiles
    where public.normalize_phone(phone) = public.normalize_phone(p_phone)
      and (p_exclude_profile_id is null or id <> p_exclude_profile_id)
  );
$$;

revoke execute on function public.is_phone_available(text, uuid) from public;
grant execute on function public.is_phone_available(text, uuid) to anon, authenticated;
