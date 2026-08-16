"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cx } from "./ui";

const ICONS = {
  // הגלים מהלוגו עצמו — לא סינוסים גנריים. אסימטרי, עם הרמה קטנה
  // בקצה, כמו הגל הראשי ב-public/logo.png.
  events:
    "M2 11q3-2.8 6.5 0t6.5 0q2-2 5.5-0.8M4.5 16q3.5-2 7-0.3t5.5-0.7",
  // שחיין פונה ימינה: ראש, זרוע זיגזג באמצע משיכה, ושני גלים — לא
  // סתם דמות גנרית. הקהילה היא שחיינים.
  profile:
    "M18 8.6a2 2 0 1 0 0-4 2 2 0 0 0 0 4ZM15.8 7.6L11 2.5L14.5 7L2.5 10.5M2 16q3-2.1 6 0t6 0t6 0t4.5 0M3 19.5q2.5-1.7 5 0t5 0t5 0",
  admin: "M5 20v-7M12 20V5M19 20v-4M3 20h18",
} as const;

function NavIcon({ d }: { d: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="size-6"
      aria-hidden
    >
      {d.split("M").filter(Boolean).map((seg, i) => (
        <path key={i} d={"M" + seg} />
      ))}
    </svg>
  );
}

export function AppNav({ isOrganizer }: { isOrganizer: boolean }) {
  const pathname = usePathname();

  const items = [
    { href: "/events", label: "מפגשים", icon: ICONS.events },
    { href: "/profile", label: "פרופיל", icon: ICONS.profile },
    ...(isOrganizer
      ? [{ href: "/admin", label: "ניהול", icon: ICONS.admin }]
      : []),
  ];

  return (
    <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-(--color-line) bg-(--color-surface)/92 backdrop-blur-md">
      <ul className="mx-auto flex w-full max-w-md pb-[env(safe-area-inset-bottom)]">
        {items.map((item) => {
          const active =
            pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <li key={item.href} className="flex-1">
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cx(
                  "flex min-h-16 flex-col items-center justify-center gap-1 text-[0.7rem] font-semibold transition",
                  active
                    ? "text-(--color-sea)"
                    : "text-(--color-ink-faint) hover:text-(--color-ink-soft)",
                )}
              >
                <NavIcon d={item.icon} />
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
