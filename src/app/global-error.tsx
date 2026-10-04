"use client";

import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";
import { Rubik, Assistant } from "next/font/google";
import { Button, EmptyState, LinkButton } from "@/components/ui";
import "./globals.css";

const rubik = Rubik({
  variable: "--font-rubik",
  subsets: ["hebrew", "latin"],
  weight: ["500", "700"],
});

const assistant = Assistant({
  variable: "--font-assistant",
  subsets: ["hebrew", "latin"],
  weight: ["400", "600", "700"],
});

/**
 * רק למקרה הנדיר שבו הקריסה היא ב-layout השורש עצמו (למשל טעינת
 * גופן נכשלת) - אז error.tsx הרגיל לא נקרא בכלל, וחייבים את כל
 * ה-html/body כאן בעצמנו כי אין layout שיספק אותם. באותו ניסוח
 * כמו error.tsx (ושאר האתר), כדי שגם קריסה נדירה כזו תרגיש שייכת.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  // ראו error.tsx - אותה סיבה בדיוק, רק למקרה הנדיר שהקריסה היא
  // ב-layout השורש עצמו.
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="he" dir="rtl" className={`${rubik.variable} ${assistant.variable}`}>
      <body>
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
      </body>
    </html>
  );
}
