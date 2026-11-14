"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Flag, X } from "lucide-react";

export function ChallengeJoinButton({ clubId, challengeId, joined, ended }: {
  clubId: string; challengeId: string; joined: boolean; ended: boolean;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();
  async function change() {
    if (busy) return;
    setBusy(true); setError("");
    try {
      const r = await fetch("/api/clubs/" + encodeURIComponent(clubId) + "/competition/challenges/" + encodeURIComponent(challengeId) + "/join", {
        method: "POST", cache: "no-store", credentials: "same-origin",
        headers: { "Content-Type": "application/json" }, body: JSON.stringify({ active: !joined }),
      });
      const b = await r.json();
      if (!r.ok) throw new Error(b.error ?? "Could not update participation");
      router.refresh();
    } catch (e) { setError(e instanceof Error ? e.message : "Try again"); }
    finally { setBusy(false); }
  }
  return <div className="mt-5">
    <button type="button" onClick={change} disabled={busy || (ended && !joined)} aria-pressed={joined}
      className={"inline-flex min-h-11 items-center gap-2 rounded-xl px-5 text-sm font-black disabled:opacity-45 " + (joined ? "border border-[#ffd09a]/35 text-[#ffe0b9]" : "bg-gradient-to-r from-[#ffd497] to-[#ef802f] text-[#281509]")}>
      {joined ? <X className="size-4" /> : <Flag className="size-4" />}{busy ? "Updating…" : joined ? "Leave challenge" : "Join this challenge"}
    </button>
    {error && <p role="alert" className="mt-2 text-xs text-red-300">{error}</p>}
  </div>;
}
