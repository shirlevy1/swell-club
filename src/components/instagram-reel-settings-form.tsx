"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { demoMode } from "@/lib/config";
import { updateInstagramReelAction } from "@/lib/demo/actions";
import { compressImageFile, ALBUM_PHOTO_OPTIONS, blobToDataUrl } from "@/lib/image";
import { Button, Card, Field, Input, Notice } from "./ui";

/**
 * שיר ניסתה להדביק את קוד ה"הטבעה" המלא של אינסטגרם (⋯ → הטבעה →
 * העתקת הקוד) במקום רק הקישור (⋯ → העתקת קישור) - שדה url דוחה את
 * זה בשקט עם הודעת ולידציה של הדפדפן, בלי שום הסבר למה. שולפים את
 * הקישור האמיתי מתוך data-instgrm-permalink אם זה מה שהודבק, כדי
 * שהטעות הזו לא תחסום.
 */
function extractReelLink(raw: string): string {
  const trimmed = raw.trim();
  const embedMatch = trimmed.match(/data-instgrm-permalink="([^"]+)"/);
  if (embedMatch) return embedMatch[1];
  const urlMatch = trimmed.match(
    /https?:\/\/(?:www\.)?instagram\.com\/(?:reel|p)\/[A-Za-z0-9_-]+\/?[^\s"'<>]*/,
  );
  if (urlMatch) return urlMatch[0];
  return trimmed;
}

/**
 * טופס עריכת הרייל+תמונת הקאבר בכרטיס האינסטגרם בדף הבית (ראו
 * instagram-reel-showcase.tsx, admin/instagram/page.tsx). currentCoverPath
 * הוא הערך הגולמי השמור (נתיב ב-storage/data URL, לא ה-URL הציבורי
 * המפוענח) - נשלח חזרה כמו שהוא כש"שמירה" נלחץ בלי לבחור תמונה חדשה,
 * כדי שלא לדרוס אותו.
 */
export function InstagramReelSettingsForm({
  clubId,
  currentPermalink,
  currentCoverPath,
  currentCoverUrl,
}: {
  clubId: string;
  currentPermalink: string | null;
  currentCoverPath: string | null;
  currentCoverUrl: string;
}) {
  const router = useRouter();
  const [permalink, setPermalink] = useState(currentPermalink ?? "");
  const [preview, setPreview] = useState(currentCoverUrl);
  const [file, setFile] = useState<File | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    setSuccess(false);
    setPreview(URL.createObjectURL(f));
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    setPending(true);

    try {
      const trimmedPermalink = permalink.trim() || null;
      // ברירת מחדל: הנתיב השמור כבר (לא נוגעים בתמונה אם לא נבחרה חדשה).
      let coverPath = currentCoverPath;

      if (file) {
        const blob = await compressImageFile(file, ALBUM_PHOTO_OPTIONS);
        if (demoMode) {
          coverPath = await blobToDataUrl(blob);
        } else {
          const supabase = createClient();
          const path = `${clubId}/${crypto.randomUUID()}.jpg`;
          const { error: uploadError } = await supabase.storage
            .from("club-assets")
            .upload(path, blob, { contentType: "image/jpeg" });
          if (uploadError) throw uploadError;
          coverPath = path;
        }
      }

      if (demoMode) {
        await updateInstagramReelAction(trimmedPermalink, coverPath);
      } else {
        const supabase = createClient();
        const { error: rpcError } = await supabase.rpc("update_club_instagram_reel", {
          p_club_id: clubId,
          p_permalink: trimmedPermalink,
          p_cover_path: coverPath,
        });
        if (rpcError) throw rpcError;

        // ניקוי הקובץ הישן ב-storage - best-effort, לא חוסם את השמירה
        // אם נכשל (ממילא רק קובץ יתום, לא שגיאת משתמש/ת).
        if (file && currentCoverPath && currentCoverPath !== coverPath) {
          supabase.storage.from("club-assets").remove([currentCoverPath]).catch(() => {});
        }
      }

      setPending(false);
      setSuccess(true);
      setFile(null);
      router.refresh();
    } catch {
      setPending(false);
      setError("משהו השתבש. בדקו את החיבור ונסו שוב.");
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <Card className="space-y-4">
        <Field
          label="קישור הרייל"
          hint="⋯ → העתקת קישור, באינסטגרם (לא ⋯ → הטבעה - זה קוד שונה, לא קישור)"
        >
          <Input
            type="text"
            dir="ltr"
            placeholder="https://www.instagram.com/reel/…"
            value={permalink}
            onChange={(e) => {
              setPermalink(e.target.value);
              setSuccess(false);
            }}
            onPaste={(e) => {
              const pasted = e.clipboardData.getData("text");
              if (pasted.includes("data-instgrm-permalink") || pasted.includes("<blockquote")) {
                e.preventDefault();
                setPermalink(extractReelLink(pasted));
                setSuccess(false);
              }
            }}
            className="text-left"
          />
        </Field>

        <Field label="תמונת קאבר">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={preview}
            alt=""
            className="aspect-[2/3] w-40 rounded-xl border border-(--color-line) object-cover"
          />
          <input
            type="file"
            accept="image/*"
            onChange={onFileChange}
            className="mt-2 block w-full text-sm text-(--color-ink-soft) file:ms-0 file:me-3 file:rounded-lg file:border-0 file:bg-(--color-sea) file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white"
          />
        </Field>
      </Card>

      {error && <Notice tone="error">{error}</Notice>}
      {success && <Notice tone="good">נשמר. דף הבית מציג את הגרסה המעודכנת.</Notice>}

      <Button type="submit" disabled={pending} className="w-full">
        {pending ? "שומרים…" : "שמירה"}
      </Button>
    </form>
  );
}
