import { redirect } from "next/navigation";
import { getViewer, getOrganizerPendingCounts } from "@/lib/data";
import { demoMode } from "@/lib/config";
import { AppNav } from "@/components/app-nav";
import { AppHeader } from "@/components/app-header";
import { DemoBadge } from "@/components/demo-badge";
import { VisibilityRefresh } from "@/components/visibility-refresh";
import { PullToRefresh } from "@/components/pull-to-refresh";
import { NotificationPromptBanner } from "@/components/notification-prompt-banner";
import { SignOutButton } from "@/components/sign-out-button";
import { Card, LinkButton } from "@/components/ui";
import { InstagramIcon } from "@/components/social-icons";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const viewer = await getViewer();
  if (!viewer) redirect("/login");

  // חברות ששוחזרה (restore_member(), migration 0036) מאפסת joined_at
  // להיום, בזמן ש-profiles.created_at נשאר תאריך ההרשמה המקורי —
  // בהרשמה חדשה רגילה שני התאריכים נוצרים באותה טרנזקציה בדיוק
  // (handle_new_user()), אז הפער ביניהם תמיד כמעט אפס. פער אמיתי
  // מזהה במדויק "זה שחזור", בלי טור/דגל נפרד — ראו NotificationPromptBanner.
  const recentlyRestored = !!(
    viewer.joinedAt &&
    viewer.profile?.created_at &&
    new Date(viewer.joinedAt).getTime() -
      new Date(viewer.profile.created_at).getTime() >
      60_000
  );

  // ערך התחלתי אמיתי לתג ההתראה על "ניהול" — בלעדיו הוא תמיד מתחיל
  // מ"אין כלום ממתין" ומתקן את עצמו רגע אחרי, כשה-fetch בצד הלקוח
  // מסיים (ראו app-nav.tsx).
  const isOrganizer = viewer.role === "organizer";
  const initialPendingCounts =
    isOrganizer && viewer.club?.id
      ? await getOrganizerPendingCounts(viewer.club.id)
      : { members: 0, photos: 0 };

  return (
    <div className="relative isolate flex h-full flex-col overflow-hidden">
      <div
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background:
            "linear-gradient(180deg, #ffffff 0%, #f2f7fa 55%, #e8f0f6 100%)",
        }}
      />

      {demoMode && <DemoBadge currentRole={viewer.role ?? "member"} />}

      <VisibilityRefresh />

      <AppHeader />

      {/* PullToRefresh הוא גם אזור הגלילה היחיד בעמוד — הכותרת למעלה
          וה-nav למטה יושבים מחוצה לו בכוונה, כדי שאף פעם לא "יזוזו"
          תוך כדי גלילה (ראו ההערה ברכיב עצמו). */}
      <main className="min-h-0 flex-1 overflow-hidden">
        <PullToRefresh className="mx-auto h-full w-full max-w-md overflow-y-auto px-5 pb-6 pt-6">
          {/* ממתין/ה לאישור: אין גישה לתוכן הקהילה, כולל ניווט בין
              עמודים — לפני שמנהלת אישרה, אין כלום לנווט אליו בכל מקרה. */}
          {viewer.status === "pending" ? (
            <div className="flex flex-1 items-center pt-10">
              <Card className="w-full space-y-4 text-center">
                <h1 className="font-[family-name:var(--font-display)] text-xl font-bold">
                  עוד רגע אתם איתנו במים
                </h1>
                <p className="text-sm leading-relaxed text-(--color-ink-soft)">
                  ההרשמה שלכם התקבלה. תנו לנו רגע לעבור עליה, וברגע
                  שתאושרו תוכלו להיכנס ולגלות את המפגשים הקרובים.
                </p>
                <hr className="border-(--color-line)" />
                <p className="text-sm leading-relaxed text-(--color-ink-soft)">
                  רוצים להצטרף לקהילה?
                  <br />
                  רק תוודאו שאתם עוקבים אחרינו באינסטגרם.
                </p>
                <LinkButton
                  href="https://www.instagram.com/swell__club/"
                  target="_blank"
                  rel="noreferrer"
                  variant="secondary"
                  className="w-full"
                >
                  <InstagramIcon className="size-4" />
                  מעבר לאינסטגרם של Swell Club
                </LinkButton>
                <SignOutButton />
              </Card>
            </div>
          ) : viewer.status === "removed" || viewer.status === null ? (
            // הוסרו מהקהילה, עזבו בעצמם, או נדחו — club_members קיימת
            // עם status='removed' (מחיקה רכה, ראו migration 0036),
            // או שאין שורה בכלל (חשבון ישן/מקרה תיאורטי). בלי המסך
            // הזה כל שאר העמודים מניחים viewer.club לא ריק ומתרסקים.
            <div className="flex flex-1 items-center pt-10">
              <Card className="w-full space-y-4 text-center">
                <h1 className="font-[family-name:var(--font-display)] text-xl font-bold">
                  כבר לא חלק מהקהילה
                </h1>
                <p className="text-sm leading-relaxed text-(--color-ink-soft)">
                  החשבון הזה כבר לא חבר בקהילה.
                </p>
                <p className="text-sm leading-relaxed text-(--color-ink-soft)">
                  אם זה לא צפוי, פנו למנהלת הקהילה.
                </p>
                <SignOutButton />
              </Card>
            </div>
          ) : (
            <>
              <NotificationPromptBanner recentlyRestored={recentlyRestored} />
              {children}
            </>
          )}
        </PullToRefresh>
      </main>

      {viewer.status !== "pending" &&
        viewer.status !== "removed" &&
        viewer.status !== null && (
        <AppNav
          isOrganizer={isOrganizer}
          clubId={viewer.club?.id ?? null}
          initialCounts={initialPendingCounts}
        />
      )}
    </div>
  );
}
