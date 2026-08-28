"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { demoMode } from "@/lib/config";
import { updateEventScheduleAction } from "@/lib/demo/actions";
import { getEventAgendaText, getEventEquipmentText } from "@/lib/agenda";
import type { SwellEvent } from "@/lib/types";
import { Button, Card, Field, Notice, Textarea } from "./ui";

export function EditEventScheduleForm({ event }: { event: SwellEvent }) {
  const router = useRouter();
  const [description, setDescription] = useState(event.description ?? "");
  const [agendaText, setAgendaText] = useState(getEventAgendaText(event));
  const [equipmentText, setEquipmentText] = useState(
    getEventEquipmentText(event),
  );
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setPending(true);

    const patch = {
      description: description.trim() || null,
      agenda_text: agendaText.trim() || null,
      equipment_text: equipmentText.trim() || null,
    };

    if (demoMode) {
      await updateEventScheduleAction(event.id, patch);
      setPending(false);
      router.push(`/events/${event.id}`);
      router.refresh();
      return;
    }

    const supabase = createClient();
    const { error: updateError } = await supabase
      .from("events")
      .update(patch)
      .eq("id", event.id);
    setPending(false);

    if (updateError) return setError("לא הצלחנו לשמור. נסו שוב.");
    router.push(`/events/${event.id}`);
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <Card className="space-y-4">
        <Field label="תיאור המפגש (אופציונלי)">
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            placeholder="כאן תוכלו לשתף את כל הפרטים שחשוב לדעת לקראת המפגש, מעבר ללוח הזמנים."
          />
        </Field>
      </Card>

      <Card className="space-y-4">
        <Field label="לו״ז המפגש">
          <Textarea
            value={agendaText}
            onChange={(e) => setAgendaText(e.target.value)}
            rows={7}
            dir="auto"
          />
        </Field>
      </Card>

      <Card className="space-y-4">
        <Field label="מה להביא למים?">
          <Textarea
            value={equipmentText}
            onChange={(e) => setEquipmentText(e.target.value)}
            rows={5}
            dir="auto"
          />
        </Field>
      </Card>

      {error && <Notice tone="error">{error}</Notice>}

      <Button type="submit" disabled={pending} className="w-full">
        {pending ? "שומרים…" : "שמירה"}
      </Button>
    </form>
  );
}
