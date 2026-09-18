import Link from "next/link";
import type { Gender, SwellEvent } from "@/lib/types";
import { EventCard } from "./event-card";

/**
 * משותף בין עמוד המפגשים הראשי (חתוך) לעמוד ההיסטוריה המלאה — אבל
 * כפתור החזרה של המפגש עצמו צריך לדעת מאיפה בדיוק הגיעו: מהעמוד
 * הראשי חוזרים אליו ("לכל המפגשים"), מעמוד ההיסטוריה המלאה חוזרים
 * לשם ("לכל המפגשים שהיו") — לכן eventLinkQuery מגיע מבחוץ, לא קבוע.
 */
export function PastEventsList({
  events,
  attended,
  gender,
  eventLinkQuery,
}: {
  events: SwellEvent[];
  attended: Set<string>;
  gender: Gender | null;
  eventLinkQuery?: string;
}) {
  return (
    <ul className="space-y-3">
      {events.map((event) => (
        <li key={event.id}>
          <Link
            href={`/events/${event.id}${eventLinkQuery ? `?${eventLinkQuery}` : ""}`}
          >
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
