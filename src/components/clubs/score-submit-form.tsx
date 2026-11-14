"use client";
import { useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { ArrowUpRight, Flame } from "lucide-react";
import { METRICS, type CompetitionMetricKey } from "@/lib/competition-catalog";

export function ScoreSubmitForm({ clubId, metrics, memberRecordId }: {
  clubId: string;
  metrics: { id: string; metric: CompetitionMetricKey }[];
  memberRecordId?: string;
}) {
  const router = useRouter();
  const [metricId, setMetricId] = useState(metrics[0]?.id ?? "");
  const [value, setValue] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const operation = useRef<string | null>(null);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || !metricId) return;
    if (!operation.current) operation.current = crypto.randomUUID();
    setBusy(true); setError("");
    try {
      const response = await fetch("/api/clubs/" + encodeURIComponent(clubId) + "/competition/scores", {
        method: "POST", credentials: "same-origin", cache: "no-store",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          seasonMetricId: metricId, operationKey: operation.current,
          value: Number(value), note: note.trim(),
          ...(memberRecordId ? { memberRecordId } : {}),
        }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "Could not submit");
      operation.current = null; setValue(""); setNote(""); router.refresh();
    } catch (e) { setError(e instanceof Error ? e.message : "Try again"); }
    finally { setBusy(false); }
  }
  if (!metrics.length) return <p className="text-sm text-[#bca89b]">No active competition metrics are configured yet.</p>;
  const item = metrics.find((m) => m.id === metricId) ?? metrics[0];
  const rule = METRICS[item.metric];
  return (
    <form onSubmit={submit} className="space-y-4">
      <label className="block text-xs font-bold text-[#f5d4b1]">Discipline
        <select value={metricId} onChange={(e) => { setMetricId(e.target.value); operation.current = null; }}
          className="mt-2 min-h-12 w-full rounded-xl border border-white/15 bg-[#111114] px-4 text-sm text-white focus-visible:outline-2 focus-visible:outline-[#ffbb77]">
          {metrics.map((m) => <option key={m.id} value={m.id}>{METRICS[m.metric].label} ({METRICS[m.metric].unit})</option>)}
        </select>
      </label>
      <label className="block text-xs font-bold text-[#f5d4b1]">Your result · {rule.unit}
        <input type="number" required min={rule.min} max={rule.max} step="1" value={value}
          onChange={(e) => { setValue(e.target.value); operation.current = null; }}
          className="mt-2 min-h-12 w-full rounded-xl border border-white/15 bg-[#111114] px-4 text-lg font-black text-white tabular-nums focus-visible:outline-2 focus-visible:outline-[#ffbb77]" placeholder="0" />
      </label>
      <label className="block text-xs font-bold text-[#f5d4b1]">Context for the club judge (optional)
        <textarea rows={2} maxLength={160} value={note} onChange={(e) => { setNote(e.target.value); operation.current = null; }}
          className="mt-2 w-full rounded-xl border border-white/15 bg-[#111114] p-4 text-sm text-white focus-visible:outline-2 focus-visible:outline-[#ffbb77]" placeholder="Match, class or supervised lift details" />
      </label>
      <button disabled={busy} className="inline-flex min-h-12 items-center gap-2 rounded-xl bg-gradient-to-r from-[#f9d58e] to-[#ef7926] px-5 text-sm font-black text-[#281407] disabled:opacity-55"><Flame className="size-4" /> {busy ? "Submitting…" : "Submit for verification"} <ArrowUpRight className="size-4" /></button>
      {error && <p role="alert" className="text-sm text-red-300">{error}</p>}
      <p className="text-xs leading-6 text-[#ad9b8e]">A club owner or manager must verify your result. Pending scores never count towards rankings or badges.</p>
    </form>
  );
}
