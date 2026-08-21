import Link from "next/link";
import { redirect } from "next/navigation";
import {
  getViewer,
  getSelfieHistory,
  getEventPhotoCollages,
  getRecentMonthStats,
} from "@/lib/data";
import { demoMode } from "@/lib/config";
import { attendanceStreak } from "@/lib/streak";
import { StreakCard } from "@/components/streak-card";
import { NotificationToggle } from "@/components/notification-toggle";
import { SelfieHistory } from "@/components/selfie-history";
import { facePositionStyle } from "@/lib/face-position";
import { Button } from "@/components/ui";

function EditIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
    </svg>
  );
}

/**
 * "היית איתנו ב-Y מפגשים מתוך X מפגשים שהיו החודש" — יחיד/רבים נפרד
 * לכל אחד מהמספרים בנפרד ("מפגש אחד" / "שהיה" מול "X מפגשים" / "שהיו"),
 * כמו בשאר האפליקציה. "היית" זהה בכתיב לזכר ולנקבה — אין צורך בפיצול
 * מגדרי כאן.
 *
 * "החודש" הוא חלון נגלל של 30 יום אחורה מעכשיו (למשל 17.7–16.8 כולל),
 * לא חודש קלנדרי — ראו getRecentMonthStats ב-lib/data.ts.
 */
function monthAttendanceLine(attended: number, total: number) {
  if (total === 0) return "לא היו מפגשים החודש";
  return (
    <>
      היית איתנו ב־
      {attended === 1 ? (
        "מפגש אחד"
      ) : (
        <>
          <span className="ltr-nums">{attended}</span> מפגשים
        </>
      )}{" "}
      מתוך{" "}
      {total === 1 ? (
        "מפגש אחד שהיה"
      ) : (
        <>
          <span className="ltr-nums">{total}</span> מפגשים שהיו
        </>
      )}{" "}
      החודש
    </>
  );
}

export default async function ProfilePage() {
  const viewer = await getViewer();
  if (!viewer) redirect("/login");

  const shots = await getSelfieHistory(viewer.userId);
  const count = shots.length;
  const albumsByEvent = await getEventPhotoCollages(shots.map((s) => s.eventId));
  // הנוכחויות כבר כאן — אין צורך בשאילתה נוספת בשביל הרצף
  const streak = attendanceStreak(shots.map((s) => s.startsAt));
  const monthStats = viewer.club
    ? await getRecentMonthStats(viewer.club.id, viewer.userId)
    : null;
  const fullName = viewer.profile?.full_name ?? "הפרופיל שלי";
  // הסלפי האחרון שלך — shots כבר ממוינים מהאחרון לראשון
  const latestSelfie = shots[0]?.selfieUrl ?? null;
  const latestSelfiePosition = facePositionStyle(
    shots[0]?.faceX ?? null,
    shots[0]?.faceY ?? null,
  );

  return (
    <div className="space-y-7">
      <header className="flex items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-4">
          <div className="flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-full border border-(--color-line) bg-(--color-haze)">
            {latestSelfie ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={latestSelfie}
                alt={fullName}
                className="size-full object-cover"
                style={latestSelfiePosition}
              />
            ) : (
              <span
                aria-hidden
                className="font-[family-name:var(--font-display)] text-2xl font-bold text-(--color-sea)"
              >
                {fullName.trim()[0]}
              </span>
            )}
          </div>
          <div className="min-w-0">
            <h1 className="truncate font-[family-name:var(--font-display)] text-2xl font-bold">
              {fullName}
            </h1>
            <p className="text-sm text-(--color-ink-soft)">
              {monthStats
                ? monthAttendanceLine(monthStats.attended, monthStats.total)
                : count === 0
                  ? "עוד לא היית איתנו באף מפגש"
                  : count === 1
                    ? "היית איתנו במפגש אחד"
                    : `היית איתנו ב־${count} מפגשים`}
            </p>
          </div>
        </div>

        {viewer.profile && (
          <Link
            href="/profile/edit"
            aria-label="עריכת פרופיל"
            className="flex size-11 shrink-0 items-center justify-center rounded-full border border-(--color-line) bg-(--color-surface) text-(--color-sea) transition hover:border-(--color-sea)/50 hover:bg-(--color-sea)/10"
          >
            <EditIcon className="size-5" />
          </Link>
        )}
      </header>

      {count > 0 && (
        <StreakCard streak={streak} gender={viewer.profile?.gender ?? null} />
      )}

      <NotificationToggle />

      {count > 0 && (
        <section className="space-y-3">
          <div className="space-y-0.5">
            <h2 className="text-xs font-bold tracking-[0.2em] text-(--color-sea)">
              הרגעים מהסוואל
            </h2>
            <p className="text-xs text-(--color-ink-faint)">
              רגעים מהמפגשים שהיית בהם איתנו.
            </p>
          </div>
          <SelfieHistory shots={shots} albumsByEvent={albumsByEvent} />
        </section>
      )}

      <p className="text-center text-xs leading-relaxed text-(--color-ink-faint)">
        הפרטים שלך גלויים רק למי שהיה איתך במים.
      </p>

      {!demoMode && (
        <form action="/auth/signout" method="post">
          <Button type="submit" variant="ghost" className="w-full">
            התנתקות
          </Button>
        </form>
      )}
    </div>
  );
}
