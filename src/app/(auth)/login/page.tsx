"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { demoMode } from "@/lib/config";
import { PasswordInput } from "@/components/password-input";
import { Button, Field, Input, Notice } from "@/components/ui";

/**
 * `?next=` מגיע מכתובת שמישהו יכול לשלוח בוואטסאפ. בלי הסינון הזה
 * `?next=https://swell-fake.example/login` מעביר את המשתמש, מיד אחרי
 * התחברות מוצלחת, לעמוד התחברות מזויף — והוא כבר סומך על מה שרואה.
 * מותר רק מסלול פנימי; `//host` נחסם כי הדפדפן קורא אותו כדומיין אחר.
 */
function safeNext(next: string | null): string {
  if (!next || !next.startsWith("/") || next.startsWith("//")) return "/events";
  return next;
}

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resetSent, setResetSent] = useState(false);
  const [email, setEmail] = useState("");

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    // בהדגמה אין Supabase לקרוא אליו — הטופס רק מדמה התחברות אמיתית
    if (demoMode) {
      router.push(safeNext(params.get("next")));
      router.refresh();
      return;
    }

    setPending(true);
    const form = new FormData(e.currentTarget);
    const supabase = createClient();

    // כשל רשת אמיתי (לא רק שגיאת התחברות רגילה) זורק חריגה במקום
    // להחזיר error מסודר — בלי try/catch הכפתור היה נשאר נעול על
    // "רגע…" לצמיתות, בלי שום הודעה.
    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: String(form.get("email") ?? "").trim(),
        password: String(form.get("password") ?? ""),
      });
      setPending(false);

      if (signInError) {
        setError(
          signInError.message.includes("Invalid login")
            ? "אימייל או סיסמה לא נכונים."
            : signInError.message.includes("Email not confirmed")
              ? "קודם צריך לאשר את המייל שנשלח אליכם."
              : signInError.message,
        );
        return;
      }

      router.push(safeNext(params.get("next")));
      router.refresh();
    } catch {
      setPending(false);
      setError("משהו השתבש. בדקו את החיבור ונסו שוב.");
    }
  }

  async function onReset() {
    if (!email) return setError("קודם הקלידו אימייל, ואז לחצו על שחזור.");
    setError(null);
    const supabase = createClient();
    try {
      const { error: resetError } =
        await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/update-password`,
        });
      if (resetError) {
        return setError(
          resetError.message.includes("rate limit")
            ? "יותר מדי בקשות איפוס בזמן קצר. חכו כמה דקות ונסו שוב."
            : "לא הצלחנו לשלוח את המייל. נסו שוב בעוד רגע.",
        );
      }
      setResetSent(true);
    } catch {
      setError("משהו השתבש. בדקו את החיבור ונסו שוב.");
    }
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1 text-center">
        <h1 className="font-[family-name:var(--font-display)] text-2xl font-bold">
          התחברות
        </h1>
      </div>

      <form onSubmit={onSubmit} className="space-y-4">
        <Field label="אימייל">
          <Input
            name="email"
            type="email"
            inputMode="email"
            autoComplete="email"
            dir="ltr"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="text-left"
          />
        </Field>

        <Field label="סיסמה">
          <PasswordInput
            name="password"
            autoComplete="current-password"
            required
            className="text-left"
          />
        </Field>

        {resetSent && (
          <Notice tone="good">שלחנו לכם מייל לאיפוס סיסמה.</Notice>
        )}
        {error && <Notice tone="error">{error}</Notice>}

        <Button type="submit" disabled={pending} className="w-full">
          {pending ? "רגע…" : "כניסה"}
        </Button>
      </form>

      <div className="space-y-3 text-center text-sm">
        {!demoMode && (
          <button
            type="button"
            onClick={onReset}
            className="text-(--color-ink-faint) underline underline-offset-4"
          >
            שכחתי סיסמה
          </button>
        )}
        <p className="text-(--color-ink-soft)">
          עוד לא רשומים?{" "}
          <Link href="/signup" className="font-semibold text-(--color-sea)">
            הצטרפות
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
