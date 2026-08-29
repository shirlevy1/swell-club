import { type EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

/** יעד הקישורים שנשלחים במייל: אישור הרשמה ואיפוס סיסמה. */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  // אותו שיקול כמו במסך ההתחברות: הכתובת הזאת מגיעה מקישור במייל,
  // וקישור במייל הוא בדיוק מה שתוקף שולט בו. רק מסלול פנימי.
  const rawNext = searchParams.get("next");
  const next =
    rawNext && rawNext.startsWith("/") && !rawNext.startsWith("//")
      ? rawNext
      : "/events";

  if (!tokenHash || !type) {
    return NextResponse.redirect(`${origin}/login?error=bad_link`);
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.verifyOtp({
    type,
    token_hash: tokenHash,
  });

  if (error) {
    // מעביר גם את סוג הקישור (recovery/signup/...) — כדי שמסך ההתחברות
    // יוכל להציע פעולה קונקרטית ("שכחתי סיסמה" מול "שליחת אישור חדש"),
    // לא רק "הקישור פג תוקף" בלי הסבר מה לעשות עם זה.
    return NextResponse.redirect(
      `${origin}/login?error=expired_link&type=${type}`,
    );
  }

  return NextResponse.redirect(`${origin}${next}`);
}
