"use client";

import { useEffect, useRef, useState } from "react";
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
import { PhotoLightbox } from "@/components/photo-lightbox";
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

function DownloadIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.1"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <path d="M12 4v11m0 0 4-4m-4 4-4-4M5 19h14" />
    </svg>
  );
}

/**
 * רק ל-iOS: שם תפריט השיתוף המובנה כולל "שמירת תמונות" שנוחתת ישר
 * בגלריה, וזו הדרך היחידה לשמור בכלל (קישור download רגיל לכתובת
 * ממתחם אחר רק פותח את התמונה, לא שומר אותה).
 *
 * באנדרואיד תפריט השיתוף **לא** כולל פעולת "שמירה לגלריה" גנרית —
 * זו לא בעיית תאימות שאפשר לעקוף, זו התנהגות שונה בין הפלטפורמות
 * (נבדק בפועל: גם ב-Chrome, לא רק Samsung Internet — התפריט נפתח
 * ותקין, פשוט אין בו אפשרות כזו). הורדה ישירה, שנוחתת בתיקיית
 * ההורדות, היא בפועל הדרך הכי ברורה שם.
 */
function isIOS(): boolean {
  return typeof navigator !== "undefined" && /iPad|iPhone|iPod/.test(navigator.userAgent);
}

/**
 * כמה קבצי הורדה שנורים ברצף מהעמוד עצמו (בלי אינטראקציה נפרדת של
 * המשתמש/ת לכל אחד) נחסמים על ידי דפדפני כרום/אנדרואיד כ"הורדות
 * מרובות אוטומטיות" — רק הראשונה עוברת, השאר נבלעות בשקט. הפתרון:
 * תמונה בודדת יורדת ישירות, אבל כמה תמונות ביחד ארוזות קודם לקובץ
 * ZIP אחד, כדי שזו תמיד הורדה אחת בלבד.
 */
async function downloadViaBlobLinks(
  items: { url: string; filename: string }[],
): Promise<void> {
  if (items.length === 1) {
    const [item] = items;
    const res = await fetch(item.url);
    const blob = await res.blob();
    const blobUrl = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = blobUrl;
    a.download = item.filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(blobUrl);
    return;
  }

  const { default: JSZip } = await import("jszip");
  const zip = new JSZip();
  await Promise.all(
    items.map(async (item) => {
      const res = await fetch(item.url);
      const blob = await res.blob();
      zip.file(item.filename, blob);
    }),
  );
  const zipBlob = await zip.generateAsync({ type: "blob" });
  const blobUrl = URL.createObjectURL(zipBlob);
  const a = document.createElement("a");
  a.href = blobUrl;
  a.download = "תמונות-מהמפגש.zip";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(blobUrl);
}

