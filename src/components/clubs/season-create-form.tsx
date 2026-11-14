"use client";
import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { CalendarDays } from "lucide-react";
import { METRICS, type CompetitionMetricKey } from "@/lib/competition-catalog";

export function SeasonCreateForm({ clubId, available }: { clubId: string; available: CompetitionMetricKey[] }) {
  const today = new Date();
  const [startDate, setStartDate] = useState(today.toISOString().slice(0, 7) + "-01");
  const [metrics, setMetrics] = useState<CompetitionMetricKey[]>(available);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault(); if (busy) return;
    setBusy(true); setError("");
    try {
      const response = await fetch("/api/clubs/" + encodeURIComponent(clubId) + "/competition/seasons", {
        method: "POST", credentials: "same-origin", cache: "no-store",
        headers: { "Content-Type": "application/json" }, body: JSON.stringify({ startDate, metrics }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Could not create season");
      router.refresh();
    } catch (err) { setError(err instanceof Error ? err.message : "Try again"); }
    finally { setBusy(false); }
  }
  return <form onSubmit={submit} className="mt-5 space-y-4">
    <label className="block text-xs font-bold text-[#f5d5aa]">Season starts · first of month (UTC)
      <input required type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)}
        className="mt-2 min-h-12 w-full rounded-xl border border-[#ffd09a]/20 bg-[#130f0c] px-4 text-sm text-white focus-visible:outline-2 focus-visible:outline-[#ffc383]" />
    </label>
    <fieldset><legend className="mb-3 text-xs font-bold text-[#f5d5aa]">Enabled disciplines</legend>
      <div className="grid gap-2">{available.map(key => <label key={key} className="flex min-h-11 cursor-pointer items-center gap-3 rounded-xl border border-white/10 bg-[#271c14] px-4 text-sm text-[#f4d5b4]">
        <input type="checkbox" checked={metrics.includes(key)} onChange={(e) =>
          setMetrics(list => e.target.checked ? [...list, key] : list.filter(m => m !== key))}
          className="size-4 accent-[#ed8a35]" />{METRICS[key].label} <span className="ml-auto text-xs text-[#ae967c]">{METRICS[key].unit}</span>
      </label>)}</div>
    </fieldset>
    <button disabled={busy || metrics.length === 0} className="inline-flex min-h-12 items-center gap-2 rounded-xl bg-gradient-to-r from-[#ffd18c] to-[#ed7524] px-5 text-sm font-black text-[#2c170b] disabled:opacity-45"><CalendarDays className="size-4" /> {busy ? "Creating…" : "Create three-month season"}</button>
    {error && <p role="alert" className="text-sm text-red-300">{error}</p>}
    <p className="text-xs leading-6 text-[#af9983]">Seasons never overlap. The club chooses its first month rather than following an assumed universal sports calendar.</p>
  </form>;
}
