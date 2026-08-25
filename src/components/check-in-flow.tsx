"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  distanceMeters,
  formatDistance,
  geolocationErrorMessage,
  getCurrentPosition,
  type Coords,
} from "@/lib/geo";
import { checkInErrorMessage } from "@/lib/checkin";
import { demoMode } from "@/lib/config";
import { checkInAction } from "@/lib/demo/actions";
import { detectFace } from "@/lib/face-detection";
import type { SwellEvent } from "@/lib/types";
import { Button, Card, Notice } from "./ui";

type Step = "idle" | "locating" | "opening" | "camera" | "uploading" | "done";

/**
 * הודעה שמתאימה לסיבה האמיתית. קודם כל כישלון החזיר "צריך לאשר גישה",
 * וזה שולח אנשים לחפש הרשאה גם כשהבעיה היא מצלמה תפוסה או חיבור לא מאובטח.
 */
function cameraErrorMessage(err: unknown): string {
  const name = (err as { name?: string } | null)?.name;

  if (name === "NotAllowedError" || name === "SecurityError") {
    return (
      "הגישה למצלמה נדחתה. צריך לאשר אותה בהגדרות האתר בדפדפן — " +
      "הסלפי הוא ההוכחה שהייתם שם, ובלעדיו אי אפשר לסמן הגעה."
    );
  }
  if (name === "NotFoundError" || name === "OverconstrainedError") {
    return "לא נמצאה מצלמה במכשיר הזה.";
  }
  if (name === "NotReadableError" || name === "AbortError") {
    return "המצלמה תפוסה על ידי אפליקציה אחרת. סגרו אותה ונסו שוב.";
  }
  return "לא הצלחנו לפתוח את המצלמה. נסו שוב.";
}

/** דחיסה לפני העלאה. בחוף ב-6:45 הקליטה גרועה — 3MB לא יעלו. */
const MAX_EDGE = 1080;
const JPEG_QUALITY = 0.7;

