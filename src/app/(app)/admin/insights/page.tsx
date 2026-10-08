import { redirect } from "next/navigation";
import {
  getViewer,
  getRecentEventStats,
  getNewVsReturningByEvent,
  getGenderBreakdown,
  getTenureBreakdown,
  getActiveMembersTrend,
  getReturnRateTrend,
} from "@/lib/data";
import { BackLink } from "@/components/ui";
import { GenderAttendanceChart } from "@/components/gender-attendance-chart";
import { NewVsReturningChart } from "@/components/new-vs-returning-chart";
import { RsvpAttendanceChart } from "@/components/rsvp-attendance-chart";
import { GenderDonutChart } from "@/components/gender-donut-chart";
import { TenureDonutChart } from "@/components/tenure-donut-chart";
import { SparklineCard } from "@/components/sparkline-card";

/**
 * תובנות הניהול - נבנה גרף-אחר-גרף עם שיר, לא באצווה אחת. כל גרף
 * מוזן משאילתה עצמאית ומוגבלת משלו (לא דרך getAdminData, שמביאה את
 * כל ההיסטוריה) - ראו ההערות ב-lib/data.ts ליד כל אחת.
 */
export default async function AdminInsightsPage() {
  const viewer = await getViewer();
  if (!viewer?.club || viewer.role !== "organizer") redirect("/events");

  const [
    eventStats,
    newVsReturning,
    genderBreakdown,
    tenureBreakdown,
    activeTrend,
    returnRateTrend,
  ] = await Promise.all([
    getRecentEventStats(viewer.club.id),
    getNewVsReturningByEvent(viewer.club.id),
    getGenderBreakdown(viewer.club.id),
    getTenureBreakdown(viewer.club.id),
    getActiveMembersTrend(viewer.club.id),
    getReturnRateTrend(viewer.club.id),
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

      <div className="grid grid-cols-2 gap-3">
        <SparklineCard
          title="פעילים"
          value={activeTrend.current}
          trend={activeTrend.diff === 0 ? null : { kind: "diff", value: activeTrend.diff }}
          sparkline={activeTrend.sparkline}
        />
        <SparklineCard
          title="חוזרים"
          value={returnRateTrend.current}
          valueSuffix="%"
          trend={
            returnRateTrend.diffPoints === 0
              ? null
              : { kind: "percent", value: returnRateTrend.diffPoints }
          }
          sparkline={returnRateTrend.sparkline}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <GenderDonutChart data={genderBreakdown} />
        <TenureDonutChart data={tenureBreakdown} />
      </div>
    </div>
  );
}
