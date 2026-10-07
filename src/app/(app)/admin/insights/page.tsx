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

      <h1 className="font-[family-name:var(--font-display)] text-2xl font-bold">
        תובנות
      </h1>

      <GenderAttendanceChart events={genderAttendance} />
    </div>
  );
}
