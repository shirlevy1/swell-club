import {
  getViewer,
  getMetPeople,
  getUpcomingEvents,
  getMyGoingEventIds,
  getRandomMoment,
} from "@/lib/data";
import { getWaveForecast, getBestSwimDays } from "@/lib/gosurf";
import { EmptyState } from "@/components/ui";
import { NextEventCard } from "@/components/next-event-card";
import { WaveForecastStrip } from "@/components/wave-forecast-strip";
import { KnownPeopleStrip } from "@/components/known-people-strip";
import { RandomMomentCard } from "@/components/random-moment-card";

export default async function HomePage() {
  const viewer = await getViewer();
  if (!viewer?.club) {
    return (
      <EmptyState
        title="אתם עוד לא בקהילה"
        body="בקשו ממנהלת הקהילה את קישור ההצטרפות."
      />
    );
  }

  const [waveDays, bestDays, knownPeople, upcomingEvents, myGoingIds, randomMoment] =
    await Promise.all([
      getWaveForecast(),
      getBestSwimDays(),
      getMetPeople(viewer.userId),
      getUpcomingEvents(viewer.club.id),
      getMyGoingEventIds(viewer.userId),
      getRandomMoment(),
    ]);
  const nextEvent = upcomingEvents[0];

  return (
    <div className="space-y-8">
      {nextEvent && (
        <NextEventCard event={nextEvent} going={myGoingIds.has(nextEvent.id)} />
      )}
      <KnownPeopleStrip people={knownPeople} />
      <RandomMomentCard moment={randomMoment} />
      <WaveForecastStrip days={waveDays} bestDays={bestDays} />
    </div>
  );
}
