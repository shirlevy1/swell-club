"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { getMembersForAttendanceAction } from "@/lib/actions";
import type { MemberPickerRow } from "@/lib/data";
import { EditIcon, SwimmerIcon, XIcon } from "./social-icons";

/**
 * הוספת נוכחות ידנית — למי שהגיע בפועל אבל פספס את חלון הצ'ק־אין.
 * admin_add_attendance() כבר קיימת במסד ובודקת הרשאת מנהלת בעצמה
 * בשרת; זה רק הממשק שקורא לה. רשימת החברים נטענת רק כשפותחים את
 * הפאנל, לא כחלק מטעינת עמוד המפגש עצמו.
 *
 * מודאל ממורכז במסך, לא תפריט צף שתלוי באייקון קטן — רשימת חברי
 * קהילה יכולה להיות ארוכה, ותפריט צף מהאייקון (24px, בקצה השורה)
 * יצא חתוך/עקום. עדיף חלון ממורכז עם גלילה משלו.
 */
export function AddAttendanceButton({
  eventId,
  excludeProfileIds,
}: {
  eventId: string;
  excludeProfileIds: string[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [members, setMembers] = useState<MemberPickerRow[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [addingId, setAddingId] = useState<string | null>(null);
  const [justAdded, setJustAdded] = useState<Set<string>>(new Set());

  async function openModal() {
    setOpen(true);
    if (members) return;
    setLoading(true);
    setError(null);
    const result = await getMembersForAttendanceAction();
    if (!result.ok) {
      setError(result.error);
    } else {
      setMembers(result.members);
    }
    setLoading(false);
  }

  async function addMember(profileId: string) {
    setAddingId(profileId);
    setError(null);
    const { error: rpcError } = await createClient().rpc(
      "admin_add_attendance",
      { p_event_id: eventId, p_profile_id: profileId },
    );
    if (rpcError) {
      setError("לא הצלחנו להוסיף. נסו שוב.");
      setAddingId(null);
      return;
    }
    setJustAdded((prev) => new Set(prev).add(profileId));
    setAddingId(null);
    router.refresh();
  }

  const excluded = new Set([...excludeProfileIds, ...justAdded]);
  const visible = (members ?? []).filter(
    (m) => !excluded.has(m.profileId) && m.fullName.includes(query.trim()),
  );

  return (
    <>
      <button
        type="button"
        onClick={openModal}
        aria-label="הוספת נוכחות ידנית"
        className="flex size-6 shrink-0 items-center justify-center rounded-full border border-(--color-line) bg-(--color-surface) text-(--color-sea) transition hover:border-(--color-sea)/50 hover:bg-(--color-sea)/10"
      >
        <EditIcon className="size-3.5" />
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) setOpen(false);
          }}
        >
          <div className="flex max-h-[80vh] w-full max-w-sm flex-col rounded-2xl bg-(--color-surface) shadow-xl">
            <div className="flex shrink-0 items-center justify-between border-b border-(--color-line) p-4">
              <p className="text-sm font-bold">הוספת נוכחות ידנית</p>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="סגירה"
                className="flex size-8 shrink-0 items-center justify-center rounded-full text-(--color-ink-faint) transition hover:bg-(--color-haze)"
              >
                <XIcon className="size-4" />
              </button>
            </div>

            <div className="shrink-0 p-4 pb-2">
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="חיפוש לפי שם"
                className="w-full rounded-lg border border-(--color-line) bg-(--color-page) px-3 py-2 text-sm text-(--color-ink)"
              />
              {error && (
                <p className="mt-2 text-xs text-(--color-fail)">{error}</p>
              )}
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto p-4 pt-0">
              {loading ? (
                <p className="text-sm text-(--color-ink-faint)">טוען…</p>
              ) : visible.length === 0 ? (
                <p className="text-sm text-(--color-ink-faint)">
                  {query
                    ? "לא נמצא אף אחד בשם הזה."
                    : "כל חברי הקהילה כבר ברשימת הנוכחים."}
                </p>
              ) : (
                <ul className="space-y-1">
                  {visible.map((m) => (
                    <li key={m.profileId}>
                      <button
                        type="button"
                        onClick={() => addMember(m.profileId)}
                        disabled={addingId === m.profileId}
                        className="flex min-h-11 w-full items-center gap-3 rounded-lg px-2 py-2 text-start transition hover:bg-(--color-haze) disabled:opacity-50"
                      >
                        <span className="flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-(--color-line)/40">
                          {m.selfieUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={m.selfieUrl}
                              alt={m.fullName}
                              className="size-full object-cover"
                            />
                          ) : (
                            <SwimmerIcon className="size-5 text-(--color-ink-faint)" />
                          )}
                        </span>
                        <span className="min-w-0 flex-1 truncate text-sm font-semibold">
                          {m.fullName}
                        </span>
                        <span className="shrink-0 text-xs text-(--color-sea)">
                          {addingId === m.profileId ? "מוסיף…" : "הוספה"}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
