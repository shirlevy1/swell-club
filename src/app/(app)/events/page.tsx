import Link from "next/link";
import {
  getViewer,
  getUpcomingEvents,
  getPastEvents,
  getMyAttendedEventIds,
  getMyGoingEventIds,
  getGoingNamesByEvent,
} from "@/lib/data";
import { EmptyState } from "@/components/ui";
import { EventCard } from "@/components/event-card";
import { NotificationIconToggle } from "@/components/notification-icon-toggle";

export default async function EventsPage() {
  const viewer = await getViewer();
  if (!viewer?.club) {
    return (
      <EmptyState
        title="אתם עוד לא בקהילה"
        body="בקשו ממנהל הקהילה את קישור ההצטרפות."
      />
    );
  }

  const [upcoming, past, attended, going] = await Promise.all([
    getUpcomingEvents(viewer.club.id),
    getPastEvents(viewer.club.id),
    getMyAttendedEventIds(viewer.userId),
    getMyGoingEventIds(viewer.userId),
  ]);

  // רק לקרובים: מי מתכוון להגיע למפגש שהיה לפני שבוע לא מעניין אף אחד
  const goingNames = await getGoingNamesByEvent(
    upcoming.map((e) => e.id),
    viewer.userId,
  );

  return (
    <div className="space-y-8">
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-bold tracking-[0.2em] text-(--color-sea)">
            מפגשים קרובים
          </h2>
          <NotificationIconToggle />
        </div>
        {upcoming.length === 0 ? (
          <EmptyState
            title="אין מפגש מתוכנן"
            body="ברגע שייקבע מפגש חדש הוא יופיע כאן."
          />
        ) : (
          <ul className="space-y-3">
            {upcoming.map((event) => (
              <li key={event.id}>
                <Link href={`/events/${event.id}`}>
                  <EventCard
                    event={event}
                    attended={attended.has(event.id)}
                    going={going.has(event.id)}
                    goingPeople={goingNames.get(event.id) ?? []}
                    gender={viewer.profile?.gender ?? null}
                  />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      {past.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-xs font-bold tracking-[0.2em] text-(--color-ink-faint)">
            מפגשים שהיו
          </h2>
          <ul className="space-y-3">
            {past.map((event) => (
              <li key={event.id}>
                <Link href={`/events/${event.id}`}>
                  <EventCard
                    event={event}
                    attended={attended.has(event.id)}
                    gender={viewer.profile?.gender ?? null}
                    past
                  />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
