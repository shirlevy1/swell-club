import { redirect } from "next/navigation";
import { getViewer, getAdminData } from "@/lib/data";
import { BackLink, EmptyState } from "@/components/ui";
import { MemberSearchList } from "@/components/member-search-list";

/**
 * פירוט "נשים מול גברים" (גרף 4 ב-תובנות) - שתי רשימות נפרדות, כל
 * אחת עם חיפוש וגלילה משלה (אותו MemberSearchList בדיוק כמו
 * admin/members). לא שאילתה חדשה - משתמשת ב-members שכבר מגיעה
 * מ-getAdminData, אותו עיקרון כמו admin/members ו-admin/outreach.
 */
export default async function AdminInsightsGenderPage() {
  const viewer = await getViewer();
  if (!viewer?.club || viewer.role !== "organizer") redirect("/events");

  const { members } = await getAdminData(viewer.club.id);
  const women = members.filter((m) => m.profile.gender === "female");
  const men = members.filter((m) => m.profile.gender === "male");

  return (
    <div className="space-y-6">
      <BackLink href="/admin/insights">לתובנות</BackLink>

      <h1 className="font-[family-name:var(--font-display)] text-2xl font-bold">
        נשים מול גברים
      </h1>

      <section className="space-y-3">
        <h2 className="text-xs font-bold tracking-[0.2em] text-(--color-sea)">
          נשים · <span className="ltr-nums">{women.length}</span>
        </h2>
        {women.length === 0 ? (
          <EmptyState title="אין כאן אף אחת" body="עדיין אין חברות קהילה." />
        ) : (
          <MemberSearchList members={women} />
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-xs font-bold tracking-[0.2em] text-(--color-sea)">
          גברים · <span className="ltr-nums">{men.length}</span>
        </h2>
        {men.length === 0 ? (
          <EmptyState title="אין כאן אף אחד" body="עדיין אין חברי קהילה." />
        ) : (
          <MemberSearchList members={men} />
        )}
      </section>
    </div>
  );
}
