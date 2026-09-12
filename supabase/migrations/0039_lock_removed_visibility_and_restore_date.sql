-- שני תיקונים שנחשפו כשבדקנו מחדש את כל נושא ההסרה/עזיבה/שחזור
-- (migration 0035-0038), אחרי שהחברות של מי שהוסר/עזב הפסיקה להימחק
-- ונשארת בטבלה עם status='removed'.

-- ---------------------------------------------------------------------------
-- 1) person_card(): נעילה מלאה למי שהוסר/עזב, וסינון פרטי קשר להם.
-- ---------------------------------------------------------------------------
-- הבדיקה של "האם יש לי בכלל שורת חברות בקהילה" לא בדקה סטטוס. עד היום
-- זה לא שינה כלום כי שורת חברות של מי שהוסר/עזב פשוט נעלמה (נמחקה).
-- עכשיו היא נשארת עם status='removed' — ולכן מי שהוסר/עזב עדיין עבר
-- את הבדיקה ויכל להמשיך ולבקש כרטיסי מידע על חברי קהילה אחרים, וגם
-- אחרים יכלו לקבל כרטיס בסיסי (שם+מגדר) עליו/ה בלי היכרות משותפת
-- אמיתית. לפי בקשת שיר:
--   * מי שהוסר/עזב לא רואה שום דבר בקהילה, עד שיבקש/תבקש לחזור.
--   * מי שכבר נכח/ה יחד עם מי שהוסר/עזב ממשיך/ה לראות תמונות, מפגשים
--     משותפים ורמת שחייה — אבל בלי כפתורי יצירת קשר (וואטסאפ/אינסטגרם).
create or replace function public.person_card(p_profile_id uuid)
returns table (
  full_name      text,
  gender         public.gender,
  instagram      text,
  phone          text,
  swim_level     public.swim_level,
  shared_count   integer,
  attended_count integer
)
language plpgsql security definer stable set search_path = public
as $$
declare
  v_my_club uuid;
  v_shared int;
  v_organizer boolean;
  v_target_active boolean;
begin
  select club_id into v_my_club
    from public.club_members
    where profile_id = auth.uid() and status = 'approved'
    limit 1;
  if v_my_club is null then
    return;
  end if;

  select count(*)::int into v_shared
    from public.attendances a
    join public.events e on e.id = a.event_id
    where a.profile_id = p_profile_id
      and e.club_id = v_my_club
      and public.has_attended(a.event_id);

  select exists (
    select 1 from public.club_members
    where club_id = v_my_club and profile_id = p_profile_id and status = 'approved'
  ) into v_target_active;

  if v_shared = 0 and not v_target_active then
    return;
  end if;

  select exists (
    select 1 from public.club_members cm
    where cm.profile_id = p_profile_id
      and public.is_club_organizer(cm.club_id)
  ) into v_organizer;

  return query
    select
      p.full_name,
      p.gender,
      case when (v_shared > 0 or v_organizer) and v_target_active then p.instagram else null end,
      case when (v_shared > 0 or v_organizer) and v_target_active then p.phone else null end,
      case when v_shared > 0 or v_organizer then p.swim_level else null end,
      v_shared,
      (select count(*)::int from public.attendances a
        where a.profile_id = p_profile_id)
    from public.profiles p
    where p.id = p_profile_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- 2) restore_member(): לאפס את joined_at כדי שהתור יראה בקשה טרייה.
-- ---------------------------------------------------------------------------
-- list_pending_members() (migration 0017) ממיינת ומציגה לפי
-- club_members.joined_at כ"תאריך בקשה". restore_member() החזיר את
-- הסטטוס ל-pending בלי לגעת ב-joined_at, כך שמי ששוחזר/ה אחרי זמן רב
-- הופיע/ה בתור עם תאריך הבקשה המקורי שלו/ה במקום תאריך השחזור.
create or replace function public.restore_member(p_profile_id uuid)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  v_club uuid;
begin
  select club_id into v_club
    from public.club_members
    where profile_id = p_profile_id and status = 'removed';

  if v_club is null or not public.is_club_organizer(v_club) then
    raise exception 'NOT_ORGANIZER';
  end if;

  update public.club_members
  set status = 'pending', removed_at = null, removed_reason = null, joined_at = now()
  where profile_id = p_profile_id and club_id = v_club;
end;
$$;
