import { redirect } from "next/navigation";
import { getViewer, getNeedsOutreachMembers } from "@/lib/data";
import { BackLink, EmptyState } from "@/components/ui";
import { MemberSearchList } from "@/components/member-search-list";

/**
 * "אורחים" - חברי קהילה שהגיעו בעבר אבל לא הגיעו לאף אחד משני
 * המפגשים האחרונים (ראו getNeedsOutreachMembers ב-lib/data.ts).
 * אותו רכיב חיפוש+תצוגה בדיוק כמו admin/members, רק עם רשימה
 * מסוננת מראש במקום כל חברי הקהילה.
 */
export default async function AdminOutreachPage() {
  const viewer = await getViewer();
  if (!viewer?.club || viewer.role !== "organizer") redirect("/events");

  const members = await getNeedsOutreachMembers(viewer.club.id);

  return (
    <div className="space-y-6">
      <BackLink href="/admin/insights">לתובנות</BackLink>

      <h1 className="font-[family-name:var(--font-display)] text-2xl font-bold">
        אורחים
      </h1>

      {members.length === 0 ? (
        <EmptyState
          title="אין כרגע למי לפנות"
          body="כל מי שהגיע בעבר הגיע גם לאחד משני המפגשים האחרונים."
        />
      ) : (
        <MemberSearchList members={members} />
      )}
    </div>
  );
}
