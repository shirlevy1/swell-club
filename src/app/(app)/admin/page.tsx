import Link from "next/link";
import { redirect } from "next/navigation";
import {
  getViewer,
  getAdminData,
  getPendingMembers,
  getPendingEventPhotos,
  splitAdminEvents,
  type PendingEventPhoto,
} from "@/lib/data";
import {
  getAdminMembersReportAction,
  getAdminEventsReportAction,
  getAdminAttendanceMatrixReportAction,
} from "@/lib/actions";
import { EmptyState, LinkButton, PageHeader } from "@/components/ui";
import { ExportButton } from "@/components/export-button";
import { AdminEventCard } from "@/components/admin-event-card";
import { PendingMembersCard } from "@/components/pending-member-row";
import { MemberSearchList } from "@/components/member-search-list";
import { PendingPhotosSection } from "@/components/pending-photo-group";
import { AdminLiveRefresh } from "@/components/admin-live-refresh";
import { ChartIcon } from "@/components/social-icons";

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

export default async function AdminPage() {
  const viewer = await getViewer();
  if (!viewer?.club || viewer.role !== "organizer") redirect("/events");

  // שלוש שאילתות בלתי-תלויות זו בזו — בבת אחת, לא ברצף
  const [{ events, members }, pendingMembers, pendingPhotos] =
    await Promise.all([
      getAdminData(viewer.club.id),
      getPendingMembers(viewer.club.id),
      getPendingEventPhotos(viewer.club.id),
    ]);
  const pendingPhotosByEvent = groupPendingPhotos(pendingPhotos);

  // מפגשים שהיו: רק האחרון שבהם מוצג כאן (לא כל ההיסטוריה) + קישור
  // לעמוד ההיסטוריה הנפרד (admin/events/history), כדי שגלילת הניהול
  // לא תתארך ככל שיצטברו מפגשים. אותו עיקרון בדיוק כמו עמוד "מפגשים"
  // הרגיל (events/page.tsx), רק עם כרטיס אחד בלבד במקום 3.
  const { upcoming: upcomingEvents, pastAll: pastEventsAll } =
    splitAdminEvents(events);
  const mostRecentPastEvent = [...pastEventsAll].sort((a, b) =>
    b.starts_at.localeCompare(a.starts_at),
  )[0];

  return (
    <div className="space-y-8">
      <AdminLiveRefresh clubId={viewer.club.id} />

      <PageHeader
        title="ניהול"
        subtitle={
          <>
            {members.length === 1 ? (
              "חבר אחד"
            ) : (
              <>
                <span className="ltr-nums">{members.length}</span> חברים
              </>
            )}{" "}
            ·{" "}
            {events.length === 1 ? (
              "מפגש אחד"
            ) : (
              <>
                <span className="ltr-nums">{events.length}</span> מפגשים
              </>
            )}
          </>
        }
        action={
          <div className="flex shrink-0 gap-2">
            <Link
              href="/admin/insights"
              aria-label="תובנות"
              className="flex size-12 shrink-0 items-center justify-center rounded-xl border border-(--color-line) bg-(--color-surface) text-(--color-sea) transition hover:border-(--color-sea)/50 hover:bg-(--color-sea)/10"
            >
              <ChartIcon className="size-5" />
            </Link>
            <LinkButton href="/admin/events/new" className="min-h-10 px-4 text-sm">
              מפגש חדש
            </LinkButton>
          </div>
        }
      />

      {pendingMembers.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-xs font-bold tracking-[0.2em] text-(--color-sea)">
            {pendingMembers.length === 1 ? (
              "בקשת הצטרפות אחת ממתינה"
            ) : (
              <>
                <span className="ltr-nums">{pendingMembers.length}</span>{" "}
                בקשות הצטרפות ממתינות
              </>
            )}
          </h2>
          <PendingMembersCard members={pendingMembers} clubId={viewer.club.id} />
        </section>
      )}

      {pendingPhotos.length > 0 && (
        <section id="pending-photos" className="space-y-4 scroll-mt-20">
          <h2 className="text-xs font-bold tracking-[0.2em] text-(--color-sea)">
            {pendingPhotos.length === 1
              ? "תמונה אחת ממתינה לאישור"
              : `${pendingPhotos.length} תמונות ממתינות לאישור`}
          </h2>
          <PendingPhotosSection photosByEvent={pendingPhotosByEvent} clubId={viewer.club.id} />
        </section>
      )}

      <section id="events" className="space-y-3 scroll-mt-20">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-bold tracking-[0.2em] text-(--color-sea)">
            מפגשים קרובים ·{" "}
            <span className="ltr-nums">{upcomingEvents.length}</span>
          </h2>
          {events.length > 0 && (
            <ExportButton
              action={getAdminEventsReportAction}
              filename="swell-events.csv"
              label="מפגשים"
            />
          )}
        </div>
        {events.length === 0 ? (
          <EmptyState
            title="עוד אין מפגשים"
            body="פתחו מפגש ראשון והקהילה תראה אותו מיד."
          />
        ) : upcomingEvents.length === 0 ? (
          <p className="text-sm text-(--color-ink-faint)">
            אין מפגשים קרובים מתוכננים כרגע.
          </p>
        ) : (
          <ul className="space-y-3">
            {upcomingEvents.map((event) => (
              <li key={event.id}>
                <AdminEventCard event={event} eventLinkQuery="from=admin" />
              </li>
            ))}
          </ul>
        )}
      </section>

      {pastEventsAll.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-xs font-bold tracking-[0.2em] text-(--color-ink-faint)">
            מפגשים שהיו ·{" "}
            <span className="ltr-nums">{pastEventsAll.length}</span>
          </h2>
          {mostRecentPastEvent && (
            <AdminEventCard event={mostRecentPastEvent} eventLinkQuery="from=admin" />
          )}
          <Link
            href="/admin/events/history"
            className="block text-center text-sm font-semibold text-(--color-sea)"
          >
            כל המפגשים שהיו
          </Link>
        </section>
      )}

      <section id="members" className="space-y-3 scroll-mt-20">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-bold tracking-[0.2em] text-(--color-ink-faint)">
            חברי הקהילה · <span className="ltr-nums">{members.length}</span>
          </h2>
          {members.length > 0 && (
            <div className="flex items-center gap-2">
              <ExportButton
                action={getAdminAttendanceMatrixReportAction}
                filename="swell-attendance-matrix.csv"
                label="הגעה"
              />
              <ExportButton
                action={getAdminMembersReportAction}
                filename="swell-members.csv"
                label="חברים"
              />
            </div>
          )}
        </div>

        {members.length === 0 ? (
          <EmptyState
            title="עוד אין חברי קהילה"
            body="כשמישהו יצטרף לקהילה, הוא יופיע כאן."
          />
        ) : (
          <MemberSearchList
            members={members}
            backFrom="admin-members-section"
            whenEmpty={
              <Link
                href="/admin/members"
                className="block text-center text-sm font-semibold text-(--color-sea)"
              >
                כל חברי הקהילה
              </Link>
            }
          />
        )}
      </section>
    </div>
  );
}
