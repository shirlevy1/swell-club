"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { isValidIsraeliId } from "@/lib/format";
import { Button, Card, Field, Input, Notice } from "@/components/ui";

/**
 * מסך חוסם לחברי קהילה (לא מנהלת, ראו id-number-banner.tsx) שעדיין
 * אין להם/ן תעודת זהות/רחוב שמור/ה - בעיקר חשבונות ישנים שנרשמו
 * לפני migration 0081, אבל גם מי שלא ניגש/ה אל עריכת הפרופיל מאז.
 * אותו דפוס בדיוק כמו legal-update-gate.tsx - מוצג במקום children
 * ב-(app)/layout.tsx.
 */
export function IdNumberGate({ profileId }: { profileId: string }) {
  const router = useRouter();
  const [idNumber, setIdNumber] = useState("");
  const [street, setStreet] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    if (!isValidIsraeliId(idNumber)) return setError("מספר תעודת הזהות לא נראה תקין.");
    if (!street.trim()) return setError("צריך למלא רחוב ומספר בית.");

    setPending(true);
    try {
      const supabase = createClient();
      const { error: upsertError } = await supabase
        .from("profile_private_info")
        .upsert(
          {
            profile_id: profileId,
            id_number: idNumber.trim(),
            street: street.trim(),
            updated_at: new Date().toISOString(),
          },
          { onConflict: "profile_id" },
        );
      setPending(false);
      if (upsertError) return setError("לא הצלחנו לשמור. נסו שוב.");
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
            עוד שני פרטים
          </h1>
          <p className="text-sm leading-relaxed text-(--color-ink-soft)">
            תעודת זהות וכתובת מגורים נדרשות כדי להמשיך - נגישות רק
            למנהלת הקהילה, לעולם לא לחברי קהילה אחרים.
          </p>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          <Field label="תעודת זהות">
            <Input
              type="text"
              inputMode="numeric"
              autoComplete="off"
              dir="ltr"
              maxLength={9}
              placeholder="123456789"
              value={idNumber}
              onChange={(e) => setIdNumber(e.target.value)}
              className="text-left"
            />
          </Field>

          <Field label="רחוב ומספר בית">
            <Input
              value={street}
              onChange={(e) => setStreet(e.target.value)}
              autoComplete="address-line1"
            />
          </Field>

          {error && <Notice tone="error">{error}</Notice>}

          <Button type="submit" disabled={pending} className="w-full">
            {pending ? "שומרים…" : "שמירה והמשך"}
          </Button>
        </form>
      </Card>
    </div>
  );
}
