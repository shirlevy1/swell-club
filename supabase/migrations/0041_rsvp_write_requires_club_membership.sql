-- rsvps_write_own בדקה רק שהשורה שייכת לכותב/ת (profile_id = auth.uid()),
-- לא שהמפגש עצמו שייך לקהילה שהוא/היא חבר/ה מאושר/ת בה. אותה מחלה
-- שכבר תוקנה במקומות אחרים (check_in(), clubs_select) — כאן פשוט לא
-- קיבלה טיפול מלכתחילה. היום זה בלי השפעה בפועל (קהילה אחת בלבד),
-- אבל ברגע שתהיה קהילה שנייה זה היה מאפשר RSVP למפגש של קהילה זרה.
drop policy if exists "rsvps_write_own" on public.rsvps;

create policy "rsvps_write_own" on public.rsvps
for all to authenticated
using (profile_id = auth.uid())
with check (
  profile_id = auth.uid()
  and exists (
    select 1 from public.events e
    where e.id = rsvps.event_id and public.is_club_member(e.club_id)
  )
);
