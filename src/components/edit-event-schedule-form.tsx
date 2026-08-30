"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { demoMode } from "@/lib/config";
import { updateEventScheduleAction } from "@/lib/demo/actions";
import {
  resolveMapsLinkAction,
  searchLocationAction,
  type LocationSuggestion,
} from "@/lib/actions";
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

/** `min`/`max` ב-HTML הם הצעה בלבד. הטווח נאכף גם כאן וגם ב-constraint. */
function minutesField(raw: FormDataEntryValue | null): number {
  const n = Number(String(raw ?? "").trim());
  if (!Number.isFinite(n)) return 30;
  return Math.min(180, Math.max(0, Math.round(n)));
}

/**
 * עריכת מפגש קיים — כל השדות, לא רק תיאור/לו״ז/ציוד. עד כאן היה
 * אפשר לתקן רק את אלה; טעות בכותרת/תאריך/מיקום חייבה מחיקת המפגש
 * כולו ויצירה מחדש, כולל אובדן ה-RSVP-ים והנוכחויות שכבר נאספו.
 * הטופס כאן בעצם זהה לטופס "מפגש חדש" (admin/events/new/page.tsx),
 * רק ממולא מהמפגש הקיים ושומר עם update() במקום insert().
 */
export function EditEventScheduleForm({ event }: { event: SwellEvent }) {
  const router = useRouter();

  // מחושב פעם אחת (lazy initializer, לא בכל רינדור) — EventDateTimeInput
  // מאפס את הבחירה שלו בכל פעם ש-defaultValue מקבל זהות אובייקט חדשה,
  // ו-`new Date(...)` בתוך ה-JSX היה יוצר תאריך חדש בכל הקלדה בשדה
  // אחר בטופס (תיאור, מיקום וכו'), ומוחק שינוי שעה/תאריך שכבר נבחר.
  const [startsAtDefault] = useState(() => new Date(event.starts_at));

  const [locationName, setLocationName] = useState(event.location_name);
  const [coords, setCoords] = useState<{ lat: number; lng: number }>({
    lat: event.lat,
    lng: event.lng,
  });
  const [mapsUrl, setMapsUrl] = useState<string | null>(event.maps_url);
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

  // חיפוש מיקום תוך כדי הקלדה — אותה לוגיקה בדיוק כמו בטופס "מפגש חדש"
  const [suggestions, setSuggestions] = useState<LocationSuggestion[]>([]);
  const [searching, setSearching] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const skipNextSearch = useRef(true); // הערך ההתחלתי כבר נכון — לא לחפש עליו מיד
  const [focusSignal, setFocusSignal] = useState(0);

  useEffect(() => {
    if (skipNextSearch.current) {
      skipNextSearch.current = false;
      return;
    }
    const query = locationName.trim();
    setHighlightedIndex(-1);
    if (query.length < 3) {
      setSuggestions([]);
      setSearchError(null);
      setSearching(false);
      return;
    }
    setSearching(true);
    setSearchError(null);
    setShowSuggestions(true);
    const id = setTimeout(async () => {
      const result = await searchLocationAction(query);
      if (result.ok) {
        setSuggestions(result.suggestions);
      } else {
        setSuggestions([]);
        setSearchError(result.error);
      }
      setSearching(false);
    }, 400);
    return () => clearTimeout(id);
  }, [locationName]);

  function chooseSuggestion(s: LocationSuggestion) {
    skipNextSearch.current = true;
    setLocationName(s.shortLabel);
    setCoords({ lat: s.lat, lng: s.lng });
    setMapsUrl(
      `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(s.shortLabel)}`,
    );
    setSuggestions([]);
    setShowSuggestions(false);
    setHighlightedIndex(-1);
    setFocusSignal((n) => n + 1);
  }

  const [mapsLinkInput, setMapsLinkInput] = useState("");
  const [resolvingLink, setResolvingLink] = useState(false);
  const [linkError, setLinkError] = useState<string | null>(null);
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
    if (result.name) {
      skipNextSearch.current = true;
      setLocationName(result.name);
    }
    setFocusSignal((n) => n + 1);
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
      location_name: locationName.trim(),
      lat: coords.lat,
      lng: coords.lng,
      maps_url: mapsUrl,
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
      router.push(`/events/${event.id}`);
      router.refresh();
      return;
    }

    const supabase = createClient();
    const { error: updateError } = await supabase
      .from("events")
      .update(patch)
      .eq("id", event.id);
    setPending(false);

    if (updateError) return setError("לא הצלחנו לשמור. נסו שוב.");

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

    router.push(`/events/${event.id}`);
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5">
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
            <Field label="כותרת הסקשן">
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
              value={locationName}
              onChange={(e) => {
                setLocationName(e.target.value);
                setMapsUrl(null);
              }}
              onKeyDown={(e) => {
                if (!showSuggestions) return;
                if (e.key === "Escape") {
                  setShowSuggestions(false);
                  return;
                }
                if (suggestions.length === 0) return;
                if (e.key === "ArrowDown") {
                  e.preventDefault();
                  setHighlightedIndex((i) =>
                    i < suggestions.length - 1 ? i + 1 : 0,
                  );
                } else if (e.key === "ArrowUp") {
                  e.preventDefault();
                  setHighlightedIndex((i) =>
                    i > 0 ? i - 1 : suggestions.length - 1,
                  );
                } else if (e.key === "Enter") {
                  if (highlightedIndex >= 0) {
                    e.preventDefault();
                    chooseSuggestion(suggestions[highlightedIndex]);
                  }
                }
              }}
            />
          </Field>

          {showSuggestions &&
            (searching || suggestions.length > 0 || searchError) && (
              <ul className="absolute z-[1200] mt-1 w-full overflow-hidden rounded-xl border border-(--color-line) bg-(--color-surface) shadow-lg">
                {searching && (
                  <li className="px-4 py-2.5 text-sm text-(--color-ink-faint)">
                    מחפשים…
                  </li>
                )}
                {!searching && searchError && (
                  <li className="px-4 py-2.5 text-sm text-(--color-fail)">
                    {searchError} אפשר להשתמש בכלים הידניים למטה.
                  </li>
                )}
                {!searching &&
                  !searchError &&
                  suggestions.length === 0 && (
                    <li className="px-4 py-2.5 text-sm text-(--color-ink-faint)">
                      לא נמצאה התאמה. אפשר להשתמש בכלים הידניים למטה.
                    </li>
                  )}
                {!searching &&
                  suggestions.map((s, i) => (
                    <li key={`${s.lat},${s.lng},${i}`}>
                      <button
                        type="button"
                        onClick={() => chooseSuggestion(s)}
                        onMouseEnter={() => setHighlightedIndex(i)}
                        className={
                          "block w-full px-4 py-2.5 text-start text-sm " +
                          (i === highlightedIndex
                            ? "bg-(--color-haze)"
                            : "hover:bg-(--color-haze)")
                        }
                      >
                        {s.label}
                      </button>
                    </li>
                  ))}
              </ul>
            )}
        </div>

        <div className="relative z-0">
          <MapPicker
            lat={coords.lat}
            lng={coords.lng}
            radiusM={radius}
            focusSignal={focusSignal}
            onChange={(c) => {
              setCoords(c);
              setMapsUrl(null);
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
  );
}
