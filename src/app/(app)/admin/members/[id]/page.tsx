import { notFound, redirect } from "next/navigation";
import {
  getViewer,
  getMemberProfile,
  getSelfieHistory,
  getEventPhotoCollages,
} from "@/lib/data";
import { instagramUrl, whatsappUrl } from "@/lib/format";
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
  const albumsByEvent = await getEventPhotoCollages(shots.map((s) => s.eventId));

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
        <div className="min-w-0 space-y-1">
          <h1 className="truncate font-[family-name:var(--font-display)] text-2xl font-bold">
            {profile.full_name}
          </h1>
          {profile.swim_level && (
            <span
              className="flex w-fit shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-sm font-semibold text-(--color-ink)"
              style={swimLevelBadgeStyle(profile.swim_level)}
            >
              <WaveIcon
                className="size-3.5"
                style={{ color: SWIM_LEVEL_COLOR[profile.swim_level] }}
              />
              {swimLevelLabel(profile.swim_level)}
            </span>
          )}
          <p className="text-sm text-(--color-ink-soft)">
            {shots.length === 0
              ? "עוד לא נכח במפגש"
              : shots.length === 1
                ? "נכח במפגש אחד"
                : `נכח ב־${shots.length} מפגשים`}
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
            כל הסלפים
          </h2>
          <p className="text-xs text-(--color-ink-faint)">
            כל צ׳ק־אין מוסיף תמונה. ככה מזהים מי זה מי.
          </p>
        </div>
        <SelfieHistory shots={shots} albumsByEvent={albumsByEvent} />
      </section>
    </div>
  );
}
