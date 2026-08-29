import { notFound, redirect } from "next/navigation";
import { getViewer, getEvent } from "@/lib/data";
import { BackLink } from "@/components/ui";
import { EditEventScheduleForm } from "@/components/edit-event-schedule-form";

export default async function EditEventSchedulePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const viewer = await getViewer();
  if (!viewer?.club || viewer.role !== "organizer") redirect("/events");

  const event = await getEvent(id);
  if (!event) notFound();

  return (
    <div className="space-y-6">
      <BackLink href={`/events/${id}`}>למפגש</BackLink>

      <h1 className="font-[family-name:var(--font-display)] text-2xl font-bold">
        עריכת מפגש
      </h1>

      <EditEventScheduleForm event={event} />
    </div>
  );
}
