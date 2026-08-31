import Link from "next/link";
import { notFound } from "next/navigation";
import { getViewer, getEvent, getEventDetail, getEventPhotos } from "@/lib/data";
import {
  formatDateTime,
  formatDayMonth,
  formatMinutes,
  formatTime,
  formatWeekday,
} from "@/lib/format";
import { checkInWindow, hasEventStarted } from "@/lib/checkin";
import { getSeaForecastForEvent } from "@/lib/gosurf";
import {
  getEventAgendaText,
  getEventEquipmentHeading,
  getEventEquipmentText,
} from "@/lib/agenda";
import { BackLink, Card, Notice } from "@/components/ui";
import { RsvpButton } from "@/components/rsvp-button";
import { CheckInFlow } from "@/components/check-in-flow";
import { AttendeeGrid } from "@/components/attendee-grid";
import { GoingList } from "@/components/going-list";
import { SeaForecast } from "@/components/sea-forecast";
import { EventAgendaView } from "@/components/event-agenda";
import { EventPhotoAlbum } from "@/components/event-photo-album";
import { EditSelfieButton } from "@/components/edit-selfie-button";
import { DeleteEventButton } from "@/components/delete-event-button";
import { EventLiveRefresh } from "@/components/event-live-refresh";
import { AddAttendanceButton } from "@/components/add-attendance-button";
import { WhatToBring } from "@/components/what-to-bring";
import { EditIcon, ExternalLinkIcon } from "@/components/social-icons";

