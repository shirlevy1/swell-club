import { redirect } from "next/navigation";
import {
  getViewer,
  getAdminData,
  getNextEventGoingProfileIds,
} from "@/lib/data";
import { BackLink, EmptyState } from "@/components/ui";
import { MemberSearchList } from "@/components/member-search-list";
import { SWIM_LEVEL_OPTIONS } from "@/lib/swim-level";

/**
 * פירוט "רמת שחייה" (שלישיית הדמוגרפיה ב-תובנות) - שלוש רשימות
 * נפרדות, כל אחת עם חיפוש וגלילה משלה - אותו דפוס בדיוק כמו
 * admin/insights/tenure. SWIM_LEVEL_OPTIONS ב-lib/swim-level.ts הוא
 * מקור האמת היחיד לסדר/תוויות הרמות, אותו מקור כמו בכל שאר האתר.
 */
export default async function AdminInsightsSwimLevelPage() {
  const viewer = await getViewer();
  if (!viewer?.club || viewer.role !== "organizer") redirect("/events");

  const [{ members }, goingProfileIds] = await Promise.all([
    getAdminData(viewer.club.id),
    getNextEventGoingProfileIds(viewer.club.id),
  ]);

  return (
    <div className="space-y-6">
      <BackLink href="/admin/insights">לתובנות</BackLink>

      <h1 className="font-[family-name:var(--font-display)] text-2xl font-bold">
        רמת שחייה
      </h1>

      {SWIM_LEVEL_OPTIONS.map(({ value, label }) => {
        const levelMembers = members.filter((m) => m.profile.swim_level === value);
        return (
          <section key={value} className="space-y-3">
            <h2 className="text-xs font-bold tracking-[0.2em] text-(--color-sea)">
              {label} · <span className="ltr-nums">{levelMembers.length}</span>
            </h2>
            {levelMembers.length === 0 ? (
              <EmptyState title="אין כאן אף אחד" body="אף חבר/ת קהילה לא בקטגוריה הזו." />
            ) : (
              <MemberSearchList
                members={levelMembers}
                backFrom="admin-insights-swim-level"
                goingProfileIds={goingProfileIds}
              />
            )}
          </section>
        );
      })}
    </div>
  );
}
