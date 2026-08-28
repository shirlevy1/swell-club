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
  const [agendaVisible, setAgendaVisible] = useState(event.agenda_visible);
  const [equipmentText, setEquipmentText] = useState(
    getEventEquipmentText(event),
  );
  const [equipmentVisible, setEquipmentVisible] = useState(
    event.equipment_visible,
  );
  const [equipmentLinkVisible, setEquipmentLinkVisible] = useState(
    event.equipment_link_visible,
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
      agenda_visible: agendaVisible,
      equipment_text: equipmentText.trim() || null,
      equipment_visible: equipmentVisible,
      equipment_link_visible: equipmentLinkVisible,
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
        <label className="flex min-h-11 items-center gap-2.5 text-sm font-semibold text-(--color-ink)">
          <input
            type="checkbox"
            checked={agendaVisible}
            onChange={(e) => setAgendaVisible(e.target.checked)}
            className="size-5 shrink-0 rounded border-(--color-line) accent-(--color-sea)"
          />
          לו״ז המפגש
        </label>
        <Textarea
          value={agendaText}
          onChange={(e) => setAgendaText(e.target.value)}
          rows={7}
          dir="auto"
        />
      </Card>

      <Card className="space-y-4">
        <label className="flex min-h-11 items-center gap-2.5 text-sm font-semibold text-(--color-ink)">
          <input
            type="checkbox"
            checked={equipmentVisible}
            onChange={(e) => setEquipmentVisible(e.target.checked)}
            className="size-5 shrink-0 rounded border-(--color-line) accent-(--color-sea)"
          />
          מה להביא למים?
        </label>
        <Textarea
          value={equipmentText}
          onChange={(e) => setEquipmentText(e.target.value)}
          rows={5}
          dir="auto"
        />
      </Card>

      <Card>
        <label className="flex min-h-11 items-center gap-2.5 text-sm font-semibold text-(--color-ink)">
          <input
            type="checkbox"
            checked={equipmentLinkVisible}
            onChange={(e) => setEquipmentLinkVisible(e.target.checked)}
            className="size-5 shrink-0 rounded border-(--color-line) accent-(--color-sea)"
          />
          להציג קישור לציוד של Speedo?
        </label>
        <p className="mt-1 text-xs leading-relaxed text-(--color-ink-faint)">
          כשמסומן, קישור עם 15% הנחה בקוד SWELLCLUB מופיע מתחת ל“מה
          להביא למים?” במפגש הזה.
        </p>
      </Card>

      {error && <Notice tone="error">{error}</Notice>}

      <Button type="submit" disabled={pending} className="w-full">
        {pending ? "שומרים…" : "שמירה"}
      </Button>
    </form>
  );
}
