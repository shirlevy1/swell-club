-- ============================================================================
-- Swell — אלבום מפגש: העלאה על ידי כל נוכח/ת, באישור מנהלת
-- ============================================================================
-- עד כה רק המנהלת העלתה תמונות, וה-storage עצמו היה מקור האמת (בלי
-- טבלת metadata). עכשיו כל מי שנכח יכול להעלות, אבל התמונה נכנסת
-- ל"ממתין לאישור" עד שהמנהלת מאשרת אותה — ולכן צריך מקום לשמור סטטוס,
-- וה-storage לבד כבר לא מספיק. טבלת event_photos היא מקור האמת החדש;
-- ה-storage עצמו רק מחזיק את הבייטים.
--
-- להדבקה ב-Supabase → SQL Editor → New query → Run.
-- ============================================================================

create type public.photo_status as enum ('pending', 'approved');

create table public.event_photos (
  id           uuid primary key default gen_random_uuid(),
  event_id     uuid not null references public.events(id) on delete cascade,
  storage_path text not null unique,
  uploaded_by  uuid not null references public.profiles(id) on delete cascade,
  status       public.photo_status not null default 'pending',
  created_at   timestamptz not null default now()
);

create index event_photos_event_idx on public.event_photos (event_id, status);

alter table public.event_photos enable row level security;

-- מי רואה שורה: מי שהעלה אותה (גם אם עוד ממתינה — כדי לדעת שההעלאה
-- נקלטה), כל נוכח/ת במפגש אם היא כבר אושרה, והמנהלת רואה הכל תמיד.
create policy "event_photos_select" on public.event_photos
for select to authenticated using (
  uploaded_by = auth.uid()
  or (status = 'approved' and public.has_attended(event_id))
  or public.is_event_organizer(event_id)
);

-- אין policy של insert בכוונה — הדרך היחידה פנימה היא add_event_photo(),
-- בדיוק כמו check_in() לסלפים. כך גם נאכף שהקובץ כבר קיים ב-storage
-- וששולט/ת בשם הנתיב לא ממציאה event_id שרירותי.
create policy "event_photos_organizer_update" on public.event_photos
for update to authenticated
using (public.is_event_organizer(event_id))
with check (public.is_event_organizer(event_id));

create policy "event_photos_organizer_delete" on public.event_photos
for delete to authenticated using (public.is_event_organizer(event_id));


-- ------------------------------ add_event_photo -----------------------------
-- נקראת אחרי שהקובץ כבר הועלה ל-storage. מאמתת שהמעלה/ה נכח/ה במפגש
-- (או מנהלת), שהנתיב באמת שייך למפגש הזה, ושהקובץ אכן קיים — אותו
-- דפוס בדיוק כמו check_in() עם הסלפי. מנהלת מקבלת אישור מיידי (אין
-- טעם שתאשר לעצמה); כל אחד/ת אחר/ת נכנס/ת כ-pending.
create or replace function public.add_event_photo(
  p_event_id     uuid,
  p_storage_path text
)
returns public.event_photos
language plpgsql security definer set search_path = public
as $$
declare
  v_row public.event_photos;
  v_is_organizer boolean;
begin
  v_is_organizer := public.is_event_organizer(p_event_id);

  if not (public.has_attended(p_event_id) or v_is_organizer) then
    raise exception 'NOT_ATTENDED';
  end if;

  if split_part(p_storage_path, '/', 1) <> p_event_id::text then
    raise exception 'BAD_PATH';
  end if;

  if not exists (
    select 1 from storage.objects
    where bucket_id = 'event-photos' and name = p_storage_path
  ) then
    raise exception 'FILE_MISSING';
  end if;

  insert into public.event_photos (event_id, storage_path, uploaded_by, status)
  values (
    p_event_id,
    p_storage_path,
    auth.uid(),
    case when v_is_organizer then 'approved' else 'pending' end::public.photo_status
  )
  returning * into v_row;

  return v_row;
end;
$$;

revoke execute on function public.add_event_photo(uuid, text) from public, anon;
grant execute on function public.add_event_photo(uuid, text) to authenticated;


-- ============================ מדיניות האחסון מחדש ===========================
-- מחליפות את מדיניות ההעלאה/קריאה הישנות של event-photos (שהניחו
-- שרק המנהלת מעלה, ושכל מי שנכח יכול לקרוא בלי קשר לאישור).

drop policy if exists "event_photos_upload_organizer" on storage.objects;
drop policy if exists "event_photos_read_attendees" on storage.objects;

create policy "event_photos_upload_attendee" on storage.objects
for insert to authenticated with check (
  bucket_id = 'event-photos'
  and (
    public.has_attended((split_part(name, '/', 1))::uuid)
    or public.is_event_organizer((split_part(name, '/', 1))::uuid)
  )
);

-- קריאה עוברת עכשיו דרך event_photos, לא רק דרך "נכח/ה במפגש": תמונה
-- שממתינה לאישור לא נגישה למי שרק נכח/ה, רק למי שהעלה אותה ולמנהלת.
create policy "event_photos_read_authorized" on storage.objects
for select to authenticated using (
  bucket_id = 'event-photos'
  and exists (
    select 1 from public.event_photos ep
    where ep.storage_path = storage.objects.name
      and (
        ep.uploaded_by = auth.uid()
        or (ep.status = 'approved' and public.has_attended(ep.event_id))
        or public.is_event_organizer(ep.event_id)
      )
  )
);

-- event_photos_delete_organizer (0001) נשארת ללא שינוי — מחיקת קובץ
-- עדיין רק על ידי מנהלת המפגש.


-- ========================= הרשאות טבלה (תואם ל-0001) =======================
grant all on public.event_photos to anon, authenticated;
