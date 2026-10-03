import { redirect } from "next/navigation";
import { getViewer } from "@/lib/data";
import { NewEventForm } from "@/components/new-event-form";

export default async function NewEventPage() {
  const viewer = await getViewer();
  if (!viewer?.club || viewer.role !== "organizer") redirect("/events");

  return <NewEventForm />;
}