async function downloadPhotos(
  items: { url: string; filename: string }[],
): Promise<boolean> {
  try {
    if (isIOS()) {
      const files = await Promise.all(
        items.map(async (item) => {
          const res = await fetch(item.url);
          const blob = await res.blob();
          return new File([blob], item.filename, {
            type: blob.type || "image/jpeg",
          });
        }),
      );
      if (navigator.canShare?.({ files })) {
        await navigator.share({ files });
        return true;
      }
    }

    await downloadViaBlobLinks(items);
    return true;
  } catch (err) {
    // AbortError = המשתמש/ת ביטל/ה את תפריט השיתוף בעצמו/ה — לא שגיאה
    return (err as { name?: string } | null)?.name === "AbortError";
  }
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
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [downloaded, setDownloaded] = useState<string | null>(null);

  function flashDownloaded(message: string) {
    setDownloaded(message);
    setTimeout(() => setDownloaded((m) => (m === message ? null : m)), 3000);
  }

  const approved = photos.filter((p) => p.status === "approved");
  // כשאין הרשאת ניהול, RLS כבר לא מחזירה בכלל תמונות ממתינות של אחרים —
  // מה שנשאר תחת pending הוא תמיד רק שלי.
  const pending = photos.filter((p) => p.status === "pending");

  // למנהלת יש אזור אישור נפרד עם כפתורי אישור/דחייה, ולכן הרשת הראשית
  // שלה מציגה רק מאושרות — כדי לא להציג את אותן תמונות פעמיים. לחבר/ה
  // רגיל/ה הרשת הראשית *היא* התשובה: RLS כבר מחזירה בדיוק את מה שמותר
  // לו/ה לראות (מאושרות של כולם + הממתינות של עצמו/ה), כך שהתמונה
  // הממתינה שלו/ה מופיעה מיד, בשקיפות חלקית, באותו מקום שבו תהיה
  // כשתאושר — ולא נעלמת ומופיעה מחדש במקום אחר.
  const gridPhotos = canManage ? approved : photos;

  // עדכון חי: כשהמנהלת מאשרת/מוחקת/מישהו מעלה, כל מי שכבר פתוח/ה בעמוד
  // המפגש מקבל/ת את זה מיד — בלי לצאת ולהיכנס מחדש. ה-RLS על event_photos
  // חל גם כאן, אז כל אחד/ת מקבל/ת התראה רק על מה שמותר לו/ה לראות ממילא.
  useEffect(() => {
    if (demoMode) return;
    const supabase = createClient();
    const channel = supabase
      .channel(`event_photos:${eventId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "event_photos",
          filter: `event_id=eq.${eventId}`,
        },
        () => router.refresh(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [eventId, router]);

  // רשת ביטחון: חיבור חי (WebSocket) לא תמיד נשאר פתוח באמינות בנייד
  // (למשל כשהדפדפן עובר לרקע). רענון תקופתי מבטיח שהאלבום מתעדכן לבד
  // תוך זמן קצר גם אם החיבור החי נופל, בלי תלות בו לגמרי.
  useEffect(() => {
    if (demoMode) return;
    const id = setInterval(() => router.refresh(), 15_000);
    return () => clearInterval(id);
  }, [router]);

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
        const { data: photoRow, error: addError } = await supabase.rpc(
          "add_event_photo",
          { p_event_id: eventId, p_storage_path: path },
        );
        if (addError) throw addError;

        // רק אם באמת נכנסה כ"ממתינה" — העלאת מנהלת מאושרת מיד ולא
        // צריכה להודיע לעצמה. לא ממתינים לזה, זה לא חוסם את ההעלאה.
        if (photoRow?.status === "pending") {
          fetch("/api/push/notify-new-photo", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ photo_id: photoRow.id }),
          }).catch(() => {});
        }
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
    // אותה בטוחה בדיוק כמו מחיקת מפגש שלם (delete-event-button.tsx) —
    // גם מחיקת תמונה בלתי הפיכה, ולא הייתה לה שום "רגע לפני" עד עכשיו.
    if (!window.confirm("למחוק את התמונה הזו? הפעולה לא הפיכה.")) return;

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
    setViewerIndex(null);
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

  async function downloadSelected() {
    setDownloading(true);
    const chosen = gridPhotos.filter((p) => selected.has(p.id));
    const ok = await downloadPhotos(
      chosen.map((p, i) => ({ url: p.url, filename: `תמונה-מהמפגש-${i + 1}.jpg` })),
    );
    setDownloading(false);
    if (!ok) {
      setError("ההורדה נכשלה. נסו שוב.");
      return;
    }
    flashDownloaded(
      chosen.length === 1 ? "התמונה הורדה בהצלחה." : `${chosen.length} תמונות הורדו בהצלחה.`,
    );
    setSelecting(false);
    setSelected(new Set());
  }

  async function downloadOne(photo: EventPhoto) {
    setDownloading(true);
    const ok = await downloadPhotos([{ url: photo.url, filename: "תמונה-מהמפגש.jpg" }]);
    setDownloading(false);
    if (!ok) return setError("ההורדה נכשלה. נסו שוב.");
    flashDownloaded("התמונה הורדה בהצלחה.");
  }

  if (!approved.length && !pending.length && !canUpload) return null;

  const viewerPhoto = viewerIndex !== null ? gridPhotos[viewerIndex] : null;

  return (
    <div className="space-y-4">
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-sm font-semibold">אלבום המפגש</p>
        <div className="flex items-center gap-3">
          {gridPhotos.length > 0 && (
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
      {downloaded && <Notice tone="good">{downloaded}</Notice>}

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
                <p className="truncate text-[0.65rem] text-(--color-ink-faint)">
                  {photo.uploaderName}
                </p>
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

      {gridPhotos.length > 0 ? (
        <div className="grid grid-cols-3 gap-2">
          {gridPhotos.map((photo, i) => {
            const isSelected = selected.has(photo.id);
            const isPending = photo.status === "pending";
            return (
              <button
                key={photo.id}
                type="button"
                onClick={() => (selecting ? toggleSelected(photo.id) : setViewerIndex(i))}
                aria-pressed={selecting ? isSelected : undefined}
                aria-label={selecting ? "בחירת תמונה" : "הצגת תמונה"}
                className="relative aspect-square overflow-hidden rounded-lg bg-(--color-haze)"
              >
                {/* מקורות מעורבים (קישור חתום / data URL / נכס מקומי
                    בהדגמה) — next/image דורש רשימת דומיינים מוגדרת מראש
                    ולא מתאים כאן, בדיוק כמו בסלפים ב-attendee-grid. */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={photo.url}
                  alt=""
                  className={
                    "size-full object-cover transition " +
                    (isPending ? "opacity-45 " : "") +
                    (selecting && isSelected ? "opacity-60" : "")
                  }
                  loading="lazy"
                />

                {/* עד שהמנהלת מאשרת, התמונה שקופה חלקית — ברגע שהיא
                    מאושרת, אותה תמונה באותו מקום עוברת לצבע מלא. */}
                {isPending && (
                  <span className="pointer-events-none absolute inset-x-1 bottom-1 rounded-full bg-black/60 py-0.5 text-center text-[0.65rem] font-bold text-white">
                    ממתין לאישור
                  </span>
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
                  <span
                    role="button"
                    tabIndex={0}
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete(photo);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.stopPropagation();
                        onDelete(photo);
                      }
                    }}
                    aria-label="מחיקת תמונה"
                    className="absolute end-1 top-1 flex size-7 items-center justify-center rounded-full bg-black/55 text-xs text-white"
                  >
                    ✕
                  </span>
                )}
              </button>
            );
          })}
        </div>
      ) : (
        pending.length === 0 && (
          <p className="text-sm text-(--color-ink-faint)">
            עוד לא עלו תמונות מהמפגש הזה. יש לכם תמונות? שתפו אותן איתנו.
          </p>
        )
      )}

      {selecting && selected.size > 0 && (
        <Button onClick={downloadSelected} disabled={downloading} className="w-full">
          {downloading
            ? "מורידים…"
            : selected.size === 1
              ? "הורדת תמונה"
              : `הורדת ${selected.size} תמונות`}
        </Button>
      )}

      {viewerPhoto && (
        <PhotoLightbox
          photos={gridPhotos}
          index={viewerIndex!}
          onIndexChange={(i) => setViewerIndex(i)}
          onClose={() => setViewerIndex(null)}
          label={viewerPhoto.status === "pending" ? "ממתין לאישור" : undefined}
          footer={
            downloaded && (
              <p className="pb-4 text-center text-sm font-semibold text-white">
                {downloaded}
              </p>
            )
          }
          actions={
            <>
              {canManage && (
                <button
                  type="button"
                  onClick={() => onDelete(viewerPhoto)}
                  disabled={busyId === viewerPhoto.id}
                  className="rounded-full bg-white/10 px-4 py-2 text-xs font-bold text-white disabled:opacity-40"
                >
                  מחיקה
                </button>
              )}
              <button
                type="button"
                onClick={() => downloadOne(viewerPhoto)}
                disabled={downloading}
                className="flex items-center gap-1.5 rounded-full bg-white/10 px-4 py-2 text-xs font-bold text-white disabled:opacity-40"
              >
                <DownloadIcon className="size-4" />
                הורדה
              </button>
            </>
          }
        />
      )}
    </div>
  );
}
