"use client";

import { useSyncExternalStore } from "react";

type Platform = "ios" | "android" | "other";

function detectPlatform(): Platform {
  const ua = navigator.userAgent;
  if (/iPhone|iPad|iPod/.test(ua)) return "ios";
  if (/Android/.test(ua)) return "android";
  return "other";
}

// אין "שינוי" אמיתי להירשם אליו — הפלטפורמה לא משתנה תוך כדי ביקור.
// זה שימוש ב-useSyncExternalStore רק בשביל ה-server snapshot המובנה
// שלו: מונע את אי-ההתאמה בין מה שהשרת מרנדר (לא יודע איזה מכשיר זה)
// לבין מה שהלקוח יודע ברגע הראשון — בלי useEffect+setState שרודף
// אחרי זה בסבב שני.
function subscribe() {
  return () => {};
}
function getServerSnapshot(): Platform {
  return "other";
}

/**
 * ההנחיה להוספה למסך הבית שונה לגמרי בין אייפון/ספארי לאנדרואיד/כרום —
 * אין "שיתוף ← הוסף למסך הבית" באנדרואיד. מזוהה רק בצד הלקוח
 * (navigator.userAgent, לא ידוע בזמן רינדור בשרת) — כמו isIOS() ב-
 * event-photo-album.tsx, רק שכאן צריך גם להבדיל אנדרואיד, לא רק
 * "כן/לא אייפון".
 *
 * במחשב/דפדפן אחר לא מוצג כלום — הטיפ הזה רלוונטי רק לטלפון, ששם
 * באמת משתמשים באתר (בחוף).
 */
export function AddToHomeScreenTip() {
  const platform = useSyncExternalStore(
    subscribe,
    detectPlatform,
    getServerSnapshot,
  );

  if (platform === "other") return null;

  return (
    <section
      className="rise rounded-2xl border border-(--color-line)/70 bg-(--color-surface)/40 p-4 backdrop-blur-sm"
      style={{ animationDelay: "380ms" }}
    >
      <p className="text-[0.8rem] font-bold">
        טיפ: הוסיפו את Swell Club למסך הבית
      </p>
      {/* חצים שמצביעים לכיוון הקריאה של RTL — שמאלה, לא ימינה,
          כי הצעד הבא בעברית ממשיך שמאלה מהצעד הקודם. */}
      <p className="mt-1 text-[0.75rem] leading-relaxed text-(--color-ink-faint)">
        {platform === "ios" ? (
          <>בספארי ← שיתוף ← ״הוסף למסך הבית״.</>
        ) : (
          <>
            בכרום ← שלוש הנקודות למעלה ← ״התקנת אפליקציה״ (או ״הוספה
            למסך הבית״).
          </>
        )}
        <br />
        וזהו, Swell Club אצלכם כמו אפליקציה.
      </p>
    </section>
  );
}
