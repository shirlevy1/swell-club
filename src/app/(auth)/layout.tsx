import Link from "next/link";
import { SwellLogo } from "@/components/swell-logo";

/**
 * גם בהדגמה עוברים דרך המסכים האלה — ראו ההסתעפות ל-demoMode בתוך
 * signup/page.tsx ו-login/page.tsx. שם אין קריאה אמיתית ל-Supabase,
 * רק מעבר ל-/events אחרי מילוי הטופס.
 */
export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative isolate flex flex-1 flex-col overflow-y-auto">
      <div className="haze pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(180deg, #ffffff 0%, #f2f7fa 50%, #e2ecf3 100%)",
          }}
        />
        <div
          className="absolute inset-x-0 top-[38%] h-[30rem] -translate-y-1/2"
          style={{
            background:
              "radial-gradient(58% 46% at 50% 50%, color-mix(in oklab, var(--color-sky) 40%, transparent), transparent 72%)",
          }}
        />
      </div>

      <div className="mx-auto flex w-full max-w-md flex-1 flex-col gap-8 px-6 pb-[max(2rem,env(safe-area-inset-bottom))] pt-[max(2.5rem,env(safe-area-inset-top))]">
        <Link
          href="/"
          className="flex flex-col items-center gap-3 text-center"
        >
          <SwellLogo className="w-28" decorative />
          <span className="sr-only">Swell Club</span>
        </Link>

        {children}
      </div>
    </div>
  );
}
