"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { demoMode } from "@/lib/config";
import { createEventAction } from "@/lib/demo/actions";
import { DEFAULT_EVENT_LOCATION } from "@/lib/maps";
import { minutesField, useEventLocation } from "@/lib/use-event-location";
import {
  defaultAgendaText,
  defaultEquipmentHeading,
  defaultEquipmentText,
  defaultEventTitle,
} from "@/lib/agenda";
import { EventDateTimeInput } from "@/components/event-datetime-input";
import { LocationSuggestions } from "@/components/location-suggestions";
import { Button, Card, Field, Input, Notice, Textarea } from "@/components/ui";

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

/** עכשיו, מעוגל כלפי מעלה לשעה העגולה הקרובה — 19:48 הופך ל-20:00. */
function roundedNow(): Date {
  const d = new Date();
  d.setSeconds(0, 0);
  if (d.getMinutes() > 0) {
    d.setMinutes(0);
    d.setHours(d.getHours() + 1);
  }
  return d;
}

export default function NewEventPage() {
  const router = useRouter();
  const location = useEventLocation({
    locationName: DEFAULT_EVENT_LOCATION.name,
    lat: DEFAULT_EVENT_LOCATION.lat,
    lng: DEFAULT_EVENT_LOCATION.lng,
    mapsUrl: DEFAULT_EVENT_LOCATION.mapsUrl,
    skipInitialSearch: false,
  });
  const [radius, setRadius] = useState(150);

  // null בהתחלה כדי שלא יהיה פער בין מה שהשרת רינדר למה שהדפדפן
  // מחשב (לשעה המקומית) — מתמלא ברגע שהעמוד עולה בדפדפן.
  const [startsAtDefault, setStartsAtDefault] = useState<Date | null>(null);
  const [title, setTitle] = useState("");
  // עולה ברגע שמישהי נוגעת בכותרת בעצמה — מאותה נקודה שינוי שעה כבר
  // לא דורס מה שהיא כתבה. אותו דפוס בדיוק כמו agendaTouched למטה.
  const [titleTouched, setTitleTouched] = useState(false);
  const [description, setDescription] = useState("");
  const [descriptionVisible, setDescriptionVisible] = useState(true);
  const [isSea, setIsSea] = useState(true);
  const [agendaText, setAgendaText] = useState("");
  // עולה ברגע שמישהי נוגעת בלו״ז בעצמה — מאותה נקודה שינוי שעה כבר
  // לא דורס את מה שהיא כתבה.
  const [agendaTouched, setAgendaTouched] = useState(false);
  const [agendaVisible, setAgendaVisible] = useState(true);
  // בלי תלות בשעה כמו הלו"ז, אז אין צורך ב-useEffect נפרד
  const [equipmentHeading, setEquipmentHeading] = useState(
    defaultEquipmentHeading(),
  );
  const [equipmentText, setEquipmentText] = useState(defaultEquipmentText());
  const [equipmentVisible, setEquipmentVisible] = useState(true);
  const [equipmentLinkVisible, setEquipmentLinkVisible] = useState(true);
  useEffect(() => {
    const now = roundedNow();
    // מכוון: "עכשיו" חייב להיקבע רק בדפדפן (ראו ההערה על startsAtDefault
    // למעלה) — אי אפשר לחשב את זה בלי useEffect בלי ליצור פער בין
    // מה שהשרת מרנדר למה שהדפדפן מחשב.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setStartsAtDefault(now);
    setTitle(defaultEventTitle(now.toISOString()));
    setAgendaText(defaultAgendaText(now.toISOString()));
  }, []);

  // כל עוד הכותרת/הלו״ז עדיין ההצעה האוטומטית ולא נערכו ידנית, שינוי
  // שעה בטופס מעדכן אותם בהתאם — מפגש שקיעה לא צריך להיפתח עם
  // "שחיית בוקר" או "רגליים במים — 15:15" רק כי זו הייתה השעה כשהטופס נטען.
  function handleStartsAtChange(date: Date | null) {
    if (!date) return;
    if (!titleTouched) setTitle(defaultEventTitle(date.toISOString()));
    if (!agendaTouched) setAgendaText(defaultAgendaText(date.toISOString()));
  }

  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    const form = new FormData(e.currentTarget);
    const startsAtLocal = String(form.get("starts_at") ?? "");
    if (!startsAtLocal) return setError("צריך תאריך ושעה.");

    // מפגש בעבר לא ניתן לצ'ק־אין — חלון הזמן שלו כבר נסגר ברגע היצירה
    if (new Date(startsAtLocal).getTime() < Date.now()) {
      return setError("התאריך שבחרתם כבר עבר. אי אפשר לפתוח מפגש באחור.");
    }

    setPending(true);

    // datetime-local נקרא כשעון מקומי של הדפדפן — נכון כל עוד המארגנת
    // בישראל, וזה המקרה.
    const startsAtISO = new Date(startsAtLocal).toISOString();

    // אם הטקסט זהה לברירת המחדל הנוכחית (כלומר לא נערך בפועל), שומרים
    // null ולא את המחרוזת הקפואה — כדי שהמפגש ימשיך לעקוב אחרי ברירת
    // המחדל גם כשהיא תשתנה בעתיד, ולא יינעל על הניסוח שהיה בזמן היצירה.
    const agendaIsDefault = agendaText.trim() === defaultAgendaText(startsAtISO).trim();
    const equipmentIsDefault = equipmentText.trim() === defaultEquipmentText().trim();
    const equipmentHeadingIsDefault =
      equipmentHeading.trim() === defaultEquipmentHeading().trim();

    const draft = {
      title: String(form.get("title") ?? "").trim(),
      starts_at: startsAtISO,
      location_name: location.locationName.trim(),
      lat: location.coords.lat,
      lng: location.coords.lng,
      // ברירת המחדל, או קישור ה-Maps שנקבע מהחיפוש/הקישור שהודבק
      maps_url: location.mapsUrl,
      checkin_radius_m: radius,
      // `?? 15` לא עוזר: שדה שרוקן מחזיר מחרוזת ריקה ולא null, ו-Number("")
      // הוא 0 — כלומר החלון נפתח בדיוק בשעת ההתחלה, בשקט.
      checkin_opens_before_min: minutesField(form.get("opens_before")),
      checkin_closes_after_min: minutesField(form.get("closes_after")),
      description: description.trim() || null,
      agenda_text: agendaIsDefault ? null : agendaText.trim() || null,
      agenda_visible: agendaVisible,
      equipment_heading: equipmentHeadingIsDefault
        ? null
        : equipmentHeading.trim() || null,
      equipment_text: equipmentIsDefault ? null : equipmentText.trim() || null,
      equipment_visible: equipmentVisible,
      equipment_link_visible: equipmentLinkVisible,
      is_sea: isSea,
    };

    if (demoMode) {
      const id = `demo-e-${Date.now()}`;
      await createEventAction({
        ...draft,
        id,
        club_id: "demo-club",
        created_by: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
      setPending(false);
      router.push(`/events/${id}`);
      router.refresh();
      return;
    }

    const supabase = createClient();

    // כשל רשת אמיתי (לא רק שגיאה מסודרת) זורק חריגה במקום להחזיר
    // error — בלי try/catch הכפתור היה נשאר נעול על "יוצרים…" לצמיתות,
    // עם אובדן מלא של כל מה שמולא בטופס.
    try {
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

      // לא ממתינים לזה — התראה לחברי הקהילה לא צריכה לעכב את הניווט,
      // ואם היא נכשלת (למשל אף אחד לא הפעיל תזכורות) המפגש עדיין נוצר
      fetch("/api/push/notify-new-event", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ event_id: data.id }),
      }).catch(() => {});

      router.push(`/events/${data.id}`);
      router.refresh();
    } catch {
      setPending(false);
      setError("משהו השתבש. בדקו את החיבור ונסו שוב.");
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="font-[family-name:var(--font-display)] text-2xl font-bold">
        מפגש חדש
      </h1>

      <form onSubmit={onSubmit} className="space-y-5">
        <Card className="space-y-4">
          <Field label="שם המפגש">
            <Input
              name="title"
              required
              value={title}
              onChange={(e) => {
                setTitleTouched(true);
                setTitle(e.target.value);
              }}
            />
          </Field>

          <Field label="תאריך ושעה">
            <EventDateTimeInput
              name="starts_at"
              defaultValue={startsAtDefault}
              onChange={handleStartsAtChange}
            />
          </Field>
        </Card>

        <Card className="space-y-4">
          <label className="flex min-h-11 items-center gap-2.5 text-sm font-semibold text-(--color-ink)">
            <input
              type="checkbox"
              checked={descriptionVisible}
              onChange={(e) => {
                const checked = e.target.checked;
                setDescriptionVisible(checked);
                if (!checked) setDescription("");
              }}
              className="size-5 shrink-0 rounded border-(--color-line) accent-(--color-sea)"
            />
            תיאור המפגש
          </label>
          {descriptionVisible && (
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="כאן תוכלו לשתף את כל הפרטים שחשוב לדעת לקראת המפגש, מעבר ללוח הזמנים."
            />
          )}
        </Card>

        <Card>
          <label className="flex min-h-11 items-center gap-2.5 text-sm font-semibold text-(--color-ink)">
            <input
              type="checkbox"
              checked={isSea}
              onChange={(e) => setIsSea(e.target.checked)}
              className="size-5 shrink-0 rounded border-(--color-line) accent-(--color-sea)"
            />
            האם המפגש בים?
          </label>
          <p className="mt-1 text-xs leading-relaxed text-(--color-ink-faint)">
            כשמסומן, תוצג תחזית הים לזמן המפגש.
          </p>
        </Card>

        <Card className="space-y-4">
          <label className="flex min-h-11 items-center gap-2.5 text-sm font-semibold text-(--color-ink)">
            <input
              type="checkbox"
              checked={agendaVisible}
              onChange={(e) => {
                const checked = e.target.checked;
                setAgendaVisible(checked);
                if (!checked) setAgendaText("");
              }}
              className="size-5 shrink-0 rounded border-(--color-line) accent-(--color-sea)"
            />
            לו״ז המפגש
          </label>
          {agendaVisible && (
            <Textarea
              value={agendaText}
              onChange={(e) => {
                setAgendaTouched(true);
                setAgendaText(e.target.value);
              }}
              rows={7}
              dir="auto"
            />
          )}
        </Card>

        <Card className="space-y-4">
          <label className="flex min-h-11 items-center gap-2.5 text-sm font-semibold text-(--color-ink)">
            <input
              type="checkbox"
              checked={equipmentVisible}
              onChange={(e) => {
                const checked = e.target.checked;
                setEquipmentVisible(checked);
                if (!checked) setEquipmentText("");
              }}
              className="size-5 shrink-0 rounded border-(--color-line) accent-(--color-sea)"
            />
            מה להביא?
          </label>
          {equipmentVisible && (
            <>
              <Field label="כותרת">
                <Input
                  value={equipmentHeading}
                  onChange={(e) => setEquipmentHeading(e.target.value)}
                  dir="auto"
                />
              </Field>
              <Textarea
                value={equipmentText}
                onChange={(e) => setEquipmentText(e.target.value)}
                rows={5}
                dir="auto"
              />
            </>
          )}
        </Card>

        <Card>
          <label className="flex min-h-11 items-center gap-2.5 text-sm font-semibold text-(--color-ink)">
            <input
              type="checkbox"
              checked={equipmentLinkVisible}
              onChange={(e) => setEquipmentLinkVisible(e.target.checked)}
              className="size-5 shrink-0 rounded border-(--color-line) accent-(--color-sea)"
            />
            להציג הטבות Speedo ו-Garmin?
          </label>
          <p className="mt-1 text-xs leading-relaxed text-(--color-ink-faint)">
            כשמסומן, הטבות והקישורים של Speedo ו-Garmin מופיעים מתחת
            לרשימת הציוד במפגש הזה.
          </p>
        </Card>

        <Card className="space-y-4">
          <p className="text-sm font-semibold">איפה נפגשים</p>
          <p className="text-xs leading-relaxed text-(--color-ink-faint)">
            הקלידו כתובת או שם מקום — הבחירה מהרשימה קובעת גם את המיקום
            במפה וגם את קישור הניווט, לא רק את השם.
          </p>

          <div className="relative z-20">
            <Field label="מיקום המפגש" hint="איך אנשים מכירים את המקום">
              <Input
                name="location_name"
                required
                autoComplete="off"
                value={location.locationName}
                onChange={(e) => location.setLocationName(e.target.value)}
                onKeyDown={location.onLocationInputKeyDown}
              />
            </Field>

            <LocationSuggestions
              show={location.showSuggestions}
              searching={location.searching}
              searchError={location.searchError}
              suggestions={location.suggestions}
              highlightedIndex={location.highlightedIndex}
              onHighlight={location.setHighlightedIndex}
              onChoose={location.chooseSuggestion}
            />
          </div>

          <div className="relative z-0">
            <MapPicker
              lat={location.coords.lat}
              lng={location.coords.lng}
              radiusM={radius}
              focusSignal={location.focusSignal}
              onChange={location.setCoords}
            />
          </div>

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

          <div className="space-y-2 border-t border-(--color-line) pt-4">
            <p className="text-xs font-semibold text-(--color-ink-soft)">
              הנקודה על המפה לא מדויקת? אפשר לתקן ידנית
            </p>
            <p className="text-xs leading-relaxed text-(--color-ink-faint)">
              גם לגרור את הסיכה על המפה למעלה, וגם להדביק כאן קישור
              Google Maps ישירות.
            </p>
            <div className="flex gap-2">
              <Input
                type="url"
                dir="ltr"
                placeholder="https://maps.app.goo.gl/…"
                value={location.mapsLinkInput}
                onChange={(e) => location.setMapsLinkInput(e.target.value)}
                className="text-left"
              />
              <Button
                type="button"
                variant="secondary"
                disabled={location.resolvingLink || !location.mapsLinkInput.trim()}
                onClick={location.onResolveMapsLink}
                className="shrink-0"
              >
                {location.resolvingLink ? "מאתרים…" : "עדכון מיקום"}
              </Button>
            </div>
            {location.linkError && (
              <p className="text-xs text-(--color-fail)">{location.linkError}</p>
            )}
          </div>
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
                defaultValue={30}
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
                defaultValue={180}
                className="text-left"
              />
            </Field>
          </div>
          <p className="text-xs leading-relaxed text-(--color-ink-faint)">
            חלון צר מדי נועל אנשים שאיחרו.
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
