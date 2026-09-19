"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { demoMode } from "@/lib/config";
import { updateEventScheduleAction } from "@/lib/demo/actions";
import { minutesField, useEventLocation } from "@/lib/use-event-location";
import {
  defaultAgendaText,
  defaultEquipmentHeading,
  defaultEquipmentText,
  getEventAgendaText,
  getEventEquipmentHeading,
  getEventEquipmentText,
} from "@/lib/agenda";
import type { SwellEvent } from "@/lib/types";
import { EventDateTimeInput } from "./event-datetime-input";
import { LocationNameInput, LocationSuggestions } from "./location-suggestions";
import { ChevronIcon } from "./social-icons";
import { Button, Card, Field, Input, Notice, Textarea } from "./ui";

// Leaflet ניגש ל-window בזמן הטעינה — חייב להיטען רק בדפדפן
const MapPicker = dynamic(
  () => import("./map-picker").then((m) => m.MapPicker),
  {
    ssr: false,
    loading: () => (
      <div className="h-64 w-full animate-pulse rounded-xl bg-(--color-surface)" />
    ),
  },
);

/**
 * עריכת מפגש קיים — כל השדות, לא רק תיאור/לו״ז/ציוד. עד כאן היה
 * אפשר לתקן רק את אלה; טעות בכותרת/תאריך/מיקום חייבה מחיקת המפגש
 * כולו ויצירה מחדש, כולל אובדן ה-RSVP-ים והנוכחויות שכבר נאספו.
 * הטופס כאן בעצם זהה לטופס "מפגש חדש" (admin/events/new/page.tsx),
 * רק ממולא מהמפגש הקיים ושומר עם update() במקום insert().
 */