export default async function EventPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const viewer = await getViewer();
  const event = await getEvent(id);
  if (!viewer || !event) notFound();

  const isOrganizer = viewer.role === "organizer";
  const { myGoing, rsvpCount, going, hasAttended, attendees } =
    await getEventDetail(id, viewer.userId, isOrganizer);
  const { status, closesAt } = checkInWindow(event);
  const minutesBefore = formatMinutes(event.checkin_opens_before_min);
  // אף פעם לא מפיל את העמוד — GoSurf לא זמין נחשב "אין תחזית", לא שגיאה.
  // גם לא נשלף בכלל למפגש שכבר נגמר — התחזית כבר לא מוצגת שם, ואין
  // טעם בקריאת רשת חיצונית סתם.
  const forecast =
    event.is_sea && status !== "closed"
      ? await getSeaForecastForEvent(event.starts_at)
      : null;
  const agendaText = getEventAgendaText(event);
  const equipmentText = getEventEquipmentText(event);
  const equipmentHeading = getEventEquipmentHeading(event);

  const eventHasStarted = hasEventStarted(event);
  // מנהלת רואה ומנהלת את האלבום גם בלי שנכחה — כמו בסלפים
  const canSeeAlbum = hasAttended || isOrganizer;
  const photos = canSeeAlbum ? await getEventPhotos(id) : [];

  return (
    <div className="space-y-7">
      {status !== "closed" && <EventLiveRefresh />}
      <BackLink href="/events">לכל המפגשים</BackLink>

      <header className="space-y-2">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 space-y-0.5">
            <p className="text-sm font-semibold text-(--color-sea)">
              {event.title}
            </p>
            <h1 className="font-[family-name:var(--font-display)] text-3xl font-bold leading-tight text-balance">
              {formatDateTime(event.starts_at)}
            </h1>
          </div>
          {/* לא רק "לפני שהמפגש התחיל" — גם ברגע שחלון הצ'ק־אין נפתח
              (שיכול להיות לפני שעת ההתחלה) או שכבר יש נוכחויות
              מאומתות, עריכת מיקום/רדיוס/חלון היא כבר לא בטוחה. */}
          {isOrganizer && status === "before" && attendees.length === 0 && (
            <Link
              href={`/admin/events/${id}/edit`}
              aria-label="עריכת מפגש"
              className="flex size-11 shrink-0 items-center justify-center rounded-full border border-(--color-line) bg-(--color-surface) text-(--color-sea) transition hover:border-(--color-sea)/50 hover:bg-(--color-sea)/10"
            >
              <EditIcon className="size-5" />
            </Link>
          )}
        </div>
        <a
          href={
            event.maps_url ??
            `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(event.location_name)}`
          }
          target="_blank"
          rel="noreferrer"
          className="inline-flex min-h-11 items-center gap-1.5 rounded-xl border border-(--color-line) bg-(--color-surface) px-3 text-sm font-semibold text-(--color-sea) transition hover:border-(--color-sea)/50 hover:bg-(--color-haze)"
        >
          {event.location_name}
          <ExternalLinkIcon className="size-3.5" />
        </a>
      </header>

      {/* תיאור/לו״ז/תחזית/ציוד הם מידע לקראת המפגש — לא רלוונטיים
          יותר אחרי שהוא כבר נגמר, אז נעלמים יחד עם סגירת הצ'ק־אין. */}
      {status !== "closed" && (
        <>
          {event.description && (
            <p className="text-sm leading-relaxed text-(--color-ink-soft)">
              {event.description}
            </p>
          )}

          {event.agenda_visible && <EventAgendaView text={agendaText} />}

          {forecast && <SeaForecast day={forecast} />}

          {event.equipment_visible && (
            <WhatToBring
              heading={equipmentHeading}
              text={equipmentText}
              showLink={event.equipment_link_visible}
            />
          )}
        </>
      )}

      {status === "before" && !hasAttended && (
        <Card>
          <RsvpButton
            event={event}
            initialGoing={myGoing}
            initialCount={rsvpCount}
            gender={viewer.profile?.gender ?? null}
          />
        </Card>
      )}

      {/* השמות שמאחורי המספר. מי שכבר נכח רואה במקום זה את הרשימה
          האמיתית עם הפנים, ולכן אין צורך להראות לו כוונות. */}
      {!hasAttended && status !== "closed" && (
        <GoingList people={going} myGoing={myGoing} />
      )}

      {!hasAttended && status === "open" && (
        <CheckInFlow event={event} />
      )}

      {!hasAttended && status === "before" && (
        <Notice>
          הצ׳ק־אין נפתח{" "}
          {event.checkin_opens_before_min > 0
            ? `${minutesBefore} לפני המפגש`
            : "עם תחילת המפגש"}
          , ורק מהמקום עצמו.
        </Notice>
      )}

      {!hasAttended && status === "closed" && (
        <Notice tone="warn">
          הצ׳ק־אין למפגש הזה כבר נסגר ב
          {formatWeekday(closesAt.toISOString())} ה-
          <span className="ltr-nums font-semibold">
            {formatDayMonth(closesAt.toISOString())}
          </span>{" "}
          בשעה{" "}
          <span className="ltr-nums font-semibold">
            {formatTime(closesAt.toISOString())}
          </span>
          .
          <br />
          רק מי שהיה במפגש וסימן הגעה יכול לראות מי עוד היה שם.
        </Notice>
      )}

      {/* מנהלת רואה את הרשימה הזו תמיד, גם בלי שנכחה בעצמה — כמו
          באלבום התמונות. hasAttended נשאר "האם אני עצמי נכחתי",
          ולכן עדיין קובע את כפתור עריכת הסלפי (אין מה לערוך אם
          לא נכחת) בנפרד מתנאי הראות של הסקשן כולו. */}
      {(hasAttended || isOrganizer) && (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-[family-name:var(--font-display)] text-xl font-bold">
              מי היה חלק מהסוואל?
            </h2>
            <div className="flex items-center gap-2">
              <span className="ltr-nums text-sm text-(--color-ink-faint)">
                {attendees.length}
              </span>
              {/* לפני שחלון הצ'ק־אין נפתח אין עדיין את מי "שהחמיץ" אותו
                  להוסיף ידנית — ראו גם admin_add_attendance() בשרת,
                  שחוסמת את זה שוב מאחורי הממשק. */}
              {isOrganizer && status !== "before" && (
                <AddAttendanceButton
                  eventId={id}
                  excludeProfileIds={attendees.map((a) => a.profile.id)}
                />
              )}
            </div>
          </div>
          <AttendeeGrid attendees={attendees} eventId={id} />
          {/* אותו חלון זמן בדיוק כמו הצ'ק־אין עצמו — לא נפרד וגם לא
              פתוח לצמיתות. selfies_update_own ב-storage אוכפת את זה
              שוב בשרת, לא רק כאן. */}
          {hasAttended && status === "open" && (
            <EditSelfieButton eventId={id} />
          )}
        </section>
      )}

      {canSeeAlbum && (
        <EventPhotoAlbum
          eventId={id}
          photos={photos}
          canManage={isOrganizer && eventHasStarted}
          canUpload={canSeeAlbum && eventHasStarted}
        />
      )}

      {isOrganizer && <DeleteEventButton eventId={id} />}
    </div>
  );
}
