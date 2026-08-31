-- הסרת חבר/ה מהקהילה (ע"י מנהלת) ועזיבה עצמית (ע"י חבר/ה קהילה).
--
-- שתי הפעולות מוחקות רק את שורת החברות ב-club_members — לא את
-- הפרופיל, לא את הסלפים, לא את היסטוריית הנוכחות. בזכות זה מי
-- שהיה חלק ממפגש בעבר ממשיך להופיע ברשימת "מי היה חלק מהסוואל" של
-- אותו מפגש עבור מי שהיה שם איתו/ה, גם אחרי שכבר לא חבר/ת קהילה
-- (ראו 0027 — person_card() כבר תומכת בדיוק במצב הזה).
--
-- בכוונה בלי מסלול הצטרפות-מחדש: מי שהוסר/ה או עזב/ה לא יכול/ה
-- לקבל שוב שורת חברות דרך שום פעולה בממשק. זו החלטה מודעת שנשארת
-- כרגע כמשימה עתידית.
--
-- שני הפעולות חוסמות הסרה/עזיבה של מנהלת/ת קהילה — קהילה בלי אף
-- מנהלת נעולה לגמרי (is_club_organizer נכשל לכולם), אז זו הגנה
-- מפני נעילה בטעות, לא רק ולידציה שרירותית.

create or replace function public.remove_member(p_profile_id uuid)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  v_club uuid;
  v_role text;
begin
  select club_id, role into v_club, v_role
    from public.club_members
    where profile_id = p_profile_id;

  if v_club is null or not public.is_club_organizer(v_club) then
    raise exception 'NOT_ORGANIZER';
  end if;
  if v_role = 'organizer' then
    raise exception 'CANNOT_REMOVE_ORGANIZER';
  end if;

  delete from public.club_members
  where profile_id = p_profile_id and club_id = v_club;
end;
$$;

create or replace function public.leave_community()
returns void
language plpgsql security definer set search_path = public
as $$
declare
  v_club uuid;
  v_role text;
begin
  select club_id, role into v_club, v_role
    from public.club_members
    where profile_id = auth.uid();

  if v_club is null then
    raise exception 'NOT_A_MEMBER';
  end if;
  if v_role = 'organizer' then
    raise exception 'CANNOT_REMOVE_ORGANIZER';
  end if;

  delete from public.club_members
  where profile_id = auth.uid() and club_id = v_club;
end;
$$;

revoke execute on function
  public.remove_member(uuid),
  public.leave_community()
from public, anon;

grant execute on function
  public.remove_member(uuid),
  public.leave_community()
to authenticated;
