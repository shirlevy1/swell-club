"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { instagramUrl, whatsappUrl } from "@/lib/format";
import { CheckIcon, InstagramIcon, WhatsAppIcon, XIcon } from "./social-icons";
import { Notice } from "./ui";

export function PendingMemberRow({
  profileId,
  fullName,
  ageYears,
  phone,
  instagram,
}: {
  profileId: string;
  fullName: string;
  ageYears: number | null;
  phone: string | null;
  instagram: string | null;
}) {
  const router = useRouter();
  const [pending, setPending] = useState<"approve" | "reject" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const wa = whatsappUrl(phone);
  const ig = instagramUrl(instagram);

  async function approve() {
    setError(null);
    setPending("approve");
    const supabase = createClient();
    const { error: rpcError } = await supabase.rpc("approve_member", {
      p_profile_id: profileId,
    });
    setPending(null);
    if (rpcError) return setError("לא הצלחנו לאשר. נסו שוב.");
    router.refresh();
  }

  async function reject() {
    setError(null);
    setPending("reject");
    const supabase = createClient();
    const { error: rpcError } = await supabase.rpc("reject_member", {
      p_profile_id: profileId,
    });
    setPending(null);
    if (rpcError) return setError("לא הצלחנו לדחות. נסו שוב.");
    router.refresh();
  }

  return (
    <div className="space-y-2 px-4 py-3">
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
          onClick={approve}
          aria-label="אישור"
          className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-(--color-line) bg-(--color-haze) text-(--color-verified) transition hover:border-(--color-verified)/50 hover:bg-(--color-verified)/10 disabled:opacity-50"
        >
          <CheckIcon className="size-4" />
        </button>
        <button
          type="button"
          disabled={pending !== null}
          onClick={reject}
          aria-label="דחייה"
          className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-(--color-line) bg-(--color-haze) text-(--color-fail) transition hover:border-(--color-fail)/50 hover:bg-(--color-fail)/10 disabled:opacity-50"
        >
          <XIcon className="size-4" />
        </button>
      </div>

      {error && <Notice tone="error">{error}</Notice>}
    </div>
  );
}
