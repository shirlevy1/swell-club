import {
  getViewer,
  getMetPeople,
  getMetPeopleCount,
  getClubMemberCount,
  getUpcomingEvents,
  getMyGoingEventIds,
  getMyAttendedEventIds,
  getRandomEventAlbum,
  getHomeInstagramReel,
} from "@/lib/data";
import { getWaveForecast, getBestSwimDays, getCurrentWaterTempC } from "@/lib/gosurf";
import { EmptyState } from "@/components/ui";
import { NextEventCard } from "@/components/next-event-card";
import { SeaConditionsCard } from "@/components/sea-conditions-card";
import { KnownPeopleStrip } from "@/components/known-people-strip";
import { RandomEventAlbumCard } from "@/components/random-event-album";
import { CommunityStats } from "@/components/community-stats";
import { InstagramReelShowcase } from "@/components/instagram-reel-showcase";
import { WhatsappGroupCard } from "@/components/whatsapp-group-card";
import { WhatsappGroupCardBanner } from "@/components/whatsapp-group-card-banner";
import { WhatsappGroupCardRow } from "@/components/whatsapp-group-card-row";
import { WhatsappGroupCardFeature } from "@/components/whatsapp-group-card-feature";

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
    instagramReel,
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
    getHomeInstagramReel(viewer.club),
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
      <InstagramReelShowcase
        permalink={instagramReel.permalink}
        coverUrl={instagramReel.coverUrl}
      />
      <WhatsappGroupCard link={viewer.club.whatsapp_group_link} />

      {/* זמני - 3 אופציות עיצוב נוספות להשוואה, ראו שיחה עם שיר.
          למחוק את כולן חוץ מהנבחרת אחרי שתבחר. */}
      <p className="text-xs font-bold text-(--color-ink-faint)">אפשרות 2</p>
      <WhatsappGroupCardBanner link={viewer.club.whatsapp_group_link} />
      <p className="text-xs font-bold text-(--color-ink-faint)">אפשרות 3</p>
      <WhatsappGroupCardRow link={viewer.club.whatsapp_group_link} />
      <p className="text-xs font-bold text-(--color-ink-faint)">אפשרות 4</p>
      <WhatsappGroupCardFeature link={viewer.club.whatsapp_group_link} />
    </div>
  );
}
