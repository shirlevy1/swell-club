"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { demoMode } from "@/lib/config";
import { restoreMemberAction } from "@/lib/demo/actions";
import { Notice } from "./ui";

/**
 * שחזור חברות למי שהוסר/ה, עזב/ה, או נדחה/תה (status='removed',
 * migration 0036). לא מחזיר/ה ישר לחברות מלאה — לפי בקשה מפורשת,
 * חוזר/ת ל"ממתין/ה לאישור" ועובר/ת שוב את אותו תהליך אישור כמו כל
 * בקשת הצטרפות חדשה. בלי אישור נוסף לפני לחיצה, בדיוק כמו כפתור
 * האישור ב-pending-member-row — זו לא פעולה הרסנית.
 */
export function RestoreMemberButton({
  profileId,
  fullName,
}: {
  profileId: string;
  fullName: string;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function restore() {
    setError(null);
    setPending(true);

    if (demoMode) {
      await restoreMemberAction(profileId);
      setPending(false);
      router.refresh();
      return;
    }

    try {
      const supabase = createClient();
      const { error: rpcError } = await supabase.rpc("restore_member", {
        p_profile_id: profileId,
      });
      setPending(false);
      if (rpcError) return setError("לא הצלחנו לשחזר. נסו שוב.");
      router.refresh();
    } catch {
      setPending(false);
      setError("משהו השתבש. בדקו את החיבור ונסו שוב.");
    }
  }

  return (
    <div className="space-y-1.5">
      <button
        type="button"
        disabled={pending}
        onClick={restore}
        aria-label={`שחזור חברות של ${fullName}`}
        className="min-h-9 shrink-0 rounded-lg border border-(--color-sea) px-3 text-xs font-semibold text-(--color-sea) transition hover:bg-(--color-sea)/10 disabled:opacity-50"
      >
        {pending ? "משחזרים…" : "שחזור"}
      </button>
      {error && <Notice tone="error">{error}</Notice>}
    </div>
  );
}
