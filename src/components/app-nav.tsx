"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { demoMode } from "@/lib/config";
import * as demo from "@/lib/demo/store";
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

/** עיגול מספר בודד — שני מהם נערמים אנכית משמאל לאייקון "ניהול":
 * העליון להצטרפות, התחתון לתמונות. צבע האתר, לא צבע התראה אדום. */
function CountCircle({ count, label }: { count: number; label: string }) {
  if (count <= 0) return null;
  return (
    <span
      aria-label={label}
      className="flex size-4 items-center justify-center rounded-full bg-(--color-sea) text-[0.62rem] font-bold leading-none text-white"
    >
      <span className="ltr-nums">{count > 9 ? "9+" : count}</span>
    </span>
  );
}

async function fetchPendingCounts(
  clubId: string,
): Promise<{ members: number; photos: number }> {
  const supabase = createClient();
  const [{ count: memberCount }, { count: photoCount }] = await Promise.all([
    supabase
      .from("club_members")
      .select("*", { count: "exact", head: true })
      .eq("club_id", clubId)
      .eq("status", "pending"),
    supabase
      .from("event_photos")
      .select("*, events!inner(club_id)", { count: "exact", head: true })
      .eq("status", "pending")
      .eq("events.club_id", clubId),
  ]);
  return { members: memberCount ?? 0, photos: photoCount ?? 0 };
}

export function AppNav({
  isOrganizer,
  clubId,
}: {
  isOrganizer: boolean;
  clubId: string | null;
}) {
  const pathname = usePathname();
  // בהדגמה יש רק תמונות ממתינות (אין הרשמה אמיתית להדגים) — נתון
  // מקומי סינכרוני, אין צורך ב-fetch או ב-realtime.
  const [pendingCounts, setPendingCounts] = useState(() => ({
    members: 0,
    photos: demoMode ? demo.demoAllPendingPhotos().length : 0,
  }));

  // תג ההתראה על "ניהול": בקשות הצטרפות ותמונות ממתינות מוצגות
  // בנפרד — לא סתם מספר אחד מאוחד — כי אלה שתי פעולות שונות לגמרי.
  // נראה בכל מקום באפליקציה שבו המנהלת נמצאת, לא רק בתוך עמוד הניהול
  // עצמו. realtime לתגובה מיידית, ורענון תקופתי כרשת ביטחון (חיבור
  // חי לא תמיד נשאר פתוח באמינות בנייד).
  useEffect(() => {
    if (demoMode || !isOrganizer || !clubId) return;

    let cancelled = false;
    async function refresh() {
      const counts = await fetchPendingCounts(clubId!);
      if (!cancelled) setPendingCounts(counts);
    }

    refresh();

    const supabase = createClient();
    const channel = supabase
      .channel(`admin-pending-badge:${clubId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "club_members" },
        refresh,
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "event_photos" },
        refresh,
      )
      .subscribe();

    const interval = setInterval(refresh, 15_000);

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
      clearInterval(interval);
    };
  }, [isOrganizer, clubId]);

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
          const isAdmin = item.href === "/admin";
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
                <span className="flex items-center gap-1">
                  {/* בסדר הזה, ב-RTL: האייקון נשאר מימין,
                      העיגולים נערמים משמאל לו — כמו שביקשה. */}
                  <NavIcon d={item.icon} />
                  {isAdmin && (pendingCounts.members > 0 || pendingCounts.photos > 0) && (
                    <span className="flex flex-col gap-0.5">
                      <CountCircle
                        count={pendingCounts.members}
                        label={`${pendingCounts.members} בקשות הצטרפות ממתינות`}
                      />
                      <CountCircle
                        count={pendingCounts.photos}
                        label={`${pendingCounts.photos} תמונות ממתינות לאישור`}
                      />
                    </span>
                  )}
                </span>
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
