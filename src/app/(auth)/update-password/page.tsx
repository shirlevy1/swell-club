"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { demoMode } from "@/lib/config";
import { authErrorMessage } from "@/lib/auth-errors";
import { PasswordInput } from "@/components/password-input";
import { Button, Field, Notice } from "@/components/ui";

export default function UpdatePasswordPage() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // מגיעים לכאן רק דרך קישור איפוס שנשלח במייל, שיוצר סשן זמני
  // אוטומטית ברגע שהעמוד נטען. בלי הבדיקה הזו, קישור פג-תוקף/שכבר
  // נוצל (או פשוט הקלדת הכתובת ידנית) היה מציג את הטופס כרגיל, והכשל
  // היה מתגלה רק אחרי לחיצה על "שמירה" — בשגיאה אנגלית גולמית.
  const [checking, setChecking] = useState(!demoMode);
  const [linkValid, setLinkValid] = useState(demoMode);

  useEffect(() => {
    if (demoMode) return;
    let cancelled = false;
    createClient()
      .auth.getUser()
      .then(({ data }) => {
        if (cancelled) return;
        setLinkValid(!!data.user);
        setChecking(false);
      })
      .catch(() => {
        if (cancelled) return;
        setLinkValid(false);
        setChecking(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    const password = String(new FormData(e.currentTarget).get("password") ?? "");
    if (password.length < 8) return setError("הסיסמה צריכה להיות באורך 8 תווים לפחות.");

    setPending(true);
    const supabase = createClient();

    // כשל רשת אמיתי זורק חריגה במקום להחזיר error מסודר — בלי
    // try/catch הכפתור היה נשאר נעול על "רגע…" לצמיתות.
    try {
      const { error: updateError } = await supabase.auth.updateUser({
        password,
      });
      setPending(false);

      if (updateError) {
        return setError(
          authErrorMessage(updateError, "לא הצלחנו לעדכן את הסיסמה. נסו שוב."),
        );
      }

      router.push("/events");
      router.refresh();
    } catch {
      setPending(false);
      setError("משהו השתבש. בדקו את החיבור ונסו שוב.");
    }
  }

  if (checking) return null;

  if (!linkValid) {
    return (
      <div className="space-y-6">
        <h1 className="text-center font-[family-name:var(--font-display)] text-2xl font-bold">
          סיסמה חדשה
        </h1>
        <Notice tone="error">
          הקישור לא תקין או שפג תוקפו. בקשו קישור חדש מעמוד ההתחברות.
        </Notice>
        <Link
          href="/login"
          className="block text-center text-sm font-semibold text-(--color-sea)"
        >
          למסך ההתחברות
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-center font-[family-name:var(--font-display)] text-2xl font-bold">
        סיסמה חדשה
      </h1>
      <form onSubmit={onSubmit} className="space-y-4">
        <Field label="סיסמה חדשה" hint="לפחות 8 תווים">
          <PasswordInput
            name="password"
            autoComplete="new-password"
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
