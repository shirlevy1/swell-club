import { redirect } from "next/navigation";
import {
  getViewer,
  getReturnRateMembers,
  getNextEventGoingProfileIds,
} from "@/lib/data";
import { BackLink, EmptyState } from "@/components/ui";
import { MemberSearchList } from "@/components/member-search-list";

const SECTIONS = [
  { key: "returned", label: "חזרו שוב" },
  { key: "notReturned", label: "לא חזרו (עדיין, ראויים לשפוט)" },
  { key: "notEligible", label: "לא ראויים לשפוט עדיין" },
] as const;

/**
 * פירוט "חוזרים" (גרף 7 ב-תובנות) - שלוש רשימות נפרדות, כל אחת עם
 * חיפוש וגלילה משלה, אותו דפוס בדיוק כמו admin/insights/tenure.
 * getReturnRateMembers ב-lib/data.ts הוא מקור האמת היחיד לחלוקה -
 * אותו חישוב בדיוק כמו באחוז בכרטיס עצמו.
 */
export default async function AdminReturningPage() {
  const viewer = await getViewer();
  if (!viewer?.club || viewer.role !== "organizer") redirect("/events");

  const [groups, goingProfileIds] = await Promise.all([
    getReturnRateMembers(viewer.club.id),
    getNextEventGoingProfileIds(viewer.club.id),
  ]);

  return (
    <div className="space-y-6">
      <BackLink href="/admin/insights">לתובנות</BackLink>

      <h1 className="font-[family-name:var(--font-display)] text-2xl font-bold">
        חוזרים
      </h1>

      {SECTIONS.map(({ key, label }) => {
        const sectionMembers = groups[key];
        return (
          <section key={key} className="space-y-3">
            <h2 className="text-xs font-bold tracking-[0.2em] text-(--color-sea)">
              {label} · <span className="ltr-nums">{sectionMembers.length}</span>
            </h2>
            {sectionMembers.length === 0 ? (
              <EmptyState title="אין כאן אף אחד" body="אף חבר/ת קהילה לא בקטגוריה הזו." />
            ) : (
              <MemberSearchList
                members={sectionMembers}
                backFrom="admin-returning"
                goingProfileIds={goingProfileIds}
              />
            )}
          </section>
        );
      })}
    </div>
  );
}
