import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import {
  demoMode,
  supabaseAnonKey,
  supabaseUrl,
  TRUSTED_USER_ID_HEADER,
} from "../config";

/**
 * מסלולים שנגישים בלי התחברות. /update-password חייב להיות כאן:
 * מי שמגיע/ה מקישור איפוס במייל היא בהגדרה **לא** מחוברת (זו הסיבה
 * שהיא מאפסת סיסמה), וההרשאה הזמנית מהקישור נוצרת רק בצד הלקוח אחרי
 * שהעמוד נטען — אם ה-proxy חוסם את הדרך לשם קודם, אין בכלל דרך
 * להגיע לטופס. הבדיקה שהקישור עצמו תקף כבר קיימת בתוך העמוד עצמו.
 *
 * /api חייב להיות כאן גם כן: כל מסלולי api/push/* מאמתים את עצמם
 * בעצמם (סוד cron בהדר x-swell-cron, או supabase.auth.getUser()
 * מחדש בתוך המסלול עצמו) — הם לא סומכים על ה-proxy בכלל. בלעדי
 * החריג הזה, כל בקשה בלי עוגיית סשן דפדפן (כמו הקריאה מ-GitHub
 * Actions ל-api/push/send) הייתה מקבלת redirect ל-/login ואף פעם לא
 * מגיעה לקוד עצמו — בדיוק הבאג שגרם לתזכורות לא לצאת בפועל, גם אחרי
 * שהתזמון עצמו תוקן: ה-cron מעולם לא הצליח להגיע ל-endpoint.
 */
const PUBLIC_PATHS = ["/", "/login", "/signup", "/auth", "/update-password", "/api"];

function isPublic(pathname: string) {
  return PUBLIC_PATHS.some(
    (p) => pathname === p || (p !== "/" && pathname.startsWith(p + "/")),
  );
}

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const url = supabaseUrl;
  const key = supabaseAnonKey;

  // בלי מפתחות אין על מה לאמת. מניחים למעבר כדי שהאפליקציה
  // תרוץ מקומית לפני שחיברו את Supabase.
  //
  // ⚠️ הבדיקה חייבת להיות על `demoMode` ולא רק על קיום המפתחות:
  // בהדגמה מכוונת המפתחות **כן** קיימים, ובלי השורה הזאת ה-proxy
  // מפנה כל מסלול ל-/login — כלומר הדגמה שאי אפשר להיכנס אליה.
  if (demoMode || !url || !key) return response;

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value);
        }
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }
      },
    },
  });

  // חובה: getUser() מרענן את הטוקן. אין לכתוב קוד בין יצירת הלקוח לכאן.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  if (!user && !isPublic(pathname)) {
    const to = request.nextUrl.clone();
    to.pathname = "/login";
    to.searchParams.set("next", pathname);
    return NextResponse.redirect(to);
  }

  // מחובר שנוחת על שער הכניסה — ישר פנימה. חוץ ממקרה אחד: אם יש
  // ?error= בכתובת (קישור מייל שבור/פג-תוקף שהפנה לכאן), לא מוחקים
  // את זה בשקט — גם מי שכבר מחוברת/ת צריכה לראות את ההודעה, לא רק
  // להיבלע ישר פנימה בלי שום הסבר.
  if (
    user &&
    (pathname === "/login" || pathname === "/signup") &&
    !request.nextUrl.searchParams.has("error")
  ) {
    const to = request.nextUrl.clone();
    to.pathname = "/events";
    to.search = "";
    return NextResponse.redirect(to);
  }

  // מעבירים הלאה את הזהות שכבר אימתנו הרגע — כדי ש-getViewer() לא
  // ישאל את אותה שאלה שוב מול Supabase, נסיעת רשת שנייה ומיותרת על
  // כל בקשה. תמיד נקבע כאן מחדש (לא רק מתווסף) כדי שערך שהודבק
  // ידנית בבקשה הנכנסת לעולם לא ישרוד: נדרס בזהות האמיתית, או נמחק
  // אם אין התחברות בכלל.
  const headersWithIdentity = new Headers(request.headers);
  if (user) {
    headersWithIdentity.set(TRUSTED_USER_ID_HEADER, user.id);
  } else {
    headersWithIdentity.delete(TRUSTED_USER_ID_HEADER);
  }
  const withIdentity = NextResponse.next({
    request: { headers: headersWithIdentity },
  });
  // שומרים על כל עוגייה שכבר נקבעה על response (למשל ריענון טוקן
  // שקרה בתוך setAll למעלה) — לא בונים תגובה מאפס.
  for (const cookie of response.cookies.getAll()) {
    withIdentity.cookies.set(cookie);
  }
  return withIdentity;
}
