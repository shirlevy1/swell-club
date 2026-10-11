import { redirect } from "next/navigation";
import {
  getViewer,
  getActiveMembers,
  getNextEventGoingProfileIds,
} from "@/lib/data";
import { BackLink, EmptyState } from "@/components/ui";
import { MemberSearchList } from "@/components/member-search-list";

/**
 * "פעילים" - חברי קהילה שהגיעו לאחד משני המפגשים האחרונים שהיו
 * (ראו getActiveMembers ב-lib/data.ts, אותו תנאי בדיוק כמו בכרטיס
 * בתובנות). אותו רכיב חיפוש+תצוגה בדיוק כמו admin/core/admin/outreach.
 */
export default async function AdminActivePage() {
  const viewer = await getViewer();
  if (!viewer?.club || viewer.role !== "organizer") redirect("/events");

  const [members, goingProfileIds] = await Promise.all([
    getActiveMembers(viewer.club.id),
    getNextEventGoingProfileIds(viewer.club.id),
  ]);

  return (
    <div className="space-y-6">
      <BackLink href="/admin/insights">לתובנות</BackLink>

      <h1 className="font-[family-name:var(--font-display)] text-2xl font-bold">
        פעילים
      </h1>

      {members.length === 0 ? (
        <EmptyState
          title="אין כאן אף אחד עדיין"
          body="ברגע שמישהו יגיע לאחד משני המפגשים האחרונים, הוא/היא יופיע/תופיע כאן."
        />
      ) : (
        <MemberSearchList
          members={members}
          backFrom="admin-active"
          goingProfileIds={goingProfileIds}
        />
      )}
    </div>
  );
}
