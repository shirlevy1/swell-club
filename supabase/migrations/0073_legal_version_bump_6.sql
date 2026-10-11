-- ============================================================================
-- Swell — גרסת הטקסט המשפטי 6 (תיעוד/רשתות חברתיות, שיתוף פעולה עם Speedo)
-- ============================================================================
-- הצהרת הפרטיות, כתב הוויתור ותנאי השימוש (signup/page.tsx, privacy/page.tsx,
-- terms/page.tsx) עודכנו בשלושה שינויים מהותיים: (1) אישור שהפעילות
-- מתועדת ועשויה להתפרסם ברשתות החברתיות של Swell Club כולל אינסטגרם,
-- (2) סעיף חדש "שיתוף פעולה עם Speedo ישראל" - זכות שימוש בתמונות
-- מאירועים משותפים, חשיפת פרטי הרשמה לספידו, והרחבת הפטור מאחריות גם
-- לספידו ולקאנטרי/בריכה מארחת, (3) הרחבת רשיון השימוש בתמונות שמעלים
-- לאלבום כך שיכלול גם שימוש והעלאה לרשתות החברתיות, לא רק הצגה
-- באפליקציה. ראו הסבר מלא ב-0065 וב-src/lib/legal.ts.
--
-- ⚠️ חברי קהילה קיימים (שנרשמו לפני השינוי הזה) לא יראו את הטקסט
-- החדש מחדש - profile-form.tsx מציג תיבת אישור רק כש-privacy_accepted_at
-- עדיין null (חשבון ישן מלפני שהשדה נוסף בכלל), לא כשגרסת הטקסט
-- התעדכנה. זו החלטה פתוחה שטרם התקבלה, לא תקלה טכנית - ראו הממצא
-- המתאים בביקורת.
-- ============================================================================

create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  v_club uuid;
  v_is_first boolean;
  v_birth_date date;
begin
  v_birth_date := nullif(new.raw_user_meta_data ->> 'birth_date', '')::date;

  if v_birth_date is not null
     and extract(year from age(current_date, v_birth_date)) < 21
  then
    raise exception 'AGE_UNDER_MINIMUM';
  end if;

  insert into public.profiles (id, full_name, phone, birth_date, city, gender, swim_level, waiver_accepted_at, privacy_accepted_at, legal_version, instagram)
  values (
    new.id,
    coalesce(nullif(new.raw_user_meta_data ->> 'full_name', ''), 'חבר קהילה'),
    nullif(new.raw_user_meta_data ->> 'phone', ''),
    v_birth_date,
    nullif(new.raw_user_meta_data ->> 'city', ''),
    nullif(new.raw_user_meta_data ->> 'gender', '')::public.gender,
    nullif(new.raw_user_meta_data ->> 'swim_level', '')::public.swim_level,
    now(),
    now(),
    6,
    nullif(new.raw_user_meta_data ->> 'instagram', '')
  );

  select id into v_club from public.clubs where slug = 'swell';
  if v_club is not null then
    perform pg_advisory_xact_lock(hashtext('swell:club:' || v_club::text));

    v_is_first := not exists (
      select 1 from public.club_members where club_id = v_club
    );
    insert into public.club_members (club_id, profile_id, role, status)
    values (
      v_club,
      new.id,
      case when v_is_first then 'organizer' else 'member' end::public.member_role,
      case when v_is_first then 'approved' else 'pending' end::public.member_status
    )
    on conflict do nothing;
  end if;

  return new;
end;
$$;
