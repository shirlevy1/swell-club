import { redirect } from "next/navigation";
import { getViewer, getRemovedMembers } from "@/lib/data";
import { formatDateShort } from "@/lib/format";
import { BackLink, Card, EmptyState } from "@/components/ui";
import { RestoreMemberButton } from "@/components/restore-member-button";

/**
 * מי שכבר לא בקהילה (הוסרו, עזבו, או נדחו) — תצוגה נפרדת ומכוונת
 * לגמרי מרשימת "חברי הקהילה" הרגילה, כדי שהיא תישאר נקייה. כל שורה
 * כאן ניתנת לשחזור (מחזיר ל"ממתין/ה לאישור", לא ישר לחברות מלאה).
 */
export default async function RemovedMembersPage() {
  const viewer = await getViewer();
  if (!viewer?.club || viewer.role !== "organizer") redirect("/events");

  const removed = await getRemovedMembers(viewer.club.id);

  return (
    <div className="space-y-6">
      <BackLink href="/admin">לניהול</BackLink>

      <div className="space-y-0.5">
        <h1 className="font-[family-name:var(--font-display)] text-2xl font-bold">
          מי שכבר לא בקהילה
        </h1>
        <p className="text-sm text-(--color-ink-soft)">
          הוסרו, עזבו, או שהבקשה שלהם נדחתה. שחזור מחזיר אותם ל&quot;ממתין/ה
          לאישור&quot; — לא ישר לחברות מלאה.
        </p>
      </div>

      {removed.length === 0 ? (
        <EmptyState
          title="אין כאן אף אחד"
          body="מי שיוסר/תוסר או יעזוב/תעזוב מהקהילה יופיע/תופיע כאן, עם אפשרות לשחזור."
        />
      ) : (
        <Card className="divide-y divide-(--color-line)/50 p-0">
          {removed.map((m) => (
            <div
              key={m.profileId}
              className="flex items-center justify-between gap-3 px-4 py-3"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">
                  {m.fullName}
                </p>
                {m.removedAt && (
                  <p className="text-xs text-(--color-ink-faint)">
                    לא בקהילה מאז {formatDateShort(m.removedAt)}
                  </p>
                )}
              </div>
              <RestoreMemberButton
                profileId={m.profileId}
                fullName={m.fullName}
              />
            </div>
          ))}
        </Card>
      )}
    </div>
  );
}
