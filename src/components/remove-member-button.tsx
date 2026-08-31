"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { demoMode } from "@/lib/config";
import { removeMemberAction } from "@/lib/demo/actions";
import { XIcon } from "./social-icons";

/**
 * הסרת חבר/ה מהקהילה ע"י המנהלת. מוחקת רק את שורת החברות — הפרופיל,
 * הסלפים וההיסטוריה נשארים (person_card() כבר תומכת בזה, ראו 0027).
 * בכוונה אין דרך לחזור מלבד הצטרפות כמשתמש חדש לגמרי — משימה עתידית.
 */
export function RemoveMemberButton({
  profileId,
  fullName,
}: {
  profileId: string;
  fullName: string;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleRemove() {
    const ok = window.confirm(
      `להסיר את ${fullName} מהקהילה? הם לא יראו יותר מפגשים או אנשים באפליקציה. אין דרך אוטומטית לחזור — רק הרשמה כמשתמש/ת חדש/ה לגמרי.`,
    );
    if (!ok) return;

    setError(null);
    setPending(true);

    if (demoMode) {
      await removeMemberAction(profileId);
      setPending(false);
      router.refresh();
      return;
    }

    const { error: rpcError } = await createClient().rpc("remove_member", {
      p_profile_id: profileId,
    });
    setPending(false);
    if (rpcError) {
      setError("לא הצלחנו להסיר. נסו שוב.");
      return;
    }
    router.refresh();
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        disabled={pending}
        onClick={handleRemove}
        aria-label={`הסרת ${fullName} מהקהילה`}
        className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-(--color-line) bg-(--color-haze) text-(--color-fail) transition hover:border-(--color-fail)/50 hover:bg-(--color-fail)/10 disabled:opacity-50"
      >
        <XIcon className="size-3.5" />
      </button>
      {error && (
        <p className="max-w-32 text-end text-[0.65rem] text-(--color-fail)">
          {error}
        </p>
      )}
    </div>
  );
}
