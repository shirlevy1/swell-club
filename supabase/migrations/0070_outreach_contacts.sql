-- ============================================================================
-- Swell — סימון "כבר יצרתי קשר" בעמוד "אורחים"
-- ============================================================================
-- מנהלת מסמנת חבר/ה ברשימת "אורחים" (מי שהגיע/ה בעבר אך לא לאף אחד
-- משני המפגשים האחרונים - ראו getNeedsOutreachMembers ב-lib/data.ts)
-- כ"כבר דיברתי איתו/ה". הסימון שייך ל"פרק ההיעדרות" הנוכחי בלבד, לא
-- לנצח: הוא מעוגן למפגש האחרון שבו האדם נכח (last_attended_event_id).
-- אם האדם חוזר להגיע (ואז יוצא מרשימת האורחים), ומאוחר יותר שוב נעדר
-- (וחוזר לרשימה) - המפגש האחרון שלו כבר השתנה, אז הסימון הישן כבר לא
-- תואם ונחשב אוטומטית למיושן, בלי שום ניקוי ידני או תאריך-תפוגה.
--
-- להדבקה ב-Supabase → SQL Editor → New query → Run.
-- ============================================================================

create table public.outreach_contacts (
  club_id                uuid not null references public.clubs(id) on delete cascade,
  profile_id             uuid not null references public.profiles(id) on delete cascade,
  last_attended_event_id uuid not null references public.events(id) on delete cascade,
  marked_at              timestamptz not null default now(),
  primary key (club_id, profile_id)
);

alter table public.outreach_contacts enable row level security;

-- רק מנהלת הקהילה - זה כלי עבודה פנימי שלה, לא מידע שחברי קהילה
-- אמורים לראות על עצמם.
create policy "outreach_contacts_organizer_all" on public.outreach_contacts
for all to authenticated
using (public.is_club_organizer(club_id))
with check (public.is_club_organizer(club_id));

grant all on public.outreach_contacts to authenticated;
