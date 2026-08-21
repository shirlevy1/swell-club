import type { CSSProperties } from "react";

/**
 * `object-position` לחיתוך `object-cover` ממורכז סביב הפנים, במקום
 * סביב מרכז התמונה הגולמי. נופל על מרכז רגיל (50% 50%) כשאין נתון —
 * תמונות ישנות, או נוכחות שנוספה ידנית בלי צילום.
 */
export function facePositionStyle(
  faceX: number | null,
  faceY: number | null,
): CSSProperties {
  if (faceX == null || faceY == null) return {};
  return { objectPosition: `${faceX * 100}% ${faceY * 100}%` };
}
