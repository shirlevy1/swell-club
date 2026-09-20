import Link from "next/link";
import { redirect } from "next/navigation";
import {
  getViewer,
  getSelfieHistory,
  getEventPhotoCollages,
} from "@/lib/data";
import { demoMode } from "@/lib/config";
import { attendanceStreak } from "@/lib/streak";
import { StreakCard } from "@/components/streak-card";
import { SelfieHistory, SelfieAvatarButton } from "@/components/selfie-history";
import {
  swimLevelLabel,
  SWIM_LEVEL_COLOR,
  swimLevelBadgeStyle,
} from "@/lib/swim-level";
import { EditIcon, WaveIcon } from "@/components/social-icons";
import { LeaveCommunityButton } from "@/components/leave-community-button";
import { SignOutButton } from "@/components/sign-out-button";

export default async function ProfilePage() {
  const viewer = await getViewer();
  if (!viewer) redirect("/login");

  // שתי שאילתות בלתי-תלויות זו בזו — בבת אחת, לא ברצף. אלבומי
  // התמונות דווקא כן תלויים ב-shots (צריך את מזהי המפגשים שלהם),
  // ולכן נשארים אחרי, לא בתוך אותה קבוצה.
  const shots = await getSelfieHistory(viewer.userId);
  const count = shots.length;
  const albumsByEvent = await getEventPhotoCollages(shots.map((s) => s.eventId));
  // הנוכחויות כבר כאן — אין צורך בשאילתה נוספת בשביל הרצף
  const streak = attendanceStreak(shots.map((s) => s.startsAt));
  const fullName = viewer.profile?.full_name ?? "חבר קהילה";

  return (
    <div className="space-y-7">
      <header className="flex items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-4">
          <SelfieAvatarButton
            shots={shots}
            fullName={fullName}
            className="flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-full border border-(--color-line) bg-(--color-haze)"
          />
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
              {count === 0
                ? "עוד לא הייתם איתנו באף מפגש"
                : count === 1
                  ? "הייתם איתנו במפגש אחד"
                  : (
                      <>
                        הייתם איתנו ב־<span className="ltr-nums">{count}</span>{" "}
                        מפגשים
                      </>
                    )}
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

      <StreakCard streak={streak} gender={viewer.profile?.gender ?? null} />

      <section className="space-y-3">
        <div className="space-y-0.5">
          <h2 className="text-xs font-bold tracking-[0.2em] text-(--color-sea)">
            הרגעים מהסוואל
          </h2>
          <p className="text-xs text-(--color-ink-faint)">
            רגעים מהמפגשים שהייתם בהם איתנו.
          </p>
        </div>
        <SelfieHistory
          shots={shots}
          albumsByEvent={albumsByEvent}
          eventLinkQuery="from=profile"
        />
      </section>

      <p className="text-center text-xs leading-relaxed text-(--color-ink-faint)">
        הפרטים שלכם גלויים רק למי שהיה איתכם במים.
      </p>

      {!demoMode && <SignOutButton />}

      {/* מנהלת לא יכולה לעזוב ככה — קהילה בלי אף מנהלת נעולה לגמרי.
          נאכף שוב בשרת ב-leave_community(). */}
      {viewer.role !== "organizer" && <LeaveCommunityButton />}
    </div>
  );
}
