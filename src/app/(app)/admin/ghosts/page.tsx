import { redirect } from "next/navigation";
import { getViewer, getGhostMembers } from "@/lib/data";
import { BackLink, EmptyState } from "@/components/ui";
import { MemberSearchList } from "@/components/member-search-list";

/**
 * "רוח רפאים" - חברי קהילה מאושרים שמעולם לא הגיעו לאף מפגש (ראו
 * getGhostMembers ב-lib/data.ts). אותו רכיב חיפוש+תצוגה בדיוק כמו
 * admin/outreach ו-admin/members, רק עם רשימה מסוננת.
 */
export default async function AdminGhostsPage() {
  const viewer = await getViewer();
  if (!viewer?.club || viewer.role !== "organizer") redirect("/events");

  const members = await getGhostMembers(viewer.club.id);

  return (
    <div className="space-y-6">
      <BackLink href="/admin/insights">לתובנות</BackLink>

      <h1 className="font-[family-name:var(--font-display)] text-2xl font-bold">
        רוח רפאים
      </h1>

      {members.length === 0 ? (
        <EmptyState
          title="אין כאן אף אחד"
          body="כל מי שאושר/ה בקהילה הגיע/ה לפחות פעם אחת."
        />
      ) : (
        <MemberSearchList members={members} backFrom="admin-ghosts" />
      )}
    </div>
  );
}
