import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { demoMode, supabaseAnonKey, supabaseUrl } from "../config";

/** מסלולים שנגישים בלי התחברות */
const PUBLIC_PATHS = ["/", "/login", "/signup", "/auth"];

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

  // מחובר שנוחת על שער הכניסה — ישר פנימה
  if (user && (pathname === "/login" || pathname === "/signup")) {
    const to = request.nextUrl.clone();
    to.pathname = "/events";
    to.search = "";
    return NextResponse.redirect(to);
  }

  return response;
}
