"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { RotateCcw } from "lucide-react";
export function ReversePaymentButton({ clubId, paymentId }: { clubId: string; paymentId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  async function reverse() {
    if (busy) return;
    const reason = window.prompt(
      "Void this mistaken ClubKeep record? This does not issue a bank refund. Enter a reason (8–240 characters):"
    );
    if (reason === null) return;
    if (reason.trim().length < 8 || reason.trim().length > 240) {
      setError("Reason must contain 8–240 characters");
      return;
    }
    if (
      !window.confirm(
        "Permanently mark this receipt VOID and restore the recorded outstanding balance?"
      )
    )
      return;
    setBusy(true);
    setError("");
    try {
      const response = await fetch(
        "/api/clubs/" +
          encodeURIComponent(clubId) +
          "/finance/payments/" +
          encodeURIComponent(paymentId) +
          "/reverse",
        {
          method: "POST",
          credentials: "same-origin",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ reason: reason.trim() }),
        }
      );
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to void entry");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to void entry");
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        disabled={busy}
        onClick={reverse}
        className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-[#f2c089]/25 px-3 text-xs text-[#f4c591] disabled:opacity-50"
      >
        <RotateCcw className="size-3.5" />
        {busy ? "Saving…" : "Void entry"}
      </button>
      {error && (
        <span role="alert" className="max-w-52 text-right text-xs text-red-200">
          {error}
        </span>
      )}
    </div>
  );
}
