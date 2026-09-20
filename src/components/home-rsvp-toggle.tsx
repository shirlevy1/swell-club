"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { demoMode } from "@/lib/config";
import { toggleRsvpAction } from "@/lib/demo/actions";
import { byGender } from "@/lib/format";
import type { Gender } from "@/lib/types";
import { CheckIcon } from "./social-icons";

/**
 * גרסה מצומצמת של RsvpButton, ל"אתם מגיעים" בכרטיס "המפגש הקרוב"
 * בדף הבית — אותה לוגיקת toggle בדיוק (upsert אופטימי + התראת RSVP
 * fire-and-forget), בלי מונה המגיעים ובלי "הוספה ליומן": הכרטיס כאן
 * קומפקטי, ואלה כבר קיימים בעמוד המפגש עצמו, מרחק לחיצה אחת. בכשל
 * חוזרים למצב הקודם בשקט, בלי Notice, כדי לא לשבור את הכרזה — מי
 * שרוצה משוב מלא ילחץ על הכרטיס ויגיע לעמוד המפגש.
 *
 * לא בתוך ה-Link של הכרטיס (עוגן בתוך עוגן/כפתור בתוך עוגן הוא לא
 * תקין) — יושב לידו כאח, בדיוק כמו האייקונים ליד השורה בניהול חברים.
 */
export function HomeRsvpToggle({
  eventId,
  initialGoing,
  gender,
}: {
  eventId: string;
  initialGoing: boolean;
  gender: Gender | null;
}) {
  const router = useRouter();
  const [going, setGoing] = useState(initialGoing);
  const [pending, startTransition] = useTransition();
  const submittingRef = useRef(false);
  const [submitting, setSubmitting] = useState(false);

  async function toggle() {
    if (submittingRef.current) return;
    submittingRef.current = true;
    setSubmitting(true);

    const next = !going;
    setGoing(next);

    try {
      if (demoMode) {
        await toggleRsvpAction(eventId);
        startTransition(() => router.refresh());
        return;
      }

      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase.from("rsvps").upsert(
        { event_id: eventId, profile_id: user.id, going: next },
        { onConflict: "event_id,profile_id" },
      );
      if (error) {
        setGoing(!next);
        return;
      }

      if (next) {
        fetch("/api/push/notify-rsvp", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ event_id: eventId }),
        }).catch(() => {});
      }
      startTransition(() => router.refresh());
    } catch {
      setGoing(!next);
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={pending || submitting}
      className={
        going
          ? "flex shrink-0 items-center gap-1 rounded-full bg-white/15 px-2.5 py-1 text-[0.66rem] font-bold text-white transition hover:bg-white/25 disabled:opacity-60"
          : "flex shrink-0 items-center gap-1 rounded-full bg-white px-2.5 py-1 text-[0.66rem] font-bold text-(--color-deep) transition hover:bg-white/90 disabled:opacity-60"
      }
    >
      {going && <CheckIcon className="size-2.5" />}
      {going ? "אתם מגיעים" : byGender(gender, "אני מגיע", "אני מגיעה")}
    </button>
  );
}
