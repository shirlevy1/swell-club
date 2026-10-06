import { test, expect } from "@playwright/test";

/**
 * מגינה על תרחיש שכבר נשבר פעם אמיתית: צ'ק-אין נרשם, אבל אחרי רענון
 * הדף המסך מראה בטעות "כבר לא חלק מהקהילה" במקום את ההגעה שנרשמה.
 *
 * רצה נגד מצב הדגמה בלבד (ראו playwright.config.ts). שלב הצ'ק-אין
 * עצמו "מוזרע" ישירות דרך /api/test/seed-checkin (נתיב שקיים רק
 * בהדגמה) במקום לעבור דרך המצלמה האמיתית - זרימת הצ'ק-אין האמיתית
 * דורשת זיהוי פנים אמיתי בתמונה, ואין כאן דרך סבירה לדמות את זה
 * אוטומטית. מה שהבדיקה הזו באמת בודקת - האם רענון דף שובר תצוגת
 * נוכחות קיימת - לא תלוי בשלב המצלמה בכלל.
 */

const EVENT_ID = "demo-e-now";
const MY_NAME = "לירון חגבי";
const CHECKIN_BUTTON_TEXT = "הגעתי - לצילום סלפי";

test("checked-in attendee is still shown as attended after a page refresh", async ({
  page,
  request,
}) => {
  await page.goto(`/events/${EVENT_ID}`);

  // לפני הצ'ק-אין: כפתור ההגעה אמור להיות שם, השם שלי עדיין לא ברשימת הנוכחים.
  await expect(page.getByText(CHECKIN_BUTTON_TEXT)).toBeVisible();
  await expect(page.getByText(MY_NAME)).not.toBeVisible();

  const seed = await request.post("/api/test/seed-checkin", {
    data: { event_id: EVENT_ID },
  });
  expect(seed.ok()).toBeTruthy();

  await page.goto(`/events/${EVENT_ID}`);
  await expect(page.getByText(CHECKIN_BUTTON_TEXT)).not.toBeVisible();
  await expect(page.getByText(MY_NAME)).toBeVisible();

  // הבדיקה האמיתית: רענון לא אמור "לאבד" את ההגעה שכבר נרשמה.
  await page.reload();
  await expect(page.getByText(CHECKIN_BUTTON_TEXT)).not.toBeVisible();
  await expect(page.getByText(MY_NAME)).toBeVisible();
});
