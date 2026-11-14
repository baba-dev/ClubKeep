"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ShieldCheck, ShieldOff } from "lucide-react";

export function RankingConsentControl({ clubId, initial }: { clubId: string; initial: boolean }) {
  const [enabled, setEnabled] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();
  async function change() {
    if (busy) return;
    setBusy(true); setError("");
    try {
      const response = await fetch("/api/clubs/" + encodeURIComponent(clubId) + "/competition/consent", {
        method: "POST", credentials: "same-origin", cache: "no-store",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: !enabled }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Unable to update privacy setting");
      setEnabled(result.enabled);
      router.refresh();
    } catch (e) { setError(e instanceof Error ? e.message : "Try again"); }
    finally { setBusy(false); }
  }
  return (
    <div className="rounded-3xl border border-[#f4ba72]/25 bg-[#211915] p-6">
      <div className="flex items-center gap-3">
        {enabled ? <ShieldCheck className="size-7 text-[#ffd08f]" /> : <ShieldOff className="size-7 text-[#f1b46f]" />}
        <div><h2 className="text-lg font-black text-white">Private club ranking</h2><p className="mt-1 text-xs text-[#c2a896]">{enabled ? "Opted in · only active club members can view your rank" : "Hidden · your name never appears on rankings"}</p></div>
      </div>
      <p className="mt-4 text-sm leading-6 text-[#c4b3a1]">Only club-approved nonmedical scores can appear. You control visibility; opting out removes you from the next ranking view. Nothing is posted publicly or shared with other clubs.</p>
      <button type="button" aria-pressed={enabled} disabled={busy} onClick={change}
        className="mt-5 min-h-11 rounded-xl border border-[#f8c27d]/45 px-5 text-sm font-extrabold text-[#ffd094] transition hover:bg-[#f4b874]/15 focus-visible:outline-2 focus-visible:outline-[#ffcc82] disabled:opacity-60">
        {busy ? "Updating…" : enabled ? "Leave the leaderboard" : "Opt into club leaderboard"}
      </button>
      {error && <p className="mt-3 text-xs text-red-300" role="alert">{error}</p>}
    </div>
  );
}
