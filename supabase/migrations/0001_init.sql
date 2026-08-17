-- ============================================================================
-- Swell — סכמה ראשונית
-- ============================================================================
-- הכלל שכל המוצר עומד עליו:
--   רואים את משתתפי מפגש X רק אם עשית צ'ק־אין מאומת למפגש X.
-- הוא נאכף כאן, ב־RLS. הממשק הוא נוחות בלבד — האכיפה במסד.
--
-- להדבקה ב-Supabase → SQL Editor → New query → Run.
-- ============================================================================


-- ============================== טבלאות =====================================

create table public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  full_name   text not null,
  -- מוקלד ידנית ואינו מאומת. זו העלות המודעת של הוויתור על אימות SMS.
  phone       text,
  instagram   text,
  birth_date  date,
  city        text,
  -- זמן אישור כתב הוויתור. נחתם בשרת ב-handle_new_user(), לא מתקבל
  -- מהלקוח — כך שהוא תמיד אמיתי ולא ניתן לזיוף מהדפדפן.
  waiver_accepted_at timestamptz,
  avatar_path text,
  created_at  timestamptz not null default now()
);

create table public.clubs (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  slug        text not null unique,
  description text,
  created_at  timestamptz not null default now()
);

create type public.member_role as enum ('member', 'organizer');

