"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { demoMode } from "@/lib/config";
import { toggleRsvpAction } from "@/lib/demo/actions";
import { downloadIcs } from "@/lib/ics";
import { byGender } from "@/lib/format";
import type { Gender, SwellEvent } from "@/lib/types";
import { CheckIcon } from "./social-icons";
import { Button, Notice } from "./ui";

export function RsvpButton({
  event,
  initialGoing,
  initialCount,
  gender,
}: {
  event: SwellEvent;
  initialGoing: boolean;
  initialCount: number;
  gender: Gender | null;
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

    // רק כשמסמנים הגעה, לא כשמבטלים — לא ממתינים לזה
    if (next) {
      fetch("/api/push/notify-rsvp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ event_id: event.id }),
      }).catch(() => {});
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
        {/* גוף ראשון עם ניסוח מגדרי — לא "אני מתכוון" שמניח זכר */}
        {going && <CheckIcon className="size-4" />}
        {byGender(gender, "אני מגיע", "אני מגיעה")}
      </Button>

      <p className="text-center text-sm text-(--color-ink-soft)">
        {count === 0 ? (
          "תהיו הראשונים לסמן"
        ) : count === 1 ? (
          "אחד מגיע"
        ) : (
          <>
            <span className="ltr-nums font-bold text-(--color-ink)">
              {count}
            </span>{" "}
            מגיעים
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
