"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { CURRENT_LEGAL_VERSION } from "@/lib/legal";

/**
 * גרסת מנהלת ל-legal-update-gate.tsx - לא חוסמת: המנהלת היא זו
 * שמבקשת את שינויי הטקסט המשפטי, אז אין מצב שהיא "לא יודעת" שהוא
 * השתנה, בשונה מחבר/ת קהילה רגיל/ה. חסימה מלאה שלה הייתה מסוכנת
 * יותר ממה שהיא שווה - היא היחידה שמנהלת את הקהילה, ובאג במסך
 * החוסם היה נועל אותה גם מ-/admin.
 */
export function LegalUpdateBanner({ profileId }: { profileId: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  async function onAccept() {
    setPending(true);
    try {
      const supabase = createClient();
      await supabase
        .from("profiles")
        .update({
          legal_version: CURRENT_LEGAL_VERSION,
          waiver_accepted_at: new Date().toISOString(),
          privacy_accepted_at: new Date().toISOString(),
          legal_version_updated_at: new Date().toISOString(),
        })
        .eq("id", profileId);
      setDismissed(true);
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  if (dismissed) return null;

  return (
    <div className="mb-3 flex items-center justify-between gap-3 rounded-xl border border-(--color-line) bg-(--color-haze) px-3 py-2.5 text-sm">
      <span className="text-(--color-ink-soft)">הטקסט המשפטי עודכן.</span>
      <button
        type="button"
        onClick={onAccept}
        disabled={pending}
        className="shrink-0 text-sm font-bold text-(--color-sea) disabled:opacity-50"
      >
        {pending ? "…" : "ראיתי, אישרתי"}
      </button>
    </div>
  );
}
