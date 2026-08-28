"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { demoMode } from "@/lib/config";
import { createEventAction } from "@/lib/demo/actions";
import {
  resolveMapsLinkAction,
  searchLocationAction,
  type LocationSuggestion,
} from "@/lib/actions";
import { DEFAULT_EVENT_LOCATION } from "@/lib/maps";
import { defaultAgendaText, defaultEquipmentText } from "@/lib/agenda";
import { EventDateTimeInput } from "@/components/event-datetime-input";
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

/** `min`/`max` ב-HTML הם הצעה בלבד. הטווח נאכף גם כאן וגם ב-constraint. */
function minutesField(raw: FormDataEntryValue | null): number {
  const n = Number(String(raw ?? "").trim());
  if (!Number.isFinite(n)) return 30;
  return Math.min(180, Math.max(0, Math.round(n)));
}

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

  // null בהתחלה כדי שלא יהיה פער בין מה שהשרת רינדר למה שהדפדפן
  // מחשב (לשעה המקומית) — מתמלא ברגע שהעמוד עולה בדפדפן.
  const [startsAtDefault, setStartsAtDefault] = useState<Date | null>(null);
  const [description, setDescription] = useState("");
  const [isSea, setIsSea] = useState(true);
  const [agendaText, setAgendaText] = useState("");
  // עולה ברגע שמישהי נוגעת בלו״ז בעצמה — מאותה נקודה שינוי שעה כבר
  // לא דורס את מה שהיא כתבה.
  const [agendaTouched, setAgendaTouched] = useState(false);
  const [agendaVisible, setAgendaVisible] = useState(true);
  // בלי תלות בשעה כמו הלו"ז, אז אין צורך ב-useEffect נפרד
  const [equipmentText, setEquipmentText] = useState(defaultEquipmentText());
  const [equipmentVisible, setEquipmentVisible] = useState(true);
  const [equipmentLinkVisible, setEquipmentLinkVisible] = useState(true);
  useEffect(() => {
    const now = roundedNow();
    setStartsAtDefault(now);
    setAgendaText(defaultAgendaText(now.toISOString()));
  }, []);

  // כל עוד הלו״ז עדיין ההצעה האוטומטית ולא נערך ידנית, שינוי השעה
  // בטופס מעדכן אותו בהתאם — מפגש שקיעה לא צריך להיפתח עם "רגליים
  // במים — 15:15" רק כי זו הייתה השעה כשהטופס נטען.
  function handleStartsAtChange(date: Date | null) {
    if (!date || agendaTouched) return;
    setAgendaText(defaultAgendaText(date.toISOString()));
  }

  // חיפוש מיקום תוך כדי הקלדה בשדה "שם המקום" עצמו — זו הדרך
  // הראשית לקבוע מיקום. הבחירה ממלאת גם את הקואורדינטות וגם קישור
  // מפות, לא רק את השם.
  const [suggestions, setSuggestions] = useState<LocationSuggestion[]>([]);
  const [searching, setSearching] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  // איזו הצעה מודגשת כרגע כשמנווטים עם חצי המקלדת. -1 = כלום מודגש.
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  // בחירת הצעה גם היא משנה את locationName — בלי הדגל הזה הבחירה
  // הייתה מפעילה חיפוש חדש על השם שהיא עצמה קבעה.
  const skipNextSearch = useRef(false);
  // עולה בכל פעם שהמיקום נקבע פרוגרמטית (בחירה מהרשימה, קישור שהודבק) —
  // כדי שהמפה תזוז לשם. לא עולה בלחיצה ידנית על המפה, כי שם המשתמשת
  // כבר רואה בדיוק את הנקודה שבה היא לחצה.
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
    // נראה מיד עם תחילת החיפוש (לא רק כשהוא מסתיים) — כדי שתמיד יהיה
    // ברור שמשהו קורה, במקום מסך ריק בזמן ההמתנה.
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
    // חיפוש טקסטואלי, לא נ.צ גולמי — כתובת פותחת דף מקום אמיתי
    // (עם תמונה, Street View וכו'), נ.צ פותח סתם סיכה עם קואורדינטות
    setMapsUrl(
      `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(s.shortLabel)}`,
    );
    setSuggestions([]);
    setShowSuggestions(false);
    setHighlightedIndex(-1);
    setFocusSignal((n) => n + 1);
  }

  // --- גיבוי ידני: הדבקת קישור Google Maps, למקרה שהחיפוש לא מצא
  // בדיוק את הנקודה הנכונה ---
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
    if (result.name) {
      skipNextSearch.current = true;
      setLocationName(result.name);
    }
    setFocusSignal((n) => n + 1);
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
      // ברירת המחדל, או קישור ה-Maps שנקבע מהחיפוש/הקישור שהודבק
      maps_url: mapsUrl,
      checkin_radius_m: radius,
      // `?? 15` לא עוזר: שדה שרוקן מחזיר מחרוזת ריקה ולא null, ו-Number("")
      // הוא 0 — כלומר החלון נפתח בדיוק בשעת ההתחלה, בשקט.
      checkin_opens_before_min: minutesField(form.get("opens_before")),
      checkin_closes_after_min: minutesField(form.get("closes_after")),
      description: description.trim() || null,
      agenda_text: agendaText.trim() || null,
      agenda_visible: agendaVisible,
      equipment_text: equipmentText.trim() || null,
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

    // לא ממתינים לזה — התראה לחברי הקהילה לא צריכה לעכב את הניווט,
    // ואם היא נכשלת (למשל אף אחד לא הפעיל תזכורות) המפגש עדיין נוצר
    fetch("/api/push/notify-new-event", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ event_id: data.id }),
    }).catch(() => {});

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
            <Input name="title" required defaultValue="שחיית בוקר" />
          </Field>

          <Field label="תאריך ושעה">
            <EventDateTimeInput
              name="starts_at"
              defaultValue={startsAtDefault}
              onChange={handleStartsAtChange}
            />
          </Field>

          <Field label="תיאור המפגש (אופציונלי)">
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="כאן תוכלו לשתף את כל הפרטים שחשוב לדעת לקראת המפגש, מעבר ללוח הזמנים."
            />
          </Field>
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
            מה להביא למים?
          </label>
          {equipmentVisible && (
            <Textarea
              value={equipmentText}
              onChange={(e) => setEquipmentText(e.target.value)}
              rows={5}
              dir="auto"
            />
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
            להציג קישור לציוד של Speedo?
          </label>
          <p className="mt-1 text-xs leading-relaxed text-(--color-ink-faint)">
            כשמסומן, קישור עם 15% הנחה בקוד SWELLCLUB מופיע מתחת ל“מה
            להביא למים?” במפגש הזה.
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
                  // עריכה חופשית אחרי שנבחר משהו כבר לא קשורה לקישור
                  // הישן — הוא כבר לא בהכרח מתאר את מה שכתוב עכשיו
                  setMapsUrl(null);
                }}
                onKeyDown={(e) => {
                  if (!showSuggestions) return;
                  // ESC סוגר תמיד כשהרשימה פתוחה — גם בזמן חיפוש וגם
                  // כשאין תוצאות. הוא היה תקוע מאחורי הבדיקה של
                  // suggestions.length, ולכן לא עשה כלום כשהיו הצעות.
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
              lat={coords?.lat ?? null}
              lng={coords?.lng ?? null}
              radiusM={radius}
              focusSignal={focusSignal}
              onChange={(c) => {
                setCoords(c);
                // סימון ידני מבטל את הקישור שנשמר — הוא כבר לא מתאר את
                // הנקודה שנבחרה בפועל
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