export function CheckInFlow({ event }: { event: SwellEvent }) {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const cameraCardRef = useRef<HTMLDivElement>(null);

  const [step, setStep] = useState<Step>("idle");
  const [error, setError] = useState<string | null>(null);
  const [coords, setCoords] = useState<
    (Coords & { accuracy: number }) | null
  >(null);
  const [checkingFace, setCheckingFace] = useState(false);

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  // הנורית של המצלמה חייבת להיכבות כשעוזבים את המסך
  useEffect(() => stopCamera, [stopCamera]);

  // --- שלב 1: מיקום ---
  async function startLocating() {
    setError(null);

    // בהדגמה אין חוף ואין GPS אמיתי — מדלגים ישר למצלמה,
    // שהיא ממילא החלק שמסביר את המוצר.
    if (demoMode) {
      await startCamera();
      return;
    }

    setStep("locating");
    try {
      const pos = await getCurrentPosition();
      const here = {
        lat: pos.coords.latitude,
        lng: pos.coords.longitude,
        accuracy: pos.coords.accuracy,
      };
      setCoords(here);

      // בדיקה מקדימה בלבד — כדי לא לבזבז העלאה כשברור שרחוקים.
      // האמת היחידה היא הבדיקה בשרת ב-check_in().
      const dist = distanceMeters(here, event);
      if (dist > event.checkin_radius_m + here.accuracy) {
        setStep("idle");
        setError(
          `אתם במרחק ${formatDistance(dist)} מהמפגש. אפשר לסמן הגעה רק מהמקום עצמו.`,
        );
        return;
      }

      await startCamera();
    } catch (err) {
      setStep("idle");
      setError(geolocationErrorMessage(err));
    }
  }

  // --- שלב 2: מצלמה ---
  async function startCamera() {
    // בלי חיבור מאובטח הדפדפן לא חושף את ה-API בכלל — אין הרשאה לבקש,
    // ולכן חשוב לא לשלוח אנשים לחפש אישור שלא קיים.
    if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
      setStep("idle");
      setError(
        "הדפדפן חוסם את המצלמה כי החיבור אינו מאובטח. צריך לפתוח את " +
          "האתר בכתובת https (או ב-localhost בפיתוח) — אין כאן הרשאה שאפשר לאשר.",
      );
      return;
    }

    setStep("opening");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 1280 } },
        audio: false,
      });
      streamRef.current = stream;
      // ההשמה ל-video קורית ב-useEffect למטה, אחרי שהוא באמת קיים ב-DOM
      setStep("camera");
    } catch (err) {
      setStep("idle");
      setError(cameraErrorMessage(err));
    }
  }

  /**
   * חיבור הזרם לאלמנט הווידאו.
   *
   * קודם זה נעשה ב-`requestAnimationFrame` מיד אחרי `setStep("camera")`,
   * וזה **מרוץ**: rAF רץ לפני הציור הבא, אבל React לא בהכרח הספיק
   * לבצע commit ל-DOM, ואז `videoRef.current` עדיין null — הזרם לא
   * מתחבר לעולם, והמשתמש מקבל מלבן שחור במקום מצלמה. `useEffect`
   * רץ **אחרי** ה-commit, ולכן האלמנט מובטח.
   */
  useEffect(() => {
    if (step !== "camera") return;
    const video = videoRef.current;
    const stream = streamRef.current;
    if (!video || !stream) return;

    video.srcObject = stream;
    video.play().catch(() => {
      // ספארי חוסם ניגון אוטומטי לפעמים; muted+playsInline אמורים לכסות
      setError("המצלמה נפתחה אבל התצוגה לא התחילה. נסו שוב.");
    });

    // הכפתור נלחץ בתחתית העמוד, והמצלמה נפתחת במקומו. בלי הגלילה
    // הזאת היא יכולה להיפתח מחוץ למסך — וזה נראה בדיוק כמו כלום.
    cameraCardRef.current?.scrollIntoView({ block: "center" });
  }, [step]);

  /**
   * כל יציאה משלב ההעלאה חייבת להחזיר את המסך למצב שאפשר לנסות ממנו
   * שוב. בלי זה הכפתור נשאר "רגע…" ומושבת לנצח — והמשתמש עומד בחוף
   * מול מסך תקוע, בלי דרך לצאת ממנו חוץ מרענון.
   */
  function fail(message: string) {
    stopCamera();
    setStep("idle");
    setError(message);
  }

  // --- שלב 3: צילום, דחיסה, העלאה, אימות ---
  async function capture() {
    try {
      await runCapture();
    } catch {
      // רשת שנופלת באמצע זורקת, ולא מחזירה שגיאה מסודרת
      fail("משהו השתבש. נסו שוב.");
    }
  }

  async function runCapture() {
    const video = videoRef.current;
    if (!video || (!coords && !demoMode)) return;

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

    // בדיקת פנים לפני שממשיכים לכל דבר אחר, ולפני עצירת המצלמה —
    // ככה אפשר לנסות שוב מיד באותה תצוגה חיה, בלי לפתוח הכל מחדש.
    // לא חוסמת סוג ציוד (משקפי שמש, כובע) — רק תמונה שאין בה פנים
    // בכלל (תקרה, שמיים).
    setError(null);
    setCheckingFace(true);
    const detection = await detectFace(canvas);
    setCheckingFace(false);
    if (!detection.hasFace) {
      setError("לא זיהינו פנים בתמונה. ודאו שהפנים שלכם נראות בבירור ונסו שוב.");
      return;
    }

    if (demoMode) {
      stopCamera();
      setStep("uploading");
      await checkInAction(
        event.id,
        canvas.toDataURL("image/jpeg", JPEG_QUALITY),
        detection.center?.x ?? null,
        detection.center?.y ?? null,
      );
      setStep("done");
      router.refresh();
      return;
    }

    if (!coords) return;

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", JPEG_QUALITY),
    );
    // מסך המצלמה לא מציג שגיאות, ולכן חוזרים למסך הראשי איתה
    if (!blob) return fail("לא הצלחנו לצלם. נסו שוב.");

    stopCamera();
    setStep("uploading");
    setError(null);

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return fail("צריך להתחבר מחדש.");

    // הנתיב חייב להיות {event_id}/{profile_id}.jpg —
    // עליו נשענות מדיניות ההעלאה והקריאה ב-storage.
    const path = `${event.id}/${user.id}.jpg`;

    // ניסיון ראשון בלי upsert: Postgres מתכנן upsert כ-INSERT ... ON
    // CONFLICT DO UPDATE גם כשאין באמת התנגשות, ומחייב הרשאת UPDATE
    // בנוסף להרשאת INSERT — נתיב שלם ומיותר ברוב המכריע של המקרים
    // (העלאה ראשונה). upsert נשמר רק כגיבוי לניסיון חוזר אמיתי, כשהעלאה
    // קודמת הצליחה אבל ה-check_in שאחריה נכשל (למשל TOO_FAR).
    let { error: uploadError } = await supabase.storage
      .from("selfies")
      .upload(path, blob, { contentType: "image/jpeg" });

    if (uploadError && uploadError.message?.includes("already exists")) {
      ({ error: uploadError } = await supabase.storage
        .from("selfies")
        .upload(path, blob, { contentType: "image/jpeg", upsert: true }));
    }

    if (uploadError) {
      return fail("העלאת התמונה נכשלה. הקליטה בחוף לפעמים חלשה — נסו שוב.");
    }

    const { error: rpcError } = await supabase.rpc("check_in", {
      p_event_id: event.id,
      p_lat: coords.lat,
      p_lng: coords.lng,
      p_accuracy_m: coords.accuracy,
      p_selfie_path: path,
      p_face_x: detection.center?.x ?? null,
      p_face_y: detection.center?.y ?? null,
    });

    if (rpcError) {
      return fail(checkInErrorMessage(rpcError.message, event));
    }

    setStep("done");
    router.refresh();
  }

  function cancel() {
    stopCamera();
    setStep("idle");
  }

  // ------------------------------------------------------------------ UI

  if (step === "camera") {
    return (
      <Card ref={cameraCardRef} className="space-y-4 p-4">
        {/* max-h: ב-3:4 על מסך של אייפון קטן הווידאו לבדו גבוה מהמסך,
            וכפתור "צילום" יורד מתחת לסרגל התחתון. מי שלא גילל חשב
            שהמצלמה פשוט לא נפתחה. */}
        <div className="relative overflow-hidden rounded-xl bg-(--color-deep)">
          <video
            ref={videoRef}
            playsInline
            muted
            autoPlay
            className="aspect-3/4 max-h-[52vh] w-full scale-x-[-1] object-cover"
          />
        </div>
        <p className="text-center text-sm text-(--color-ink-soft)">
          זו התמונה שחברי הקהילה יראו לצד השם שלכם.
        </p>

        {error && <Notice tone="error">{error}</Notice>}

        <div className="flex gap-3">
          <Button onClick={capture} disabled={checkingFace} className="flex-1">
            {checkingFace ? "בודקים…" : "צילום"}
          </Button>
          <Button onClick={cancel} variant="secondary">
            ביטול
          </Button>
        </div>
      </Card>
    );
  }

  if (step === "done") {
    return <Notice tone="good">הייתם איתנו. הרשימה נפתחה למטה.</Notice>;
  }

  return (
    <Card className="space-y-4">
      <div className="space-y-1">
        <h2 className="font-[family-name:var(--font-display)] text-xl font-bold">
          אתם כאן?
        </h2>
        <p className="text-sm leading-relaxed text-(--color-ink-soft)">
          אם כן, סמנו הגעה כדי להיות חלק מהמפגש.
        </p>
      </div>

      {demoMode && (
        <Notice tone="warn">
          בהדגמה דילגנו על בדיקת המיקום. במוצר האמיתי, בלי להיות בחוף,
          הכפתור הזה לא עובד.
        </Notice>
      )}

      {error && <Notice tone="error">{error}</Notice>}

      <Button
        onClick={startLocating}
        disabled={
          step === "locating" || step === "opening" || step === "uploading"
        }
        className="w-full"
      >
        {step === "locating"
          ? "מאתרים אתכם…"
          : step === "opening"
            ? "פותחים מצלמה…"
            : step === "uploading"
              ? "רגע…"
              : "הגעתי — לצילום סלפי"}
      </Button>
    </Card>
  );
}
