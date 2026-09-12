import { redirect } from "next/navigation";
import { getViewer, getRemovedMembers, getAdminData } from "@/lib/data";
import type { RemovedReason } from "@/lib/data";
import {
  ageInYears,
  byGender,
  formatDate,
  formatDateShort,
  formatDateTimeNumeric,
  formatPhone,
  genderLabel,
  normalizeInstagram,
} from "@/lib/format";
import type { Gender } from "@/lib/types";
import { checkInWindow } from "@/lib/checkin";
import { swimLevelLabel } from "@/lib/swim-level";
import { BackLink, Card, EmptyState } from "@/components/ui";
import { ExportButton } from "@/components/export-button";
import { RestoreMemberButton } from "@/components/restore-member-button";

function reasonLabel(reason: RemovedReason, gender: Gender | null): string {
  switch (reason) {
    case "left":
      return byGender(gender, "עזב בעצמו", "עזבה בעצמה");
    case "removed":
      return byGender(gender, "הוסר ע״י מנהלת", "הוסרה ע״י מנהלת");
    case "rejected":
      return "בקשת הצטרפות נדחתה";
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

  const [removed, { events }] = await Promise.all([
    getRemovedMembers(viewer.club.id),
    getAdminData(viewer.club.id),
  ]);

  // אותו מכנה בדיוק כמו בייצוא "חברים" הרגיל — מפגשים שחלון הצ'ק־אין
  // שלהם כבר נפתח, לא רק מי שהסתיים.
  const heldCount = events.filter(
    (e) => checkInWindow(e).status !== "before",
  ).length;

  const removedCsv = [
    [
      "שם",
      "מגדר",
      "גיל",
      "תאריך לידה",
      "עיר מגורים",
      "טלפון",
      "אינסטגרם",
      "רמת שחייה",
      "תאריך הצטרפות",
      "מפגשים",
      "אחוז הגעה",
      "אישרו כתב ויתור",
      "אישרו הצהרת פרטיות",
      "תאריכי מפגשים שהגיעו אליהם",
      "תאריך עזיבה",
      "סיבה",
    ],
    ...removed.map((m) => [
      m.fullName,
      genderLabel(m.gender),
      ageInYears(m.birthDate)?.toString() ?? "",
      m.birthDate ?? "",
      m.city ?? "",
      formatPhone(m.phone) ?? "",
      normalizeInstagram(m.instagram) ?? "",
      swimLevelLabel(m.swimLevel) ?? "",
      formatDate(m.createdAt),
      `${m.attendedDates.length} מתוך ${heldCount}`,
      `${heldCount ? Math.round((m.attendedDates.length / heldCount) * 100) : 0}%`,
      m.waiverAcceptedAt ? "כן" : "",
      m.privacyAcceptedAt ? "כן" : "",
      m.attendedDates.map((d) => formatDateTimeNumeric(d)).join(" | "),
      m.removedAt ? formatDate(m.removedAt) : "",
      m.removedReason ? reasonLabel(m.removedReason, m.gender) : "",
    ]),
  ];

  return (
    <div className="space-y-6">
      <BackLink href="/admin">לניהול</BackLink>

      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1.5">
          <h1 className="font-[family-name:var(--font-display)] text-2xl font-bold">
            מי שכבר לא בקהילה
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
            rows={removedCsv}
            filename="swell-removed-members.csv"
            label="CSV"
          />
        )}
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
                    {m.removedReason && ` · ${reasonLabel(m.removedReason, m.gender)}`}
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
