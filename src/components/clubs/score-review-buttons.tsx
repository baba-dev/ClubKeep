"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, XCircle } from "lucide-react";

export function ScoreReviewButtons({
  clubId,
  scoreId,
  selfSubmitted,
}: {
  clubId: string;
  scoreId: string;
  selfSubmitted: boolean;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();
  async function decide(decision: "APPROVED" | "REJECTED") {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const r = await fetch(
        "/api/clubs/" +
          encodeURIComponent(clubId) +
          "/competition/scores/" +
          encodeURIComponent(scoreId) +
          "/review",
        {
          method: "POST",
          credentials: "same-origin",
          cache: "no-store",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ decision }),
        }
      );
      const body = await r.json();
      if (!r.ok) throw new Error(body.error ?? "Score review failed");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Try again");
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="flex flex-wrap gap-2">
      <button
        disabled={busy || selfSubmitted}
        onClick={() => decide("APPROVED")}
        title={selfSubmitted ? "A different manager must approve this submission" : undefined}
        className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#f5c47f] px-4 text-xs font-black text-[#26150b] disabled:opacity-40"
      >
        <CheckCircle2 className="size-4" /> Verify
      </button>
      <button
        disabled={busy}
        onClick={() => decide("REJECTED")}
        className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-white/20 px-4 text-xs font-bold text-[#f9c7a8] disabled:opacity-40"
      >
        <XCircle className="size-4" /> Reject
      </button>
      {selfSubmitted && (
        <p className="w-full text-xs text-[#e7ae84]">
          A second reviewer must approve your own submission.
        </p>
      )}
      {error && (
        <p role="alert" className="w-full text-xs text-red-300">
          {error}
        </p>
      )}
    </div>
  );
}
