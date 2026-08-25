import Link from "next/link";
import { redirect } from "next/navigation";
import {
  getViewer,
  getAdminData,
  getPendingMembers,
  getPendingEventPhotos,
  type PendingEventPhoto,
} from "@/lib/data";
import {
  ageInYears,
  formatDateTime,
  formatPhone,
  instagramUrl,
  normalizeInstagram,
  whatsappUrl,
} from "@/lib/format";
import { checkInWindow } from "@/lib/checkin";
import { facePositionStyle } from "@/lib/face-position";
import {
  swimLevelLabel,
  SWIM_LEVEL_COLOR,
  swimLevelBadgeStyle,
} from "@/lib/swim-level";
import { WaveIcon } from "@/components/streak-card";
import { InstagramIcon, WhatsAppIcon } from "@/components/social-icons";
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
                ageYears={m.ageYears}
                phone={m.phone}
                instagram={m.instagram}
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
            {events.map((event) => {
              const femalePercent =
                event.cameCount > 0
                  ? Math.round((event.femaleCame / event.cameCount) * 100)
                  : 0;
              const malePercent =
                event.cameCount > 0
                  ? Math.round((event.maleCame / event.cameCount) * 100)
                  : 0;

              return (
                <li key={event.id}>
                  <Link href={`/events/${event.id}`}>
                    <Card className="space-y-4 transition hover:border-(--color-line)">
                      <div>
                        <p className="font-[family-name:var(--font-display)] text-lg font-bold">
                          {event.title}
                        </p>
                        <p className="text-xs text-(--color-ink-faint)">
                          {formatDateTime(event.starts_at)}
                        </p>
                      </div>
                      {/* שתי קבוצות — "כמה" ו"מי" — מופרדות בקו דק, לא
                          חמש עמודות דחוסות. סדר ה-DOM הפוך מסדר התצוגה
                          במכוון: איבר ראשון נופל מימין ב-RTL, ולכן כדי
                          לקבל משמאל לימין "הגיעו בפועל, סימנו שיגיעו,
                          נשים, גברים" הם נכתבים כאן בסדר הפוך. */}
                      <div className="flex items-center gap-4">
                        <div className="flex flex-1 gap-4">
                          <div className="flex-1">
                            <p className="ltr-nums text-2xl font-bold text-(--color-deep)">
                              {malePercent}%
                            </p>
                            <p className="text-[0.7rem] text-(--color-ink-faint)">
                              גברים
                            </p>
                          </div>
                          <div className="flex-1">
                            <p className="ltr-nums text-2xl font-bold text-(--color-sea)">
                              {femalePercent}%
                            </p>
                            <p className="text-[0.7rem] text-(--color-ink-faint)">
                              נשים
                            </p>
                          </div>
                        </div>

                        <div className="h-9 w-px shrink-0 bg-(--color-line)" />

                        <div className="flex flex-1 gap-4">
                          <div className="flex-1">
                            <p className="ltr-nums text-2xl font-bold text-(--color-ink-soft)">
                              {event.goingCount}
                            </p>
                            <p className="text-[0.7rem] text-(--color-ink-faint)">
                              סימנו שיגיעו
                            </p>
                          </div>
                          <div className="flex-1">
                            <p className="ltr-nums text-2xl font-bold text-(--color-verified)">
                              {event.cameCount}
                            </p>
                            <p className="text-[0.7rem] text-(--color-ink-faint)">
                              הגיעו בפועל
                            </p>
                          </div>
                        </div>
                      </div>
                    </Card>
                  </Link>
                </li>
              );
            })}
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
          {members.map((m) => {
            const age = ageInYears(m.profile.birth_date);
            const wa = whatsappUrl(m.profile.phone);
            const ig = instagramUrl(m.profile.instagram);

            return (
              <div
                key={m.profile.id}
                className="flex items-center gap-3 px-4 py-3 transition hover:bg-(--color-haze)/60"
              >
                {/* קישור לפרופיל רק על פנים+שם — כפתורי וואטסאפ/אינסטגרם
                    בהמשך השורה הם קישורים בפני עצמם, ועוגן בתוך עוגן
                    שובר את שניהם (כבר קרה פעם, ראו attendee-grid). */}
                <Link
                  href={`/admin/members/${m.profile.id}`}
                  className="flex min-w-0 flex-1 items-center gap-3"
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
                  <p className="min-w-0 flex-1 truncate text-sm font-semibold">
                    {m.profile.full_name}
                    {age !== null && (
                      <span className="ms-1 font-normal text-(--color-ink-faint)">
                        · {age}
                      </span>
                    )}
                  </p>
                </Link>

                {m.profile.swim_level && (
                  <span
                    className="flex shrink-0 items-center gap-1 rounded-full border px-1.5 py-0.5 text-[0.65rem] font-semibold text-(--color-ink)"
                    style={swimLevelBadgeStyle(m.profile.swim_level)}
                  >
                    <WaveIcon
                      className="size-2.5"
                      style={{ color: SWIM_LEVEL_COLOR[m.profile.swim_level] }}
                    />
                    {swimLevelLabel(m.profile.swim_level)}
                  </span>
                )}

                {(wa || ig) && (
                  <div className="flex shrink-0 gap-1">
                    {wa && (
                      <a
                        href={wa}
                        target="_blank"
                        rel="noreferrer"
                        aria-label={`וואטסאפ עם ${m.profile.full_name}`}
                        className="flex size-8 items-center justify-center rounded-lg border border-(--color-line) bg-(--color-haze) text-(--color-verified) transition hover:border-(--color-verified)/50 hover:bg-(--color-verified)/10"
                      >
                        <WhatsAppIcon className="size-3.5" />
                      </a>
                    )}
                    {ig && (
                      <a
                        href={ig}
                        target="_blank"
                        rel="noreferrer"
                        aria-label={`אינסטגרם של ${m.profile.full_name}`}
                        className="flex size-8 items-center justify-center rounded-lg border border-(--color-line) bg-(--color-haze) text-(--color-sea) transition hover:border-(--color-sea)/50 hover:bg-(--color-sea)/10"
                      >
                        <InstagramIcon className="size-3.5" />
                      </a>
                    )}
                  </div>
                )}

                <span className="ltr-nums shrink-0 text-sm font-bold text-(--color-ink-soft)">
                  {m.attendedCount}
                  <span className="text-(--color-ink-faint)">/{heldCount}</span>
                </span>
              </div>
            );
          })}
        </Card>
      </section>
    </div>
  );
}
