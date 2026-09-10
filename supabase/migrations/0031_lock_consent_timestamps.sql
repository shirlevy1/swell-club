-- נועלת את חותמות הזמן של אישור כתב הוויתור/הצהרת הפרטיות במסד עצמו,
-- לא רק בממשק. RLS הוא ברמת שורה בלבד — "profiles_update_own" מרשה
-- לעדכן כל שדה בפרופיל של עצמך, בלי הבחנה בין שדה רגיל לחותמת שנועדה
-- להישאר קבועה. קריאת API ישירה (לא רק דרך הכפתורים באתר) יכלה
-- תיאורטית לאפס/לשכתב את waiver_accepted_at או privacy_accepted_at
-- אחרי שכבר נקבעו — מחליש את הערבות "נחתם בשרת, אי אפשר לזייף" למסמכים
-- שהם בעצם כתב ויתור משפטי והצהרת פרטיות.
--
-- לא זורקת שגיאה — פשוט משאירה את הערך הישן כשכבר יש כזה, כדי שעדכון
-- פרופיל לגיטימי שמגיע יחד עם שדות אחרים (עיר, טלפון וכו') לא ייכשל
-- כולו רק בגלל ניסיון (מכוון או לא) לגעת בחותמת. עדיין מאפשרת לקבוע
-- אותה בפעם הראשונה (מ-null לערך), למשל חשבון ישן שאושר רק עכשיו.
create or replace function public.lock_profile_consent_timestamps()
returns trigger
language plpgsql
as $$
begin
  if old.waiver_accepted_at is not null then
    new.waiver_accepted_at := old.waiver_accepted_at;
  end if;
  if old.privacy_accepted_at is not null then
    new.privacy_accepted_at := old.privacy_accepted_at;
  end if;
  return new;
end;
$$;

create trigger lock_profile_consent_timestamps
before update on public.profiles
for each row execute function public.lock_profile_consent_timestamps();

-- טריגר בלבד. אף לקוח לא אמור להיות מסוגל לקרוא לה ישירות.
revoke execute on function public.lock_profile_consent_timestamps() from public, anon, authenticated;
