import { notFound, redirect } from "next/navigation";
import {
  getViewer,
  getMemberProfile,
  getSelfieHistory,
  getEventPhotoCollages,
} from "@/lib/data";
import {
  formatPhone,
  instagramUrl,
  normalizeInstagram,
  whatsappUrl,
} from "@/lib/format";
import { BackLink, Card } from "@/components/ui";
import { SelfieHistory } from "@/components/selfie-history";

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
            />
          ) : null}
        </div>
        <div className="min-w-0">
          <h1 className="truncate font-[family-name:var(--font-display)] text-2xl font-bold">
            {profile.full_name}
          </h1>
          <p className="text-sm text-(--color-ink-soft)">
            {shots.length === 0
              ? "עוד לא נכח במפגש"
              : shots.length === 1
                ? "נכח במפגש אחד"
                : `נכח ב־${shots.length} מפגשים`}
          </p>
        </div>
      </header>

      <Card className="space-y-3">
        <Row label="טלפון">
          {wa ? (
            <a
              href={wa}
              target="_blank"
              rel="noreferrer"
              dir="ltr"
              className="font-semibold text-(--color-sea) hover:underline"
            >
              {formatPhone(profile.phone)}
            </a>
          ) : (
            <span className="text-(--color-ink-faint)">—</span>
          )}
        </Row>
        <Row label="אינסטגרם">
          {ig ? (
            <a
              href={ig}
              target="_blank"
              rel="noreferrer"
              dir="ltr"
              className="font-semibold text-(--color-sea) hover:underline"
            >
              @{normalizeInstagram(profile.instagram)}
            </a>
          ) : (
            <span className="text-(--color-ink-faint)">—</span>
          )}
        </Row>
      </Card>

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

function Row({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-baseline justify-between gap-3 text-sm">
      <span className="text-(--color-ink-faint)">{label}</span>
      {children}
    </div>
  );
}
