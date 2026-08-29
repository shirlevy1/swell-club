"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { demoMode } from "@/lib/config";
import { authErrorMessage } from "@/lib/auth-errors";
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
  const [resendSent, setResendSent] = useState(false);
  const [email, setEmail] = useState("");

  // מגיעים לכאן עם אלה כשקישור ממייל (auth/confirm) נכשל — הקישור
  // עצמו כבר "צעק" מה קרה (bad_link/expired_link + הסוג), רק שעד עכשיו
  // שום דבר במסך לא הקשיב לזה, והמשתמשת פשוט ראתה מסך התחברות ריק.
  const linkError = params.get("error");
  const linkErrorType = params.get("type");

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
          authErrorMessage(signInError, "לא הצלחנו להתחבר. נסו שוב."),
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
    if (!email) return setError("קודם הקלידו אימייל, ואז לחצו על ״שכחתי סיסמה״.");
    setError(null);
    const supabase = createClient();
    try {
      const { error: resetError } =
        await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/update-password`,
        });
      if (resetError) {
        return setError(
          authErrorMessage(resetError, "לא הצלחנו לשלוח את המייל. נסו שוב בעוד רגע."),
        );
      }
      setResetSent(true);
    } catch {
      setError("משהו השתבש. בדקו את החיבור ונסו שוב.");
    }
  }

  // "בקשו קישור חדש" למייל אישור הרשמה שפג תוקף: לא לנסות להירשם שוב
  // (זה נכשל — הטלפון כבר תפוס מההרשמה הראשונה, גם אם לא אושרה) אלא
  // resend ייעודי, שלא עובר דרך signUp() ולא נתקל בבדיקת הטלפון שלנו.
  async function onResendConfirmation() {
    if (!email) return setError("קודם הקלידו את האימייל שנרשמתם איתו.");
    setError(null);
    try {
      const { error: resendError } = await createClient().auth.resend({
        type: "signup",
        email,
      });
      if (resendError) {
        return setError(
          authErrorMessage(resendError, "לא הצלחנו לשלוח את המייל. נסו שוב בעוד רגע."),
        );
      }
      setResendSent(true);
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

      {linkError === "bad_link" && (
        <Notice tone="error">הקישור לא תקין.</Notice>
      )}

      {linkError === "expired_link" && linkErrorType === "recovery" && (
        <Notice tone="warn">
          קישור איפוס הסיסמה פג תוקף או שכבר נוצל. אפשר לבקש קישור חדש עם
          ״שכחתי סיסמה״ למטה.
        </Notice>
      )}

      {linkError === "expired_link" && linkErrorType === "signup" && (
        <Notice tone={resendSent ? "good" : "warn"}>
          {resendSent ? (
            "שלחנו קישור אישור חדש. בדקו את המייל."
          ) : (
            <>
              קישור האישור פג תוקף. הקלידו למטה את האימייל שנרשמתם איתו,
              ואז{" "}
              <button
                type="button"
                onClick={onResendConfirmation}
                className="font-semibold underline underline-offset-4"
              >
                שליחת קישור אישור חדש
              </button>
              .
            </>
          )}
        </Notice>
      )}

      {linkError === "expired_link" &&
        linkErrorType !== "recovery" &&
        linkErrorType !== "signup" && (
          <Notice tone="warn">הקישור פג תוקף או שכבר נוצל. בקשו קישור חדש.</Notice>
        )}

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
