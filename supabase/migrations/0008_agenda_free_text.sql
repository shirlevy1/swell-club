-- הלו״ז עבר מרשימת שלבים מובנית לטקסט חופשי אחד — פשוט יותר לכתוב
-- ולערוך, ובלי הבאג של שורה מפוצלת לשני שדות. עדיין נופל על ברירת
-- מחדל מחושבת ב-lib/agenda.ts כשהוא ריק, בדיוק כמו קודם.
alter table public.events
  drop column agenda,
  drop column agenda_closing,
  add column agenda_text text;
