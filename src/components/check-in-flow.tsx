"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  distanceMeters,
  geolocationErrorMessage,
  getCurrentPosition,
  type Coords,
} from "@/lib/geo";
import { checkInErrorMessage } from "@/lib/checkin";
import { markJustCheckedIn } from "@/lib/checkin-scroll";
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
      "הגישה למצלמה נדחתה. צריך לאשר אותה בהגדרות האתר בדפדפן - " +
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

export function CheckInFlow({
  event,
  variant = "card",
}: {
  event: SwellEvent;
  /** "compact": כפתור מלא-רוחב בלי הכותרת/התיאור/אזהרת-ההדגמה סביבו —
   * לשימוש בכרטיס "המפגש הקרוב" בדף הבית, שם כבר יש הזמנה משלו
   * ("בואו לסמן שהגעתם!") ואין מקום לכרטיס מבוא שלם. שלבי camera/done
   * זהים לגמרי בשני הווריאנטים — ברגע שנפתחה מצלמה צריך מסך מלא בכל
   * מקרה, לא משנה מאיפה התחילו. */
  variant?: "card" | "compact";
}) {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);
  // התצוגה החיה מצוירת לתוך קנבס במקום שה-video עצמו יוצג על המסך —
  // ראו ההערה המלאה ליד ה-useEffect שמצייר אליו.
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);
  const drawLoopRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const cameraCardRef = useRef<HTMLDivElement>(null);
  // נעילה מיידית משלה, לא רק checkingFace (state) — לחיצה כפולה מהירה
  // (ידיים רטובות בחוף) יכולה לקרות לפני ש-React מעדכן את ה-state,
  // ואז שתי הלחיצות עוברות את הבדיקה ומריצות runCapture() במקביל.
  // ref מתעדכן מיידית, בלי לחכות לרינדור מחדש — אותו פתרון בדיוק
  // כמו ב-rsvp-button.tsx.
  const capturingRef = useRef(false);

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

  /**
   * כל יציאה משלב ההעלאה חייבת להחזיר את המסך למצב שאפשר לנסות ממנו
   * שוב. בלי זה הכפתור נשאר "רגע…" ומושבת לנצח — והמשתמש עומד בחוף
   * מול מסך תקוע, בלי דרך לצאת ממנו חוץ מרענון. useCallback (לא
   * function רגילה) כדי שאפשר יהיה להשתמש בה בבטחה בתלויות של
   * useEffect למטה, בלי שהאפקט ירוץ מחדש בכל רינדור.
   */
  const fail = useCallback(
    (message: string) => {
      stopCamera();
      setStep("idle");
      setError(message);
      // בלי זה, כישלון אחרי זיהוי פנים מוצלח (העלאה/check_in) משאיר
      // את "בודקים…" נעול על כפתור הצילום בפעם הבאה שהמצלמה נפתחת —
      // בדיוק אותו סוג תקיעות שהפונקציה הזו נועדה למנוע, רק דרך משתנה אחר.
      setCheckingFace(false);
    },
    [stopCamera],
  );

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
        setError("אתם עדיין לא במפגש. הצ׳ק־אין מחכה לכם במקום עצמו.");
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
          "האתר בכתובת https (או ב-localhost בפיתוח) - אין כאן הרשאה שאפשר לאשר.",
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
   * חיבור הזרם לאלמנט הווידאו, וציור התצוגה החיה לתוך קנבס נפרד.
   *
   * קודם זה נעשה ב-`requestAnimationFrame` מיד אחרי `setStep("camera")`,
   * וזה **מרוץ**: rAF רץ לפני הציור הבא, אבל React לא בהכרח הספיק
   * לבצע commit ל-DOM, ואז `videoRef.current` עדיין null — הזרם לא
   * מתחבר לעולם, והמשתמש מקבל מלבן שחור במקום מצלמה. `useEffect`
   * רץ **אחרי** ה-commit, ולכן האלמנט מובטח.
   *
   * ⚠️ **למה קנבס ולא ה-video ישירות על המסך**: אומת בפועל על מכשיר
   * אמיתי (אייפון, אפליקציה שמורה למסך הבית) — getUserMedia מצליח,
   * ה-stream מגיע, videoWidth/height מתמלאים — אבל ה-<video> עצמו
   * מוצג כמלבן כהה ריק. זה באג ציור (compositing) ידוע ב-WebKit
   * שקיים רק במצב standalone, לא בספארי רגיל — הנתונים עצמם תקינים,
   * רק הציור הישיר של ה-video על המסך שבור. ctx.drawImage(video,...)
   * קורא את הפריים המפוענח ישירות, לא דרך צינור הציור השבור של
   * ה-video עצמו — בדיוק כמו שכבר עובד ב-runCapture() למטה בשביל
   * הצילום הסופי. לכן: מציירים בלולאה לקנבס גלוי, וה-video נשאר
   * בעמוד אבל בלתי-נראה (לא display:none — זה עלול לגרום לדפדפנים
   * להשהות את הפענוח לגמרי, בדיוק מה שרוצים למנוע).
   */
  useEffect(() => {
    if (step !== "camera") return;
    const video = videoRef.current;
    const canvas = previewCanvasRef.current;
    const stream = streamRef.current;
    if (!video || !canvas || !stream) return;

    video.srcObject = stream;
    video.play().catch(() => {
      // ספארי חוסם ניגון אוטומטי לפעמים; muted+playsInline אמורים לכסות
      setError("המצלמה נפתחה אבל התצוגה לא התחילה. נסו שוב.");
    });

    // הכפתור נלחץ בתחתית העמוד, והמצלמה נפתחת במקומו. בלי הגלילה
    // הזאת היא יכולה להיפתח מחוץ למסך — וזה נראה בדיוק כמו כלום.
    cameraCardRef.current?.scrollIntoView({ block: "center" });

    const ctx = canvas.getContext("2d");
    function drawFrame() {
      if (ctx && video && video.videoWidth > 0) {
        if (canvas!.width !== video.videoWidth) canvas!.width = video.videoWidth;
        if (canvas!.height !== video.videoHeight) canvas!.height = video.videoHeight;
        // ממוראה, בדיוק כמו שהיה על ה-video עצמו קודם (scale-x-[-1])
        ctx.save();
        ctx.translate(canvas!.width, 0);
        ctx.scale(-1, 1);
        ctx.drawImage(video, 0, 0, canvas!.width, canvas!.height);
        ctx.restore();
      }
      drawLoopRef.current = requestAnimationFrame(drawFrame);
    }
    drawLoopRef.current = requestAnimationFrame(drawFrame);

    // videoWidth>0 (לא אירוע 'playing') הוא הסימן האמין: הוא משקף
    // שיש פריים מפוענח בפועל, גם אם הציור-על-המסך של ה-video עצמו
    // שבור. אם גם זה אף פעם לא קורה — זה כשל אמיתי, לא רק באג ציור.
    let resolved = false;
    const markStarted = () => {
      if (video.videoWidth > 0) resolved = true;
    };
    video.addEventListener("loadeddata", markStarted);
    const stuckTimer = setTimeout(() => {
      markStarted();
      if (resolved) return;
      const isStandalone =
        window.matchMedia?.("(display-mode: standalone)").matches ||
        (navigator as unknown as { standalone?: boolean }).standalone === true;
      fail(
        isStandalone
          ? "המצלמה לא הציגה תמונה. זו מגבלה ידועה של אייפון באפליקציות ששמורות למסך הבית - לפתיחה מיידית, היכנסו לאתר ישירות דרך ספארי במקום מהאייקון."
          : "המצלמה לא הציגה תמונה. נסו שוב.",
      );
    }, 3000);

    return () => {
      video.removeEventListener("loadeddata", markStarted);
      clearTimeout(stuckTimer);
      if (drawLoopRef.current !== null) cancelAnimationFrame(drawLoopRef.current);
      drawLoopRef.current = null;
    };
  }, [step, fail]);

  // --- שלב 3: צילום, דחיסה, העלאה, אימות ---
  async function capture() {
    if (capturingRef.current) return;
    capturingRef.current = true;
    try {
      await runCapture();
    } catch {
      // רשת שנופלת באמצע זורקת, ולא מחזירה שגיאה מסודרת
      fail("משהו השתבש. בדקו את החיבור ונסו שוב.");
    } finally {
      // גם ל-runCapture() יש כמה יציאות מוקדמות (return שקט, בלי
      // fail()) — finally מבטיח שהנעילה תמיד תשתחרר, בלי צורך לזכור
      // לאפס אותה בכל נקודת יציאה בנפרד.
      capturingRef.current = false;
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
    if (!detection.hasFace) {
      // רק כאן — נשארים על מסך המצלמה ורוצים שהכפתור יהיה לחיץ שוב.
      // בהצלחה ממשיכים ישר לשמירה/העלאה בלי לשחרר את הכפתור באמצע —
      // אחרת לחיצה כפולה מהירה פותחת שני תהליכי צילום מקבילים (הכפתור
      // היה נראה לחיץ לרגע, לפני ש-setStep("uploading") מסתיר אותו).
      setCheckingFace(false);
      setError("לא זיהינו פנים בתמונה. נסו שוב, הפעם עם הפנים מול המצלמה.");
      return;
    }

    const previewUrl = canvas.toDataURL("image/jpeg", JPEG_QUALITY);

    if (demoMode) {
      stopCamera();
      setStep("uploading");
      await checkInAction(
        event.id,
        previewUrl,
        detection.center?.x ?? null,
        detection.center?.y ?? null,
      );
      finishCheckIn();
      return;
    }

    if (!coords) return fail("משהו השתבש עם המיקום. נסו שוב.");

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
      return fail("העלאת התמונה נכשלה. הקליטה בחוף לפעמים חלשה - נסו שוב.");
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

    finishCheckIn();
  }

  /**
   * ניווט אחרי צ'ק־אין מוצלח, לפי מאיפה זה קרה. מכרטיס "המפגש הקרוב"
   * בדף הבית (variant="compact") הכוונה היא לראות מי עוד שם — עמוד
   * המפגש עצמו, לא להישאר על דף הבית. מעמוד המפגש עצמו (variant="card")
   * נשארים במקום ומרעננים, כי זה כבר העמוד הנכון.
   */
  function finishCheckIn() {
    markJustCheckedIn();
    if (variant === "compact") {
      router.push(`/events/${event.id}`);
      return;
    }
    setStep("done");
    // רענון מיידי היה מחליף את מסך ה"done" ברשימת הנוכחים תוך שנייה
    // (hasAttended בעמוד הקורא הופך ל-true ומסיר את CheckInFlow כולו
    // מה-DOM) — לא מספיק זמן לקרוא אותו. השהיה נותנת רגע לראות את
    // המסך לפני שהוא מוחלף.
    setTimeout(() => router.refresh(), 2000);
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
          {/* התצוגה החיה מגיעה מהקנבס, לא מה-video ישירות — ראו ההערה
              המלאה ב-useEffect שמצייר אליו (באג ציור ידוע ב-WebKit
              באפליקציות ששמורות למסך הבית באייפון). */}
          <canvas
            ref={previewCanvasRef}
            className="aspect-3/4 max-h-[52vh] w-full object-cover"
          />
          {/* לא display:none: זה עלול לגרום לדפדפן להשהות את פענוח
              הזרם לגמרי. חייב להישאר "מנגן" בפועל כדי שיהיו פריימים
              לצייר מהם לקנבס. */}
          <video
            ref={videoRef}
            playsInline
            muted
            autoPlay
            aria-hidden
            className="absolute size-px opacity-0"
          />
        </div>
        <p className="text-center text-sm text-(--color-ink-soft)">
          זו התמונה שחברי Swell Club שהיו במפגש יראו לצד השם שלכם.
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
    return <Notice tone="good">אתם איתנו. עכשיו אפשר לראות מי עוד כאן.</Notice>;
  }

  if (variant === "compact") {
    return (
      <div className="space-y-2">
        {/* !bg-white/!text-deep: כרטיס "המפגש הקרוב" כהה (sea→deep),
            וכפתור ה-Button הרגיל (bg-sea) היה נבלע בתוכו. ה-! מכריח
            עדיפות על BUTTON_VARIANTS בלי לגעת ברכיב Button המשותף. */}
        <Button
          onClick={startLocating}
          disabled={
            step === "locating" || step === "opening" || step === "uploading"
          }
          className="w-full !bg-white !text-(--color-deep) hover:!bg-white/90"
        >
          {step === "locating"
            ? "מאתרים אתכם…"
            : step === "opening"
              ? "פותחים מצלמה…"
              : step === "uploading"
                ? "רגע…"
                : "הגעתי - לצילום סלפי"}
        </Button>
        {error && <Notice tone="error">{error}</Notice>}
      </div>
    );
  }

  return (
    <Card className="space-y-4">
      <div className="space-y-1">
        <h2 className="font-[family-name:var(--font-display)] text-xl font-bold">
          אתם כאן?
        </h2>
        <p className="text-sm leading-relaxed text-(--color-ink-soft)">
          סמנו הגעה ותהיו חלק מהמפגש.
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
              : "הגעתי - לצילום סלפי"}
      </Button>
    </Card>
  );
}
