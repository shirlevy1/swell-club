import { redirect } from "next/navigation";
import { getViewer, getRecentEventStats } from "@/lib/data";
import { BackLink } from "@/components/ui";
import { GenderAttendanceChart } from "@/components/gender-attendance-chart";
import { RsvpAttendanceChart } from "@/components/rsvp-attendance-chart";

/**
 * תובנות הניהול - נבנה גרף-אחר-גרף עם שיר, לא באצווה אחת. שאילתה
 * עצמאית ומוגבלת אחת (לא דרך getAdminData, שמביאה את כל ההיסטוריה) -
 * ראו הערה ב-getRecentEventStats - משותפת לכל הגרפים כאן.
 */
export default async function AdminInsightsPage() {
  const viewer = await getViewer();
  if (!viewer?.club || viewer.role !== "organizer") redirect("/events");

  const eventStats = await getRecentEventStats(viewer.club.id);

  return (
    <div className="space-y-6">
      <BackLink href="/admin">לניהול</BackLink>

      {/* בלי כותרת גלויה - שיר ביקשה בלי שום מילה בעמוד הזה. h1
          נשאר לקוראי מסך/מבנה העמוד בלבד, אותו דפוס כמו ב-app/page.tsx. */}
      <h1 className="sr-only">תובנות</h1>

      <GenderAttendanceChart events={eventStats} />
      <RsvpAttendanceChart events={eventStats} />
    </div>
  );
}
