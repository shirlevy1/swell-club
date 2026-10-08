"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { demoMode } from "@/lib/config";
import {
  setOutreachContactAction,
  clearOutreachContactAction,
} from "@/lib/demo/actions";

/**
 * "כבר דיברתי איתו/ה" בעמוד "אורחים". מסומן ל"פרק ההיעדרות" הנוכחי
 * בלבד, לא לנצח - ראו ההסבר המלא ב-0070_outreach_contacts.sql
 * וב-getNeedsOutreachMembers (lib/data.ts): אם האדם חוזר להגיע ואז
 * שוב נעדר, הוא חוזר לכאן *לא מסומן*, כי lastAttendedEventId השתנה
 * בינתיים ו-contacted מחושב מחדש מול הערך החדש בכל טעינה. אין צורך
 * ב-router.refresh() אחרי לחיצה - זה עדכון לצפייה הבאה, לא משהו
 * שמשנה את הרשימה הנוכחית בעמוד הזה.
 */
export function OutreachCheckbox({
  clubId,
  profileId,
  fullName,
  lastAttendedEventId,
  initialContacted,
}: {
  clubId: string;
  profileId: string;
  fullName: string;
  lastAttendedEventId: string;
  initialContacted: boolean;
}) {
  const [contacted, setContacted] = useState(initialContacted);
  const [pending, setPending] = useState(false);

  async function toggle() {
    if (pending) return;
    const next = !contacted;
    setContacted(next);
    setPending(true);

    try {
      if (demoMode) {
        if (next) await setOutreachContactAction(profileId, lastAttendedEventId);
        else await clearOutreachContactAction(profileId);
        return;
      }

      const supabase = createClient();
      const { error } = next
        ? await supabase.from("outreach_contacts").upsert(
            {
              club_id: clubId,
              profile_id: profileId,
              last_attended_event_id: lastAttendedEventId,
            },
            { onConflict: "club_id,profile_id" },
          )
        : await supabase
            .from("outreach_contacts")
            .delete()
            .eq("club_id", clubId)
            .eq("profile_id", profileId);

      if (error) setContacted(!next);
    } catch {
      setContacted(!next);
    } finally {
      setPending(false);
    }
  }

  return (
    <input
      type="checkbox"
      checked={contacted}
      onChange={toggle}
      disabled={pending}
      aria-label={`דיברתי עם ${fullName}`}
      className="size-5 shrink-0 self-center rounded border-(--color-line) accent-(--color-sea) disabled:opacity-50"
    />
  );
}
