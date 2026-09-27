"use client";

import { useCallback, useState } from "react";
import { Button, Card } from "./ui";

type ConfirmOptions = {
  title: string;
  body: string;
  confirmText: string;
  /** danger = כפתור אדום (מחיקה/הסרה בלתי הפיכה). primary = כחול רגיל
   * (למשל "לצאת בלי לשמור" — לא הרסני, רק החלטת ניווט). */
  tone?: "danger" | "primary";
};

type ConfirmState = ConfirmOptions & { resolve: (ok: boolean) => void };

/**
 * מחליף את window.confirm() הגולמי (חלון הדפדפן הגנרי) בחלון בעיצוב
 * Swell. אותה צורת קריאה בדיוק כמו קודם — `const ok = await confirm(...)`
 * — רק א-סינכרוני במקום סינכרוני, ומעוצב במקום ברירת המחדל של המערכת.
 * צריך גם לצייר את `dialog` המוחזר בתוך ה-JSX של הרכיב הקורא.
 */
export function useConfirmDialog() {
  const [state, setState] = useState<ConfirmState | null>(null);

  const confirm = useCallback((options: ConfirmOptions): Promise<boolean> => {
    return new Promise((resolve) => {
      setState({ ...options, resolve });
    });
  }, []);

  function close(result: boolean) {
    setState((current) => {
      current?.resolve(result);
      return null;
    });
  }

  const dialog = state ? (
    <div
      // z-[60], לא z-50: החלון הזה חייב להופיע מעל אוברליים אחרים
      // שכבר קיימים באתר (כמו PhotoLightbox, שגם הוא z-50) — למשל
      // דחיית תמונה נלחצת לפעמים מתוך התצוגה המוגדלת עצמה.
      className="fixed inset-0 z-[60] flex items-center justify-center bg-(--color-deep)/50 p-5"
      onClick={(e) => {
        if (e.target === e.currentTarget) close(false);
      }}
    >
      <Card className="w-full max-w-sm space-y-5">
        <div className="space-y-2">
          <h2 className="font-[family-name:var(--font-display)] text-lg font-bold">
            {state.title}
          </h2>
          <p className="whitespace-pre-line text-sm leading-relaxed text-(--color-ink-soft)">
            {state.body}
          </p>
        </div>
        <div className="flex gap-3">
          <Button
            type="button"
            variant="secondary"
            className="flex-1"
            onClick={() => close(false)}
          >
            ביטול
          </Button>
          <Button
            type="button"
            variant={state.tone === "primary" ? "primary" : "danger"}
            className="flex-1"
            onClick={() => close(true)}
          >
            {state.confirmText}
          </Button>
        </div>
      </Card>
    </div>
  ) : null;

  return { confirm, dialog };
}
