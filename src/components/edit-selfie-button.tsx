"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { demoMode } from "@/lib/config";
import { updateSelfieAction } from "@/lib/demo/actions";
import { detectFace } from "@/lib/face-detection";
import { Button, Card, Notice } from "./ui";

type Step = "idle" | "opening" | "camera" | "checking" | "uploading" | "done";

/** אותם ערכים כמו ב-check-in-flow — זה אותו סוג תמונה, לב אמיתי
 * לא לב דמו, אין סיבה שיהיו שונים. */
const MAX_EDGE = 1080;
const JPEG_QUALITY = 0.7;

function cameraErrorMessage(err: unknown): string {
  const name = (err as { name?: string } | null)?.name;
  if (name === "NotAllowedError" || name === "SecurityError") {
    return "הגישה למצלמה נדחתה. צריך לאשר אותה בהגדרות האתר בדפדפן.";
  }
  if (name === "NotFoundError" || name === "OverconstrainedError") {
    return "לא נמצאה מצלמה במכשיר הזה.";
  }
  if (name === "NotReadableError" || name === "AbortError") {
    return "המצלמה תפוסה על ידי אפליקציה אחרת. סגרו אותה ונסו שוב.";
  }
  return "לא הצלחנו לפתוח את המצלמה. נסו שוב.";
}

/**
 * מחליפה את קובץ הסלפי הקיים באותו נתיב ({event_id}/{profile_id}.jpg)
 * — אין קריאה חוזרת ל-check_in(): המיקום והזמן המקוריים של הנוכחות
 * לא משתנים, רק התמונה. selfies_update_own ב-storage היא האכיפה
 * האמיתית של "רק בתוך חלון הצ'ק־אין" — אם היא נסגרה, ההעלאה נכשלת
 * גם אם מישהו יעקוף את הכפתור הזה.
 */
export function EditSelfieButton({ eventId }: { eventId: string }) {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  const [step, setStep] = useState<Step>("idle");
  const [error, setError] = useState<string | null>(null);

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  useEffect(() => stopCamera, [stopCamera]);

  useEffect(() => {
    if (step !== "done") return;
    const id = setTimeout(() => setStep("idle"), 2500);
    return () => clearTimeout(id);
  }, [step]);

  async function startCamera() {
    setError(null);
    if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
      setError("הדפדפן חוסם את המצלמה כי החיבור אינו מאובטח.");
      return;
    }
    setStep("opening");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 1280 } },
        audio: false,
      });
      streamRef.current = stream;
      setStep("camera");
    } catch (err) {
      setStep("idle");
      setError(cameraErrorMessage(err));
    }
  }

  useEffect(() => {
    if (step !== "camera") return;
    const video = videoRef.current;
    const stream = streamRef.current;
    if (!video || !stream) return;
    video.srcObject = stream;
    video.play().catch(() => setError("המצלמה נפתחה אבל התצוגה לא התחילה. נסו שוב."));
    cardRef.current?.scrollIntoView({ block: "center" });
  }, [step]);

  function fail(message: string) {
    stopCamera();
    setStep("idle");
    setError(message);
  }

  async function capture() {
    const video = videoRef.current;
    if (!video) return;

    try {
      const scale = Math.min(
        1,
        MAX_EDGE / Math.max(video.videoWidth, video.videoHeight),
      );
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(video.videoWidth * scale);
      canvas.height = Math.round(video.videoHeight * scale);
      const ctx = canvas.getContext("2d");
      // ממוראה כמו התצוגה המקדימה — לא רק בזמן הצילום. זיהוי הפנים
      // רץ אחרי הציור הזה, ולכן מודד את הפנים במיקום הסופי (המוראה)
      // ולא צריך שום תיקון נפרד.
      ctx?.translate(canvas.width, 0);
      ctx?.scale(-1, 1);
      ctx?.drawImage(video, 0, 0, canvas.width, canvas.height);

      setError(null);
      setStep("checking");
      const detection = await detectFace(canvas);
      if (!detection.hasFace) {
        setStep("camera");
        setError("לא זיהינו פנים בתמונה. נסו שוב, הפעם עם הפנים מול המצלמה.");
        return;
      }

      if (demoMode) {
        stopCamera();
        setStep("uploading");
        await updateSelfieAction(
          eventId,
          canvas.toDataURL("image/jpeg", JPEG_QUALITY),
          detection.center?.x ?? null,
          detection.center?.y ?? null,
        );
        setStep("done");
        router.refresh();
        return;
      }

      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, "image/jpeg", JPEG_QUALITY),
      );
      if (!blob) return fail("לא הצלחנו לצלם. נסו שוב.");

      stopCamera();
      setStep("uploading");

      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return fail("צריך להתחבר מחדש.");

      const path = `${eventId}/${user.id}.jpg`;
      const { error: uploadError } = await supabase.storage
        .from("selfies")
        .upload(path, blob, { contentType: "image/jpeg", upsert: true });

      if (uploadError) {
        return fail(
          "העדכון נכשל. ייתכן שחלון עריכת הסלפי נסגר, או שהקליטה חלשה — נסו שוב.",
        );
      }

      // לא חוסם את ההצלחה: התמונה כבר הוחלפה בפועל, ומיקום הפנים הוא
      // שיפור תצוגה משני. אם זה נכשל, החיתוך פשוט נופל חזרה למרכז.
      await supabase.rpc("update_selfie_face_position", {
        p_event_id: eventId,
        p_face_x: detection.center?.x ?? null,
        p_face_y: detection.center?.y ?? null,
      });

      setStep("done");
      router.refresh();
    } catch {
      fail("משהו השתבש. נסו שוב.");
    }
  }

  function cancel() {
    stopCamera();
    setStep("idle");
    setError(null);
  }

  if (step === "camera" || step === "checking") {
    return (
      <Card ref={cardRef} className="space-y-4 p-4">
        <div className="relative overflow-hidden rounded-xl bg-(--color-deep)">
          <video
            ref={videoRef}
            playsInline
            muted
            autoPlay
            className="aspect-3/4 max-h-[52vh] w-full scale-x-[-1] object-cover"
          />
        </div>
        {error && <Notice tone="error">{error}</Notice>}
        <div className="flex gap-3">
          <Button onClick={capture} disabled={step === "checking"} className="flex-1">
            {step === "checking" ? "בודקים…" : "צילום"}
          </Button>
          <Button onClick={cancel} variant="secondary">
            ביטול
          </Button>
        </div>
      </Card>
    );
  }

  if (step === "done") {
    return <Notice tone="good">הסלפי עודכן.</Notice>;
  }

  return (
    <div className="space-y-2">
      {error && <Notice tone="error">{error}</Notice>}
      <button
        type="button"
        onClick={startCamera}
        disabled={step === "opening" || step === "uploading"}
        className="text-xs font-semibold text-(--color-sea) disabled:opacity-40"
      >
        {step === "opening"
          ? "פותחים מצלמה…"
          : step === "uploading"
            ? "מעדכנים…"
            : "עריכת הסלפי שלי"}
      </button>
    </div>
  );
}
