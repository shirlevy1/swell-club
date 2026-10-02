"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { demoMode } from "@/lib/config";
import { approveMemberAction, rejectMemberAction } from "@/lib/demo/actions";
import { instagramUrl, whatsappUrl } from "@/lib/format";
import { CheckIcon, InstagramIcon, WhatsAppIcon, XIcon } from "./social-icons";
import { Card, Notice } from "./ui";
import { useConfirmDialog } from "./confirm-dialog";
import { useNewLiveIds } from "./live-refresh-context";
import type { PendingMember } from "@/lib/data";

/** עוטפת את כל רשימת הבקשות הממתינות — ראו useNewLiveIds: ה"זריעה"
 * הראשונית של כל ה-ids חייבת לקרות פעם אחת לכל הרשימה יחד, לא per-row
 * (אחרת כל בקשה שכבר הייתה שם תיראה "חדשה" כי אין לה בסיס להשוואה). */
export function PendingMembersCard({ members, clubId }: { members: PendingMember[]; clubId: string }) {
  const newIds = useNewLiveIds(
    `pending-members:${clubId}`,
    members.map((m) => m.profileId),
  );

  return (
    <Card className="divide-y divide-(--color-line)/50 p-0">
      {members.map((m) => (
        <PendingMemberRow
          key={m.profileId}
          profileId={m.profileId}
          fullName={m.fullName}
          ageYears={m.ageYears}
          phone={m.phone}
          instagram={m.instagram}
          isNew={newIds.has(m.profileId)}
        />
      ))}
    </Card>
  );
}

function PendingMemberRow({
  profileId,
  fullName,
  ageYears,
  phone,
  instagram,
  isNew,
}: {
  profileId: string;
  fullName: string;
  ageYears: number | null;
  phone: string | null;
  instagram: string | null;
  isNew: boolean;
}) {
  const router = useRouter();
  const [pending, setPending] = useState<"approve" | "reject" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { confirm, dialog } = useConfirmDialog();

  const wa = whatsappUrl(phone);
  const ig = instagramUrl(instagram);

  async function approve() {
    setError(null);
    setPending("approve");
    if (demoMode) {
      await approveMemberAction(profileId);
      setPending(null);
      router.refresh();
      return;
    }
    try {
      const supabase = createClient();
      const { error: rpcError } = await supabase.rpc("approve_member", {
        p_profile_id: profileId,
      });
      setPending(null);
      if (rpcError) return setError("לא הצלחנו לאשר. נסו שוב.");
      router.refresh();
    } catch {
      setPending(null);
      setError("משהו השתבש. בדקו את החיבור ונסו שוב.");
    }
  }

  async function reject() {
    const ok = await confirm({
      title: `לדחות את הבקשה של ${fullName}?`,
      body: "הפעולה לא הפיכה - הבקשה תימחק לגמרי.",
      confirmText: "כן, לדחות",
      tone: "danger",
    });
    if (!ok) return;

    setError(null);
    setPending("reject");
    if (demoMode) {
      await rejectMemberAction(profileId);
      setPending(null);
      router.refresh();
      return;
    }
    try {
      const supabase = createClient();
      const { error: rpcError } = await supabase.rpc("reject_member", {
        p_profile_id: profileId,
      });
      setPending(null);
      if (rpcError) return setError("לא הצלחנו לדחות. נסו שוב.");
      router.refresh();
    } catch {
      setPending(null);
      setError("משהו השתבש. בדקו את החיבור ונסו שוב.");
    }
  }

  return (
    <div className={"space-y-2 px-4 py-3 " + (isNew ? "live-highlight-row" : "")}>
      <div className="flex items-center gap-2">
        {/* קישור לפרופיל המלא — טלפון, כל הסלפים, הכל. */}
        <Link
          href={`/admin/members/${profileId}`}
          className="min-w-0 flex-1"
        >
          <p className="truncate text-sm font-semibold hover:underline">
            {fullName}
            {ageYears !== null && (
              <span className="ms-1.5 font-normal text-(--color-ink-faint)">
                · גיל {ageYears}
              </span>
            )}
          </p>
        </Link>

        {wa && (
          <a
            href={wa}
            target="_blank"
            rel="noreferrer"
            aria-label={`וואטסאפ עם ${fullName}`}
            className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-(--color-line) bg-(--color-haze) text-(--color-verified) transition hover:border-(--color-verified)/50 hover:bg-(--color-verified)/10"
          >
            <WhatsAppIcon className="size-4" />
          </a>
        )}
        {ig && (
          <a
            href={ig}
            target="_blank"
            rel="noreferrer"
            aria-label={`אינסטגרם של ${fullName}`}
            className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-(--color-line) bg-(--color-haze) text-(--color-sea) transition hover:border-(--color-sea)/50 hover:bg-(--color-sea)/10"
          >
            <InstagramIcon className="size-4" />
          </a>
        )}

        <button
          type="button"
          disabled={pending !== null}
          onClick={reject}
          aria-label="דחייה"
          className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-(--color-line) bg-(--color-haze) text-(--color-fail) transition hover:border-(--color-fail)/50 hover:bg-(--color-fail)/10 disabled:opacity-50"
        >
          <XIcon className="size-4" />
        </button>
        <button
          type="button"
          disabled={pending !== null}
          onClick={approve}
          aria-label="אישור"
          className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-(--color-line) bg-(--color-haze) text-(--color-verified) transition hover:border-(--color-verified)/50 hover:bg-(--color-verified)/10 disabled:opacity-50"
        >
          <CheckIcon className="size-4" />
        </button>
      </div>

      {error && <Notice tone="error">{error}</Notice>}
      {isNew && (
        <span className="sr-only" role="status">
          {fullName} ביקש/ה להצטרף לקהילה.
        </span>
      )}
      {dialog}
    </div>
  );
}
