"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { demoMode } from "@/lib/config";
import { approveEventPhotoAction, deleteEventPhotoAction } from "@/lib/demo/actions";
import { Notice } from "./ui";

export function PendingPhotoCard({
  photoId,
  eventId,
  eventTitle,
  url,
  storagePath,
}: {
  photoId: string;
  eventId: string;
  eventTitle: string;
  url: string;
  storagePath: string | null;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<"approve" | "reject" | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function approve() {
    setError(null);
    setBusy("approve");
    if (demoMode) {
      await approveEventPhotoAction(eventId, photoId);
    } else {
      const supabase = createClient();
      const { error: updateError } = await supabase
        .from("event_photos")
        .update({ status: "approved" })
        .eq("id", photoId);
      if (updateError) {
        setBusy(null);
        return setError("לא הצלחנו לאשר. נסו שוב.");
      }
    }
    setBusy(null);
    router.refresh();
  }

  async function reject() {
    setError(null);
    setBusy("reject");
    if (demoMode) {
      await deleteEventPhotoAction(eventId, photoId);
    } else {
      const supabase = createClient();
      if (storagePath) {
        await supabase.storage.from("event-photos").remove([storagePath]);
      }
      const { error: deleteError } = await supabase
        .from("event_photos")
        .delete()
        .eq("id", photoId);
      if (deleteError) {
        setBusy(null);
        return setError("לא הצלחנו לדחות. נסו שוב.");
      }
    }
    setBusy(null);
    router.refresh();
  }

  return (
    <div className="space-y-1.5">
      <div className="aspect-square overflow-hidden rounded-lg bg-(--color-haze)">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={url} alt="" className="size-full object-cover" loading="lazy" />
      </div>
      <p className="truncate text-[0.7rem] text-(--color-ink-faint)">{eventTitle}</p>
      <div className="flex gap-1">
        <button
          type="button"
          onClick={approve}
          disabled={busy !== null}
          className="flex-1 rounded-lg bg-(--color-sea) py-1 text-[0.7rem] font-bold text-white disabled:opacity-40"
        >
          {busy === "approve" ? "רגע…" : "אישור"}
        </button>
        <button
          type="button"
          onClick={reject}
          disabled={busy !== null}
          className="flex-1 rounded-lg border border-(--color-line) bg-(--color-surface) py-1 text-[0.7rem] font-bold text-(--color-ink-soft) disabled:opacity-40"
        >
          {busy === "reject" ? "רגע…" : "דחייה"}
        </button>
      </div>
      {error && <Notice tone="error">{error}</Notice>}
    </div>
  );
}
