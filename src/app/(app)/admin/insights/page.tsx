import { redirect } from "next/navigation";
import { getViewer, getRecentEventStats, getNewVsReturningByEvent } from "@/lib/data";
import { BackLink } from "@/components/ui";
import { GenderAttendanceChart } from "@/components/gender-attendance-chart";
import { NewVsReturningChart } from "@/components/new-vs-returning-chart";
import { RsvpAttendanceChart } from "@/components/rsvp-attendance-chart";

/**
 * תובנות הניהול - נבנה גרף-אחר-גרף עם שיר, לא באצווה אחת. כל גרף
 * מוזן משאילתה עצמאית ומוגבלת משלו (לא דרך getAdminData, שמביאה את
 * כל ההיסטוריה) - ראו ההערות ב-lib/data.ts ליד כל אחת.
 */
export default async function AdminInsightsPage() {
  const viewer = await getViewer();
  if (!viewer?.club || viewer.role !== "organizer") redirect("/events");

  const [eventStats, newVsReturning] = await Promise.all([
    getRecentEventStats(viewer.club.id),
    getNewVsReturningByEvent(viewer.club.id),
  ]);

  return (
    <div className="space-y-6">
      <BackLink href="/admin">לניהול</BackLink>

      {/* בלי כותרת גלויה - שיר ביקשה בלי שום מילה בעמוד הזה. h1
          נשאר לקוראי מסך/מבנה העמוד בלבד, אותו דפוס כמו ב-app/page.tsx. */}
      <h1 className="sr-only">תובנות</h1>

      <GenderAttendanceChart events={eventStats} />
      <NewVsReturningChart events={newVsReturning} />
      <RsvpAttendanceChart events={eventStats} />
    </div>
  );
}
