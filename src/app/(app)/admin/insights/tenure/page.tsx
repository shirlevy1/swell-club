import { redirect } from "next/navigation";
import { getViewer, getAdminData, tenureBucket, type TenureBucket } from "@/lib/data";
import { BackLink, EmptyState } from "@/components/ui";
import { MemberSearchList } from "@/components/member-search-list";

const BUCKETS: { key: TenureBucket; label: string }[] = [
  { key: "regular", label: "קבועים" },
  { key: "occasional", label: "מזדמנים" },
  { key: "oneTime", label: "חד-פעמיים" },
  { key: "ghost", label: "רוח רפאים" },
];

/**
 * פירוט "ותק חברים" (גרף 5 ב-תובנות) - ארבע רשימות נפרדות (אותו
 * סדר כמו המקרא בעוגה: קבועים→רוח רפאים), כל אחת עם חיפוש וגלילה
 * משלה. tenureBucket() ב-data.ts הוא מקור האמת היחיד לסיפים - אותו
 * חישוב בדיוק כמו בעוגה עצמה.
 */
export default async function AdminInsightsTenurePage() {
  const viewer = await getViewer();
  if (!viewer?.club || viewer.role !== "organizer") redirect("/events");

  const { members } = await getAdminData(viewer.club.id);

  return (
    <div className="space-y-6">
      <BackLink href="/admin/insights">לתובנות</BackLink>

      <h1 className="font-[family-name:var(--font-display)] text-2xl font-bold">
        ותק חברים
      </h1>

      {BUCKETS.map(({ key, label }) => {
        const bucketMembers = members.filter(
          (m) => tenureBucket(m.attendedCount) === key,
        );
        return (
          <section key={key} className="space-y-3">
            <h2 className="text-xs font-bold tracking-[0.2em] text-(--color-sea)">
              {label} · <span className="ltr-nums">{bucketMembers.length}</span>
            </h2>
            {bucketMembers.length === 0 ? (
              <EmptyState title="אין כאן אף אחד" body="אף חבר/ת קהילה לא בקטגוריה הזו." />
            ) : (
              <MemberSearchList members={bucketMembers} />
            )}
          </section>
        );
      })}
    </div>
  );
}
