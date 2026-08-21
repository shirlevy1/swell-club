import Link from "next/link";
import { redirect } from "next/navigation";
import {
  getViewer,
  getAdminData,
  getPendingMembers,
  getPendingEventPhotos,
  type PendingEventPhoto,
} from "@/lib/data";
import { formatDateTime, formatPhone, normalizeInstagram } from "@/lib/format";
import { checkInWindow } from "@/lib/checkin";
import { facePositionStyle } from "@/lib/face-position";
import { Card, EmptyState, LinkButton, PageHeader } from "@/components/ui";
import { ExportButton } from "@/components/export-button";
import { PendingMemberRow } from "@/components/pending-member-row";
import { PendingPhotoGroup } from "@/components/pending-photo-group";
import { AdminLiveRefresh } from "@/components/admin-live-refresh";

/** מקבצת לפי מפגש, ובתוך כל מפגש לפי מי שהעלה — כדי שערימת התמונות
 * של אדם אחד ממפגש אחד תאושר בלחיצה אחת, במקום תמונה-תמונה. */
function groupPendingPhotos(photos: PendingEventPhoto[]) {
  const eventOrder: string[] = [];
  const events = new Map<
    string,
    {
      eventId: string;
      eventTitle: string;
      eventStartsAt: string;
      uploaderOrder: string[];
      uploaders: Map<string, { uploaderName: string; photos: PendingEventPhoto[] }>;
    }
  >();

  for (const photo of photos) {
    let event = events.get(photo.eventId);
    if (!event) {
      event = {
        eventId: photo.eventId,
        eventTitle: photo.eventTitle,
        eventStartsAt: photo.eventStartsAt,
        uploaderOrder: [],
        uploaders: new Map(),
      };
      events.set(photo.eventId, event);
      eventOrder.push(photo.eventId);
    }
    let uploader = event.uploaders.get(photo.uploaderId);
    if (!uploader) {
      uploader = { uploaderName: photo.uploaderName, photos: [] };
      event.uploaders.set(photo.uploaderId, uploader);
      event.uploaderOrder.push(photo.uploaderId);
    }
    uploader.photos.push(photo);
  }

  return eventOrder.map((eventId) => {
    const event = events.get(eventId)!;
    return {
      eventId: event.eventId,
      eventTitle: event.eventTitle,
      eventStartsAt: event.eventStartsAt,
      uploaderGroups: event.uploaderOrder.map((uploaderId) => ({
        uploaderId,
        ...event.uploaders.get(uploaderId)!,
      })),
    };
  });
}

function InstagramGlyph() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      className="size-3 shrink-0"
      aria-hidden
    >
      <rect x="2.5" y="2.5" width="19" height="19" rx="5.5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.6" cy="6.4" r="1.2" fill="currentColor" />
    </svg>
  );
}

