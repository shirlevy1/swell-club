import { BackLink, Card, PageHeader } from "@/components/ui";
import { SpeedoPartnershipBody, TermsOfUseBody, WaiverBody } from "@/components/legal-text";

/**
 * עמוד עצמאי, נגיש בלי התחברות (ראו PUBLIC_PATHS ב-middleware.ts).
 * כתב הוויתור ותנאי השימוש מאוחדים כאן בעמוד אחד — שניהם עוסקים
 * ביחסים בינך לבין Swell Club, בניגוד להצהרת הפרטיות (עמוד נפרד)
 * שעוסקת במידע. הטקסט קורא מ-components/legal-text.tsx, אותו מקור
 * בדיוק כמו ההרשמה ו-/privacy.
 */
export default function TermsPage() {
  return (
    <div className="w-full space-y-4">
      <BackLink href="/profile">חזור לפרופיל</BackLink>
      <Card className="space-y-5">
        <PageHeader title="כתב ויתור ותנאי שימוש" />

        <div className="space-y-3">
          <p className="font-bold text-(--color-ink)">
            כתב ויתור – השתתפות על אחריות אישית בלבד
          </p>
          <div className="space-y-3 text-sm leading-relaxed text-(--color-ink-soft)">
            <WaiverBody />
          </div>
        </div>

        <div className="space-y-3 border-t border-(--color-line) pt-5">
          <p className="font-bold text-(--color-ink)">
            שיתוף פעולה עם Speedo ישראל
          </p>
          <div className="space-y-3 text-sm leading-relaxed text-(--color-ink-soft)">
            <SpeedoPartnershipBody />
          </div>
        </div>

        <div className="space-y-3 border-t border-(--color-line) pt-5">
          <p className="font-bold text-(--color-ink)">
            תנאי שימוש וזכויות יוצרים
          </p>
          <div className="space-y-3 text-sm leading-relaxed text-(--color-ink-soft)">
            <TermsOfUseBody />
          </div>
        </div>
      </Card>
    </div>
  );
}
