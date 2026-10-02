"use client";

import { useEffect, useState } from "react";

const PREFIX = "swell:live-seen:";

/**
 * null = התחום הזה אף פעם לא נזרע במכשיר הזה (אין הבדל בין "ריק
 * כרגע" ל"אף פעם לא ראינו" בלי זה — וההבדל קריטי: בביקור ראשון
 * אמיתי לא צריך להבהב שום דבר, גם אם הרשימה הנוכחית לא ריקה).
 */
function readSeen(scope: string): Set<string> | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(PREFIX + scope);
    if (raw === null) return null;
    return new Set(JSON.parse(raw) as string[]);
  } catch {
    return null;
  }
}

function writeSeen(scope: string, ids: Set<string>) {
  try {
    localStorage.setItem(PREFIX + scope, JSON.stringify([...ids]));
  } catch {
    // localStorage חסום (גלישה פרטית, מדיניות דפדפן) — פשוט לא מהבהבים.
  }
}

/**
 * מזהה אילו איברים מתוך currentIds עוד לא ראינו במכשיר הזה (לרשימות
 * שמתעדכנות ברקע — EventLiveRefresh / AdminLiveRefresh / realtime
 * ב-EventPhotoAlbum) — כדי שרק מה שבאמת חדש יבהב לרגע, ולא כל מה
 * שכבר היה במסך בטעינה הראשונית.
 *
 * ⚠️ localStorage הוא מקור האמת, לא React state/Context ולא
 * sessionStorage. שתי גרסאות קודמות נכשלו בבדיקה חיה בפועל (עם שני
 * טלפונים, מפגש טרי):
 *   1. Context+Provider — ההבהוב לא הופיע אחרי router.refresh(). תואם
 *      בעיה מתועדת של Next.js: state שיושב ישירות מתחת לקומפוננטת
 *      שרת לא תמיד שורד רענון שלה (vercel/next.js discussions #54821,
 *      #76419 — אותה משפחת התנהגות).
 *   2. sessionStorage — עדיין לא הופיע. שיר בדקה דרך **אפליקציה
 *      שמותקנת על מסך הבית**, לא דפדפן רגיל — וב-iOS PWA כזה, לעבור
 *      לאפליקציה אחרת וחזרה בפועל "הורג" את חלון ה-JS לפעמים ופותח
 *      אותו מחדש, מה שמאפס sessionStorage למרות שלמשתמש/ת זה נראה
 *      כאילו "האפליקציה עדיין פתוחה". בדיוק הבאג המתועד כבר ב-
 *      visibility-refresh.tsx לגבי visibilitychange, ואותה סיבה שה-
 *      פתרון שם (יעד ניווט ממתין) משתמש ב-Cache Storage ולא ב-
 *      sessionStorage. localStorage לא סובל מהבעיה הזו.
 *
 * נקראת פעם אחת ברכיב הרשימה עצמו (לא per-item) — כי רק הרשימה רואה
 * את כל ה-ids בבת אחת, וצריך לדעת את כולם יחד כדי "לזרוע" את הבסיס
 * בפעם הראשונה בלי להבהב כלום.
 */
export function useNewLiveIds(
  scope: string,
  currentIds: readonly string[],
): ReadonlySet<string> {
  const [newIds, setNewIds] = useState<ReadonlySet<string>>(() => new Set());
  const key = currentIds.join(",");

  useEffect(() => {
    const ids = key === "" ? [] : key.split(",");
    const seenBefore = readSeen(scope);
    // seenBefore === null: ביקור ראשון אמיתי בתחום הזה — זורעים הכול
    // בלי להבהב, גם אם currentIds לא ריקה. אחרת, רק מה שבאמת לא היה
    // ברשימה השמורה.
    const fresh = seenBefore === null ? [] : ids.filter((id) => !seenBefore.has(id));

    const next = new Set(seenBefore ?? []);
    ids.forEach((id) => next.add(id));
    writeSeen(scope, next);

    // נדחה למיקרו-טסק (לא קריאה סינכרונית ישירה בתוך ה-effect) —
    // ESLint (react-hooks/set-state-in-effect) מסמן setState סינכרוני
    // בתוך effect. כאן זה בדיוק הכוונה (לסנכרן state מ-localStorage
    // לפי שינוי ב-props), אז רק דוחים את הקריאה עצמה.
    if (fresh.length > 0) {
      queueMicrotask(() => setNewIds(new Set(fresh)));
    }
  }, [scope, key]);

  return newIds;
}
