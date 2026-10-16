"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { demoMode } from "@/lib/config";
import { updateWhatsappLinkAction } from "@/lib/demo/actions";
import { Button, Card, Field, Input, Notice } from "./ui";

/**
 * טופס עריכת קישור קבוצת הוואטסאפ שמוצג בדף הבית (whatsapp-group-card-row.tsx)
 * - מנהלת בלבד, אותו עמוד ניהול כמו הרייל באינסטגרם (admin/instagram).
 */
export function WhatsappGroupSettingsForm({
  clubId,
  currentLink,
}: {
  clubId: string;
  currentLink: string | null;
}) {
  const router = useRouter();
  const [link, setLink] = useState(currentLink ?? "");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    setPending(true);

    try {
      const trimmedLink = link.trim() || null;

      if (demoMode) {
        await updateWhatsappLinkAction(trimmedLink);
      } else {
        const supabase = createClient();
        const { error: rpcError } = await supabase.rpc("update_club_whatsapp_link", {
          p_club_id: clubId,
          p_link: trimmedLink,
        });
        if (rpcError) throw rpcError;
      }

      setPending(false);
      setSuccess(true);
      router.refresh();
    } catch {
      setPending(false);
      setError("משהו השתבש. בדקו את החיבור ונסו שוב.");
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <Card className="space-y-4">
        <Field label="קישור לקבוצת הוואטסאפ של Swell Club">
          <Input
            type="text"
            dir="ltr"
            placeholder="https://chat.whatsapp.com/…"
            value={link}
            onChange={(e) => {
              setLink(e.target.value);
              setSuccess(false);
            }}
            className="text-left"
          />
        </Field>
      </Card>

      {error && <Notice tone="error">{error}</Notice>}
      {success && <Notice tone="good">נשמר. דף הבית מציג את הגרסה המעודכנת.</Notice>}

      <Button type="submit" disabled={pending} className="w-full">
        {pending ? "שומרים…" : "שמירה"}
      </Button>
    </form>
  );
}
