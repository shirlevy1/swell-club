import { notFound } from "next/navigation";
import { getViewer, getEvent, getEventDetail, getEventPhotos } from "@/lib/data";
import { formatDateTime, formatMinutes, formatTime } from "@/lib/format";
import { checkInWindow, hasEventStarted } from "@/lib/checkin";
import { getSeaForecastForEvent } from "@/lib/gosurf";
import { getEventAgenda } from "@/lib/agenda";
import { BackLink, Card, Notice } from "@/components/ui";
import { RsvpButton } from "@/components/rsvp-button";
import { CheckInFlow } from "@/components/check-in-flow";
import { AttendeeGrid } from "@/components/attendee-grid";
import { GoingList } from "@/components/going-list";
import { SeaForecast } from "@/components/sea-forecast";
import { EventAgendaView } from "@/components/event-agenda";
import { EventPhotoAlbum } from "@/components/event-photo-album";

export default async function EventPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const viewer = await getViewer();
  const event = await getEvent(id);
  if (!viewer || !event) notFound();

  const { myGoing, rsvpCount, going, hasAttended, attendedCount, attendees } =
    await getEventDetail(id, viewer.userId);
  const { status, opensAt, closesAt } = checkInWindow(event);
  const minutesBefore = formatMinutes(event.checkin_opens_before_min);
  // אף פעם לא מפיל את העמוד — GoSurf לא זמין נחשב "אין תחזית", לא שגיאה
  const forecast = await getSeaForecastForEvent(event.starts_at);
  const agenda = getEventAgenda(event.starts_at);

  const isOrganizer = viewer.role === "organizer";
  const eventHasStarted = hasEventStarted(event);
  // מנהלת רואה ומנהלת את האלבום גם בלי שנכחה — כמו בסלפים
  const canSeeAlbum = hasAttended || isOrganizer;
  const photos = canSeeAlbum ? await getEventPhotos(id) : [];

  return (
    <div className="space-y-7">
      <BackLink href="/events">לכל המפגשים</BackLink>

      <header className="space-y-2">
        <div className="space-y-0.5">
          <p className="text-sm font-semibold text-(--color-sea)">
            {event.title}
          </p>
          <h1 className="font-[family-name:var(--font-display)] text-3xl font-bold leading-tight text-balance">
            {formatDateTime(event.starts_at)}
          </h1>
        </div>
        <a
          href={
            event.maps_url ??
            `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(event.location_name)}`
          }
          target="_blank"
          rel="noreferrer"
          className="-ms-2 inline-flex min-h-11 items-center gap-1.5 px-2 text-sm font-semibold text-(--color-sea)"
        >
          {event.location_name}
          <span aria-hidden>↗</span>
        </a>
      </header>

      <EventAgendaView agenda={agenda} />

      {forecast && <SeaForecast day={forecast} />}

      {status === "before" && !hasAttended && (
        <Card>
          <RsvpButton
            event={event}
            initialGoing={myGoing}
            initialCount={rsvpCount}
          />
        </Card>
      )}

      {/* השמות שמאחורי המספר. מי שכבר נכח רואה במקום זה את הרשימה
          האמיתית עם הפנים, ולכן אין צורך להראות לו כוונות. */}
      {!hasAttended && status !== "closed" && (
        <GoingList people={going} myGoing={myGoing} />
      )}

      {!hasAttended && status === "open" && (
        <CheckInFlow event={event} attendedCount={attendedCount} />
      )}

      {!hasAttended && status === "before" && (
        <Notice>
          הצ׳ק־אין ייפתח{" "}
          <span className="ltr-nums font-semibold">
            {formatTime(opensAt.toISOString())}
          </span>
          {event.checkin_opens_before_min > 0
            ? `, ${minutesBefore} לפני ההתחלה`
            : ", בדיוק בזמן ההתחלה"}{" "}
          — ורק מהמקום עצמו.
        </Notice>
      )}

      {!hasAttended && status === "closed" && (
        <Notice tone="warn">
          הצ׳ק־אין למפגש הזה נסגר ב־
          <span className="ltr-nums font-semibold">
            {formatTime(closesAt.toISOString())}
          </span>
          .{" "}
          {attendedCount > 0
            ? `${attendedCount} סימנו הגעה — אבל מי שלא היה שם לא יכול לראות מי הם.`
            : "מי שלא סימן הגעה לא יכול לראות מי היה."}
        </Notice>
      )}

      {hasAttended && (
        <section className="space-y-4">
          <div className="flex items-baseline justify-between">
            <h2 className="font-[family-name:var(--font-display)] text-xl font-bold">
              מי היה כאן
            </h2>
            <span className="ltr-nums text-sm text-(--color-ink-faint)">
              {attendees.length}
            </span>
          </div>
          <AttendeeGrid attendees={attendees} eventId={id} />
        </section>
      )}

      {canSeeAlbum && (
        <EventPhotoAlbum
          eventId={id}
          photos={photos}
          canManage={isOrganizer && eventHasStarted}
        />
      )}
    </div>
  );
}
