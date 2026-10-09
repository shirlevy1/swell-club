import { redirect } from "next/navigation";
import { getViewer, getCoreMembers } from "@/lib/data";
import { BackLink, EmptyState } from "@/components/ui";
import { MemberSearchList } from "@/components/member-search-list";

/**
 * "גרעין" - חברי קהילה ותיקים (קבועים כבר מזמן, לא טריים) שעדיין
 * פעילים כרגע (ראו getCoreMembers ב-lib/data.ts). אותו רכיב
 * חיפוש+תצוגה בדיוק כמו admin/outreach ו-admin/ghosts, רק עם רשימה
 * מסוננת.
 */
export default async function AdminCorePage() {
  const viewer = await getViewer();
  if (!viewer?.club || viewer.role !== "organizer") redirect("/events");

  const members = await getCoreMembers(viewer.club.id);

  return (
    <div className="space-y-6">
      <BackLink href="/admin/insights">לתובנות</BackLink>

      <h1 className="font-[family-name:var(--font-display)] text-2xl font-bold">
        גרעין
      </h1>

      {members.length === 0 ? (
        <EmptyState
          title="אין כאן אף אחד עדיין"
          body="ברגע שחברי קהילה ותיקים יהיו גם פעילים לאורך זמן, הם יופיעו כאן."
        />
      ) : (
        <MemberSearchList members={members} backFrom="admin-core" />
      )}
    </div>
  );
}
