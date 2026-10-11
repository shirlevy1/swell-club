"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { demoMode } from "@/lib/config";
import { addEventPhotoAction } from "@/lib/demo/actions";
import { Button, Card, Notice } from "./ui";

type Step = "opening" | "camera" | "uploading";

const MAX_EDGE = 1600;
const JPEG_QUALITY = 0.82;

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
 * צילום ישיר לאלבום המפגש, דרך המצלמה של האתר (לא בורר הקבצים של
 * הטלפון) - עם אותו תיקון-מראה בדיוק כמו בסלפי הצ'ק-אין/עריכת הסלפי
 * (check-in-flow.tsx/edit-selfie-button.tsx), כדי שתמונה שמצלמים כאן
 * תצא באותו כיוון בדיוק כמו הסלפי שלכם. שיר גילתה בעבר (בדיקה מול
 * נקודת ציון אמיתית) שה-stream הגולמי של המצלמה הקדמית כבר מוראה
 * ברמת המכשיר - ה-flip כאן מתקן את זה, לא יוצר מראה מלאכותית.
 *
 * ⚠️ זה לא עוזר לתמונה שמעלים מהגלריה/מצלמת הטלפון המובנית (הכפתור
 * "+ הוספת תמונות", onFilesSelected ב-event-photo-album.tsx) - שם
 * הצילום קורה *מחוץ* לאתר, ואין לקוד שום דרך לדעת אם קובץ שהתקבל
 * הוא סלפי שצריך לתקן או תמונה רגילה (קבוצתית, של מישהו אחר) שאסור
 * למוראה - לכן נשאר ללא שינוי. זו דרך *נוספת* להוסיף תמונה, לא
 * תחליף.
 *
 * בלי בדיקת פנים ובלי מיקום - זו לא הוכחת-נוכחות כמו הצ'ק-אין, רק
 * תמונה לאלבום. אותו דפוס "ציור לקנבס, לא <video> ישירות" כמו
 * check-in-flow.tsx, בגלל אותו באג ציור ידוע ב-WebKit באפליקציות
 * standalone על אייפון (ראו ההערה המלאה שם).
 */
export function AlbumCameraCapture({
  eventId,
  onDone,
  onCancel,
}: {
  eventId: string;
  onDone: () => void;
  onCancel: () => void;
}) {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);
  const drawLoopRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const capturingRef = useRef(false);

  const [step, setStep] = useState<Step>("opening");
  const [error, setError] = useState<string | null>(null);

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  useEffect(() => stopCamera, [stopCamera]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
          setError("הדפדפן חוסם את המצלמה כי החיבור אינו מאובטח.");
          return;
        }
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "user", width: { ideal: 1280 } },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        setStep("camera");
      } catch (err) {
        if (!cancelled) setError(cameraErrorMessage(err));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (step !== "camera") return;
    const video = videoRef.current;
    const canvas = previewCanvasRef.current;
    const stream = streamRef.current;
    if (!video || !canvas || !stream) return;

    video.srcObject = stream;
    video.play().catch(() => {
      setError("המצלמה נפתחה אבל התצוגה לא התחילה. נסו שוב.");
    });
    cardRef.current?.scrollIntoView({ block: "center" });

    const ctx = canvas.getContext("2d");
    function drawFrame() {
      if (ctx && video && video.videoWidth > 0) {
        if (canvas!.width !== video.videoWidth) canvas!.width = video.videoWidth;
        if (canvas!.height !== video.videoHeight) canvas!.height = video.videoHeight;
        ctx.save();
        ctx.translate(canvas!.width, 0);
        ctx.scale(-1, 1);
        ctx.drawImage(video, 0, 0, canvas!.width, canvas!.height);
        ctx.restore();
      }
      drawLoopRef.current = requestAnimationFrame(drawFrame);
    }
    drawLoopRef.current = requestAnimationFrame(drawFrame);

    return () => {
      if (drawLoopRef.current !== null) cancelAnimationFrame(drawLoopRef.current);
      drawLoopRef.current = null;
    };
  }, [step]);

  async function capture() {
    if (capturingRef.current) return;
    capturingRef.current = true;
    try {
      await runCapture();
    } catch {
      setError("משהו השתבש. בדקו את החיבור ונסו שוב.");
    } finally {
      capturingRef.current = false;
    }
  }

  async function runCapture() {
    const video = videoRef.current;
    if (!video) return;

    const scale = Math.min(
      1,
      MAX_EDGE / Math.max(video.videoWidth, video.videoHeight),
    );
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(video.videoWidth * scale);
    canvas.height = Math.round(video.videoHeight * scale);
    const ctx = canvas.getContext("2d");
    // אותו תיקון-מראה בדיוק כמו בצ'ק-אין/עריכת הסלפי - ראו ההערה למעלה.
    ctx?.translate(canvas.width, 0);
    ctx?.scale(-1, 1);
    ctx?.drawImage(video, 0, 0, canvas.width, canvas.height);

    setError(null);

    if (demoMode) {
      stopCamera();
      setStep("uploading");
      await addEventPhotoAction(eventId, canvas.toDataURL("image/jpeg", JPEG_QUALITY));
      finish();
      return;
    }

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", JPEG_QUALITY),
    );
    if (!blob) {
      setError("לא הצלחנו לצלם. נסו שוב.");
      return;
    }

    stopCamera();
    setStep("uploading");

    const supabase = createClient();
    const path = `${eventId}/${crypto.randomUUID()}.jpg`;
    const { error: uploadError } = await supabase.storage
      .from("event-photos")
      .upload(path, blob, { contentType: "image/jpeg" });
    if (uploadError) {
      setStep("camera");
      setError("ההעלאה נכשלה. בדקו את החיבור ונסו שוב.");
      return;
    }

    const { data: photoRow, error: addError } = await supabase.rpc(
      "add_event_photo",
      { p_event_id: eventId, p_storage_path: path },
    );
    if (addError) {
      setStep("camera");
      setError("ההעלאה נכשלה. בדקו את החיבור ונסו שוב.");
      return;
    }

    if (photoRow?.status === "pending") {
      fetch("/api/push/notify-new-photo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ event_id: eventId, photo_ids: [photoRow.id] }),
      }).catch(() => {});
    } else if (photoRow?.status === "approved") {
      fetch("/api/push/notify-photos-added", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ event_id: eventId, photo_ids: [photoRow.id] }),
      }).catch(() => {});
    }

    finish();
  }

  function finish() {
    router.refresh();
    onDone();
  }

  function cancel() {
    stopCamera();
    onCancel();
  }

  return (
    <Card ref={cardRef} className="space-y-4 p-4">
      <div className="relative overflow-hidden rounded-xl bg-(--color-deep)">
        {/* התצוגה החיה מגיעה מהקנבס, לא מה-video ישירות - ראו ההערה
            המלאה למעלה (באג ציור ידוע ב-WebKit). */}
        <canvas
          ref={previewCanvasRef}
          className="aspect-3/4 max-h-[52vh] w-full object-cover"
        />
        <video
          ref={videoRef}
          playsInline
          muted
          autoPlay
          aria-hidden
          className="absolute size-px opacity-0"
        />
      </div>

      {error && <Notice tone="error">{error}</Notice>}

      <div className="flex gap-3">
        <Button onClick={capture} disabled={step !== "camera"} className="flex-1">
          {step === "opening"
            ? "פותחים מצלמה…"
            : step === "uploading"
              ? "מעלה…"
              : "צילום"}
        </Button>
        <Button onClick={cancel} variant="secondary" disabled={step === "uploading"}>
          ביטול
        </Button>
      </div>
    </Card>
  );
}
