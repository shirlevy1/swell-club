"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { setMyRoleAction } from "@/lib/demo/actions";
import type { MemberRole } from "@/lib/types";
import { cx } from "./ui";

const ROLES: { value: MemberRole; label: string }[] = [
  { value: "organizer", label: "מנהלת קהילה" },
  { value: "member", label: "חבר קהילה" },
];

/**
 * ההדגמה היא אדם אחד, אבל המוצר הוא שתי חוויות נפרדות — מנהלת
 * קהילה מול חבר רגיל. המתג הזה מאפשר להראות את שתיהן באותה הדגמה,
 * במקום שהצפייה תיראה כמו פלטפורמה אחת ללא הפרדת הרשאות.
 */
export function DemoBadge({ currentRole }: { currentRole: MemberRole }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function setRole(role: MemberRole) {
    if (role === currentRole || pending) return;
    startTransition(async () => {
      await setMyRoleAction(role);
      // צפייה כחבר רגיל בזמן שנמצאים ב-/admin חייבת לשלוח אתכם מיד
      // החוצה — אחרת נראה כאילו ההרשאה לא ממש נאכפת.
      router.push("/events");
      router.refresh();
    });
  }

  return (
    <div className="mx-auto w-full max-w-md space-y-2 px-5 pt-[max(0.75rem,env(safe-area-inset-top))]">
      <p className="rounded-full border border-(--color-sea)/30 bg-(--color-sea)/10 px-3 py-1.5 text-center text-[0.7rem] font-semibold text-(--color-sea)">
        מצב הדגמה · נתונים לדוגמה, שום דבר לא נשמר
      </p>

      <div className="flex items-center justify-center gap-1.5 text-[0.7rem]">
        <span className="text-(--color-ink-faint)">צופים כ־</span>
        <div className="flex rounded-full border border-(--color-line) bg-(--color-surface) p-0.5">
          {ROLES.map((r) => (
            <button
              key={r.value}
              type="button"
              disabled={pending}
              onClick={() => setRole(r.value)}
              className={cx(
                "min-h-9 rounded-full px-3 py-1.5 font-semibold transition disabled:opacity-60",
                r.value === currentRole
                  ? "bg-(--color-sea) text-white"
                  : "text-(--color-ink-soft) hover:text-(--color-ink)",
              )}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
