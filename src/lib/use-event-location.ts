"use client";

import { useEffect, useRef, useState } from "react";
import {
  resolveMapsLinkAction,
  searchLocationAction,
  type LocationSuggestion,
} from "./actions";

/**
 * `min`/`max` ב-HTML הם הצעה בלבד. הטווח נאכף גם כאן וגם ב-constraint.
 * מקובצת כאן עם useEventLocation כי שני הצרכנים היחידים שלה (טופסי
 * "מפגש חדש" ו"עריכת מפגש") זהים.
 */
export function minutesField(raw: FormDataEntryValue | null): number {
  const n = Number(String(raw ?? "").trim());
  if (!Number.isFinite(n)) return 30;
  return Math.min(180, Math.max(0, Math.round(n)));
}

/**
 * כל לוגיקת "איפה נפגשים" של טופס מפגש — חיפוש מיקום תוך כדי הקלדה
 * (עם debounce), בחירת הצעה, וגיבוי ידני של הדבקת קישור Google Maps.
 * חולצה מ-admin/events/new/page.tsx ו-edit-event-schedule-form.tsx,
 * ששני אלה החזיקו עותק כמעט מילה-במילה של כל זה — כל תיקון עתידי
 * (debounce, "אין תוצאות", נגישות) חייב היה להתבצע פעמיים.
 */
export function useEventLocation(initial: {
  locationName: string;
  lat: number;
  lng: number;
  mapsUrl: string | null;
  /** true בעריכת מפגש קיים (המיקום כבר נכון, אין צורך לחפש עליו
   * מיד); false ביצירת מפגש חדש. */
  skipInitialSearch: boolean;
}) {
  const [locationName, setLocationNameState] = useState(
    initial.locationName,
  );
  const [coords, setCoordsState] = useState({
    lat: initial.lat,
    lng: initial.lng,
  });
  const [mapsUrl, setMapsUrl] = useState<string | null>(initial.mapsUrl);

  const [suggestions, setSuggestions] = useState<LocationSuggestion[]>([]);
  const [searching, setSearching] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  // איזו הצעה מודגשת כרגע כשמנווטים עם חצי המקלדת. -1 = כלום מודגש.
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  // בחירת הצעה/קישור גם היא משנה את locationName — בלי הדגל הזה
  // הבחירה הייתה מפעילה חיפוש חדש על השם שהיא עצמה קבעה.
  const skipNextSearch = useRef(initial.skipInitialSearch);
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

  /** עריכה חופשית בשדה עצמו — לא קשורה יותר לקישור הישן, כי הוא כבר
   * לא בהכרח מתאר את מה שכתוב עכשיו. */
  function setLocationName(name: string) {
    setLocationNameState(name);
    setMapsUrl(null);
  }

  /** סימון ידני על המפה מבטל את הקישור שנשמר — הוא כבר לא מתאר את
   * הנקודה שנבחרה בפועל. */
  function setCoordsManually(c: { lat: number; lng: number }) {
    setCoordsState(c);
    setMapsUrl(null);
  }

  function chooseSuggestion(s: LocationSuggestion) {
    skipNextSearch.current = true;
    setLocationNameState(s.shortLabel);
    setCoordsState({ lat: s.lat, lng: s.lng });
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

  /** ניווט מקלדת בתיבת ההצעות — לצרף ל-onKeyDown של שדה שם המקום. */
  function onLocationInputKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!showSuggestions) return;
    // ESC סוגר תמיד כשהרשימה פתוחה — גם בזמן חיפוש וגם כשאין תוצאות.
    if (e.key === "Escape") {
      setShowSuggestions(false);
      return;
    }
    if (suggestions.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightedIndex((i) => (i < suggestions.length - 1 ? i + 1 : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightedIndex((i) => (i > 0 ? i - 1 : suggestions.length - 1));
    } else if (e.key === "Enter") {
      if (highlightedIndex >= 0) {
        e.preventDefault();
        chooseSuggestion(suggestions[highlightedIndex]);
      }
    }
  }

  // --- גיבוי ידני: הדבקת קישור Google Maps, למקרה שהחיפוש לא מצא
  // בדיוק את הנקודה הנכונה ---
  const [mapsLinkInput, setMapsLinkInput] = useState("");
  const [resolvingLink, setResolvingLink] = useState(false);
  const [linkError, setLinkError] = useState<string | null>(null);

  async function onResolveMapsLink() {
    if (!mapsLinkInput.trim()) return;
    setLinkError(null);
    setResolvingLink(true);

    let result;
    try {
      result = await resolveMapsLinkAction(mapsLinkInput.trim());
    } catch {
      // כשל רשת אמיתי זורק חריגה במקום להחזיר error מסודר — בלי
      // try/catch הכפתור היה נשאר נעול על "מאתרים…" לצמיתות.
      setResolvingLink(false);
      setLinkError("לא הצלחנו לפתוח את הקישור. בדקו את החיבור ונסו שוב.");
      return;
    }
    setResolvingLink(false);

    if (!result.ok) {
      setLinkError(result.error);
      return;
    }

    setCoordsState({ lat: result.lat, lng: result.lng });
    setMapsUrl(result.url);
    if (result.name) {
      skipNextSearch.current = true;
      setLocationNameState(result.name);
    }
    setFocusSignal((n) => n + 1);
  }

  return {
    locationName,
    setLocationName,
    coords,
    setCoords: setCoordsManually,
    mapsUrl,
    suggestions,
    searching,
    showSuggestions,
    searchError,
    highlightedIndex,
    setHighlightedIndex,
    focusSignal,
    chooseSuggestion,
    onLocationInputKeyDown,
    mapsLinkInput,
    setMapsLinkInput,
    resolvingLink,
    linkError,
    onResolveMapsLink,
  };
}
