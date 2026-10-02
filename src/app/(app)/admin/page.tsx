import Link from "next/link";
import { redirect } from "next/navigation";
import {
  getViewer,
  getAdminData,
  getPendingMembers,
  getPendingEventPhotos,
  getRemovedMembers,
  splitAdminEvents,
  type PendingEventPhoto,
} from "@/lib/data";
import {
  ageInYears,
  formatDate,
  formatDayMonth,
  formatPhone,
  formatTime,
  formatWeekdayName,
  genderLabel,
  normalizeInstagram,
} from "@/lib/format";
import { checkInWindow } from "@/lib/checkin";
import { swimLevelLabel } from "@/lib/swim-level";
import { EmptyState, LinkButton, PageHeader } from "@/components/ui";
import { ExportButton } from "@/components/export-button";
import { AdminEventCard } from "@/components/admin-event-card";
import { PendingMembersCard } from "@/components/pending-member-row";
import { MemberSearchList } from "@/components/member-search-list";
import { PendingPhotosSection } from "@/components/pending-photo-group";
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

  // ארבע שאילתות בלתי-תלויות זו בזו — בבת אחת, לא ברצף
  const [
    { events, members, historicalMembers },
    pendingMembers,
    pendingPhotos,
    removedMembers,
  ] = await Promise.all([
      getAdminData(viewer.club.id),
      getPendingMembers(viewer.club.id),
      getPendingEventPhotos(viewer.club.id),
      getRemovedMembers(viewer.club.id),
    ]);
  const pendingPhotosByEvent = groupPendingPhotos(pendingPhotos);

  // המכנה של אחוז ההגעה הוא מפגשים שכבר **אפשר היה** לסמן בהם נוכחות,
  // כלומר שחלון הצ'ק־אין שלהם נפתח — ולא רק מפגשים שהסתיימו. אחרת מי
  // שסימן הגעה למפגש שנפתח עכשיו מקבל "3 מתוך 2".
  const heldCount = events.filter(
    (e) => checkInWindow(e).status !== "before",
  ).length;

  const membersCsv = [
    [
      "שם",
      "מגדר",
      "גיל",
      "תאריך לידה",
      "עיר מגורים",
      "טלפון",
      "אימייל",
      "אינסטגרם",
      "רמת שחייה",
      "תאריך הצטרפות",
      "מפגשים",
      "אחוז הגעה",
      "אישרו את תנאי ההצטרפות",
    ],
    // members כבר ממוין לפי תאריך הצטרפות ב-getAdminData
    ...members.map((m) => [
      m.profile.full_name,
      genderLabel(m.profile.gender),
      ageInYears(m.profile.birth_date)?.toString() ?? "",
      m.profile.birth_date ?? "",
      m.profile.city ?? "",
      formatPhone(m.profile.phone) ?? "",
      m.email ?? "",
      // מנורמל: בטופס אנשים הכניסו גם קישורים מלאים וגם שמות משתמש
      normalizeInstagram(m.profile.instagram) ?? "",
      swimLevelLabel(m.profile.swim_level) ?? "",
      formatDate(m.profile.created_at),
      // "X מתוך Y" ולא "X/Y": אקסל וגוגל שיטס קוראים "16/30" כתאריך
      // (יוני 2030!) ולא כטקסט, למרות שזה בכלל לא תאריך.
      `${m.attendedCount} מתוך ${heldCount}`,
      `${heldCount ? Math.round((m.attendedCount / heldCount) * 100) : 0}%`,
      // תיבת אישור אחת בהרשמה (legal_accepted) שומרת waiver+privacy
      // באותו רגע בדיוק — שני העמודים תמיד זהים, ולכן עמודה אחת מספיקה.
      m.profile.waiver_accepted_at ? "כן" : "",
    ]),
  ];

  // מהראשון לאחרון — הפוך מסדר הרשימה בעמוד (שם החדש קודם, כי זה מה
  // שהכי רלוונטי לראות בכניסה לניהול). ליצוא הגיוני יותר סדר כרונולוגי.
  const eventsChronological = [...events].sort(
    (a, b) => a.starts_at.localeCompare(b.starts_at),
  );
  // מי שכבר היה חלק מהקהילה ביום נתון — כולל מי שכבר עזב/הוסר מאז,
  // כי זה גודל הקהילה שהיה נכון היסטורית באותו תאריך, לא היום. פרופיל
  // ותא חברות נוצרים באותה טרנזקציה בהרשמה (handle_new_user()), ולכן
  // created_at הוא גם בפועל תאריך ההצטרפות לקהילה, בלי צורך בשאילתה
  // נפרדת ל-club_members.joined_at.
  const memberCountAtDate = (iso: string) =>
    historicalMembers.filter((m) => m.profile.created_at <= iso).length;

  const eventsCsv = [
    [
      "כותרת",
      "יום בשבוע",
      "תאריך",
      "שעה",
      "מיקום",
      "סימנו שיגיעו",
      "הגיעו בפועל",
      "אחוז הגעה מתוך חברי הקהילה",
      "אחוז הגעה מתוך מי שסימן הגעה",
      "אחוז נשים",
      "אחוז גברים",
    ],
    ...eventsChronological.map((e) => {
      // מי שהגיע נספר כאן גם אם לא סימן שהוא מתכוון להגיע — cameCount
      // הוא סך הנוכחויות בפועל, לא מותנה ב-RSVP קודם.
      const clubSize = memberCountAtDate(e.starts_at);
      const rateOfClub = clubSize
        ? Math.round((e.cameCount / clubSize) * 100)
        : 0;
      const rateOfGoing = e.goingCount
        ? Math.round((e.cameCount / e.goingCount) * 100)
        : 0;
      const female = e.cameCount ? Math.round((e.femaleCame / e.cameCount) * 100) : 0;
      const male = e.cameCount ? Math.round((e.maleCame / e.cameCount) * 100) : 0;
      return [
        e.title,
        formatWeekdayName(e.starts_at),
        formatDayMonth(e.starts_at),
        formatTime(e.starts_at),
        e.location_name,
        String(e.goingCount),
        String(e.cameCount),
        `${rateOfClub}%`,
        `${rateOfGoing}%`,
        `${female}%`,
        `${male}%`,
      ];
    }),
  ];

  // מטריצת נוכחות: שורה לכל מי שהיה/הייתה חבר/ה אי-פעם (גם מי שכבר
  // עזב/הוסר, לא רק חברים פעילים היום), עמודה לכל מפגש, "כן" איפה
  // שנכח/ה בפועל (כולל הוספה ידנית) — כדי לראות בבת אחת מי הגיע/ה
  // לאילו מפגשים לאורך זמן, בלי שההיסטוריה תיעלם כשמישהו/י עוזב/ת.
  const attendanceMatrixCsv = [
    [
      "שם",
      "טלפון",
      ...eventsChronological.map((e) => formatDayMonth(e.starts_at)),
    ],
    ...historicalMembers.map((m) => [
      m.profile.full_name,
      formatPhone(m.profile.phone) ?? "",
      ...eventsChronological.map((e) =>
        e.attendedProfileIds.includes(m.profile.id) ? "כן" : "",
      ),
    ]),
  ];

  // מפגשים שהיו לא מוצגים כאן בכלל — רק כותרת עם מספר וקישור לעמוד
  // ההיסטוריה הנפרד (admin/events/history), כדי שגלילת הניהול לא
  // תתארך ככל שיצטברו מפגשים. אותו עיקרון בדיוק כמו עמוד "מפגשים"
  // הרגיל (events/page.tsx), רק בלי תצוגה חתוכה בעמוד עצמו.
  const { upcoming: upcomingEvents, pastAll: pastEventsAll } =
    splitAdminEvents(events);

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
          <LinkButton href="/admin/events/new" className="min-h-10 px-4 text-sm">
            מפגש חדש
          </LinkButton>
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
              rows={eventsCsv}
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
                rows={attendanceMatrixCsv}
                filename="swell-attendance-matrix.csv"
                label="הגעה"
              />
              <ExportButton
                rows={membersCsv}
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
          <MemberSearchList members={members} />
        )}

        {removedMembers.length > 0 && (
          <Link
            href="/admin/removed"
            className="inline-flex min-h-9 items-center gap-1.5 rounded-full bg-(--color-haze) px-3 text-xs font-semibold text-(--color-sea) transition hover:bg-(--color-sky)/30"
          >
            מי שכבר לא בקהילה ·{" "}
            <span className="ltr-nums">{removedMembers.length}</span>
          </Link>
        )}
      </section>
    </div>
  );
}
