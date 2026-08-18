"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { demoMode } from "@/lib/config";
import {
  addEventPhotoAction,
  approveEventPhotoAction,
  deleteEventPhotoAction,
} from "@/lib/demo/actions";
import { compressImageFile, blobToDataUrl, ALBUM_PHOTO_OPTIONS } from "@/lib/image";
import { Button, Notice } from "@/components/ui";
import type { EventPhoto } from "@/lib/data";

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <path d="M5 12.5 10 17.5 19 6.5" />
    </svg>
  );
}

export function EventPhotoAlbum({
  eventId,
  photos,
  canManage,
  canUpload,
}: {
  eventId: string;
  photos: EventPhoto[];
  /** המנהלת בלבד: מאשרת/דוחה תמונות ממתינות, ומוחקת כל תמונה */
  canManage: boolean;
  /** כל מי שנכח (וגם המנהלת) יכולים להעלות */
  canUpload: boolean;
}) {
  const router = useRouter();
  const fileInput = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [selecting, setSelecting] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const approved = photos.filter((p) => p.status === "approved");
  // כשאין הרשאת ניהול, RLS כבר לא מחזירה בכלל תמונות ממתינות של אחרים —
  // מה שנשאר תחת pending הוא תמיד רק שלי.
  const pending = photos.filter((p) => p.status === "pending");

  async function onFilesSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    e.target.value = "";
    if (!files.length) return;

    setError(null);
    setUploading(true);

    try {
      for (const file of files) {
        const blob = await compressImageFile(file, ALBUM_PHOTO_OPTIONS);

        if (demoMode) {
          const dataUrl = await blobToDataUrl(blob);
          await addEventPhotoAction(eventId, dataUrl);
          continue;
        }

        const supabase = createClient();
        const path = `${eventId}/${crypto.randomUUID()}.jpg`;
        const { error: uploadError } = await supabase.storage
          .from("event-photos")
          .upload(path, blob, { contentType: "image/jpeg" });
        if (uploadError) throw uploadError;

        // רושמת את התמונה כ"ממתינה לאישור" (או מאושרת מיד, אם מדובר
        // במנהלת) — בלי זה הקובץ קיים ב-storage אבל לא מופיע לאף אחד.
        const { error: addError } = await supabase.rpc("add_event_photo", {
          p_event_id: eventId,
          p_storage_path: path,
        });
        if (addError) throw addError;
      }
      router.refresh();
    } catch {
      setError(
        "העלאת התמונות נכשלה. יכול להיות שהפורמט לא נתמך — נסו תמונה אחרת.",
      );
    } finally {
      setUploading(false);
    }
  }

  async function onApprove(photoId: string) {
    setBusyId(photoId);
    if (demoMode) {
      await approveEventPhotoAction(eventId, photoId);
    } else {
      const supabase = createClient();
      await supabase
        .from("event_photos")
        .update({ status: "approved" })
        .eq("id", photoId);
    }
    setBusyId(null);
    router.refresh();
  }

  async function onDelete(photo: EventPhoto) {
    setBusyId(photo.id);
    if (demoMode) {
      await deleteEventPhotoAction(eventId, photo.id);
    } else {
      const supabase = createClient();
      if (photo.storagePath) {
        await supabase.storage.from("event-photos").remove([photo.storagePath]);
      }
      await supabase.from("event_photos").delete().eq("id", photo.id);
    }
    setSelected((s) => {
      if (!s.has(photo.id)) return s;
      const next = new Set(s);
      next.delete(photo.id);
      return next;
    });
    setBusyId(null);
    router.refresh();
  }

  function toggleSelected(photoId: string) {
    setSelected((s) => {
      const next = new Set(s);
      if (next.has(photoId)) next.delete(photoId);
      else next.add(photoId);
      return next;
    });
  }

  /** הורדה ברצף עם השהיה קצרה בין קובץ לקובץ — דפדפנים חוסמים כמה
   * הורדות בבת אחת אם הן נורות ממש באותו רגע. */
  async function downloadSelected() {
    const chosen = approved.filter((p) => selected.has(p.id));
    for (const photo of chosen) {
      const a = document.createElement("a");
      a.href = photo.url;
      a.download = "תמונה-מהמפגש.jpg";
      document.body.appendChild(a);
      a.click();
      a.remove();
      await new Promise((r) => setTimeout(r, 250));
    }
    setSelecting(false);
    setSelected(new Set());
  }

  if (!approved.length && !pending.length && !canUpload) return null;

  return (
    <div className="space-y-4">
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-sm font-semibold">אלבום המפגש</p>
        <div className="flex items-center gap-3">
          {approved.length > 0 && (
            <button
              type="button"
              onClick={() => {
                setSelecting((v) => !v);
                setSelected(new Set());
              }}
              className="text-xs font-semibold text-(--color-ink-soft)"
            >
              {selecting ? "ביטול" : "בחירה"}
            </button>
          )}
          {canUpload && (
            <button
              type="button"
              onClick={() => fileInput.current?.click()}
              disabled={uploading}
              className="text-xs font-semibold text-(--color-sea) disabled:opacity-40"
            >
              {uploading ? "מעלה…" : "+ הוספת תמונות"}
            </button>
          )}
        </div>
      </div>

      {canUpload && (
        <input
          ref={fileInput}
          type="file"
          accept="image/*"
          multiple
          onChange={onFilesSelected}
          className="hidden"
        />
      )}

      {error && <Notice tone="error">{error}</Notice>}

      {canManage && pending.length > 0 && (
        <div className="space-y-2 rounded-xl border border-(--color-line) bg-(--color-haze) p-3">
          <p className="text-xs font-bold tracking-[0.1em] text-(--color-sea)">
            {pending.length === 1 ? "תמונה אחת ממתינה לאישור" : `${pending.length} תמונות ממתינות לאישור`}
          </p>
          <div className="grid grid-cols-3 gap-2">
            {pending.map((photo) => (
              <div key={photo.id} className="space-y-1.5">
                <div className="aspect-square overflow-hidden rounded-lg bg-(--color-surface)">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={photo.url}
                    alt=""
                    className="size-full object-cover"
                    loading="lazy"
                  />
                </div>
                <div className="flex gap-1">
                  <button
                    type="button"
                    onClick={() => onApprove(photo.id)}
                    disabled={busyId === photo.id}
                    className="flex-1 rounded-lg bg-(--color-sea) py-1 text-[0.7rem] font-bold text-white disabled:opacity-40"
                  >
                    אישור
                  </button>
                  <button
                    type="button"
                    onClick={() => onDelete(photo)}
                    disabled={busyId === photo.id}
                    className="flex-1 rounded-lg border border-(--color-line) bg-(--color-surface) py-1 text-[0.7rem] font-bold text-(--color-ink-soft) disabled:opacity-40"
                  >
                    דחייה
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {!canManage && pending.length > 0 && (
        <Notice tone="good">
          {pending.length === 1
            ? "תמונה אחת שהעליתם ממתינה לאישור המנהלת."
            : `${pending.length} תמונות שהעליתם ממתינות לאישור המנהלת.`}
        </Notice>
      )}

      {approved.length > 0 ? (
        <div className="grid grid-cols-3 gap-2">
          {approved.map((photo) => {
            const isSelected = selected.has(photo.id);
            return (
              <div
                key={photo.id}
                className="relative aspect-square overflow-hidden rounded-lg bg-(--color-haze)"
              >
                {selecting ? (
                  <button
                    type="button"
                    onClick={() => toggleSelected(photo.id)}
                    className="block size-full"
                    aria-pressed={isSelected}
                    aria-label="בחירת תמונה"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={photo.url}
                      alt=""
                      className={
                        "size-full object-cover transition " +
                        (isSelected ? "opacity-60" : "")
                      }
                      loading="lazy"
                    />
                  </button>
                ) : (
                  <a
                    href={photo.url}
                    download="תמונה-מהמפגש.jpg"
                    className="block size-full"
                  >
                    {/* מקורות מעורבים (קישור חתום / data URL / נכס מקומי
                        בהדגמה) — next/image דורש רשימת דומיינים מוגדרת מראש
                        ולא מתאים כאן, בדיוק כמו בסלפים ב-attendee-grid. */}
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={photo.url}
                      alt=""
                      className="size-full object-cover"
                      loading="lazy"
                    />
                  </a>
                )}

                {selecting && (
                  <div
                    className={
                      "pointer-events-none absolute end-1.5 top-1.5 flex size-5 items-center justify-center rounded-full border-2 border-white " +
                      (isSelected ? "bg-(--color-sea)" : "bg-black/30")
                    }
                  >
                    {isSelected && <CheckIcon className="size-3 text-white" />}
                  </div>
                )}

                {!selecting && canManage && (
                  <button
                    type="button"
                    onClick={() => onDelete(photo)}
                    disabled={busyId === photo.id}
                    aria-label="מחיקת תמונה"
                    className="absolute end-1 top-1 flex size-7 items-center justify-center rounded-full bg-black/55 text-xs text-white disabled:opacity-40"
                  >
                    ✕
                  </button>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        pending.length === 0 && (
          <p className="text-sm text-(--color-ink-faint)">
            עוד לא הועלו תמונות מהמפגש הזה.
          </p>
        )
      )}

      {selecting && selected.size > 0 && (
        <Button onClick={downloadSelected} className="w-full">
          {selected.size === 1 ? "הורדת תמונה" : `הורדת ${selected.size} תמונות`}
        </Button>
      )}
    </div>
  );
}
