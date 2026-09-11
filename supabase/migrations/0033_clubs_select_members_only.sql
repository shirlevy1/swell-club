-- clubs_select הייתה פתוחה לכל משתמש/ת מחובר/ת, לא רק לחברי הקהילה —
-- שונה מכל שאר הטבלאות באתר, ששם ההרשאה תמיד בודקת חברות. אין השפעה
-- כרגע (קהילה אחת בלבד, "swell"), אבל קהילה שנייה עתידית הייתה חושפת
-- שם/תיאור לכל משתמש/ת מכל קהילה, לא רק לחברים שלה. is_club_member()
-- כבר קיים ומשמש בדיוק לזה בכל שאר האתר.
drop policy if exists "clubs_select" on public.clubs;

create policy "clubs_select" on public.clubs
for select to authenticated using (public.is_club_member(id));
