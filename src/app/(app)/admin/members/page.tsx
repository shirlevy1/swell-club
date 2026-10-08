import { redirect } from "next/navigation";
import { getViewer, getAdminData } from "@/lib/data";
import { BackLink } from "@/components/ui";
import { MemberSearchList } from "@/components/member-search-list";

/**
 * כל חברי הקהילה, בלי הגבלה - אותו רכיב חיפוש בדיוק כמו בעמוד
 * הניהול הראשי (MemberSearchList), רק בלי whenEmpty: כאן, כש-query
 * ריק, מציגים את הרשימה המלאה (זה בשביל זה העמוד הזה קיים), לא
 * קישור חוזר לכאן. אותו עיקרון בדיוק כמו admin/events/history.
 */
export default async function AdminMembersPage() {
  const viewer = await getViewer();
  if (!viewer?.club || viewer.role !== "organizer") redirect("/events");

  const { members } = await getAdminData(viewer.club.id);

  return (
    <div className="space-y-6">
      <BackLink href="/admin#members">לניהול</BackLink>

      <h1 className="font-[family-name:var(--font-display)] text-2xl font-bold">
        כל חברי הקהילה
      </h1>

      <MemberSearchList members={members} />
    </div>
  );
}
