import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { demoMode, supabaseAnonKey, supabaseUrl } from "../config";

export async function createClient() {
  // בלי זה, עמוד שניגש ל-Supabase ישירות במצב הדגמה מתפוצץ עם
  // "Your project's URL and Key are required" — שגיאה שלא מרמזת
  // על הסיבה האמיתית. כל גישה לנתונים צריכה לעבור דרך lib/data.ts,
  // ששם יש ענף להדגמה.
  if (demoMode) {
    throw new Error(
      "Supabase נקרא במצב הדגמה. גישה לנתונים חייבת לעבור דרך " +
        "lib/data.ts, שיש בו ענף לשני המצבים.",
    );
  }

  const cookieStore = await cookies();

  return createServerClient(
    supabaseUrl!,
    supabaseAnonKey!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            for (const { name, value, options } of cookiesToSet) {
              cookieStore.set(name, value, options);
            }
          } catch {
            // נקרא מתוך Server Component — הרענון מטופל ב-middleware
          }
        },
      },
    },
  );
}
