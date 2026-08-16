"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { demoMode } from "@/lib/config";
import { addEventPhotoAction, deleteEventPhotoAction } from "@/lib/demo/actions";
import { compressImageFile, blobToDataUrl } from "@/lib/image";
import { Notice } from "@/components/ui";
import type { EventPhoto } from "@/lib/data";

export function EventPhotoAlbum({
  eventId,
  photos,
  canManage,
}: {
  eventId: string;
  photos: EventPhoto[];
  /** רק המנהלת מעלה ומוחקת — היא זו שמריצה את המפגש */
  canManage: boolean;
}) {
  const router = useRouter();
  const fileInput = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onFilesSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    // מאפס את הערך, אחרת בחירה חוזרת של אותו קובץ לא מפעילה onChange
    e.target.value = "";
    if (!files.length) return;

    setError(null);
    setUploading(true);

    try {
      for (const file of files) {
        const blob = await compressImageFile(file);

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

  async function onDelete(photoId: string) {
    if (demoMode) {
      await deleteEventPhotoAction(eventId, photoId);
      router.refresh();
      return;
    }

    // ב-real mode ה-id הוא נתיב האחסון עצמו
    const supabase = createClient();
    const { error: deleteError } = await supabase.storage
      .from("event-photos")
      .remove([photoId]);
    if (!deleteError) router.refresh();
  }

  if (!photos.length && !canManage) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-baseline justify-between">
        <p className="text-sm font-semibold">אלבום המפגש</p>
        {canManage && (
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

      {canManage && (
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

      {photos.length > 0 ? (
        <div className="grid grid-cols-3 gap-2">
          {photos.map((photo) => (
            <div
              key={photo.id}
              className="relative aspect-square overflow-hidden rounded-lg bg-(--color-haze)"
            >
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
              {canManage && (
                <button
                  type="button"
                  onClick={() => onDelete(photo.id)}
                  aria-label="מחיקת תמונה"
                  className="absolute end-1 top-1 flex size-7 items-center justify-center rounded-full bg-black/55 text-xs text-white"
                >
                  ✕
                </button>
              )}
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-(--color-ink-faint)">
          עוד לא הועלו תמונות מהמפגש הזה.
        </p>
      )}
    </div>
  );
}
