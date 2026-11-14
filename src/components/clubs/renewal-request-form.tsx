"use client";

import { useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { ArrowUpRight, Send } from "lucide-react";

export function RenewalRequestForm({ clubId }: { clubId: string }) {
  const router = useRouter();
  const operation = useRef<string | null>(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    if (!operation.current) operation.current = crypto.randomUUID();
    try {
      const response = await fetch("/api/clubs/" + encodeURIComponent(clubId) + "/my/renewal", {
        method: "POST",
        credentials: "same-origin",
        cache: "no-store",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ operationKey: operation.current, message: message.trim() }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Unable to send request");
      operation.current = null;
      setMessage("");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Request failed");
    } finally {
      setBusy(false);
    }
  }
  return (
    <form onSubmit={submit} className="mt-6 space-y-4">
      <label className="block text-sm font-semibold text-[#f8dec0]">
        A note for reception (optional)
        <textarea
          className="mt-2 min-h-28 w-full resize-y rounded-xl border border-white/20 bg-[#111216] p-4 text-sm text-white outline-none focus-visible:border-[#ffd19a]"
          maxLength={300}
          value={message}
          onChange={(e) => {
            setMessage(e.target.value);
            operation.current = null;
          }}
          placeholder="I'd like to renew my membership…"
        />
      </label>
      <button
        type="submit"
        disabled={busy}
        className="inline-flex min-h-12 items-center gap-2 rounded-xl bg-gradient-to-r from-[#ffd18a] to-[#ed7927] px-6 text-sm font-black text-[#29170c] disabled:opacity-60"
      >
        <Send className="size-4" /> {busy ? "Sending…" : "Request renewal"}{" "}
        <ArrowUpRight className="size-4" />
      </button>
      {error && (
        <p role="alert" className="text-sm text-red-300">
          {error}
        </p>
      )}
    </form>
  );
}