export default async function AdminPage() {
  const viewer = await getViewer();
  if (!viewer?.club || viewer.role !== "organizer") redirect("/events");

  const { events, members } = await getAdminData(viewer.club.id);
  const pendingMembers = await getPendingMembers(viewer.club.id);
  const pendingPhotos = await getPendingEventPhotos(viewer.club.id);
  const pendingPhotosByEvent = groupPendingPhotos(pendingPhotos);

  // המכנה של אחוז ההגעה הוא מפגשים שכבר **אפשר היה** לסמן בהם נוכחות,
  // כלומר שחלון הצ'ק־אין שלהם נפתח — ולא רק מפגשים שהסתיימו. אחרת מי
  // שסימן הגעה למפגש שנפתח עכשיו מקבל "3 מתוך 2".
  const heldCount = events.filter(
    (e) => checkInWindow(e).status !== "before",
  ).length;

  const csv = [
    ["שם", "טלפון", "אינסטגרם", "מפגשים", "אחוז הגעה"],
    ...members.map((m) => [
      m.profile.full_name,
      formatPhone(m.profile.phone) ?? "",
      // מנורמל: בטופס אנשים הכניסו גם קישורים מלאים וגם שמות משתמש
      normalizeInstagram(m.profile.instagram) ?? "",
      String(m.attendedCount),
      `${heldCount ? Math.round((m.attendedCount / heldCount) * 100) : 0}%`,
    ]),
  ];

  return (
    <div className="space-y-8">
      <AdminLiveRefresh clubId={viewer.club.id} />

      <PageHeader
        title="ניהול"
        subtitle={[
          members.length === 1 ? "חבר אחד" : `${members.length} חברים`,
          events.length === 1 ? "מפגש אחד" : `${events.length} מפגשים`,
        ].join(" · ")}
        action={
          <LinkButton href="/admin/events/new" className="min-h-10 px-4 text-sm">
            מפגש חדש
          </LinkButton>
        }
      />

      {pendingMembers.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-xs font-bold tracking-[0.2em] text-(--color-sea)">
            {pendingMembers.length === 1
              ? "בקשת הצטרפות אחת ממתינה"
              : `${pendingMembers.length} בקשות הצטרפות ממתינות`}
          </h2>
          <Card className="divide-y divide-(--color-line)/50 p-0">
            {pendingMembers.map((m) => (
              <PendingMemberRow
                key={m.profileId}
                profileId={m.profileId}
                fullName={m.fullName}
              />
            ))}
          </Card>
        </section>
      )}

      {pendingPhotos.length > 0 && (
        <section className="space-y-4">
          <h2 className="text-xs font-bold tracking-[0.2em] text-(--color-sea)">
            {pendingPhotos.length === 1
              ? "תמונה אחת ממתינה לאישור"
              : `${pendingPhotos.length} תמונות ממתינות לאישור`}
          </h2>
          <div className="space-y-4">
            {pendingPhotosByEvent.map((event) => (
              <div key={event.eventId} className="space-y-2">
                <div className="flex items-baseline justify-between gap-2">
                  <Link
                    href={`/events/${event.eventId}`}
                    className="truncate text-sm font-bold text-(--color-sea) hover:underline"
                  >
                    {event.eventTitle}
                  </Link>
                  <p className="ltr-nums shrink-0 text-xs text-(--color-ink-faint)">
                    {formatDateTime(event.eventStartsAt)}
                  </p>
                </div>
                <div className="space-y-2">
                  {event.uploaderGroups.map((group) => (
                    <PendingPhotoGroup
                      key={group.uploaderId}
                      eventId={event.eventId}
                      uploaderId={group.uploaderId}
                      uploaderName={group.uploaderName}
                      photos={group.photos}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="space-y-3">
        <h2 className="text-xs font-bold tracking-[0.2em] text-(--color-sea)">
          מפגשים
        </h2>
        {events.length === 0 ? (
          <EmptyState
            title="עוד אין מפגשים"
            body="פתחו מפגש ראשון והקהילה תראה אותו מיד."
          />
        ) : (
          <ul className="space-y-3">
            {events.map((event) => (
              <li key={event.id}>
                <Link href={`/events/${event.id}`}>
                  <Card className="space-y-3 transition hover:border-(--color-line)">
                    <div>
                      <p className="font-[family-name:var(--font-display)] text-lg font-bold">
                        {event.title}
                      </p>
                      <p className="text-xs text-(--color-ink-faint)">
                        {formatDateTime(event.starts_at)}
                      </p>
                    </div>
                    <div className="flex gap-6">
                      <div>
                        <p className="ltr-nums text-2xl font-bold text-(--color-ink-soft)">
                          {event.goingCount}
                        </p>
                        <p className="text-[0.7rem] text-(--color-ink-faint)">
                          סימנו שיגיעו
                        </p>
                      </div>
                      <div>
                        <p className="ltr-nums text-2xl font-bold text-(--color-verified)">
                          {event.cameCount}
                        </p>
                        <p className="text-[0.7rem] text-(--color-ink-faint)">
                          הגיעו בפועל
                        </p>
                      </div>
                    </div>
                  </Card>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-bold tracking-[0.2em] text-(--color-ink-faint)">
            חברי הקהילה
          </h2>
          <ExportButton rows={csv} filename="swell-members.csv" />
        </div>

        <Card className="divide-y divide-(--color-line)/50 p-0">
          {members.map((m) => (
            <Link
              key={m.profile.id}
              href={`/admin/members/${m.profile.id}`}
              className="flex items-center justify-between gap-3 px-4 py-3 transition hover:bg-(--color-haze)/60"
            >
              {/* פנים ברשימה — המנהלת מזהה אנשים ככה, לא לפי שם */}
              <div className="size-11 shrink-0 overflow-hidden rounded-full border border-(--color-line) bg-(--color-haze)">
                {m.latestSelfieUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={m.latestSelfieUrl}
                    alt={m.profile.full_name}
                    className="size-full object-cover"
                    loading="lazy"
                    style={facePositionStyle(m.latestFaceX, m.latestFaceY)}
                  />
                ) : null}
              </div>

              <div className="min-w-0 flex-1 space-y-0.5">
                <p className="truncate text-sm font-semibold">
                  {m.profile.full_name}
                </p>
                <p
                  dir="ltr"
                  className="truncate text-start text-xs text-(--color-ink-faint)"
                >
                  {formatPhone(m.profile.phone) ?? "—"}
                </p>
                {/* טקסט ולא קישור: השורה כולה כבר עוגן, ועוגן בתוך
                    עוגן אינו HTML תקין. הקישור עצמו בעמוד החבר. */}
                {normalizeInstagram(m.profile.instagram) ? (
                  <p
                    dir="ltr"
                    className="flex items-center gap-1 text-start text-xs font-semibold text-(--color-sea)"
                  >
                    <InstagramGlyph />@{normalizeInstagram(m.profile.instagram)}
                  </p>
                ) : (
                  <p className="text-xs text-(--color-ink-faint)">
                    בלי אינסטגרם
                  </p>
                )}
              </div>
              <span className="ltr-nums shrink-0 text-sm font-bold text-(--color-ink-soft)">
                {m.attendedCount}
                <span className="text-(--color-ink-faint)">/{heldCount}</span>
              </span>
            </Link>
          ))}
        </Card>
      </section>
    </div>
  );
}
