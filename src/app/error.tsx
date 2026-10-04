"use client";

import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";
import { Button, EmptyState, LinkButton } from "@/components/ui";

/**
 * רשת ביטחון למקרה קריסה בלתי-צפוי (לא שגיאה מטופלת כמו היום - אלה
 * כבר מוצגות בעברית, בעיצוב, בכל מקום דרך setError/<Notice>). בלי
 * הקובץ הזה, קריסה אמיתית הייתה מציגה את מסך ברירת המחדל הגנרי של
 * Next.js - לא דולף פרטים טכניים בייצור, אבל שובר את העיצוב/השפה.
 *
 * אותו ניסוח בדיוק כמו בכל שאר האתר (login, signup, check-in וכו')
 * - לא ניסוח חדש, כדי לא ליצור קול שונה דווקא ברגע הכי לא נעים.
 * לא מציגים את error.message בפועל - בכוונה, גם אם זה לא מכיל סוד:
 * זו לא הודעה שנועדה למשתמש/ת, ותרגום-בלי-תרגום של שגיאה טכנית
 * לאנגלית ישבור את השפה העברית העקבית של שאר האתר.
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  // instrumentation.ts/instrumentation-client.ts תופסות הרבה, אבל לא
  // שגיאות רינדור שה-error boundary הזה עצמו תופס - בלי הדיווח הידני
  // הזה, בדיוק הקריסות שהמשתמש/ת רואה בפועל (זה המסך הזה) היו היחידות
  // שלא מגיעות ל-Sentry.
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <div className="mx-auto max-w-sm space-y-4 px-4 py-16">
      <EmptyState
        title="משהו השתבש"
        body="בדקו את החיבור ונסו שוב."
      />
      <div className="flex gap-2">
        <Button onClick={reset} className="flex-1">
          נסו שוב
        </Button>
        <LinkButton href="/" variant="secondary" className="flex-1">
          לדף הבית
        </LinkButton>
      </div>
    </div>
  );
}
