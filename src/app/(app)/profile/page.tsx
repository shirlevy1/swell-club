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
import { StreakCard, WaveIcon } from "@/components/streak-card";
import { SelfieHistory } from "@/components/selfie-history";
import { facePositionStyle } from "@/lib/face-position";
import {
  swimLevelLabel,
  SWIM_LEVEL_COLOR,
  swimLevelBadgeStyle,
} from "@/lib/swim-level";
import { monthAttendanceLine } from "@/lib/attendance-text";
import { EditIcon } from "@/components/social-icons";
import { Button } from "@/components/ui";

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
            <div className="flex items-center gap-2">
              <h1 className="truncate font-[family-name:var(--font-display)] text-2xl font-bold">
                {fullName}
              </h1>
              {viewer.profile?.swim_level && (
                <span
                  className="flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-sm font-semibold text-(--color-ink)"
                  style={swimLevelBadgeStyle(viewer.profile.swim_level)}
                >
                  <WaveIcon
                    className="size-3.5"
                    style={{
                      color: SWIM_LEVEL_COLOR[viewer.profile.swim_level],
                    }}
                  />
                  {swimLevelLabel(viewer.profile.swim_level)}
                </span>
              )}
            </div>
            <p className="text-sm text-(--color-ink-soft)">
              {monthStats
                ? monthAttendanceLine(
                    "הייתם איתנו",
                    monthStats.attended,
                    monthStats.total,
                  )
                : count === 0
                  ? "עוד לא הייתם איתנו באף מפגש"
                  : count === 1
                    ? "הייתם איתנו במפגש אחד"
                    : `הייתם איתנו ב־${count} מפגשים`}
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

      {count > 0 && (
        <section className="space-y-3">
          <div className="space-y-0.5">
            <h2 className="text-xs font-bold tracking-[0.2em] text-(--color-sea)">
              הרגעים מהסוואל
            </h2>
            <p className="text-xs text-(--color-ink-faint)">
              רגעים מהמפגשים שהייתם בהם איתנו.
            </p>
          </div>
          <SelfieHistory shots={shots} albumsByEvent={albumsByEvent} />
        </section>
      )}

      <p className="text-center text-xs leading-relaxed text-(--color-ink-faint)">
        הפרטים שלכם גלויים רק למי שהיה איתכם במים.
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
