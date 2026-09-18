import { redirect } from "next/navigation";
import { getViewer, getAdminData, splitAdminEvents } from "@/lib/data";
import { BackLink, EmptyState } from "@/components/ui";
import { AdminEventCard } from "@/components/admin-event-card";

/**
 * כל המפגשים שהיו, בלי הגבלה — אותו כרטיס עשיר (אחוזי הגעה, ייצוא
 * דוח) כמו ברשימה הראשית בעמוד הניהול, שם מוצגים רק 10 האחרונים.
 */
export default async function AdminEventsHistoryPage() {
  const viewer = await getViewer();
  if (!viewer?.club || viewer.role !== "organizer") redirect("/events");

  const { events } = await getAdminData(viewer.club.id);
  const { pastAll: pastEvents } = splitAdminEvents(events);

  return (
    <div className="space-y-6">
      <BackLink href="/admin#events">לניהול</BackLink>

      <h1 className="font-[family-name:var(--font-display)] text-2xl font-bold">
        כל המפגשים שהיו
      </h1>

      {pastEvents.length === 0 ? (
        <EmptyState title="עדיין אין היסטוריה" body="עוד לא היו מפגשים." />
      ) : (
        <ul className="space-y-3">
          {pastEvents.map((event) => (
            <li key={event.id}>
              <AdminEventCard event={event} eventLinkQuery="from=admin-history" />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
