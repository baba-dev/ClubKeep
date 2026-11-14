"use client";
import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Flag } from "lucide-react";

export function ChallengeCreateForm({ clubId, seasons }: {
  clubId: string; seasons: { id: string; name: string }[];
}) {
  const [seasonId, setSeasonId] = useState(seasons[0]?.id ?? "");
  const [title, setTitle] = useState("");
  const [kind, setKind] = useState<"ATTENDANCE" | "APPROVED_SCORES">("ATTENDANCE");
  const [target, setTarget] = useState("5");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault(); if (busy) return;
    setBusy(true); setError("");
    try {
      const r = await fetch("/api/clubs/" + encodeURIComponent(clubId) + "/competition/challenges", {
        method: "POST", cache: "no-store", credentials: "same-origin",
        headers: { "Content-Type": "application/json" }, body: JSON.stringify({
          seasonId, title: title.trim(), kind, target: Number(target),
        }),
      });
      const b = await r.json();
      if (!r.ok) throw new Error(b.error ?? "Could not create challenge");
      setTitle(""); router.refresh();
    } catch (err) { setError(err instanceof Error ? err.message : "Try again"); }
    finally { setBusy(false); }
  }
  if (!seasons.length) return <p className="mt-4 text-sm text-[#bda58e]">Create a competition season before adding challenges.</p>;
  return <form onSubmit={submit} className="mt-5 space-y-4">
    <label className="block text-xs font-bold text-[#e9c59c]">Season
      <select value={seasonId} onChange={(e) => setSeasonId(e.target.value)} className="mt-2 min-h-12 w-full rounded-xl border border-white/20 bg-[#16100c] px-4 text-sm text-white">
        {seasons.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
      </select></label>
    <label className="block text-xs font-bold text-[#e9c59c]">Challenge title
      <input required maxLength={90} minLength={5} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Five sessions, one big win"
        className="mt-2 min-h-12 w-full rounded-xl border border-white/20 bg-[#16100c] px-4 text-sm text-white" />
    </label>
    <div className="grid grid-cols-[1fr_110px] gap-3">
      <label className="block text-xs font-bold text-[#e9c59c]">Goal type
        <select value={kind} onChange={(e) => setKind(e.target.value as typeof kind)} className="mt-2 min-h-12 w-full rounded-xl border border-white/20 bg-[#16100c] px-3 text-sm text-white">
          <option value="ATTENDANCE">Verified visits</option><option value="APPROVED_SCORES">Approved results</option>
        </select>
      </label>
      <label className="block text-xs font-bold text-[#e9c59c]">Target
        <input required type="number" min={1} max={100} value={target} onChange={(e) => setTarget(e.target.value)}
          className="mt-2 min-h-12 w-full rounded-xl border border-white/20 bg-[#16100c] px-3 text-sm text-white" />
      </label>
    </div>
    <button disabled={busy} className="inline-flex min-h-12 items-center gap-2 rounded-xl bg-gradient-to-r from-[#ffd18c] to-[#ed7524] px-5 text-sm font-black text-[#2c170b] disabled:opacity-45"><Flag className="size-4" /> {busy ? "Creating…" : "Launch club challenge"}</button>
    {error && <p role="alert" className="text-sm text-red-300">{error}</p>}
  </form>;
}
