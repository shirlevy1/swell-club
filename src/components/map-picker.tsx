"use client";

import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { geolocationErrorMessage } from "@/lib/geo";

/** חוף תל אביב — נקודת פתיחה סבירה לקהילה ימית */
const DEFAULT_CENTER: [number, number] = [32.087, 34.766];

export function MapPicker({
  lat,
  lng,
  radiusM,
  onChange,
}: {
  lat: number | null;
  lng: number | null;
  radiusM: number;
  onChange: (coords: { lat: number; lng: number }) => void;
}) {
  const [geoError, setGeoError] = useState<string | null>(null);
  const holder = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const marker = useRef<L.CircleMarker | null>(null);
  const ring = useRef<L.Circle | null>(null);
  // ה-handler נשמר ב-ref כדי שה-listener של המפה יראה תמיד את הגרסה
  // העדכנית, בלי לבנות את המפה מחדש בכל רנדר.
  const onChangeRef = useRef(onChange);
  useEffect(() => {
    onChangeRef.current = onChange;
  });

  // המרכז ההתחלתי נקרא פעם אחת. בלי זה כל לחיצה הייתה בונה מפה מחדש
  // ומאפסת את הזום שהמשתמש הגדיר.
  const initialCenter = useRef<[number, number]>(
    lat != null && lng != null ? [lat, lng] : DEFAULT_CENTER,
  );

  useEffect(() => {
    if (!holder.current || map.current) return;

    const m = L.map(holder.current, {
      center: initialCenter.current,
      zoom: 15,
      attributionControl: true,
    });

    // אריחים בהירים ומעודנים — ברירת המחדל הצבעונית של OSM צורמת
    // מול הכחול הרך של הממשק
    L.tileLayer(
      "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",
      {
        maxZoom: 19,
        attribution: "© OpenStreetMap © CARTO",
      },
    ).addTo(m);

    m.on("click", (e: L.LeafletMouseEvent) => {
      onChangeRef.current({ lat: e.latlng.lat, lng: e.latlng.lng });
    });

    map.current = m;
    // הגודל נמדד לפני שה-layout התייצב; ההשהיה מונעת אריחים אפורים
    setTimeout(() => m.invalidateSize(), 60);

    return () => {
      m.remove();
      map.current = null;
      marker.current = null;
      ring.current = null;
    };
  }, []);

  // סימון הנקודה הנבחרת ורדיוס הצ'ק־אין
  useEffect(() => {
    const m = map.current;
    if (!m || lat == null || lng == null) return;

    const pos: [number, number] = [lat, lng];

    if (!marker.current) {
      marker.current = L.circleMarker(pos, {
        radius: 7,
        color: "#ffffff",
        weight: 2.5,
        fillColor: "#46738f",
        fillOpacity: 1,
      }).addTo(m);
      ring.current = L.circle(pos, {
        radius: radiusM,
        color: "#46738f",
        weight: 1.5,
        fillColor: "#92adc5",
        fillOpacity: 0.18,
      }).addTo(m);
    } else {
      marker.current.setLatLng(pos);
      ring.current?.setLatLng(pos);
    }
    ring.current?.setRadius(radiusM);
  }, [lat, lng, radiusM]);

  return (
    <div className="space-y-2">
      <div
        ref={holder}
        className="h-64 w-full overflow-hidden rounded-xl border border-(--color-line)"
      />
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs text-(--color-ink-faint)">
          לחצו על המפה כדי לסמן איפה נפגשים.
        </p>
        <button
          type="button"
          onClick={() =>
            navigator.geolocation?.getCurrentPosition(
              (p) => {
                setGeoError(null);
                const c = {
                  lat: p.coords.latitude,
                  lng: p.coords.longitude,
                };
                onChangeRef.current(c);
                map.current?.setView([c.lat, c.lng], 16);
              },
              // בלי callback לשגיאה, סירוב להרשאת מיקום נראה כמו כפתור
              // שבור: לוחצים, ולא קורה כלום.
              (err) => setGeoError(geolocationErrorMessage(err)),
            )
          }
          className="-me-2 inline-flex min-h-11 shrink-0 items-center px-2 text-xs font-semibold text-(--color-sea) underline underline-offset-4"
        >
          המיקום שלי
        </button>
      </div>
      {geoError && (
        <p className="text-xs text-(--color-fail)">{geoError}</p>
      )}
    </div>
  );
}
