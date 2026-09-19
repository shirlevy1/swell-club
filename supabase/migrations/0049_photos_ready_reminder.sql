-- kind נוסף ל-event_reminders: 'photos_ready' — "יש כבר תמונות מהיום
-- לראות", נשלחת פעם אחת למי שנכח במפגש (ראו api/push/send/route.ts).
alter table public.event_reminders drop constraint event_reminders_kind_check;
alter table public.event_reminders add constraint event_reminders_kind_check
  check (kind in ('evening', 'morning', 'photos_ready'));
