"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { demoMode } from "@/lib/config";
import { removeMemberAction } from "@/lib/demo/actions";
import { byGender } from "@/lib/format";
import type { Gender } from "@/lib/types";
import { Notice } from "./ui";
import { useConfirmDialog } from "./confirm-dialog";

/**
 * הסרת חבר/ה מהקהילה ע"י המנהלת. לא מוחקת שורה — מסמנת אותה 'removed'
 * (מחיקה רכה, migration 0036). הפרופיל, הסלפים וההיסטוריה נשארים
 * (person_card() כבר תומכת בזה, ראו 0027), וגם אפשר לשחזר חברות מ-
 * "עזבו/הוסרו" בעמוד הניהול — בלי הרשמה מחדש עם אימייל אחר.
 *
 * מוצג רק בעמוד הפרופיל של החבר/ה עצמו/ה בצד הניהול (admin/members/[id]),
 * לא ברשימת חברי הקהילה — לפי בקשת שיר: כפתור הסרה שפחות נגיש
 * מכוון, כמו "עזיבת הקהילה" בעמוד הפרופיל הרגיל (leave-community-
 * button.tsx), שהעיצוב הזה מחקה בכוונה.
 */
export function RemoveMemberButton({
  profileId,
  fullName,
  gender,
}: {
  profileId: string;
  fullName: string;
  gender: Gender | null;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { confirm, dialog } = useConfirmDialog();

  async function handleRemove() {
    const ok = await confirm({
      title: `להסיר את ${fullName} מ־Swell Club?`,
      body: `${byGender(gender, "הוא לא יראה", "היא לא תראה")} יותר מפגשים או אנשים בקהילה.\nאפשר להחזיר ${byGender(gender, "אותו", "אותה")} לגל בכל שלב דרך "עזבו/הוסרו" בעמוד הניהול.`,
      confirmText: "כן, להסיר",
      tone: "danger",
    });
    if (!ok) return;

    setError(null);
    setPending(true);

    if (demoMode) {
      await removeMemberAction(profileId);
      setPending(false);
      router.refresh();
      return;
    }

    try {
      const { error: rpcError } = await createClient().rpc("remove_member", {
        p_profile_id: profileId,
      });
      setPending(false);
      if (rpcError) {
        setError("לא הצלחנו להסיר. נסו שוב.");
        return;
      }
      router.refresh();
    } catch {
      setPending(false);
      setError("משהו השתבש. בדקו את החיבור ונסו שוב.");
    }
  }

  return (
    <div className="space-y-2 text-center">
      <button
        type="button"
        onClick={handleRemove}
        disabled={pending}
        className="min-h-11 text-sm text-(--color-fail) disabled:opacity-50"
      >
        {pending ? "מסירים…" : "הסרה מהקהילה"}
      </button>
      {error && <Notice tone="error">{error}</Notice>}
      {dialog}
    </div>
  );
}
