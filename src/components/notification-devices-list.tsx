"use client";

import { useEffect, useState } from "react";
import { demoMode } from "@/lib/config";
import { createClient } from "@/lib/supabase/client";
import { formatDateShort } from "@/lib/format";
import { PUSH_DECLINED_EVENT, pushSupported } from "@/lib/push-client";

type Device = { endpoint: string; created_at: string };

/**
 * רשימת כל המכשירים עם מנוי push פעיל לחשבון הזה — לא רק המכשיר
 * הנוכחי. כל מכשיר (טלפון, מחשב) נשמר כשורה נפרדת ומקבל התראה משלו;
 * בלעדי הרשימה הזו אין דרך להסיר מכשיר ישן שכבר לא בשימוש (טלפון
 * קודם וכו') — כיבוי מהפעמון מוריד רק את המכשיר שעליו לוחצים, ומכשיר
 * שלא פותחים יותר ימשיך לקבל התראות פנטום לנצח.
 */
export function NotificationDevicesList() {
  const [devices, setDevices] = useState<Device[] | null>(null);
  const [currentEndpoint, setCurrentEndpoint] = useState<string | null>(null);
  const [removing, setRemoving] = useState<string | null>(null);
  const [removingAll, setRemovingAll] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (demoMode) return;
    let cancelled = false;

    async function load() {
      if (pushSupported()) {
        try {
          const reg = await navigator.serviceWorker.getRegistration();
          const sub = await reg?.pushManager.getSubscription();
          if (!cancelled) setCurrentEndpoint(sub?.endpoint ?? null);
        } catch {
          // לא קריטי — פשוט לא נסמן אף שורה כ"המכשיר הזה"
        }
      }

      const { data } = await createClient()
        .from("push_subscriptions")
        .select("endpoint, created_at")
        .order("created_at", { ascending: false });
      if (!cancelled) setDevices(data ?? []);
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  async function remove(endpoint: string) {
    setError(null);
    setRemoving(endpoint);
    try {
      const { error: deleteError } = await createClient()
        .from("push_subscriptions")
        .delete()
        .eq("endpoint", endpoint);
      if (deleteError) throw deleteError;

      // מסירים את המכשיר הנוכחי עצמו — לא רק שורה במסד, גם המנוי
      // האמיתי בדפדפן, אחרת הוא ייווצר מחדש בטעות בפעם הבאה
      if (endpoint === currentEndpoint) {
        const reg = await navigator.serviceWorker.getRegistration();
        const sub = await reg?.pushManager.getSubscription();
        await sub?.unsubscribe();
        window.dispatchEvent(new Event(PUSH_DECLINED_EVENT));
      }
      setDevices((list) => (list ?? []).filter((d) => d.endpoint !== endpoint));
    } catch {
      setError("לא הצלחנו להסיר את המכשיר. נסו שוב.");
    } finally {
      setRemoving(null);
    }
  }

  async function removeAllOthers() {
    const others = (devices ?? []).filter((d) => d.endpoint !== currentEndpoint);
    if (others.length === 0) return;
    setError(null);
    setRemovingAll(true);
    try {
      const { error: deleteError } = await createClient()
        .from("push_subscriptions")
        .delete()
        .in(
          "endpoint",
          others.map((d) => d.endpoint),
        );
      if (deleteError) throw deleteError;
      setDevices((list) =>
        (list ?? []).filter((d) => d.endpoint === currentEndpoint),
      );
    } catch {
      setError("לא הצלחנו להסיר את המכשירים. נסו שוב.");
    } finally {
      setRemovingAll(false);
    }
  }

  if (!devices || devices.length === 0) return null;
  const hasOthers = devices.some((d) => d.endpoint !== currentEndpoint);

  return (
    <section className="space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-0.5">
          <h2 className="text-xs font-bold tracking-[0.2em] text-(--color-sea)">
            מכשירים עם התראות
          </h2>
          <p className="text-xs text-(--color-ink-faint)">
            כל מכשיר שהפעלתם בו תזכורות מקבל אותן בנפרד. מכשיר שכבר לא
            בשימוש כדאי להסיר, כדי שלא ימשיך לקבל התראות.
          </p>
        </div>
        {hasOthers && (
          <button
            type="button"
            onClick={removeAllOthers}
            disabled={removingAll || removing !== null}
            className="shrink-0 text-xs font-semibold whitespace-nowrap text-(--color-fail) underline underline-offset-4 disabled:opacity-40"
          >
            {removingAll ? "מסירים…" : "הסרת כל השאר"}
          </button>
        )}
      </div>
      <ul className="space-y-2">
        {devices.map((d) => (
          <li
            key={d.endpoint}
            className="flex items-center justify-between gap-3 rounded-xl border border-(--color-line) bg-(--color-surface) px-4 py-3"
          >
            <span className="text-sm text-(--color-ink-soft)">
              {d.endpoint === currentEndpoint
                ? "המכשיר הזה"
                : `נוסף ב־${formatDateShort(d.created_at)}`}
            </span>
            <button
              type="button"
              onClick={() => remove(d.endpoint)}
              disabled={removing === d.endpoint || removingAll}
              className="text-sm font-semibold text-(--color-fail) underline underline-offset-4 disabled:opacity-40"
            >
              {removing === d.endpoint ? "מסירים…" : "הסרה"}
            </button>
          </li>
        ))}
      </ul>
      {error && <p className="text-xs text-(--color-fail)">{error}</p>}
    </section>
  );
}
