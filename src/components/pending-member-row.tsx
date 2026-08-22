"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { instagramUrl, whatsappUrl } from "@/lib/format";
import { InstagramIcon, WhatsAppIcon } from "./social-icons";
import { Button, Notice } from "./ui";

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
    <div className="space-y-3 px-4 py-3">
      {/* קישור לפרופיל המלא — טלפון, כל הסלפים, הכל. שורה משלו, כדי
          שהשם לא ייחתך מול האייקונים/כפתורים. */}
      <Link href={`/admin/members/${profileId}`} className="block w-fit">
        <p className="text-sm font-semibold hover:underline">
          {fullName}
          {ageYears !== null && (
            <span className="ms-1.5 font-normal text-(--color-ink-faint)">
              · גיל {ageYears}
            </span>
          )}
        </p>
      </Link>

      <div className="flex items-center justify-between gap-2">
        <div className="flex gap-2">
          {wa && (
            <a
              href={wa}
              target="_blank"
              rel="noreferrer"
              aria-label={`וואטסאפ עם ${fullName}`}
              className="flex size-9 items-center justify-center rounded-lg border border-(--color-line) bg-(--color-haze) text-(--color-verified) transition hover:border-(--color-verified)/50 hover:bg-(--color-verified)/10"
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
              className="flex size-9 items-center justify-center rounded-lg border border-(--color-line) bg-(--color-haze) text-(--color-sea) transition hover:border-(--color-sea)/50 hover:bg-(--color-sea)/10"
            >
              <InstagramIcon className="size-4" />
            </a>
          )}
        </div>

        <div className="flex gap-2">
          <Button
            variant="danger"
            disabled={pending !== null}
            onClick={reject}
            className="min-h-9 px-3 text-xs"
          >
            {pending === "reject" ? "רגע…" : "דחייה"}
          </Button>
          <Button
            disabled={pending !== null}
            onClick={approve}
            className="min-h-9 px-3 text-xs"
          >
            {pending === "approve" ? "רגע…" : "אישור"}
          </Button>
        </div>
      </div>

      {error && <Notice tone="error">{error}</Notice>}
    </div>
  );
}
