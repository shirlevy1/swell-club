"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { demoMode } from "@/lib/config";
import { createEventAction } from "@/lib/demo/actions";
import { resolveMapsLinkAction } from "@/lib/actions";
import { DEFAULT_EVENT_LOCATION } from "@/lib/maps";
import { Button, Card, Field, Input, Notice } from "@/components/ui";

// Leaflet ניגש ל-window בזמן הטעינה — חייב להיטען רק בדפדפן
const MapPicker = dynamic(
  () => import("@/components/map-picker").then((m) => m.MapPicker),
  {
    ssr: false,
    loading: () => (
      <div className="h-64 w-full animate-pulse rounded-xl bg-(--color-surface)" />
    ),
  },
);

/** `min`/`max` ב-HTML הם הצעה בלבד. הטווח נאכף גם כאן וגם ב-constraint. */
function minutesField(raw: FormDataEntryValue | null): number {
  const n = Number(String(raw ?? "").trim());
  if (!Number.isFinite(n)) return 15;
  return Math.min(180, Math.max(0, Math.round(n)));
}

export default function NewEventPage() {
  const router = useRouter();
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>({
    lat: DEFAULT_EVENT_LOCATION.lat,
    lng: DEFAULT_EVENT_LOCATION.lng,
  });
  const [locationName, setLocationName] = useState<string>(
    DEFAULT_EVENT_LOCATION.name,
  );
  const [mapsUrl, setMapsUrl] = useState<string | null>(
    DEFAULT_EVENT_LOCATION.mapsUrl,
  );
  const [mapsLinkInput, setMapsLinkInput] = useState("");
  const [resolvingLink, setResolvingLink] = useState(false);
  const [linkError, setLinkError] = useState<string | null>(null);
  const [radius, setRadius] = useState(150);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onResolveMapsLink() {
    if (!mapsLinkInput.trim()) return;
    setLinkError(null);
    setResolvingLink(true);
    const result = await resolveMapsLinkAction(mapsLinkInput.trim());
    setResolvingLink(false);

    if (!result.ok) {
      setLinkError(result.error);
      return;
    }

    setCoords({ lat: result.lat, lng: result.lng });
    setMapsUrl(result.url);
    if (result.name) setLocationName(result.name);
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    if (!coords) return setError("סמנו על המפה איפה נפגשים.");

    const form = new FormData(e.currentTarget);
    const startsAtLocal = String(form.get("starts_at") ?? "");
    if (!startsAtLocal) return setError("צריך תאריך ושעה.");

    // מפגש בעבר לא ניתן לצ'ק־אין — חלון הזמן שלו כבר נסגר ברגע היצירה
    if (new Date(startsAtLocal).getTime() < Date.now()) {
      return setError("התאריך שבחרתם כבר עבר. אי אפשר לפתוח מפגש באחור.");
    }

    setPending(true);

    const draft = {
      title: String(form.get("title") ?? "").trim(),
      // datetime-local נקרא כשעון מקומי של הדפדפן — נכון כל עוד
      // המארגנת בישראל, וזה המקרה.
      starts_at: new Date(startsAtLocal).toISOString(),
      location_name: locationName.trim(),
      lat: coords.lat,
      lng: coords.lng,
      // ברירת המחדל, או קישור ה-Maps שהמנהלת הדביקה ופתרנו בשרת
      maps_url: mapsUrl,
      checkin_radius_m: radius,
      // `?? 15` לא עוזר: שדה שרוקן מחזיר מחרוזת ריקה ולא null, ו-Number("")
      // הוא 0 — כלומר החלון נפתח בדיוק בשעת ההתחלה, בשקט.
      checkin_opens_before_min: minutesField(form.get("opens_before")),
      checkin_closes_after_min: minutesField(form.get("closes_after")),
    };

    if (demoMode) {
      const id = `demo-e-${Date.now()}`;
      await createEventAction({
        ...draft,
        id,
        club_id: "demo-club",
        created_by: null,
        created_at: new Date().toISOString(),
      });
      setPending(false);
      router.push(`/events/${id}`);
      router.refresh();
      return;
    }

    const supabase = createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    // היה כאן `user!.id`. סשן שפג בין טעינת העמוד לשליחה הפיל את
    // ה-handler באמצע, ולכן `setPending(false)` לא רץ — הכפתור נשאר
    // "יוצרים…" לנצח, בלי שום הודעה.
    if (!user) {
      setPending(false);
      return setError("הסשן פג. התחברו מחדש ונסו שוב.");
    }

    const { data: membership } = await supabase
      .from("club_members")
      .select("club_id")
      .eq("profile_id", user.id)
      .maybeSingle();

    if (!membership) {
      setPending(false);
      return setError("לא מצאנו את הקהילה שלכם.");
    }

    const { data, error: insertError } = await supabase
      .from("events")
      .insert({
        ...draft,
        club_id: membership.club_id,
        created_by: user.id,
      })
      .select()
      .single();

    setPending(false);
    if (insertError || !data) {
      return setError("לא הצלחנו ליצור את המפגש. נסו שוב.");
    }

    router.push(`/events/${data.id}`);
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <h1 className="font-[family-name:var(--font-display)] text-2xl font-bold">
        מפגש חדש
      </h1>

      <form onSubmit={onSubmit} className="space-y-5">
        <Card className="space-y-4">
          <Field label="שם המפגש">
            <Input name="title" required placeholder="שחיית בוקר" />
          </Field>

          <Field label="תאריך ושעה">
            <Input name="starts_at" type="datetime-local" dir="ltr" required />
          </Field>

          <Field label="שם המקום" hint="איך אנשים מכירים את המקום">
            <Input
              name="location_name"
              required
              value={locationName}
              onChange={(e) => setLocationName(e.target.value)}
              placeholder="חוף הילטון"
            />
          </Field>
        </Card>

        <Card className="space-y-4">
          <p className="text-sm font-semibold">איפה נפגשים</p>
          <p className="text-xs leading-relaxed text-(--color-ink-faint)">
            ברירת המחדל היא חוף הצוק הדרומי. למיקום אחר — הדביקו קישור
            Google Maps ולחצו על עדכון, במקום לסמן נ.צ ידנית.
          </p>

          <div className="flex gap-2">
            <Input
              type="url"
              dir="ltr"
              placeholder="https://maps.app.goo.gl/…"
              value={mapsLinkInput}
              onChange={(e) => setMapsLinkInput(e.target.value)}
              className="text-left"
            />
            <Button
              type="button"
              variant="secondary"
              disabled={resolvingLink || !mapsLinkInput.trim()}
              onClick={onResolveMapsLink}
              className="shrink-0"
            >
              {resolvingLink ? "מאתרים…" : "עדכון מיקום"}
            </Button>
          </div>
          {linkError && <p className="text-xs text-(--color-fail)">{linkError}</p>}

          <MapPicker
            lat={coords?.lat ?? null}
            lng={coords?.lng ?? null}
            radiusM={radius}
            onChange={(c) => {
              setCoords(c);
              // סימון ידני מבטל את הקישור שנשמר — הוא כבר לא מתאר את
              // הנקודה שנבחרה בפועל
              setMapsUrl(null);
            }}
          />

          <Field
            label={`רדיוס צ׳ק־אין: ${radius} מטר`}
            hint="עד כמה רחוק אפשר לסמן הגעה"
          >
            <input
              type="range"
              min={50}
              max={500}
              step={10}
              value={radius}
              onChange={(e) => setRadius(Number(e.target.value))}
              // h-11: הפס עצמו דק, אבל אזור התפיסה חייב להיות אצבע
              className="h-11 w-full accent-(--color-sea)"
            />
          </Field>
        </Card>

        <Card className="space-y-4">
          <p className="text-sm font-semibold">חלון הצ׳ק־אין</p>
          <div className="flex gap-3">
            <Field label="דקות לפני">
              <Input
                name="opens_before"
                type="number"
                dir="ltr"
                min={0}
                max={180}
                defaultValue={15}
                className="text-left"
              />
            </Field>
            <Field label="דקות אחרי">
              <Input
                name="closes_after"
                type="number"
                dir="ltr"
                min={0}
                max={180}
                defaultValue={15}
                className="text-left"
              />
            </Field>
          </div>
          <p className="text-xs leading-relaxed text-(--color-ink-faint)">
            חלון צר מדי נועל אנשים שאיחרו. אפשר תמיד להוסיף מישהו ידנית
            אחר כך.
          </p>
        </Card>

        {error && <Notice tone="error">{error}</Notice>}

        <Button type="submit" disabled={pending} className="w-full">
          {pending ? "יוצרים…" : "יצירת המפגש"}
        </Button>
      </form>
    </div>
  );
}
