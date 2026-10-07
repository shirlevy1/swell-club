import { redirect } from "next/navigation";
import { getViewer, getRecentGenderAttendance } from "@/lib/data";
import { BackLink } from "@/components/ui";
import { GenderAttendanceChart } from "@/components/gender-attendance-chart";

/**
 * תובנות הניהול - נבנה גרף-אחר-גרף עם שיר, לא באצווה אחת. כל גרף
 * הוא פעולת שרת/שאילתה עצמאית ומוגבלת (לא דרך getAdminData, שמביאה
 * את כל ההיסטוריה) - ראו הערה ב-getRecentGenderAttendance.
 */
export default async function AdminInsightsPage() {
  const viewer = await getViewer();
  if (!viewer?.club || viewer.role !== "organizer") redirect("/events");

  const genderAttendance = await getRecentGenderAttendance(viewer.club.id);

  return (
    <div className="space-y-6">
      <BackLink href="/admin">לניהול</BackLink>

      {/* בלי כותרת גלויה - שיר ביקשה בלי שום מילה בעמוד הזה. h1
          נשאר לקוראי מסך/מבנה העמוד בלבד, אותו דפוס כמו ב-app/page.tsx. */}
      <h1 className="sr-only">תובנות</h1>

      <GenderAttendanceChart events={genderAttendance} />
    </div>
  );
}
