import { notFound, redirect } from "next/navigation";
import { getViewer, getEvent, getEventAttendanceCount } from "@/lib/data";
import { EditEventScheduleForm } from "@/components/edit-event-schedule-form";

export default async function EditEventSchedulePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  /** מועבר הלאה מ-events/[id]/page.tsx (אותו from/fromId שהעמוד ההוא
      הגיע איתו) ל-EditEventScheduleForm, כדי שהחזרה למפגש אחרי עריכה
      לא "תשכח" מאיפה הגיעו במקור (לניהול, לפרופיל וכו'). */
  searchParams: Promise<{ from?: string; fromId?: string }>;
}) {
  const { id } = await params;
  const { from, fromId } = await searchParams;
  const viewer = await getViewer();
  if (!viewer?.club || viewer.role !== "organizer") redirect("/events");

  const event = await getEvent(id);
  if (!event) notFound();
  const attendanceCount = await getEventAttendanceCount(id);

  // כותרת וכפתור החזרה עברו לתוך EditEventScheduleForm עצמו — כפתור
  // "למפגש" צריך לדעת אם הטופס dirty לפני שהוא מפנה, וזה נתון שקיים
  // רק בקומפוננטת הלקוח, לא כאן.
  return (
    <EditEventScheduleForm
      event={event}
      attendanceCount={attendanceCount}
      returnQuery={from ? `?from=${from}${fromId ? `&fromId=${fromId}` : ""}` : ""}
    />
  );
}
