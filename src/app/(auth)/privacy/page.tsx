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
      <BackLink href="/profile">חזור לפרופיל</BackLink>
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
          <p>
            האתר משתמש בעוגייה אחת בלבד - עוגיית התחברות הכרחית שמזהה
            אתכם בין ביקור לביקור. אין באתר עוגיות מעקב, פרסום או ניתוח.
          </p>
        </div>

        <div className="space-y-2 border-t border-(--color-line) pt-4">
          <p className="font-bold text-(--color-ink)">
            הסכמה לקבלת הודעות (דיוור)
          </p>
          <p className="text-sm leading-relaxed text-(--color-ink-soft)">
            אני מאשר/ת קבלת התראות Push והודעות מייל מ-Swell Club על
            פעילות בקהילה - מפגש חדש שנפתח, תמונה שעלתה, אישור הגעה
            ועדכונים במפגש. אפשר לכבות את ההתראות בכל עת דרך אייקון
            הפעמון בעמוד המפגשים.
          </p>
        </div>
      </Card>
    </div>
  );
}
