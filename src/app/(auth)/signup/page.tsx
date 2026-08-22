"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { isValidIsraeliPhone, normalizeInstagram } from "@/lib/format";
import { demoMode } from "@/lib/config";
import { CityAutocomplete } from "@/components/city-autocomplete";
import { BirthDateInput } from "@/components/birth-date-input";
import { GenderInput } from "@/components/gender-input";
import { SwimLevelInput } from "@/components/swim-level-input";
import { Button, Field, Input, Notice } from "@/components/ui";

const MIN_AGE = 20;
const MAX_AGE = 40;

/** גיל מלא נכון להיום, לא רק הפרש שנים — 31.12.2005 הוא לא בן 21 ב-1.1.2026. */
function ageInYears(birthDate: string): number {
  const b = new Date(birthDate);
  const today = new Date();
  let age = today.getFullYear() - b.getFullYear();
  const hasHadBirthdayThisYear =
    today.getMonth() > b.getMonth() ||
    (today.getMonth() === b.getMonth() && today.getDate() >= b.getDate());
  if (!hasHadBirthdayThisYear) age--;
  return age;
}

export default function SignupPage() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [needsEmailConfirm, setNeedsEmailConfirm] = useState(false);


  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    const form = new FormData(e.currentTarget);
    const fullName = String(form.get("full_name") ?? "").trim();
    const gender = String(form.get("gender") ?? "").trim();
    const email = String(form.get("email") ?? "").trim();
    const password = String(form.get("password") ?? "");
    const phone = String(form.get("phone") ?? "").trim();
    const birthDate = String(form.get("birth_date") ?? "").trim();
    const city = String(form.get("city") ?? "").trim();
    const swimLevel = String(form.get("swim_level") ?? "").trim();
    const instagram = normalizeInstagram(String(form.get("instagram") ?? ""));
    const waiverAccepted = form.get("waiver_accepted") === "on";

    if (fullName.length < 2) return setError("צריך שם מלא.");
    if (!gender) return setError("צריך לבחור מגדר.");
    if (password.length < 8) return setError("הסיסמה צריכה להיות באורך 8 תווים לפחות.");
    if (!isValidIsraeliPhone(phone))
      return setError("מספר הפלאפון לא נראה תקין.");
    if (!birthDate) return setError("צריך תאריך לידה.");
    if (ageInYears(birthDate) < MIN_AGE || ageInYears(birthDate) > MAX_AGE)
      return setError(`ההצטרפות לקהילה פתוחה לגילאי ${MIN_AGE}-${MAX_AGE}.`);
    if (!city) return setError("צריך לבחור עיר מגורים.");
    if (!swimLevel) return setError("צריך לבחור מה הכי מתאר אתכם במים.");
    if (!waiverAccepted)
      return setError("צריך לאשר את כתב הוויתור כדי להצטרף.");

    // בהדגמה אין Supabase לקרוא אליו — הטופס רק מדמה הרשמה אמיתית
    if (demoMode) {
      router.push("/events");
      router.refresh();
      return;
    }

    setPending(true);
    const supabase = createClient();

    // בדיקה מוקדמת, לפני יצירת המשתמש בכלל — כך לא נשארת התחלה של
    // הרשמה תקועה באמצע רק כי הטלפון כבר בשימוש. אימייל כפול כבר
    // נבדק אוטומטית ע"י Supabase Auth, אין צורך לבדוק אותו ידנית.
    const { data: phoneAvailable, error: phoneCheckError } =
      await supabase.rpc("is_phone_available", { p_phone: phone });
    if (phoneCheckError) {
      setPending(false);
      return setError("לא הצלחנו לבדוק את מספר הטלפון. נסו שוב.");
    }
    if (!phoneAvailable) {
      setPending(false);
      return setError(
        "מספר הטלפון הזה כבר משויך לחשבון קיים. אם זה החשבון שלכם, אפשר להתחבר במקום להירשם.",
      );
    }

    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        // נקרא ע"י handle_new_user() ליצירת הפרופיל
        data: {
          full_name: fullName,
          gender,
          phone,
          birth_date: birthDate,
          city,
          swim_level: swimLevel,
          instagram,
        },
      },
    });
    setPending(false);

    if (signUpError) {
      setError(
        signUpError.message.includes("already registered")
          ? "האימייל הזה כבר רשום. אפשר להתחבר."
          : signUpError.message,
      );
      return;
    }

    // אם אימות אימייל פעיל ב-Supabase, אין session עד שמאשרים
    if (!data.session) {
      setNeedsEmailConfirm(true);
      return;
    }

    router.push("/events");
    router.refresh();
  }

  if (needsEmailConfirm) {
    return (
      <div className="space-y-4">
        <Notice tone="good">
          שלחנו לכם מייל אישור. אחרי שתאשרו — אפשר להתחבר.
        </Notice>
        <Link
          href="/login"
          className="block text-center text-sm text-(--color-sea)"
        >
          למסך ההתחברות
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1 text-center">
        <h1 className="font-[family-name:var(--font-display)] text-2xl font-bold">
          הצטרפות לקהילה
        </h1>
        <p className="text-sm text-(--color-ink-soft)">
          פעם אחת, ואתם בפנים.
        </p>
      </div>

      <form onSubmit={onSubmit} className="space-y-4">
        <Field label="שם מלא">
          <Input name="full_name" autoComplete="name" required />
        </Field>

        <Field label="מגדר">
          <GenderInput name="gender" />
        </Field>

        <Field label="אימייל" hint="משמש להתחברות ולשחזור סיסמה">
          <Input
            name="email"
            type="email"
            inputMode="email"
            autoComplete="email"
            dir="ltr"
            required
            className="text-left"
          />
        </Field>

        <Field label="סיסמה" hint="לפחות 8 תווים">
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

        <Field label="תאריך לידה">
          <BirthDateInput name="birth_date" />
        </Field>

        <Field label="מספר טלפון" hint="כדי להמשיך את השיחה גם מחוץ למים.">
          <Input
            name="phone"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            dir="ltr"
            required
            placeholder="050-1234567"
            className="text-left"
          />
        </Field>

        <Field label="אינסטגרם" hint="כדי להכיר את מי שמאחורי השחייה.">
          <Input
            name="instagram"
            autoComplete="off"
            dir="ltr"
            placeholder="@username"
            className="text-left"
          />
        </Field>

        <Field label="עיר מגורים">
          <CityAutocomplete name="city" />
        </Field>

        <Field label="מה הכי מתאר אתכם במים?">
          <SwimLevelInput name="swim_level" />
        </Field>

        <p className="text-xs leading-relaxed text-(--color-ink-faint)">
          בהרשמה אתם מסכימים שהשם, התמונה והאינסטגרם שלכם יוצגו לחברי
          קהילה אחרים <strong className="text-(--color-ink-soft)">שנכחו
          באותו מפגש כמוכם</strong> — ולא לאף אחד אחר.
        </p>

        <div className="space-y-3">
          <div className="max-h-40 space-y-2 overflow-y-auto rounded-xl border border-(--color-line) bg-(--color-haze) p-4 text-xs leading-relaxed text-(--color-ink-soft)">
            <p className="font-bold text-(--color-ink)">
              כתב ויתור – השתתפות על אחריות אישית בלבד
            </p>
            <p>
              בהצטרפות לכל פעילות של Swell Club (לרבות שחייה משותפת, מפגשים
              ואירועים), אני מאשר/ת כי השתתפותי היא מרצוני החופשי ועל
              אחריותי האישית בלבד.
            </p>
            <p>
              ידוע לי כי שחייה במים פתוחים כרוכה בסיכונים, לרבות תנאי ים
              משתנים, זרמים, גלים וסיכונים נוספים הנובעים מהשהייה בים.
            </p>
            <p>
              אני מצהיר/ה כי אני אחראי/ת לוודא שמצבי הבריאותי, הכושר הגופני
              והיכולת האישית שלי מתאימים להשתתפות בפעילות, וכי אני
              מתחייב/ת לפעול בהתאם להנחיות צוות Swell Club במהלך המפגשים.
            </p>
            <p>
              אני מבין/ה כי צוות Swell Club אינו אחראי לכל פגיעה, נזק,
              אובדן או הוצאה שעלולים להיגרם לפני, במהלך או לאחר הפעילות,
              בכפוף לכל דין.
            </p>
          </div>

          <label className="flex items-start gap-2.5 text-sm text-(--color-ink)">
            <input
              type="checkbox"
              name="waiver_accepted"
              required
              className="mt-0.5 size-5 shrink-0 rounded border-(--color-line) accent-(--color-sea)"
            />
            <span>
              קראתי ואני מאשר/ת את כתב הוויתור שלמעלה. בלי אישור אי אפשר
              להצטרף לקהילה.
            </span>
          </label>
        </div>

        {error && <Notice tone="error">{error}</Notice>}

        <Button type="submit" disabled={pending} className="w-full">
          {pending ? "רגע…" : "הצטרפות"}
        </Button>
      </form>

      <p className="text-center text-sm text-(--color-ink-soft)">
        כבר חלק מהקהילה?{" "}
        <Link href="/login" className="font-semibold text-(--color-sea)">
          התחברות
        </Link>
      </p>
    </div>
  );
}
