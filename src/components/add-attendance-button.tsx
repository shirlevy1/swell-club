"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { getMembersForAttendanceAction } from "@/lib/actions";
import type { MemberPickerRow } from "@/lib/data";
import { SwimmerIcon } from "./social-icons";
import { Card } from "./ui";

/**
 * הוספת נוכחות ידנית — למי שהגיע בפועל אבל פספס את חלון הצ'ק־אין.
 * admin_add_attendance() כבר קיימת במסד ובודקת הרשאת מנהלת בעצמה
 * בשרת; זה רק הממשק שקורא לה. רשימת החברים נטענת רק כשפותחים את
 * הפאנל, לא כחלק מטעינת עמוד המפגש עצמו.
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

  async function toggleOpen() {
    if (open) {
      setOpen(false);
      return;
    }
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
    <div className="space-y-3">
      <button
        type="button"
        onClick={toggleOpen}
        className="min-h-11 text-sm font-semibold text-(--color-sea)"
      >
        {open ? "סגירה" : "הוספת נוכחות ידנית"}
      </button>

      {open && (
        <Card className="space-y-3">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="חיפוש לפי שם"
            className="w-full rounded-lg border border-(--color-line) bg-(--color-page) px-3 py-2 text-sm text-(--color-ink)"
          />

          {error && <p className="text-xs text-(--color-fail)">{error}</p>}

          {loading ? (
            <p className="text-sm text-(--color-ink-faint)">טוען…</p>
          ) : visible.length === 0 ? (
            <p className="text-sm text-(--color-ink-faint)">
              {query
                ? "לא נמצא אף אחד בשם הזה."
                : "כל חברי הקהילה כבר ברשימת הנוכחים."}
            </p>
          ) : (
            <ul className="max-h-80 space-y-1 overflow-y-auto">
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
        </Card>
      )}
    </div>
  );
}
