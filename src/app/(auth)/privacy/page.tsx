import { BackLink, Card, PageHeader } from "@/components/ui";
import { NotificationsConsentBody, PrivacyPolicyBody } from "@/components/legal-text";

/**
 * עמוד עצמאי, נגיש בלי התחברות (ראו PUBLIC_PATHS ב-middleware.ts) —
 * כדי שיהיה אפשר לשלוח אליו קישור ולחזור אליו בכל רגע, לא רק לקרוא
 * את הטקסט פעם אחת בתוך טופס ההרשמה. הטקסט עצמו זהה לזה שמוצג בהרשמה
 * (signup/page.tsx) — שניהם קוראים מ-components/legal-text.tsx, אין
 * יותר שני עותקים שעלולים להתפצל זה מזה.
 */
export default function PrivacyPage() {
  return (
    <div className="w-full space-y-4">
      <BackLink href="/profile">חזור לפרופיל</BackLink>
      <Card className="space-y-4">
        <PageHeader title="הצהרת פרטיות" />
        <div className="space-y-3 text-sm leading-relaxed text-(--color-ink-soft)">
          <PrivacyPolicyBody />
        </div>

        <div className="space-y-2 border-t border-(--color-line) pt-4">
          <p className="font-bold text-(--color-ink)">
            הסכמה לקבלת הודעות (דיוור)
          </p>
          <div className="text-sm leading-relaxed text-(--color-ink-soft)">
            <NotificationsConsentBody />
          </div>
        </div>
      </Card>
    </div>
  );
}
