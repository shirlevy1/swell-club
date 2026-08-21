"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { demoMode } from "@/lib/config";
import { updateProfileAction } from "@/lib/demo/actions";
import { isValidIsraeliPhone, normalizeInstagram } from "@/lib/format";
import { CityAutocomplete } from "@/components/city-autocomplete";
import { BirthDateInput } from "@/components/birth-date-input";
import { GenderInput } from "@/components/gender-input";
import type { Gender, Profile } from "@/lib/types";
import { Button, Card, Field, Input, Notice } from "./ui";

export function ProfileForm({ profile }: { profile: Profile }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    const form = new FormData(e.currentTarget);
    const fullName = String(form.get("full_name") ?? "").trim();
    const gender = String(form.get("gender") ?? "").trim();
    const phone = String(form.get("phone") ?? "").trim();
    const birthDate = String(form.get("birth_date") ?? "").trim();
    const city = String(form.get("city") ?? "").trim();
    const waiverAccepted = form.get("waiver_accepted") === "on";

    if (fullName.length < 2) return setError("צריך שם מלא.");
    if (!gender) return setError("צריך לבחור מגדר.");
    if (!isValidIsraeliPhone(phone))
      return setError("מספר הפלאפון לא נראה תקין.");
    if (!birthDate) return setError("צריך תאריך לידה.");
    if (!city) return setError("צריך לבחור עיר מגורים.");
    if (!waiverAccepted)
      return setError("צריך לאשר את כתב הוויתור כדי לשמור.");

    // waiver_accepted_at לא משתנה כאן — הוא מתעד מתי אושר לראשונה,
    // לא מתי נערך הפרופיל. התיבה היא רק שער לשמירה, לא כתיבה מחדש.
    const patch = {
      full_name: fullName,
      gender: gender as Gender,
      phone,
      birth_date: birthDate,
      city,
      instagram: normalizeInstagram(String(form.get("instagram") ?? "")),
    };

    setPending(true);

    if (demoMode) {
      await updateProfileAction(patch);
      setPending(false);
      router.push("/profile");
      router.refresh();
      return;
    }

    const supabase = createClient();
    const { error: updateError } = await supabase
      .from("profiles")
      .update(patch)
      .eq("id", profile.id);
    setPending(false);

    if (updateError) return setError("לא הצלחנו לשמור. נסו שוב.");
    router.push("/profile");
    router.refresh();
  }

  return (
    <Card>
      <form onSubmit={onSubmit} className="space-y-4">
        <Field label="שם מלא">
          <Input
            name="full_name"
            defaultValue={profile.full_name}
            autoComplete="name"
            required
          />
        </Field>

        <Field label="מגדר">
          <GenderInput name="gender" defaultValue={profile.gender ?? ""} />
        </Field>

        <Field label="מספר טלפון" hint="כדי להמשיך את השיחה גם מחוץ למים.">
          <Input
            name="phone"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            dir="ltr"
            defaultValue={profile.phone ?? ""}
            required
            className="text-left"
          />
        </Field>

        <Field label="תאריך לידה">
          <BirthDateInput name="birth_date" defaultValue={profile.birth_date ?? ""} />
        </Field>

        <Field label="עיר מגורים">
          <CityAutocomplete name="city" defaultValue={profile.city ?? ""} />
        </Field>

        <Field label="אינסטגרם" hint="כדי להכיר את מי שמאחורי השחייה.">
          <Input
            name="instagram"
            dir="ltr"
            defaultValue={profile.instagram ?? ""}
            placeholder="@username"
            className="text-left"
          />
        </Field>

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
              defaultChecked={!!profile.waiver_accepted_at}
              className="mt-0.5 size-5 shrink-0 rounded border-(--color-line) accent-(--color-sea)"
            />
            <span>
              קראתי ואני מאשר/ת את כתב הוויתור שלמעלה. בלי אישור אי אפשר
              לשמור.
            </span>
          </label>
        </div>

        {error && <Notice tone="error">{error}</Notice>}

        <Button type="submit" disabled={pending} className="w-full">
          {pending ? "שומרים…" : "שמירה"}
        </Button>
      </form>
    </Card>
  );
}
