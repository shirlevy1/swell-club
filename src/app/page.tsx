import { redirect } from "next/navigation";
import { SwellLogo } from "@/components/swell-logo";
import { LinkButton } from "@/components/ui";
import { demoMode, supabaseConfigured } from "@/lib/config";
import { createClient } from "@/lib/supabase/server";

const HORIZON = "56%";

export default async function Home() {
  // מי שכבר מחובר לא צריך לראות שער כניסה
  if (supabaseConfigured) {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) redirect("/events");
  }

  return (
    <main className="relative isolate flex flex-1 flex-col overflow-y-auto">
      {/* --- אטמוספירה: ערפל בוקר מעל המים --- */}
      <div className="haze pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(180deg, #ffffff 0%, #f2f7fa 42%, #dbe8f1 100%)",
          }}
        />
        {/* קו המים, רך ומטושטש — לא קו חד */}
        <div
          className="absolute inset-x-0 h-[30rem] -translate-y-1/2"
          style={{
            top: HORIZON,
            background:
              "radial-gradient(64% 46% at 50% 50%, color-mix(in oklab, var(--color-sky) 46%, transparent), transparent 72%)",
            animation: "horizon 12s ease-in-out infinite",
          }}
        />
      </div>

      <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-9 px-7 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-[max(2.5rem,env(safe-area-inset-top))]">
        <header className="rise flex flex-col items-center text-center">
          {/* הלוגו נושא את השם בעצמו — כותרת טקסט לצידו הייתה כפילות
              חזותית. ה-h1 נשאר לקוראי מסך ולמבנה העמוד; decorative
              משתיק את ה-aria-label של הלוגו כדי שלא יוכרז פעמיים. */}
          <SwellLogo className="w-40" decorative />
          <h1 className="sr-only">Swell Club</h1>
        </header>

        <section
          className="rise space-y-4 text-center"
          style={{ animationDelay: "140ms" }}
        >
          <p className="font-[family-name:var(--font-display)] text-[1.7rem] font-medium leading-[1.4] text-balance">
            נפגשים בים.
            <br />
            <em className="not-italic text-(--color-sea)">מתחברים</em> מעבר לו.
          </p>
          <p className="text-[0.95rem] leading-relaxed text-(--color-ink-soft) text-balance">
            כל שחייה מפגישה אתכם עם אנשים. כאן תדעו מי הם, בשם ובפנים.
          </p>
        </section>

        <section
          className="rise space-y-3"
          style={{ animationDelay: "260ms" }}
        >
          {/* גם בהדגמה עוברים דרך הרשמה/התחברות — ראו ההערה ב-(auth)/layout.tsx */}
          <LinkButton href="/signup" className="w-full">
            הצטרפות לקהילה
          </LinkButton>
          <LinkButton href="/login" variant="secondary" className="w-full">
            כבר חלק מהקהילה? התחברות
          </LinkButton>
        </section>

        <section
          className="rise rounded-2xl border border-(--color-line)/70 bg-(--color-surface)/40 p-4 backdrop-blur-sm"
          style={{ animationDelay: "380ms" }}
        >
          {demoMode ? (
            <>
              <p className="text-[0.8rem] font-bold text-(--color-sea)">
                מצב הדגמה
              </p>
              <p className="mt-1 text-[0.75rem] leading-relaxed text-(--color-ink-faint)">
                נתונים לדוגמה. מסך ההרשמה/ההתחברות כאן להמחשה בלבד ולא
                נשמר — אפשר להקליד כל דבר. אחרי זה: לסמן הגעה, לצלם סלפי
                ולראות את רשימת המשתתפים נפתחת.
              </p>
            </>
          ) : (
            <>
              <p className="text-[0.8rem] font-bold">
                טיפ: הוסיפו את Swell Club למסך הבית
              </p>
              {/* חצים שמצביעים לכיוון הקריאה של RTL — שמאלה, לא ימינה,
                  כי הצעד הבא בעברית ממשיך שמאלה מהצעד הקודם. */}
              <p className="mt-1 text-[0.75rem] leading-relaxed text-(--color-ink-faint)">
                בספארי ← שיתוף ← ״הוסף למסך הבית״.
                <br />
                וזהו, Swell Club אצלכם כמו אפליקציה.
              </p>
            </>
          )}
        </section>
      </div>
    </main>
  );
}
