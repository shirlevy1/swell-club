"use client";

import { useEffect } from "react";
import Script from "next/script";
import { InstagramIcon } from "./social-icons";

declare global {
  interface Window {
    instgrm?: { Embeds: { process: () => void } };
  }
}

/**
 * רייל נבחר ידנית מאינסטגרם של Swell Club, בתחתית דף הבית. לא "תמיד
 * הרייל העדכני ביותר" - אין API חינמי שמאפשר את זה בלי תחזוקה שוטפת
 * (ראו שיחה עם שיר). להחלפה לרייל אחר: בפוסט הרצוי באינסטגרם ⋯ →
 * הטבעה → העתקת הקוד, ולהחליף כאן את כל ה-blockquote (כולל
 * data-instgrm-permalink ו-data-instgrm-version).
 *
 * window.instgrm.Embeds.process() הוא מה שהופך את ה-blockquote
 * הגולמי לווידג'ט האמיתי - embed.js מעבד רק blockquote שכבר קיים ב-
 * DOM כשהוא נטען. ב-useEffect כדי שזה יקרה גם אם הסקריפט כבר נטען
 * ממעבר קודם לעמוד הבית (ניווט לקוח, לא רענון מלא) - אז onLoad של
 * ה-Script למטה לא יורה שוב, אבל window.instgrm כבר קיים.
 */
export function InstagramReelCard() {
  useEffect(() => {
    window.instgrm?.Embeds?.process();
  }, []);

  return (
    <div className="space-y-2">
      <p className="flex items-center gap-1.5 text-sm font-semibold">
        <InstagramIcon className="size-4 text-(--color-sea)" />
        האינסטגרם שלנו
      </p>
      <blockquote
        className="instagram-media"
        data-instgrm-captioned
        data-instgrm-permalink="https://www.instagram.com/reel/DcOCMDcsu5H/?utm_source=ig_embed&utm_campaign=loading"
        data-instgrm-version="14"
        style={{
          background: "#FFF",
          border: 0,
          borderRadius: 12,
          boxShadow: "0 0 1px 0 rgba(0,0,0,0.5), 0 1px 10px 0 rgba(0,0,0,0.15)",
          margin: "0 auto",
          maxWidth: 540,
          minWidth: 326,
          padding: 0,
          width: "99.375%",
        }}
      />
      <Script
        src="https://www.instagram.com/embed.js"
        strategy="lazyOnload"
        onLoad={() => window.instgrm?.Embeds?.process()}
      />
    </div>
  );
}
