import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { getViewer, getNeedsOutreachMembers } from "@/lib/data";
import { BackLink, EmptyState } from "@/components/ui";
import { MemberSearchList } from "@/components/member-search-list";
import { OutreachCheckbox } from "@/components/outreach-checkbox";

/**
 * "אורחים" - חברי קהילה שהגיעו בעבר אבל לא הגיעו לאף אחד משני
 * המפגשים האחרונים (ראו getNeedsOutreachMembers ב-lib/data.ts).
 * אותו רכיב חיפוש+תצוגה בדיוק כמו admin/members, רק עם רשימה
 * מסוננת מראש במקום כל חברי הקהילה, ועם תיבת "דיברתי איתו/ה"
 * (renderBefore) מימין לתמונת הפרופיל של כל שורה - כאן, ברכיב השרת,
 * כי זה המקום היחיד שיודע גם את clubId וגם את lastAttendedEventId/
 * contacted של כל חבר/ה.
 */
export default async function AdminOutreachPage() {
  const viewer = await getViewer();
  if (!viewer?.club || viewer.role !== "organizer") redirect("/events");

  const clubId = viewer.club.id;
  const members = await getNeedsOutreachMembers(clubId);

  const checkboxes = new Map<string, ReactNode>(
    members.map((m) => [
      m.profile.id,
      <OutreachCheckbox
        key={m.profile.id}
        clubId={clubId}
        profileId={m.profile.id}
        fullName={m.profile.full_name}
        lastAttendedEventId={m.lastAttendedEventId}
        initialContacted={m.contacted}
      />,
    ]),
  );

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
        <MemberSearchList
          members={members}
          renderBefore={checkboxes}
          backFrom="admin-outreach"
        />
      )}
    </div>
  );
}
