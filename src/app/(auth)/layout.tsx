import Link from "next/link";
import { SwellLogo } from "@/components/swell-logo";
import { MorningGlow } from "@/components/morning-glow";

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
      <MorningGlow horizonTop="38%" />

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
