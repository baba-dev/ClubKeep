"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { EyeOff, RotateCcw } from "lucide-react";
type Entry = { clubId: string; name: string; status: string };
export function DirectoryVisibility({ items }: { items: Entry[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null),
    [error, setError] = useState("");
  async function act(clubId: string, action: "suspend" | "reinstate") {
    if (busy) return;
    setBusy(clubId);
    setError("");
    try {
      const res = await fetch(
        "/api/admin/club-profile/" + encodeURIComponent(clubId) + "/" + action,
        {
          method: "POST",
          credentials: "same-origin",
          headers: { "Content-Type": "application/json" },
          body: "{}",
        }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Moderation failed");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Moderation failed");
    } finally {
      setBusy(null);
    }
  }
  return (
    <section className="mt-12 rounded-3xl border border-[#f6dc9b]/20 bg-[#17100b] p-6">
      <h2 className="text-xl font-semibold">Published and suspended profiles</h2>
      <p className="mt-2 text-sm text-[#bca48a]">
        Suspend an unsafe listing immediately; reinstate only previously approved content.
      </p>
      {error && (
        <p role="alert" className="mt-4 text-red-200">
          {error}
        </p>
      )}
      <ul className="mt-6 divide-y divide-[#f6dc9b]/10">
        {items.map((x) => (
          <li key={x.clubId} className="flex flex-wrap items-center justify-between gap-3 py-4">
            <span>
              <strong className="block">{x.name}</strong>
              <small className="text-[#bca58c]">{x.status.toLowerCase()}</small>
            </span>
            <button
              disabled={busy !== null}
              onClick={() => act(x.clubId, x.status === "SUSPENDED" ? "reinstate" : "suspend")}
              className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-[#f6dc9b]/20 px-4 text-sm disabled:opacity-50"
            >
              {x.status === "SUSPENDED" ? (
                <RotateCcw className="size-4" />
              ) : (
                <EyeOff className="size-4" />
              )}
              {x.status === "SUSPENDED" ? "Reinstate" : "Suspend"}
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
