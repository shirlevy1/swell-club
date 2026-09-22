import { BackLink, Card, PageHeader } from "@/components/ui";

/**
 * עמוד עצמאי, נגיש בלי התחברות (ראו PUBLIC_PATHS ב-middleware.ts) —
 * כדי שיהיה אפשר לשלוח אליו קישור ולחזור אליו בכל רגע, לא רק לקרוא
 * את הטקסט פעם אחת בתוך טופס ההרשמה. הטקסט עצמו זהה לזה שמוצג בהרשמה
 * (signup/page.tsx) — לא מנוסח מחדש, רק הועבר לעמוד משלו.
 */
export default function PrivacyPage() {
  return (
    <div className="w-full space-y-4">
      <BackLink href="/">חזרה</BackLink>
      <Card className="space-y-4">
        <PageHeader title="הצהרת פרטיות" />
        <div className="space-y-3 text-sm leading-relaxed text-(--color-ink-soft)">
          <p>
            אנחנו אוספים את הפרטים שאתם ממלאים בטופס, סלפי בכל צ׳ק־אין,
            ותמונות שמועלות לאלבום המפגשים. בזמן צ׳ק־אין נאסף גם מיקום,
            כדי לוודא שבאמת הגעתם.
          </p>
          <p>
            השם שלכם גלוי לכל חברי הקהילה. התמונות, הטלפון והאינסטגרם
            גלויים רק למי שהיה איתכם באותו מפגש. מנהלת הקהילה רואה הכל,
            תמיד.
          </p>
          <p>המידע נשמר אצל Supabase, בתשתית מאובטחת.</p>
        </div>
      </Card>
    </div>
  );
}
