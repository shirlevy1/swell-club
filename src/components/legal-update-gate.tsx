"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { CURRENT_LEGAL_VERSION } from "@/lib/legal";
import { FullLegalDisclosure } from "@/components/legal-text";
import { Button, Card, Notice } from "@/components/ui";

/**
 * מסך חוסם לחברי קהילה (לא מנהלת, ראו legal-update-banner.tsx)
 * כש-legal_version של הפרופיל ישן מ-CURRENT_LEGAL_VERSION - מוצג
 * במקום children ב-(app)/layout.tsx, אותו דפוס בדיוק כמו מסכי
 * "ממתינים לאישור"/"כבר לא חלק מהקהילה" הקיימים שם. legal_version
 * לא נעול ע"י שום טריגר (רק waiver/privacy_accepted_at נעולים,
 * migration 0031) - עדכון ישיר דרך RLS "profiles_update_own" מספיק,
 * אותו דפוס כמו profile-form.tsx.
 */
export function LegalUpdateGate({ profileId }: { profileId: string }) {
  const router = useRouter();
  const [checked, setChecked] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onAccept() {
    if (!checked) return;
    setPending(true);
    setError(null);
    try {
      const supabase = createClient();
      const { error: updateError } = await supabase
        .from("profiles")
        .update({
          legal_version: CURRENT_LEGAL_VERSION,
          // לא נדרסים אם כבר יש ערך (טריגר lock_profile_consent_timestamps,
          // migration 0031) - רק קובעים לראשונה לחשבון ישן מאוד שעדיין null.
          waiver_accepted_at: new Date().toISOString(),
          privacy_accepted_at: new Date().toISOString(),
          // בניגוד לשתי אלה - לא נעול, מתעדכן בכל אישור כולל חוזר
          // (migration 0074).
          legal_version_updated_at: new Date().toISOString(),
        })
        .eq("id", profileId);
      setPending(false);
      if (updateError) return setError("לא הצלחנו לשמור. נסו שוב.");
      router.refresh();
    } catch {
      setPending(false);
      setError("משהו השתבש. בדקו את החיבור ונסו שוב.");
    }
  }

  return (
    <div className="flex flex-1 items-center pt-10">
      <Card className="w-full space-y-4">
        <div className="space-y-1 text-center">
          <h1 className="font-[family-name:var(--font-display)] text-xl font-bold">
            עדכנו את הטקסט המשפטי שלנו
          </h1>
          <p className="text-sm leading-relaxed text-(--color-ink-soft)">
            כדי להמשיך להשתמש ב-Swell Club, צריך לאשר את הנוסח המעודכן.
          </p>
        </div>

        <div className="max-h-80 space-y-4 overflow-y-auto rounded-xl border border-(--color-line) bg-(--color-haze) p-4 text-xs leading-relaxed text-(--color-ink-soft)">
          <FullLegalDisclosure />
        </div>

        <label className="flex items-start gap-2.5 text-sm text-(--color-ink)">
          <input
            type="checkbox"
            checked={checked}
            onChange={(e) => setChecked(e.target.checked)}
            className="mt-0.5 size-5 shrink-0 rounded border-(--color-line) accent-(--color-sea)"
          />
          <span>קראתי ואני מאשר/ת את הטקסט המעודכן שלמעלה.</span>
        </label>

        {error && <Notice tone="error">{error}</Notice>}

        <Button
          type="button"
          onClick={onAccept}
          disabled={!checked || pending}
          className="w-full"
        >
          {pending ? "רגע…" : "אישור והמשך"}
        </Button>
      </Card>
    </div>
  );
}
