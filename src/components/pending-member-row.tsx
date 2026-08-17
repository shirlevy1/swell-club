"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button, Notice } from "./ui";

export function PendingMemberRow({
  profileId,
  fullName,
}: {
  profileId: string;
  fullName: string;
}) {
  const router = useRouter();
  const [pending, setPending] = useState<"approve" | "reject" | null>(null);
  const [error, setError] = useState<string | null>(null);

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
      <div className="flex items-center justify-between gap-3">
        <p className="truncate text-sm font-semibold">{fullName}</p>
        <div className="flex shrink-0 gap-2">
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
