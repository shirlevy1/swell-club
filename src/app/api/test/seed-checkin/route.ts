import { NextResponse } from "next/server";
import { demoMode } from "@/lib/config";
import { checkInAction } from "@/lib/demo/actions";

/**
 * קיים רק בשביל בדיקת E2E אחת (e2e/checkin-persists-after-refresh.spec.ts)
 * שמוודאת שרענון דף לא שובר צ'ק-אין קיים - בדיוק התרחיש שכבר נשבר פעם
 * (המסך "כבר לא חלק מהקהילה" המוטעה).
 *
 * זרימת הצ'ק-אין האמיתית (גם בהדגמה) דורשת מצלמה אמיתית וזיהוי פנים
 * אמיתי בתמונה - אין דרך סבירה "להאכיל" את זה אוטומטית בלי קובץ וידאו
 * עם פנים אמיתיות. במקום זה, הנתיב הזה "מזריע" ישירות את תוצאת הצ'ק-אין
 * (בדיוק כמו checkInAction, שום דבר אחר) - ואז הבדיקה בודקת את מה
 * שבאמת חשוב: שהתצוגה אחרי רענון נכונה.
 *
 * ⚠️ חסום לחלוטין מחוץ למצב הדגמה: demoMode הוא false תמיד באתר האמיתי
 * (יש שם חיבור Supabase אמיתי) - כך שהנתיב הזה לא עושה שום דבר שם,
 * ולא נוגע בשום נתון אמיתי בשום מקרה.
 */
export async function POST(request: Request) {
  if (!demoMode) {
    return NextResponse.json({ error: "demo_mode_only" }, { status: 404 });
  }

  const { event_id } = await request.json().catch(() => ({}));
  if (!event_id) {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }

  // תמונת-בדיקה שחורה בת פיקסל אחד - checkInAction בהדגמה לא בודקת
  // תוכן, רק שומרת אותה כסלפי.
  const fakeSelfie =
    "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAMCAgICAgMCAgIDAwMDBAYEBAQEBAgGBgUGCQgKCgkICQkKDA8MCgsOCwkJDRENDg8QEBEQCgwSExIQEw8QEBD/2wBDAQMDAwQDBAgEBAgQCwkLEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBD/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAj/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k=";

  await checkInAction(event_id, fakeSelfie, null, null);
  return NextResponse.json({ ok: true });
}
