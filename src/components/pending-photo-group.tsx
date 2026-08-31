"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { demoMode } from "@/lib/config";
import { approveEventPhotoAction, deleteEventPhotoAction } from "@/lib/demo/actions";
import { CheckIcon, XIcon } from "./social-icons";
import { Notice } from "./ui";
import { PhotoLightbox } from "./photo-lightbox";
import type { PendingEventPhoto } from "@/lib/data";

/** כל התמונות שאדם אחד העלה למפגש אחד — אישור/דחייה בלחיצה אחת על
 * כל הערימה, ועדיין אפשר להוציא תמונה בודדת ממנה אם צריך. */
export function PendingPhotoGroup({
  eventId,
  uploaderId,
  uploaderName,
  photos,
}: {
  eventId: string;
  uploaderId: string;
  uploaderName: string;
  photos: PendingEventPhoto[];
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<"approve" | "reject" | string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);

  async function approvePhotos(toApprove: PendingEventPhoto[]) {
    if (demoMode) {
      await Promise.all(toApprove.map((p) => approveEventPhotoAction(eventId, p.id)));
    } else {
      const supabase = createClient();
      const { error: updateError } = await supabase
        .from("event_photos")
        .update({ status: "approved" })
        .in(
          "id",
          toApprove.map((p) => p.id),
        );
      if (updateError) return false;
    }
    return true;
  }

  async function approveAll() {
    setError(null);
    setBusy("approve");
    const ok = await approvePhotos(photos);
    setBusy(null);
    if (!ok) return setError("לא הצלחנו לאשר. נסו שוב.");
    router.refresh();
  }

  async function approveOne(photo: PendingEventPhoto) {
    setError(null);
    setBusy(photo.id);
    const ok = await approvePhotos([photo]);
    setBusy(null);
    if (!ok) return setError("לא הצלחנו לאשר. נסו שוב.");
    // לא סוגרים את התצוגה המוגדלת — אחרי שה-router.refresh() מביא את
    // הרשימה המעודכנת (בלי התמונה שאושרה), אותו אינדקס פשוט מצביע על
    // התמונה הבאה בערימה. אם זו הייתה האחרונה, photos[viewerIndex]
    // כבר לא קיים וה-JSX למטה סוגר את התצוגה לבד.
    router.refresh();
  }

  async function rejectPhotos(toReject: PendingEventPhoto[]) {
    if (demoMode) {
      await Promise.all(toReject.map((p) => deleteEventPhotoAction(eventId, p.id)));
    } else {
      const supabase = createClient();
      const paths = toReject.flatMap((p) => (p.storagePath ? [p.storagePath] : []));
      if (paths.length) {
        await supabase.storage.from("event-photos").remove(paths);
      }
      const { error: deleteError } = await supabase
        .from("event_photos")
        .delete()
        .in(
          "id",
          toReject.map((p) => p.id),
        );
      if (deleteError) return false;
    }
    return true;
  }

  async function rejectAll() {
    setError(null);
    setBusy("reject");
    const ok = await rejectPhotos(photos);
    setBusy(null);
    if (!ok) return setError("לא הצלחנו לדחות. נסו שוב.");
    router.refresh();
  }

  async function rejectOne(photo: PendingEventPhoto) {
    setError(null);
    setBusy(photo.id);
    const ok = await rejectPhotos([photo]);
    setBusy(null);
    if (!ok) return setError("לא הצלחנו לדחות. נסו שוב.");
    // ראו הערה ב-approveOne — אותו היגיון בדיוק.
    router.refresh();
  }

  const busyAll = busy === "approve" || busy === "reject";

  return (
    <div className="space-y-2 rounded-xl border border-(--color-line) bg-(--color-surface) p-3">
      <div className="flex items-center justify-between gap-2">
        <p className="truncate text-sm font-semibold">
          <Link href={`/admin/members/${uploaderId}`} className="text-(--color-sea) hover:underline">
            {uploaderName}
          </Link>
          <span className="ms-1.5 font-normal text-(--color-ink-faint)">
            ({photos.length === 1 ? "תמונה אחת" : `${photos.length} תמונות`})
          </span>
        </p>
        <div className="flex shrink-0 gap-1.5">
          <button
            type="button"
            onClick={rejectAll}
            disabled={busyAll}
            className="rounded-lg border border-(--color-line) bg-(--color-surface) px-3 py-1.5 text-xs font-bold text-(--color-ink-soft) disabled:opacity-40"
          >
            {busy === "reject" ? "רגע…" : "דחיית הכל"}
          </button>
          <button
            type="button"
            onClick={approveAll}
            disabled={busyAll}
            className="rounded-lg bg-(--color-sea) px-3 py-1.5 text-xs font-bold text-white disabled:opacity-40"
          >
            {busy === "approve" ? "רגע…" : "אישור הכל"}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-1.5">
        {photos.map((photo, i) => (
          <div
            key={photo.id}
            className="relative aspect-square overflow-hidden rounded-lg bg-(--color-haze)"
          >
            <button
              type="button"
              onClick={() => setViewerIndex(i)}
              aria-label="הצגת תמונה בגדול"
              className="block size-full"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={photo.url} alt="" className="size-full object-cover" loading="lazy" />
            </button>
            <button
              type="button"
              onClick={() => approveOne(photo)}
              disabled={busy === photo.id || busyAll}
              aria-label="אישור תמונה זו"
              className="absolute start-1 top-1 flex size-[26px] items-center justify-center rounded-full bg-(--color-sea) text-white disabled:opacity-40"
            >
              <CheckIcon className="size-[15px]" />
            </button>
            <button
              type="button"
              onClick={() => rejectOne(photo)}
              disabled={busy === photo.id || busyAll}
              aria-label="הסרת תמונה זו"
              className="absolute end-1 top-1 flex size-[26px] items-center justify-center rounded-full bg-black/55 text-white disabled:opacity-40"
            >
              <XIcon className="size-[15px]" />
            </button>
          </div>
        ))}
      </div>

      {error && <Notice tone="error">{error}</Notice>}

      {viewerIndex !== null && photos[viewerIndex] && (
        <PhotoLightbox
          photos={photos}
          index={viewerIndex}
          onIndexChange={setViewerIndex}
          onClose={() => setViewerIndex(null)}
          label="ממתין לאישור"
          actions={
            <>
              <button
                type="button"
                onClick={() => rejectOne(photos[viewerIndex])}
                disabled={busy === photos[viewerIndex].id || busyAll}
                className="rounded-full bg-white/10 px-4 py-2 text-xs font-bold text-white disabled:opacity-40"
              >
                דחייה
              </button>
              <button
                type="button"
                onClick={() => approveOne(photos[viewerIndex])}
                disabled={busy === photos[viewerIndex].id || busyAll}
                className="rounded-full bg-white/10 px-4 py-2 text-xs font-bold text-white disabled:opacity-40"
              >
                אישור
              </button>
            </>
          }
        />
      )}
    </div>
  );
}
