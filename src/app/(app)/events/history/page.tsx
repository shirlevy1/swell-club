import { getViewer, getPastEvents, getMyAttendedEventIds } from "@/lib/data";
import { BackLink, EmptyState } from "@/components/ui";
import { PastEventsList } from "@/components/past-events-list";

export default async function EventsHistoryPage() {
  const viewer = await getViewer();
  if (!viewer?.club) {
    return (
      <EmptyState
        title="אתם עוד לא בקהילה"
        body="בקשו ממנהלת הקהילה את קישור ההצטרפות."
      />
    );
  }

  const [past, attended] = await Promise.all([
    getPastEvents(viewer.club.id),
    getMyAttendedEventIds(viewer.userId),
  ]);

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <BackLink href="/events">לכל המפגשים</BackLink>
        <h1 className="font-[family-name:var(--font-display)] text-2xl font-bold">
          כל המפגשים שהיו
        </h1>
      </div>

      {past.length === 0 ? (
        <EmptyState title="עדיין אין היסטוריה" body="עוד לא היו מפגשים." />
      ) : (
        <PastEventsList
          events={past}
          attended={attended}
          gender={viewer.profile?.gender ?? null}
          eventLinkQuery="from=history"
        />
      )}
    </div>
  );
}
