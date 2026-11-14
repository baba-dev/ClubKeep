"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, X } from "lucide-react";

export function RenewalDecisionButtons({ clubId, requestId }: { clubId: string; requestId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function decide(decision: "RESOLVED" | "DECLINED") {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/clubs/" + encodeURIComponent(clubId) + "/renewal-requests/" + encodeURIComponent(requestId), {
        method: "POST", credentials: "same-origin", cache: "no-store",
        headers: { "Content-Type": "application/json" }, body: JSON.stringify({ decision }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Unable to update request");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Action failed");
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="flex flex-wrap items-center gap-2">
      <button disabled={busy} onClick={() => decide("RESOLVED")} className="inline-flex min-h-11 items-center gap-1.5 rounded-xl bg-[#f1bb75] px-4 text-xs font-bold text-[#28170c] disabled:opacity-50"><Check className="size-4" /> Mark reviewed</button>
      <button disabled={busy} onClick={() => decide("DECLINED")} className="inline-flex min-h-11 items-center gap-1.5 rounded-xl border border-[#f0a781]/40 px-4 text-xs font-bold text-[#ffc4a9] disabled:opacity-50"><X className="size-4" /> Decline</button>
      {error && <p role="alert" className="w-full text-xs text-red-300">{error}</p>}
    </div>
  );
}
