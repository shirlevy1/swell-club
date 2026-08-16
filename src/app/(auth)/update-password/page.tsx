"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button, Field, Input, Notice } from "@/components/ui";

export default function UpdatePasswordPage() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);


  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    const password = String(new FormData(e.currentTarget).get("password") ?? "");
    if (password.length < 8) return setError("הסיסמה צריכה להיות באורך 8 תווים לפחות.");

    setPending(true);
    const supabase = createClient();
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setPending(false);

    if (updateError) return setError(updateError.message);

    router.push("/events");
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <h1 className="text-center font-[family-name:var(--font-display)] text-2xl font-bold">
        סיסמה חדשה
      </h1>
      <form onSubmit={onSubmit} className="space-y-4">
        <Field label="סיסמה חדשה" hint="לפחות 8 תווים">
          <Input
            name="password"
            type="password"
            autoComplete="new-password"
            dir="ltr"
            required
            minLength={8}
            className="text-left"
          />
        </Field>
        {error && <Notice tone="error">{error}</Notice>}
        <Button type="submit" disabled={pending} className="w-full">
          {pending ? "רגע…" : "שמירה"}
        </Button>
      </form>
    </div>
  );
}
