import {
  getViewer,
  getMetPeople,
  getMetPeopleCount,
  getClubMemberCount,
  getUpcomingEvents,
  getMyGoingEventIds,
  getMyAttendedEventIds,
  getRandomEventAlbum,
} from "@/lib/data";
import { getWaveForecast, getBestSwimDays, getCurrentWaterTempC } from "@/lib/gosurf";
import { EmptyState } from "@/components/ui";
import { NextEventCard } from "@/components/next-event-card";
import { SeaConditionsCard } from "@/components/sea-conditions-card";
import { KnownPeopleStrip } from "@/components/known-people-strip";
import { RandomEventAlbumCard } from "@/components/random-event-album";
import { CommunityStats } from "@/components/community-stats";
import { InstagramReelCard } from "@/components/instagram-reel-card";
import { InstagramReelShowcase } from "@/components/instagram-reel-showcase";

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

  const [
    waveDays,
    bestDays,
    waterTempC,
    knownPeople,
    upcomingEvents,
    myGoingIds,
    myAttendedIds,
    randomAlbum,
    memberCount,
    metCount,
  ] = await Promise.all([
    getWaveForecast(),
    getBestSwimDays(),
    getCurrentWaterTempC(),
    getMetPeople(viewer.userId),
    getUpcomingEvents(viewer.club.id),
    getMyGoingEventIds(viewer.userId),
    getMyAttendedEventIds(viewer.userId),
    getRandomEventAlbum(),
    getClubMemberCount(),
    getMetPeopleCount(viewer.userId),
  ]);
  const nextEvent = upcomingEvents[0];

  return (
    <div className="space-y-8">
      {nextEvent && (
        <NextEventCard
          event={nextEvent}
          going={myGoingIds.has(nextEvent.id)}
          hasAttended={myAttendedIds.has(nextEvent.id)}
          gender={viewer.profile?.gender ?? null}
        />
      )}
      <SeaConditionsCard days={waveDays} bestDays={bestDays} tempC={waterTempC} />
      <KnownPeopleStrip people={knownPeople} />
      {randomAlbum && (
        <RandomEventAlbumCard eventId={randomAlbum.eventId} photoUrls={randomAlbum.photoUrls} />
      )}
      <CommunityStats memberCount={memberCount} metCount={metCount} />
      <InstagramReelCard />
      <InstagramReelShowcase />
    </div>
  );
}
