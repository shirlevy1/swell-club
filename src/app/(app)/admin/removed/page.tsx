import Link from "next/link";
import { redirect } from "next/navigation";
import { getViewer, getRemovedMembers } from "@/lib/data";
import type { RemovedReason } from "@/lib/data";
import { byGender, formatDateNumericPadded } from "@/lib/format";
import type { Gender } from "@/lib/types";
import { BackLink, Card, EmptyState } from "@/components/ui";
import { ExportButton } from "@/components/export-button";
import { RestoreMemberButton } from "@/components/restore-member-button";
import { getAdminRemovedReportAction } from "@/lib/actions";

/** ניסוח קצר לשורה בכרטיס — "הוסר ב-12.09.2026", לא "לא בקהילה מאז...". */
function removalVerb(reason: RemovedReason, gender: Gender | null): string {
  switch (reason) {
    case "left":
      return byGender(gender, "עזב", "עזבה");
    case "removed":
      return byGender(gender, "הוסר", "הוסרה");
    case "rejected":
      return byGender(gender, "נדחה", "נדחתה");
  }
}

/**
 * מי שכבר לא בקהילה (הוסרו, עזבו, או נדחו) — תצוגה נפרדת ומכוונת
 * לגמרי מרשימת "חברי הקהילה" הרגילה, כדי שהיא תישאר נקייה. כל שורה
 * כאן ניתנת לשחזור (מחזיר ל"ממתין/ה לאישור", לא ישר לחברות מלאה),
 * וכל הרשימה ניתנת לייצוא לאקסל — אותם פרטים בדיוק כמו ייצוא "חברים"
 * הרגיל, ובנוסף תאריכי כל המפגשים שנכחו בהם, תאריך העזיבה, והסיבה.
 */
export default async function RemovedMembersPage() {
  const viewer = await getViewer();
  if (!viewer?.club || viewer.role !== "organizer") redirect("/events");

  const removed = await getRemovedMembers(viewer.club.id);

  return (
    <div className="space-y-6">
      <BackLink href="/admin/insights">לתובנות</BackLink>

      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1.5">
          <h1 className="font-[family-name:var(--font-display)] text-2xl font-bold">
            אקסים
          </h1>
          <p className="text-sm text-(--color-ink-soft)">
            הוסרו, עזבו, או שהבקשה שלהם להצטרף נדחתה.
          </p>
          <p className="text-sm text-(--color-ink-soft)">
            שחזור מחזיר אותם ל&quot;ממתין/ה לאישור&quot;, ולא ישר לחברות מלאה.
          </p>
        </div>
        {removed.length > 0 && (
          <ExportButton
            action={getAdminRemovedReportAction}
            filename="swell-removed-members.csv"
            label="CSV"
          />
        )}
      </div>

      {removed.length === 0 ? (
        <EmptyState
          title="אין כאן אף אחד"
          body="כשמישהו יעזוב או יוסר מהקהילה, הוא יופיע כאן ותוכלו לשחזר אותו בכל שלב."
        />
      ) : (
        <Card className="divide-y divide-(--color-line)/50 p-0">
          {removed.map((m) => {
            // לא כל שורה מגיעה בהכרח עם גם סיבה וגם תאריך (למשל רשומות
            // ישנות/ידניות) - מציגים את מה שכן יש, לא מסתירים הכל.
            const captionParts = [
              m.removedReason ? removalVerb(m.removedReason, m.gender) : null,
              m.removedAt ? `ב-${formatDateNumericPadded(m.removedAt)}` : null,
            ].filter(Boolean);

            return (
              <div
                key={m.profileId}
                className="relative flex items-center justify-between gap-3 px-4 py-3 transition hover:bg-(--color-haze)/60"
              >
                {/* קישור "מתוח" על פני כל הכרטיסייה (לא רק השם) - כפתור
                    השחזור נשאר לחיץ בנפרד כי הוא position:relative
                    ומגיע אחריו ב-DOM, אז הוא מצויר מעליו. לא ניתן
                    לעטוף הכל ב-Link יחיד כי <button> בתוך <a> לא תקין. */}
                <Link
                  href={`/admin/members/${m.profileId}?from=admin-removed`}
                  className="absolute inset-0"
                  aria-label={m.fullName}
                />
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">
                    {m.fullName}
                  </p>
                  {captionParts.length > 0 && (
                    <p className="text-xs text-(--color-ink-faint)">
                      {captionParts.join(" ")}
                    </p>
                  )}
                </div>
                <div className="relative">
                  <RestoreMemberButton
                    profileId={m.profileId}
                    fullName={m.fullName}
                  />
                </div>
              </div>
            );
          })}
        </Card>
      )}
    </div>
  );
}
