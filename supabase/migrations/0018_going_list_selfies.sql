-- ============================================================================
-- Swell — תמונה ברשימת "מי מתכוון להגיע", רק למי שכבר נכחתם איתם
-- ============================================================================
-- החלטה מוצרית: לפני מפגש, מי שסימן הגעה מציג תמונה (הסלפי העדכני שלו,
-- מאיזה מפגש שהוא) — אבל רק לצופה שכבר נכח יחד איתו באיזשהו מפגש בעבר.
-- מי שעוד לא נכחתם איתו יחד ממשיך להיראות בלי תמונה, בדיוק כמו היום.
-- זה לא פותח את "הפנים כפרס" לכולם — זו אותה גישה בדיוק כמו שכבר קיימת
-- ב-person_card() לטלפון/אינסטגרם/רמת שחייה: גלוי רק אחרי היכרות אמיתית.
--
-- שני חלקים:
-- 1. מדיניות storage חדשה — מאפשרת לקרוא סלפי של מישהו שנכחתם איתו
--    יחד באיזשהו מפגש, גם אם הסלפי הספציפי הזה מגיע ממפגש אחר לגמרי
--    שלא הייתם בו. המדיניות הקיימת (selfies_read_co_attendees) בודקת
--    רק "האם נכחתי באותו מפגש הזה בדיוק" — צרה מדי לצורך הזה.
-- 2. event_going_list() מחזירה עכשיו גם selfie_path/face_x/face_y של
--    הסלפי העדכני ביותר של כל מי שסימן הגעה — null אם עוד לא נכחתם יחד.
-- ============================================================================

create policy "selfies_read_met_before" on storage.objects
for select to authenticated using (
  bucket_id = 'selfies'
  and exists (
    select 1
    from public.attendances mine
    join public.attendances theirs on theirs.event_id = mine.event_id
    where mine.profile_id = auth.uid()
      and split_part(name, '/', 2) = theirs.profile_id::text || '.jpg'
  )
);

drop function if exists public.event_going_list(uuid);

create or replace function public.event_going_list(p_event_id uuid)
returns table (
  profile_id  uuid,
  full_name   text,
  swim_level  public.swim_level,
  selfie_path text,
  face_x      double precision,
  face_y      double precision
)
language plpgsql security definer stable set search_path = public
as $$
declare
  v_club uuid;
begin
  select club_id into v_club from public.events where id = p_event_id;
  if v_club is null or not public.is_club_member(v_club) then
    return;
  end if;

  return query
    select
      p.id,
      p.full_name,
      p.swim_level,
      latest.selfie_path,
      latest.face_x,
      latest.face_y
    from public.rsvps r
    join public.profiles p on p.id = r.profile_id
    -- הסלפי העדכני ביותר של p, מכל מפגש — אבל מצטרף רק אם מי שקורא
    -- לפונקציה (auth.uid()) כבר נכח יחד עם p באיזשהו מפגש בעבר.
    left join lateral (
      select a.selfie_path, a.face_x, a.face_y
      from public.attendances a
      where a.profile_id = p.id
      order by a.checked_in_at desc
      limit 1
    ) latest
      on exists (
        select 1
        from public.attendances mine
        join public.attendances theirs on theirs.event_id = mine.event_id
        where mine.profile_id = auth.uid() and theirs.profile_id = p.id
      )
    where r.event_id = p_event_id and r.going
    order by r.created_at;
end;
$$;

revoke execute on function public.event_going_list(uuid) from public, anon;
grant execute on function public.event_going_list(uuid) to authenticated;
