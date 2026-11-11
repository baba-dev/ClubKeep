"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, XCircle } from "lucide-react";
type Entry = {
  id: string;
  clubId: string;
  clubName: string;
  submittedAt: string;
  content: { tagline: string; description: string; city: string; listed: boolean } | null;
};
export function DirectoryReview({ items }: { items: Entry[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");
  async function decide(id: string, decision: "approve" | "reject") {
    if (busy) return;
    setBusy(id);
    setError("");
    try {
      const res = await fetch("/api/admin/directory/" + encodeURIComponent(id) + "/" + decision, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: "{}",
      });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload.error || "Review unsuccessful");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Review failed");
    } finally {
      setBusy(null);
    }
  }
  return (
    <div className="mt-8 space-y-4">
      {error && (
        <p role="alert" className="rounded-xl bg-red-950/40 p-4 text-red-200">
          {error}
        </p>
      )}
      {items.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-[#eac68b]/20 p-12 text-center text-[#c5ad97]">
          No public listing submissions awaiting review.
        </div>
      ) : (
        items.map((item) => (
          <article
            key={item.id}
            className="rounded-3xl border border-[#e8bf84]/20 bg-[#1b120c] p-6"
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-xl font-semibold">{item.clubName}</h2>
              <span className="text-xs text-[#be9e83]">
                {new Date(item.submittedAt).toLocaleDateString()}
              </span>
            </div>
            <p className="mt-2 text-sm text-[#f2c48e]">
              {item.content?.tagline || "Invalid content"}
            </p>
            <p className="mt-3 text-sm leading-7 whitespace-pre-wrap text-[#c8b09a]">
              {item.content?.description}
            </p>
            <p className="mt-4 text-xs text-[#b7a18a]">
              City: {item.content?.city} ·{" "}
              {item.content?.listed ? "Directory listing" : "Unlisted profile"}
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <button
                disabled={busy !== null || !item.content}
                onClick={() => decide(item.id, "approve")}
                className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-gradient-to-r from-[#f0ba67] to-[#ef711a] px-5 font-bold text-[#281607] disabled:opacity-50"
              >
                <CheckCircle2 className="size-4" />
                Approve
              </button>
              <button
                disabled={busy !== null}
                onClick={() => decide(item.id, "reject")}
                className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-[#f6dc9b]/25 px-5 text-sm disabled:opacity-50"
              >
                <XCircle className="size-4" />
                Reject
              </button>
            </div>
          </article>
        ))
      )}
    </div>
  );
}
