import {
  getViewer,
  getMetPeople,
  getUpcomingEvents,
  getMyGoingEventIds,
  getRandomEventAlbum,
} from "@/lib/data";
import { getWaveForecast, getBestSwimDays } from "@/lib/gosurf";
import { EmptyState } from "@/components/ui";
import { NextEventCard } from "@/components/next-event-card";
import { WaveForecastStrip } from "@/components/wave-forecast-strip";
import { KnownPeopleStrip } from "@/components/known-people-strip";
import { RandomEventAlbumCard } from "@/components/random-event-album";

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

  const [waveDays, bestDays, knownPeople, upcomingEvents, myGoingIds, randomAlbum] =
    await Promise.all([
      getWaveForecast(),
      getBestSwimDays(),
      getMetPeople(viewer.userId),
      getUpcomingEvents(viewer.club.id),
      getMyGoingEventIds(viewer.userId),
      getRandomEventAlbum(),
    ]);
  const nextEvent = upcomingEvents[0];

  return (
    <div className="space-y-8">
      {nextEvent && (
        <NextEventCard event={nextEvent} going={myGoingIds.has(nextEvent.id)} />
      )}
      <KnownPeopleStrip people={knownPeople} />
      {randomAlbum && (
        <RandomEventAlbumCard eventId={randomAlbum.eventId} photoUrls={randomAlbum.photoUrls} />
      )}
      <WaveForecastStrip days={waveDays} bestDays={bestDays} />
    </div>
  );
}
