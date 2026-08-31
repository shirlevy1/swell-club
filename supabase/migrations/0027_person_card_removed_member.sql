-- person_card() דרשה ששני הצדדים יהיו *כרגע* חברי קהילה כדי להראות
-- כרטיס בכלל. זה שובר את העמוד עבור מי שכבר לא חבר/ת קהילה (הוסר/ה,
-- או בעתיד יעזוב/תעזוב) — מי שכבר נכח/ה איתו/ה בעבר היה/הייתה נוחת/ת
-- על "לא נמצא" גנרי, במקום להמשיך לראות את מי שהיא/הוא באמת הכיר/ה.
-- עכשיו: גישה מותרת אם "הם" עדיין חברי קהילה איתי, *או* שכבר יש
-- נוכחות משותפת אמיתית בעבר — מה שקודם קורה.
create or replace function public.person_card(p_profile_id uuid)
returns table (
  full_name      text,
  instagram      text,
  phone          text,
  shared_count   integer,
  attended_count integer
)
language plpgsql security definer stable set search_path = public
as $$
declare
  v_my_club uuid;
  v_shared int;
  v_organizer boolean;
begin
  select club_id into v_my_club
    from public.club_members
    where profile_id = auth.uid()
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

  if v_shared = 0 and not exists (
    select 1 from public.club_members
    where club_id = v_my_club and profile_id = p_profile_id
  ) then
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
      case when v_shared > 0 or v_organizer then p.instagram else null end,
      case when v_shared > 0 or v_organizer then p.phone else null end,
      v_shared,
      (select count(*)::int from public.attendances a
        where a.profile_id = p_profile_id)
    from public.profiles p
    where p.id = p_profile_id;
end;
$$;
