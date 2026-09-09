import Link from "next/link";
import type { Gender, SwellEvent } from "@/lib/types";
import { EventCard } from "./event-card";

/** משותף בין עמוד המפגשים הראשי (חתוך) לעמוד ההיסטוריה המלאה. */
export function PastEventsList({
  events,
  attended,
  gender,
}: {
  events: SwellEvent[];
  attended: Set<string>;
  gender: Gender | null;
}) {
  return (
    <ul className="space-y-3">
      {events.map((event) => (
        <li key={event.id}>
          <Link href={`/events/${event.id}`}>
            <EventCard
              event={event}
              attended={attended.has(event.id)}
              gender={gender}
              past
            />
          </Link>
        </li>
      ))}
    </ul>
  );
}