export function EditEventScheduleForm({
  event,
  attendanceCount,
  returnQuery = "",
}: {
  event: SwellEvent;
  attendanceCount: number;
  /** ?from=...&fromId=... שהעמוד הגיע איתו, כדי שהחזרה למפגש (בכפתור
      "למפגש" ואחרי שמירה) לא תשכח מאיפה הגיעו במקור — ריק כברירת
      מחדל למי שהגיע ישירות (למשל מקישור בהתראה). */
  returnQuery?: string;
}) {
  const router = useRouter();
  const eventHref = `/events/${event.id}${returnQuery}`;

  // מחושב פעם אחת (lazy initializer, לא בכל רינדור) — EventDateTimeInput
  // מאפס את הבחירה שלו בכל פעם ש-defaultValue מקבל זהות אובייקט חדשה,
  // ו-`new Date(...)` בתוך ה-JSX היה יוצר תאריך חדש בכל הקלדה בשדה
  // אחר בטופס (תיאור, מיקום וכו'), ומוחק שינוי שעה/תאריך שכבר נבחר.
  const [startsAtDefault] = useState(() => new Date(event.starts_at));

  const location = useEventLocation({
    locationName: event.location_name,
    lat: event.lat,
    lng: event.lng,
    mapsUrl: event.maps_url,
    // המיקום כבר נכון (זה מפגש קיים) — אין צורך לחפש עליו מיד.
    skipInitialSearch: true,
  });
  const [radius, setRadius] = useState(event.checkin_radius_m);

  const [description, setDescription] = useState(event.description ?? "");
  const [descriptionVisible, setDescriptionVisible] = useState(
    !!event.description,
  );
  const [isSea, setIsSea] = useState(event.is_sea);
  const [agendaText, setAgendaText] = useState(getEventAgendaText(event));
  // אם כבר יש טקסט לו״ז מותאם אישית (agenda_text לא null), שינוי
  // תאריך לא אמור לדרוס אותו — רק מפגש שעדיין עוקב אחרי ברירת המחדל
  // (agenda_text === null) מתעדכן אוטומטית כששעת ההתחלה משתנה.
  const [agendaTouched, setAgendaTouched] = useState(
    event.agenda_text !== null,
  );
  const [agendaVisible, setAgendaVisible] = useState(event.agenda_visible);
  const [equipmentHeading, setEquipmentHeading] = useState(
    getEventEquipmentHeading(event),
  );
  const [equipmentText, setEquipmentText] = useState(
    getEventEquipmentText(event),
  );
  const [equipmentVisible, setEquipmentVisible] = useState(
    event.equipment_visible,
  );
  const [equipmentLinkVisible, setEquipmentLinkVisible] = useState(
    event.equipment_link_visible,
  );

  function handleStartsAtChange(date: Date | null) {
    if (!date || agendaTouched) return;
    setAgendaText(defaultAgendaText(date.toISOString()));
  }

  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // כל שינוי בטופס מסמן dirty, כדי שכפתור "למפגש" יזהיר לפני יציאה
  // בלי שמירה — רוב השדות תופסים את זה לבד (מבעבע דרך onChange על
  // ה-<form> עצמו), אבל שינויים במפה/בהצעות מיקום/פענוח קישור לא
  // עוברים דרך input רגיל, ולכן מסומנים ידנית בכל אחד מהם למטה.
  const [dirty, setDirty] = useState(false);

  function handleBackClick() {
    if (
      !dirty ||
      window.confirm("לצאת בלי לשמור?\nהשינוי שעשיתם עדיין לא נשמר.")
    ) {
      router.push(eventHref);
    }
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    const form = new FormData(e.currentTarget);
    const startsAtLocal = String(form.get("starts_at") ?? "");
    if (!startsAtLocal) return setError("צריך תאריך ושעה.");

    if (new Date(startsAtLocal).getTime() < Date.now()) {
      return setError("התאריך שבחרתם כבר עבר. אי אפשר להעביר מפגש לאחור.");
    }

    setPending(true);

    const startsAtISO = new Date(startsAtLocal).toISOString();
    const agendaIsDefault =
      agendaText.trim() === defaultAgendaText(startsAtISO).trim();
    const equipmentIsDefault =
      equipmentText.trim() === defaultEquipmentText().trim();
    const equipmentHeadingIsDefault =
      equipmentHeading.trim() === defaultEquipmentHeading().trim();

    const patch = {
      title: String(form.get("title") ?? "").trim(),
      starts_at: startsAtISO,
      location_name: location.locationName.trim(),
      lat: location.coords.lat,
      lng: location.coords.lng,
      maps_url: location.mapsUrl,
      checkin_radius_m: radius,
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
      await updateEventScheduleAction(event.id, patch);
      setPending(false);
      router.push(eventHref);
      router.refresh();
      return;
    }

    // כשל רשת אמיתי (לא רק שגיאה מסודרת) זורק חריגה במקום להחזיר
    // error — בלי try/catch הכפתור היה נשאר נעול על "שומרים…" לצמיתות,
    // עם אובדן מלא של העריכה.
    try {
      const supabase = createClient();
      // updated_at כתנאי נוסף: אם מישהי אחרת כבר שינתה את המפגש
      // הזה מאז שהטופס נטען, הטריגר (migration 0046) כבר עדכן את
      // updated_at, השורה לא תואמת יותר, וה-UPDATE לא ימצא שורה
      // לעדכן — במקום לדרוס בשקט את מה שהיא שינתה.
      const { data: updatedRows, error: updateError } = await supabase
        .from("events")
        .update(patch)
        .eq("id", event.id)
        .eq("updated_at", event.updated_at)
        .select("id");
      setPending(false);

      if (updateError) return setError("לא הצלחנו לשמור. נסו שוב.");

      if (!updatedRows || updatedRows.length === 0) {
        return setError(
          "מישהי אחרת כבר שינתה את המפגש הזה בינתיים. רעננו את הדף כדי לראות את הגרסה העדכנית לפני שתמשיכו לערוך.",
        );
      }

      // רק כששעה/תאריך או מיקום השתנו בפועל — לא על כל שמירה — ורק
      // למי שכבר סימן/ה הגעה, כי אלה תכננו לפי הפרטים הישנים. לא ממתינים
      // לזה, כמו כל שאר התראות ה-push המיידיות.
      //
      // starts_at מושווה כזמן (getTime), לא כמחרוזת: מה שחוזר מ-Supabase
      // (למשל "2026-08-28T18:00:00+00:00") לא זהה תווית ל-toISOString()
      // הטרי ("...T18:00:00.000Z"), למרות שזה אותו רגע בדיוק — השוואת
      // מחרוזות הייתה תמיד יוצאת "שונה" ומוציאה התראה על כל שמירה בכלל.
      const detailsChanged =
        new Date(patch.starts_at).getTime() !==
          new Date(event.starts_at).getTime() ||
        patch.lat !== event.lat ||
        patch.lng !== event.lng;
      if (detailsChanged) {
        fetch("/api/push/notify-event-changed", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ event_id: event.id }),
        }).catch(() => {});
      }

      router.push(eventHref);
      router.refresh();
    } catch {
      setPending(false);
      setError("משהו השתבש. בדקו את החיבור ונסו שוב.");
    }
  }

  return (
    <div className="space-y-6">
      <button
        type="button"
        onClick={handleBackClick}
        className="-ms-2 inline-flex min-h-11 items-center gap-1.5 rounded-lg px-2 text-sm font-semibold text-(--color-ink-faint) transition hover:text-(--color-sea)"
      >
        <ChevronIcon className="size-3.5 shrink-0" />
        למפגש
      </button>

      <h1 className="font-[family-name:var(--font-display)] text-2xl font-bold">
        עריכת מפגש
      </h1>

      <form
        onSubmit={onSubmit}
        onChange={() => setDirty(true)}
        className="space-y-5"
      >
      <Card className="space-y-4">
        <Field label="שם המפגש">
          <Input name="title" required defaultValue={event.title} />
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

        {attendanceCount > 0 && (
          <Notice tone="warn">
            {attendanceCount === 1
              ? "כבר יש נוכחות אחת רשומה למפגש הזה."
              : `כבר יש ${attendanceCount} נוכחויות רשומות למפגש הזה.`}{" "}
            שינוי המיקום או הרדיוס כאן לא משנה את הרשומות ההיסטוריות
            שכבר נשמרו — רק את התנאים לצ׳ק־אין מעכשיו והלאה.
          </Notice>
        )}

        {/* z-[5], לא z-20: צריך רק לנצח את המפה מתחת (z-0) — לא את
            סרגל הלוגו הקבוע (z-10), שאחרת נחצה כשהשדה מגיע לראש המסך. */}
        <div className="relative z-[5]">
          <Field label="מיקום המפגש" hint="איך אנשים מכירים את המקום">
            <LocationNameInput
              value={location.locationName}
              onChange={location.setLocationName}
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
            onChoose={(s) => {
              setDirty(true);
              location.chooseSuggestion(s);
            }}
          />
        </div>

        <div className="relative z-0">
          <MapPicker
            lat={location.coords.lat}
            lng={location.coords.lng}
            radiusM={radius}
            focusSignal={location.focusSignal}
            onChange={(c) => {
              setDirty(true);
              location.setCoords(c);
            }}
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
              onClick={() => {
                setDirty(true);
                location.onResolveMapsLink();
              }}
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
              defaultValue={event.checkin_opens_before_min}
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
              defaultValue={event.checkin_closes_after_min}
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
        {pending ? "שומרים…" : "שמירה"}
      </Button>
      </form>
    </div>
  );
}
