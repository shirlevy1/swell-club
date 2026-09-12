-- שם/טלפון/עיר נבדקים כרגע רק בטופס (JS בדפדפן) — קריאת API ישירה
-- (לא דרך הטופס) עוקפת את זה לגמרי. לא פרצת הרשאות, רק פגיעה באיכות
-- נתונים (שובר חישוב אווטאר, קישורי וואטסאפ, תצוגת CSV). נבדק מראש
-- מול כל חברי הקהילה הקיימים — אף אחד לא חורג מהכללים האלה, בטוח
-- להוסיף.
alter table public.profiles
  add constraint profiles_full_name_format
    check (full_name ~ '^[א-ת\s''"־-]+$'),
  add constraint profiles_full_name_length
    check (length(full_name) <= 60),
  add constraint profiles_city_length
    check (city is null or length(city) <= 60),
  add constraint profiles_phone_format
    check (
      phone is null
      or regexp_replace(phone, '\D', '', 'g') ~
        '^(05[0-9]{8}|0[23489][0-9]{7}|972(5[0-9]{8}|[23489][0-9]{7}))$'
    );
