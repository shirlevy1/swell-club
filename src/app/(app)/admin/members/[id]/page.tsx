import { notFound, redirect } from "next/navigation";
import {
  getViewer,
  getMemberProfile,
  getSelfieHistory,
  getEventPhotoCollages,
  getRecentMonthStats,
} from "@/lib/data";
import { instagramUrl, whatsappUrl, byGender } from "@/lib/format";
import { monthAttendanceLine } from "@/lib/attendance-text";
import { BackLink, Card } from "@/components/ui";
import { SelfieHistory } from "@/components/selfie-history";
import { facePositionStyle } from "@/lib/face-position";
import {
  swimLevelLabel,
  SWIM_LEVEL_COLOR,
  swimLevelBadgeStyle,
} from "@/lib/swim-level";
import { WaveIcon } from "@/components/streak-card";
import { WhatsAppIcon, InstagramIcon } from "@/components/social-icons";

export default async function AdminMemberPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const viewer = await getViewer();
  if (!viewer?.club || viewer.role !== "organizer") redirect("/events");

  const [profile, shots] = await Promise.all([
    getMemberProfile(id),
    getSelfieHistory(id),
  ]);
  if (!profile) notFound();
  const [albumsByEvent, monthStats] = await Promise.all([
    getEventPhotoCollages(shots.map((s) => s.eventId)),
    getRecentMonthStats(viewer.club.id, id),
  ]);

  const ig = instagramUrl(profile.instagram);
  const wa = whatsappUrl(profile.phone);

  return (
    <div className="space-y-6">
      <BackLink href="/admin">לניהול</BackLink>

      <header className="flex items-center gap-4">
        <div className="size-16 shrink-0 overflow-hidden rounded-full border border-(--color-line) bg-(--color-haze)">
          {shots[0]?.selfieUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={shots[0].selfieUrl}
              alt={profile.full_name}
              className="size-full object-cover"
              style={facePositionStyle(shots[0].faceX, shots[0].faceY)}
            />
          ) : null}
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="truncate font-[family-name:var(--font-display)] text-2xl font-bold">
              {profile.full_name}
            </h1>
            {profile.swim_level && (
              <span
                className="flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-sm font-semibold text-(--color-ink)"
                style={swimLevelBadgeStyle(profile.swim_level)}
              >
                <WaveIcon
                  className="size-3.5"
                  style={{ color: SWIM_LEVEL_COLOR[profile.swim_level] }}
                />
                {swimLevelLabel(profile.swim_level)}
              </span>
            )}
          </div>
          <p className="text-sm text-(--color-ink-soft)">
            {monthAttendanceLine(
              byGender(profile.gender, "היה איתנו", "הייתה איתנו"),
              monthStats.attended,
              monthStats.total,
            )}
          </p>
        </div>
      </header>

      {(wa || ig) && (
        <Card className="flex gap-2">
          {wa && (
            <a
              href={wa}
              target="_blank"
              rel="noreferrer"
              className="flex h-11 flex-1 items-center justify-center gap-2 rounded-xl border border-(--color-line) bg-(--color-haze) text-sm font-semibold text-(--color-verified) transition hover:border-(--color-verified)/50 hover:bg-(--color-verified)/10"
            >
              <WhatsAppIcon className="size-4" />
              וואטסאפ
            </a>
          )}
          {ig && (
            <a
              href={ig}
              target="_blank"
              rel="noreferrer"
              className="flex h-11 flex-1 items-center justify-center gap-2 rounded-xl border border-(--color-line) bg-(--color-haze) text-sm font-semibold text-(--color-sea) transition hover:border-(--color-sea)/50 hover:bg-(--color-sea)/10"
            >
              <InstagramIcon className="size-4" />
              אינסטגרם
            </a>
          )}
        </Card>
      )}

      <section className="space-y-3">
        <div className="space-y-0.5">
          <h2 className="text-xs font-bold tracking-[0.2em] text-(--color-sea)">
            הסוואל המשותף שלכם
          </h2>
          <p className="text-xs text-(--color-ink-faint)">
            רגעים מהמפגשים שהייתם בהם ביחד.
          </p>
        </div>
        <SelfieHistory shots={shots} albumsByEvent={albumsByEvent} />
      </section>
    </div>
  );
}
