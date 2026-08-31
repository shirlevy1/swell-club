import { redirect } from "next/navigation";
import { getViewer } from "@/lib/data";
import { demoMode } from "@/lib/config";
import { AppNav } from "@/components/app-nav";
import { AppHeader } from "@/components/app-header";
import { DemoBadge } from "@/components/demo-badge";
import { VisibilityRefresh } from "@/components/visibility-refresh";
import { PullToRefresh } from "@/components/pull-to-refresh";
import { NotificationPromptBanner } from "@/components/notification-prompt-banner";
import { Button, Card } from "@/components/ui";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const viewer = await getViewer();
  if (!viewer) redirect("/login");

  return (
    <div className="relative isolate flex flex-1 flex-col">
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

      <main className="mx-auto w-full max-w-md flex-1 px-5 pb-28 pt-6">
        <PullToRefresh>
          {/* ממתין/ה לאישור: אין גישה לתוכן הקהילה, כולל ניווט בין
              עמודים — לפני שמנהלת אישרה, אין כלום לנווט אליו בכל מקרה. */}
          {viewer.status === "pending" ? (
            <div className="flex flex-1 items-center pt-10">
              <Card className="space-y-4 text-center">
                <h1 className="font-[family-name:var(--font-display)] text-xl font-bold">
                  עוד רגע אתם איתנו במים
                </h1>
                <p className="text-sm leading-relaxed text-(--color-ink-soft)">
                  ההרשמה שלכם התקבלה. תנו לנו רגע לעבור עליה, וברגע
                  שתאושרו תוכלו להיכנס ולגלות את המפגשים הקרובים.
                </p>
                <form action="/auth/signout" method="post">
                  <Button type="submit" variant="ghost" className="w-full">
                    התנתקות
                  </Button>
                </form>
              </Card>
            </div>
          ) : viewer.status === null ? (
            // הוסרו מהקהילה, או עזבו בעצמם — club_members כבר לא קיימת,
            // אבל החשבון עדיין מחובר. בלי המסך הזה כל שאר העמודים
            // מניחים viewer.club לא ריק ומתרסקים.
            <div className="flex flex-1 items-center pt-10">
              <Card className="space-y-4 text-center">
                <h1 className="font-[family-name:var(--font-display)] text-xl font-bold">
                  כבר לא חלק מהקהילה
                </h1>
                <p className="text-sm leading-relaxed text-(--color-ink-soft)">
                  החשבון הזה כבר לא חבר בקהילה. אם זה לא צפוי, פנו למנהלת
                  הקהילה.
                </p>
                <form action="/auth/signout" method="post">
                  <Button type="submit" variant="ghost" className="w-full">
                    התנתקות
                  </Button>
                </form>
              </Card>
            </div>
          ) : (
            <>
              <NotificationPromptBanner />
              {children}
            </>
          )}
        </PullToRefresh>
      </main>

      {viewer.status !== "pending" && viewer.status !== null && (
        <AppNav
          isOrganizer={viewer.role === "organizer"}
          clubId={viewer.club?.id ?? null}
        />
      )}
    </div>
  );
}