create table public.club_members (
  club_id    uuid not null references public.clubs(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  role       public.member_role not null default 'member',
  joined_at  timestamptz not null default now(),
  primary key (club_id, profile_id)
);

create table public.events (
  id            uuid primary key default gen_random_uuid(),
  club_id       uuid not null references public.clubs(id) on delete cascade,
  title         text not null,
  starts_at     timestamptz not null,
  location_name text not null,
  lat           double precision not null,
  lng           double precision not null,
  -- קישור מפות מדויק (אופציונלי). כשיש כתובת שם קונקרטית — עדיף על
  -- חיפוש טקסט לפי location_name, שעלול לנחות על תוצאה כללית/קרובה.
  maps_url      text,
  -- ברירות מחדל לכיול בחוף האמיתי (סעיף 6.4 במפרט)
  checkin_radius_m         integer not null default 150,
  checkin_opens_before_min integer not null default 15,
  checkin_closes_after_min integer not null default 15,
  created_by    uuid references public.profiles(id) on delete set null,
  created_at    timestamptz not null default now(),
  constraint events_lat_valid    check (lat between -90 and 90),
  constraint events_lng_valid    check (lng between -180 and 180),
  constraint events_radius_valid check (checkin_radius_m between 10 and 5000),
  -- הרדיוס היה מוגן, חלון הזמן לא. בלי אלה אפשר לשלוח 999999 ולפתוח
  -- צ׳ק־אין שנים מראש, או מספר שלילי שסוגר את החלון לפני שנפתח.
  constraint events_opens_valid  check (checkin_opens_before_min between 0 and 180),
  constraint events_closes_valid check (checkin_closes_after_min between 0 and 180)
);

create table public.rsvps (
  event_id   uuid not null references public.events(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  going      boolean not null default true,
  created_at timestamptz not null default now(),
  primary key (event_id, profile_id)
);

-- הרשומה היחידה שמעידה על נוכחות אמיתית.
-- שים לב: אין policy של INSERT על הטבלה הזו. הכניסה היחידה אליה היא
-- דרך check_in() שמאמתת זמן ומרחק בשרת. לקוח לא יכול לכתוב לכאן.
create table public.attendances (
  event_id       uuid not null references public.events(id) on delete cascade,
  profile_id     uuid not null references public.profiles(id) on delete cascade,
  selfie_path    text,
  checked_in_at  timestamptz not null default now(),
  lat            double precision,
  lng            double precision,
  accuracy_m     double precision,
  distance_m     double precision,
  added_manually boolean not null default false,
  primary key (event_id, profile_id)
);

-- מנוי להתראות דחיפה. מפתח היעד הוא ה-endpoint שהדפדפן מנפיק —
-- הוא ייחודי למכשיר, ולכן לאותו אדם יכולים להיות כמה (טלפון, מחשב).
create table public.push_subscriptions (
  endpoint   text primary key,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  p256dh     text not null,
  auth       text not null,
  created_at timestamptz not null default now()
);

-- מי כבר קיבל תזכורת על איזה מפגש. בלי זה כל ריצה של ה-cron שולחת שוב.
create table public.event_reminders (
  event_id uuid not null references public.events(id) on delete cascade,
  kind     text not null check (kind in ('evening', 'morning')),
  sent_at  timestamptz not null default now(),
  primary key (event_id, kind)
);

create index events_club_starts_idx on public.events (club_id, starts_at desc);
create index push_subs_profile_idx  on public.push_subscriptions (profile_id);
create index rsvps_profile_idx      on public.rsvps (profile_id);
create index attendances_profile_idx on public.attendances (profile_id);


-- ========================== פונקציות עזר ===================================
-- כולן security definer. זו לא נוחות אלא הכרח: policy על attendances
-- שקוראת מ־attendances נכנסת לרקורסיה אינסופית. security definer עוקף
-- RLS ושובר את המעגל. אותו דבר לגבי club_members.
-- ה־search_path מקובע כדי למנוע חטיפה של הפונקציה דרך סכמה מזויפת.

create or replace function public.has_attended(p_event_id uuid)
returns boolean
language sql security definer stable set search_path = public
as $$
  select exists (
    select 1 from public.attendances
    where event_id = p_event_id and profile_id = auth.uid()
  );
$$;

create or replace function public.is_club_member(p_club_id uuid)
returns boolean
language sql security definer stable set search_path = public
as $$
  select exists (
    select 1 from public.club_members
    where club_id = p_club_id and profile_id = auth.uid()
  );
$$;

create or replace function public.is_club_organizer(p_club_id uuid)
returns boolean
language sql security definer stable set search_path = public
as $$
  select exists (
    select 1 from public.club_members
    where club_id = p_club_id and profile_id = auth.uid() and role = 'organizer'
  );
$$;


-- ============================ צ'ק־אין ======================================
-- לב המוצר. חייב לרוץ בשרת: ולידציה בדפדפן בלבד = כל אחד מזייף נוכחות.

-- האם אני המארגן של הקהילה שאליה שייך המפגש. משמש את מדיניות
-- ה-storage: מנהלת קהילה צריכה לראות את הסלפים גם ממפגשים שהיא
-- עצמה לא נכחה בהם, כדי לזהות אנשים ולהתאים פנים לשמות.
create or replace function public.is_event_organizer(p_event_id uuid)
returns boolean
language sql security definer stable set search_path = public
as $$
  select exists (
    select 1
    from public.events e
    join public.club_members cm on cm.club_id = e.club_id
    where e.id = p_event_id
      and cm.profile_id = auth.uid()
      and cm.role = 'organizer'
  );
$$;


create or replace function public.check_in(
  p_event_id    uuid,
  p_lat         double precision,
  p_lng         double precision,
  p_accuracy_m  double precision,
  p_selfie_path text
)
returns public.attendances
language plpgsql security definer set search_path = public
as $$
declare
  v_event public.events;
  v_dist  double precision;
  v_row   public.attendances;
  v_path  text;
begin
  select * into v_event from public.events where id = p_event_id;
  if not found then
    raise exception 'EVENT_NOT_FOUND';
  end if;

  if not public.is_club_member(v_event.club_id) then
    raise exception 'NOT_A_MEMBER';
  end if;

  -- ורפיקציה 1: חלון הזמן
  if now() < v_event.starts_at - make_interval(mins => v_event.checkin_opens_before_min) then
    raise exception 'TOO_EARLY';
  end if;
  if now() > v_event.starts_at + make_interval(mins => v_event.checkin_closes_after_min) then
    raise exception 'TOO_LATE';
  end if;

  -- ורפיקציה 2: מרחק (Haversine, מטרים)
  v_dist := 6371000 * 2 * asin(sqrt(
      power(sin(radians(p_lat - v_event.lat) / 2), 2)
    + cos(radians(v_event.lat)) * cos(radians(p_lat))
    * power(sin(radians(p_lng - v_event.lng) / 2), 2)
  ));

  if v_dist > v_event.checkin_radius_m then
    raise exception 'TOO_FAR';
  end if;

  -- ורפיקציה 3: הסלפי קיים באמת.
  --
  -- הנתיב **נגזר** ולא מתקבל כטקסט חופשי. בלי זה אפשר היה לקרוא ל-RPC
  -- עם הנתיב של מישהו אחר ולהציג את הפנים שלו כשלנו, או לוותר על התמונה
  -- לגמרי (`null`) ועדיין להיכנס לרשימה — כלומר לקבל את הפרס בלי לשלם.
  -- הבדיקה מול storage.objects היא מה שמחייב שההעלאה באמת קרתה;
  -- מדיניות ההעלאה כבר מוודאת שרק אתם יכולים לכתוב לנתיב הזה.
  v_path := p_event_id::text || '/' || auth.uid()::text || '.jpg';
  if p_selfie_path is distinct from v_path then
    raise exception 'BAD_SELFIE_PATH';
  end if;
  if not exists (
    select 1 from storage.objects
    where bucket_id = 'selfies' and name = v_path
  ) then
    raise exception 'SELFIE_MISSING';
  end if;

  -- auth.uid() ולא פרמטר — אי אפשר לעשות צ'ק־אין בשם מישהו אחר.
  insert into public.attendances
    (event_id, profile_id, selfie_path, lat, lng, accuracy_m, distance_m)
  values
    (p_event_id, auth.uid(), v_path, p_lat, p_lng, p_accuracy_m, v_dist)
  on conflict (event_id, profile_id) do nothing
  returning * into v_row;

  if v_row is null then
    raise exception 'ALREADY_CHECKED_IN';
  end if;

  return v_row;
end;
$$;

-- הוספה ידנית ע"י המארגנת: טלפון שמת בחוף לא אמור למחוק בן אדם מההיסטוריה.
create or replace function public.admin_add_attendance(
  p_event_id   uuid,
  p_profile_id uuid
)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  v_club uuid;
begin
  select club_id into v_club from public.events where id = p_event_id;
  if v_club is null then
    raise exception 'EVENT_NOT_FOUND';
  end if;
  if not public.is_club_organizer(v_club) then
    raise exception 'NOT_ORGANIZER';
  end if;
  -- גם המנהלת מוגבלת לקהילה שלה. בלי זה אפשר לשתול נוכחות של כל
  -- profile_id במערכת, כולל של מי שאינו חבר בקהילה.
  if not exists (
    select 1 from public.club_members
    where club_id = v_club and profile_id = p_profile_id
  ) then
    raise exception 'NOT_A_MEMBER';
  end if;

  insert into public.attendances (event_id, profile_id, added_manually)
  values (p_event_id, p_profile_id, true)
  on conflict (event_id, profile_id) do nothing;
end;
$$;

-- מספר הנרשמים בלבד. משתתף לא אמור לראות שמות לפני המפגש —
-- הזהויות הן הפרס על נוכחות מוכחת (החלטה 2 במפרט).
create or replace function public.event_rsvp_count(p_event_id uuid)
returns integer
language plpgsql security definer stable set search_path = public
as $$
declare
  v_club uuid;
begin
  select club_id into v_club from public.events where id = p_event_id;
  if v_club is null or not public.is_club_member(v_club) then
    return null;
  end if;
  return (select count(*)::int from public.rsvps
          where event_id = p_event_id and going);
end;
$$;

-- מי סימן שיגיע. **שמות בלבד, בלי סלפים** — הצהרת כוונה היא מה שהאדם
-- בחר לפרסם, ולכן מותר לחשוף אותה לחברי הקהילה: לראות מי מתכנן להגיע
-- זה מה שמייצר את המוטיבציה להצטרף. הפנים נשארות הפרס על נוכחות מוכחת,
-- ולכן הפונקציה הזאת לא מחזירה selfie_path.
create or replace function public.event_going_list(p_event_id uuid)
returns table (profile_id uuid, full_name text)
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
    select p.id, p.full_name
    from public.rsvps r
    join public.profiles p on p.id = r.profile_id
    where r.event_id = p_event_id and r.going
    order by r.created_at;
end;
$$;

-- אותו דבר לכמה מפגשים בבקשה אחת — רשימת המפגשים צריכה להראות שמות
-- על כל כרטיס, וקריאה נפרדת לכל מפגש היא N+1.
create or replace function public.events_going_names(p_event_ids uuid[])
returns table (event_id uuid, profile_id uuid, full_name text)
language plpgsql security definer stable set search_path = public
as $$
begin
  -- תקרה על גודל הקלט: הפונקציה נגישה לכל חבר קהילה דרך RPC, ובלי
  -- הגבלה אפשר לשלוח מערך ענק ולהעמיס את המסד.
  if p_event_ids is null or array_length(p_event_ids, 1) > 100 then
    raise exception 'TOO_MANY_EVENTS';
  end if;

  return query
    select r.event_id, p.id, p.full_name
    from public.rsvps r
    join public.events e on e.id = r.event_id
    join public.profiles p on p.id = r.profile_id
    where r.event_id = any (p_event_ids)
      and r.going
      and public.is_club_member(e.club_id)
    order by r.event_id, r.created_at;
end;
$$;

-- כרטיס אדם, לעמוד שנפתח מלחיצה על שם ברשימת הכוונות.
--
-- `profiles_select` מרשה לקרוא פרופיל רק של מי שנכחתם איתו יחד, ולכן
-- אי אפשר להגיע לכאן דרך הטבלה: את השם ראינו ברשימת הכוונות, אבל את
-- השורה עצמה אסור לנו לקרוא. הפונקציה הזאת נותנת בדיוק את מה שמותר:
--   * שם — לכל חבר קהילה, כמו ברשימת הכוונות
--   * אינסטגרם — **רק** למי שנכח יחד איתו, או למנהלת
-- הסלפים לא עוברים כאן בכלל: attendances ו-storage כבר מסננים לבד.
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
  v_shared int;
  v_organizer boolean;
begin
  -- שני הצדדים חייבים להיות באותה קהילה
  if not exists (
    select 1
    from public.club_members me
    join public.club_members them on them.club_id = me.club_id
    where me.profile_id = auth.uid() and them.profile_id = p_profile_id
  ) then
    return;
  end if;

  select count(*)::int into v_shared
  from public.attendances a
  where a.profile_id = p_profile_id and public.has_attended(a.event_id);

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

-- כמה כבר נכחו בפועל. חבר קהילה רשאי לראות את המספר גם בלי לנכוח —
-- זה מה שיוצר את המשיכה ("12 היו כאן") בלי לחשוף מי. RLS על
-- attendances חוסם קריאה ישירה, ולכן צריך security definer.
create or replace function public.event_attendance_count(p_event_id uuid)
returns integer
language plpgsql security definer stable set search_path = public
as $$
declare
  v_club uuid;
begin
  select club_id into v_club from public.events where id = p_event_id;
  if v_club is null or not public.is_club_member(v_club) then
    return null;
  end if;
  return (select count(*)::int from public.attendances
          where event_id = p_event_id);
end;
$$;


-- ======================== הרשמה: יצירת פרופיל ==============================
-- נוצר אוטומטית מ־metadata של ההרשמה, ומצורף לקהילת ברירת המחדל.

create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  v_club uuid;
  v_is_first boolean;
begin
  insert into public.profiles (id, full_name, phone, birth_date, city, waiver_accepted_at, instagram)
  values (
    new.id,
    coalesce(nullif(new.raw_user_meta_data ->> 'full_name', ''), 'חבר קהילה'),
    nullif(new.raw_user_meta_data ->> 'phone', ''),
    nullif(new.raw_user_meta_data ->> 'birth_date', '')::date,
    nullif(new.raw_user_meta_data ->> 'city', ''),
    -- ההרשמה בממשק חוסמת שליחה בלי לסמן את כתב הוויתור, ולכן הגעה
    -- לכאן פירושה שאושר — נחתם ב-now(), לא בזמן שהלקוח טוען שהיה
    now(),
    nullif(new.raw_user_meta_data ->> 'instagram', '')
  );

  -- הצטרפות פתוחה: כל מי שנרשם נכנס לקהילה (החלטה 3 במפרט)
  select id into v_club from public.clubs where slug = 'swell';
  if v_club is not null then
    -- מי שנרשם ראשון לקהילה הופך אוטומטית למנהל שלה — "לפי האימות
    -- ההתחלתי", בלי צורך בשאילתת SQL ידנית. כל מי שמצטרף אחריו הוא
    -- חבר רגיל. קידום למנהל נוסף עדיין אפשרי דרך SETUP.md.
    --
    -- הנעילה מסדרת שתי הרשמות שקורות באותו רגע. בלעדיה שתיהן רואות
    -- קהילה ריקה ושתיהן הופכות למנהלות — וזו הרשאה שאי אפשר לקחת חזרה
    -- מהממשק.
    perform pg_advisory_xact_lock(hashtext('swell:club:' || v_club::text));

    v_is_first := not exists (
      select 1 from public.club_members where club_id = v_club
    );
    insert into public.club_members (club_id, profile_id, role)
    values (v_club, new.id, case when v_is_first then 'organizer' else 'member' end::public.member_role)
    on conflict do nothing;
  end if;

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();


-- ================================ RLS ======================================

alter table public.profiles      enable row level security;
alter table public.clubs         enable row level security;
alter table public.club_members  enable row level security;
alter table public.events        enable row level security;
alter table public.rsvps         enable row level security;
alter table public.attendances   enable row level security;
alter table public.push_subscriptions enable row level security;
alter table public.event_reminders    enable row level security;

-- --- profiles ---
-- רואים פרופיל של מישהו רק אם נכחתם יחד באותו מפגש. זה הפרס.
create policy "profiles_select" on public.profiles
for select to authenticated using (
  id = auth.uid()
  or exists (
    select 1 from public.attendances a
    where a.profile_id = profiles.id and public.has_attended(a.event_id)
  )
  or exists (
    select 1 from public.club_members cm
    where cm.profile_id = profiles.id and public.is_club_organizer(cm.club_id)
  )
);

create policy "profiles_insert_own" on public.profiles
for insert to authenticated with check (id = auth.uid());

create policy "profiles_update_own" on public.profiles
for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

-- --- clubs ---
create policy "clubs_select" on public.clubs
for select to authenticated using (true);

-- --- club_members ---
create policy "club_members_select" on public.club_members
for select to authenticated using (
  profile_id = auth.uid() or public.is_club_organizer(club_id)
);

create policy "club_members_join_self" on public.club_members
for insert to authenticated with check (
  profile_id = auth.uid() and role = 'member'
);

-- --- events ---
create policy "events_select_members" on public.events
for select to authenticated using (public.is_club_member(club_id));

create policy "events_organizer_all" on public.events
for all to authenticated
using (public.is_club_organizer(club_id))
with check (public.is_club_organizer(club_id));

-- --- rsvps ---
-- משתתף רואה רק את ה־RSVP של עצמו. המספר הכולל מגיע מ־event_rsvp_count().
create policy "rsvps_select" on public.rsvps
for select to authenticated using (
  profile_id = auth.uid()
  or exists (
    select 1 from public.events e
    where e.id = rsvps.event_id and public.is_club_organizer(e.club_id)
  )
);

create policy "rsvps_write_own" on public.rsvps
for all to authenticated
using (profile_id = auth.uid())
with check (profile_id = auth.uid());

-- --- attendances ---
-- אין policy של insert בכוונה. הדרך היחידה פנימה היא check_in().
create policy "attendances_select" on public.attendances
for select to authenticated using (
  public.has_attended(event_id)
  or exists (
    select 1 from public.events e
    where e.id = attendances.event_id and public.is_club_organizer(e.club_id)
  )
);


-- --- push_subscriptions ---
-- כל אחד מנהל רק את המנויים של עצמו. השולח (ה-cron) ניגש דרך
-- service_role בשרת, שעוקף RLS ולעולם לא מגיע לדפדפן.
create policy "push_subs_own" on public.push_subscriptions
for all to authenticated
using (profile_id = auth.uid())
with check (profile_id = auth.uid());

-- --- event_reminders ---
-- טבלה תפעולית. אין ללקוח מה לעשות איתה, ולכן אין policy בכלל:
-- RLS פעיל ובלי policy = אף אחד לא רואה כלום חוץ מ-service_role.


-- ============================== אחסון ======================================
-- נתיב הקובץ הוא {event_id}/{profile_id}.jpg — התיקייה היא שם המפגש,
-- וזה מה שמאפשר לאכוף "רק מי שנכח רואה" גם על התמונות עצמן.

-- תקרת גודל וסוגי קובץ נאכפות בדלי עצמו: הלקוח דוחס ל-JPEG, אבל
-- הלקוח הוא לא מקור האמת. בלי זה חבר קהילה יכול להעלות וידאו של 5GB.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('selfies', 'selfies', false, 5242880, array['image/jpeg'])
on conflict (id) do update
  set public             = false,
      file_size_limit    = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

create policy "selfies_upload_own" on storage.objects
for insert to authenticated with check (
  bucket_id = 'selfies'
  and split_part(name, '/', 2) = auth.uid()::text || '.jpg'
);

-- העלאה חוזרת לאותו נתיב. `upsert: true` בלקוח מתורגם ל-UPDATE כשהקובץ
-- כבר קיים, ובלי המדיניות הזאת **ניסיון שני נכשל**: מי שהעלה סלפי
-- וה-check_in נכשל (רחוק מדי, קליטה) לא היה יכול לנסות שוב.
create policy "selfies_update_own" on storage.objects
for update to authenticated
using (
  bucket_id = 'selfies'
  and split_part(name, '/', 2) = auth.uid()::text || '.jpg'
)
with check (
  bucket_id = 'selfies'
  and split_part(name, '/', 2) = auth.uid()::text || '.jpg'
);

create policy "selfies_read_co_attendees" on storage.objects
for select to authenticated using (
  bucket_id = 'selfies'
  and (
    -- חבר קהילה: רק ממפגש שנכח בו
    public.has_attended((split_part(name, '/', 1))::uuid)
    -- מנהלת: מכל מפגש של הקהילה שלה, גם בלי שנכחה
    or public.is_event_organizer((split_part(name, '/', 1))::uuid)
  )
);


-- ============================ אלבום מפגש ===================================
-- נתיב הקובץ הוא {event_id}/{random}.jpg — בלי טבלת metadata נפרדת.
-- ה-storage עצמו הוא מקור האמת, בדיוק כמו הסלפים; הרשימה נשלפת עם
-- storage.list() וה-RLS כאן הוא כל האכיפה שצריך.
--
-- בניגוד לסלפי, כאן *המנהלת* מעלה בשביל כולם — ולכן אין בדיקת
-- "הנתיב שלי" בהעלאה כמו ב-selfies_upload_own, רק שהיא אכן מנהלת
-- המפגש הזה.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('event-photos', 'event-photos', false, 8388608, array['image/jpeg', 'image/png'])
on conflict (id) do update
  set public             = false,
      file_size_limit    = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

create policy "event_photos_upload_organizer" on storage.objects
for insert to authenticated with check (
  bucket_id = 'event-photos'
  and public.is_event_organizer((split_part(name, '/', 1))::uuid)
);

create policy "event_photos_delete_organizer" on storage.objects
for delete to authenticated using (
  bucket_id = 'event-photos'
  and public.is_event_organizer((split_part(name, '/', 1))::uuid)
);

create policy "event_photos_read_attendees" on storage.objects
for select to authenticated using (
  bucket_id = 'event-photos'
  and (
    public.has_attended((split_part(name, '/', 1))::uuid)
    or public.is_event_organizer((split_part(name, '/', 1))::uuid)
  )
);


-- ========================= הרשאות על הפונקציות =============================
-- Postgres נותן EXECUTE ל-public על כל פונקציה חדשה, ולכן **כל** אחת
-- מהן נגישה גם ל-anon דרך PostgREST — בלי להתחבר. היום זה לא דולף כלום
-- (auth.uid() ריק ולכן כל בדיקת חברות נופלת), אבל זה מסתמך על כך שכל
-- פונקציה עתידית תזכור לבדוק. עדיף לסגור את הדלת מראש.

revoke execute on function
  public.has_attended(uuid),
  public.is_club_member(uuid),
  public.is_club_organizer(uuid),
  public.is_event_organizer(uuid),
  public.check_in(uuid, double precision, double precision, double precision, text),
  public.admin_add_attendance(uuid, uuid),
  public.event_rsvp_count(uuid),
  public.event_going_list(uuid),
  public.events_going_names(uuid[]),
  public.person_card(uuid),
  public.event_attendance_count(uuid)
from public, anon;

-- פונקציות העזר נקראות מתוך ה-policies, שרצות בהרשאות הקורא —
-- ולכן `authenticated` חייב להיות מסוגל להריץ אותן.
grant execute on function
  public.has_attended(uuid),
  public.is_club_member(uuid),
  public.is_club_organizer(uuid),
  public.is_event_organizer(uuid),
  public.check_in(uuid, double precision, double precision, double precision, text),
  public.admin_add_attendance(uuid, uuid),
  public.event_rsvp_count(uuid),
  public.event_going_list(uuid),
  public.events_going_names(uuid[]),
  public.person_card(uuid),
  public.event_attendance_count(uuid)
to authenticated;

-- טריגר בלבד. אף לקוח לא אמור להיות מסוגל לקרוא לה ישירות.
revoke execute on function public.handle_new_user() from public, anon, authenticated;


-- ============================ נתוני התחלה ==================================

insert into public.clubs (name, slug, description)
values ('Swell', 'swell', 'קהילת השחיינים')
on conflict (slug) do nothing;
