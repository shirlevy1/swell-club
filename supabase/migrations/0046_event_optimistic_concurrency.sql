-- ============================================================================
-- Swell — הגנה מפני מרוץ בעריכת מפגש ע"י שתי מנהלות בו-זמנית
-- ============================================================================
-- עדכון מפגש (edit-event-schedule-form.tsx) עדכן לפי id בלבד, בלי שום
-- דרך לדעת אם מישהי אחרת כבר שינתה את אותו מפגש בין הרגע שהטופס נטען
-- לרגע שהוא נשמר. שתי מנהלות ששומרות כמעט-בו-זמנית — האחרונה דורסת
-- בשקט את הראשונה, בלי שום התרעה. סיכון תיאורטי היום (מנהלת אחת
-- בלבד), אבל תשתית שכדאי שתהיה מוכנה מראש.
--
-- updated_at מתעדכן אוטומטית (טריגר) בכל UPDATE על מפגש. הלקוח שולח
-- בחזרה את הערך שראה כשהטופס נטען, כתנאי נוסף ב-WHERE של השמירה —
-- אם מישהי אחרת כבר שינתה בינתיים, ה-updated_at כבר לא תואם, ה-UPDATE
-- לא מוצא שורה להתאים, והלקוח יודע להציג שגיאה במקום להניח הצלחה.
-- ============================================================================

alter table public.events
  add column updated_at timestamptz not null default now();

create or replace function public.set_events_updated_at()
returns trigger
language plpgsql set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger events_set_updated_at
  before update on public.events
  for each row execute function public.set_events_updated_at();

revoke execute on function public.set_events_updated_at() from public, anon, authenticated;
