"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { demoMode } from "@/lib/config";
import { toggleRsvpAction } from "@/lib/demo/actions";
import { downloadIcs } from "@/lib/ics";
import type { SwellEvent } from "@/lib/types";
import { Button, Notice } from "./ui";

export function RsvpButton({
  event,
  initialGoing,
  initialCount,
}: {
  event: SwellEvent;
  initialGoing: boolean;
  initialCount: number;
}) {
  const router = useRouter();
  const [going, setGoing] = useState(initialGoing);
  const [count, setCount] = useState(initialCount);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  async function toggle() {
    const next = !going;
    setError(null);
    // אופטימי — הכפתור הזה חייב להרגיש מיידי
    setGoing(next);
    setCount((c) => Math.max(0, c + (next ? 1 : -1)));

    if (demoMode) {
      await toggleRsvpAction(event.id);
      startTransition(() => router.refresh());
      return;
    }

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { error: upsertError } = await supabase.from("rsvps").upsert(
      { event_id: event.id, profile_id: user.id, going: next },
      { onConflict: "event_id,profile_id" },
    );

    if (upsertError) {
      setGoing(!next);
      setCount((c) => Math.max(0, c + (next ? -1 : 1)));
      setError("לא הצלחנו לשמור. נסו שוב.");
      return;
    }
    startTransition(() => router.refresh());
  }

  return (
    <div className="space-y-3">
      <Button
        onClick={toggle}
        disabled={pending}
        variant={going ? "secondary" : "primary"}
        className="w-full"
      >
        {/* בלשון פנייה ברבים ולא בגוף ראשון — "אני מתכוון" מניח זכר */}
        {going ? "✓ סימנתם שתגיעו" : "סמנו שתגיעו"}
      </Button>

      <p className="text-center text-sm text-(--color-ink-soft)">
        {count === 0 ? (
          "עוד אף אחד לא סימן"
        ) : count === 1 ? (
          "אדם אחד מתכוון להגיע"
        ) : (
          <>
            <span className="ltr-nums font-bold text-(--color-ink)">
              {count}
            </span>{" "}
            מתכוונים להגיע
          </>
        )}
      </p>

      {going && (
        <button
          type="button"
          onClick={() => downloadIcs(event)}
          className="w-full text-center text-sm text-(--color-sea) underline underline-offset-4"
        >
          הוספה ליומן
        </button>
      )}

      {error && <Notice tone="error">{error}</Notice>}
    </div>
  );
}
