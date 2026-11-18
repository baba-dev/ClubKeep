"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowUpRight, Loader2 } from "lucide-react";

async function post(url: string, body?: unknown) {
  const response = await fetch(url, {
    method: "POST",
    credentials: "same-origin",
    cache: "no-store",
    headers: { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const result = (await response.json().catch(() => ({}))) as {
    error?: string;
    checkoutUrl?: string;
    url?: string;
  };
  if (!response.ok) throw new Error(result.error ?? "Something went wrong. Please try again.");
  return result;
}

/** Starts hosted checkout, then sends the owner to the payment provider. */
export function SubscribeButton({
  clubId,
  tier,
  label,
  disabled,
}: {
  clubId: string;
  tier: "STARTER" | "GROWTH" | "PRO";
  label: string;
  disabled?: boolean;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function start() {
    if (busy || disabled) return;
    setBusy(true);
    setError("");
    try {
      const result = await post("/api/clubs/" + encodeURIComponent(clubId) + "/billing/checkout", {
        tier,
      });
      if (!result.checkoutUrl) throw new Error("Checkout is unavailable right now.");
      window.location.assign(result.checkoutUrl);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Try again");
      setBusy(false);
    }
  }
  return (
    <div>
      <button
        type="button"
        className="hm-button hm-button-primary w-full justify-center"
        onClick={start}
        disabled={busy || disabled}
        aria-busy={busy}
      >
        {busy ? (
          <Loader2 className="size-4 animate-spin" aria-hidden="true" />
        ) : (
          <ArrowUpRight className="size-4" aria-hidden="true" />
        )}
        {busy ? "Opening secure checkout…" : label}
      </button>
      {error && (
        <p role="alert" className="mt-2 text-sm" style={{ color: "var(--hm-terracotta)" }}>
          {error}
        </p>
      )}
    </div>
  );
}

/** Opens the provider's hosted page to update the payment method (Stripe). */
export function PaymentMethodButton({ clubId, urgent }: { clubId: string; urgent?: boolean }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function open() {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const result = (await post(
        "/api/clubs/" + encodeURIComponent(clubId) + "/billing/portal"
      )) as {
        url?: string;
      };
      if (!result.url) throw new Error("This page is unavailable right now.");
      window.location.assign(result.url);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Try again");
      setBusy(false);
    }
  }
  return (
    <div>
      <button
        type="button"
        className={"hm-button " + (urgent ? "hm-button-primary" : "hm-button-secondary")}
        onClick={open}
        disabled={busy}
        aria-busy={busy}
      >
        {busy ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : null}
        {busy ? "Opening secure page…" : "Update payment method"}
      </button>
      {error && (
        <p role="alert" className="mt-2 text-sm" style={{ color: "var(--hm-terracotta)" }}>
          {error}
        </p>
      )}
    </div>
  );
}

/** Two-step cancel so a stray tap never ends a plan. */
export function CancelPlanButton({ clubId, endsLabel }: { clubId: string; endsLabel: string }) {
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();
  async function cancel() {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      await post("/api/clubs/" + encodeURIComponent(clubId) + "/billing/cancel");
      setConfirming(false);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Try again");
    } finally {
      setBusy(false);
    }
  }
  if (!confirming) {
    return (
      <button
        type="button"
        className="hm-button hm-button-secondary"
        onClick={() => setConfirming(true)}
      >
        Cancel plan
      </button>
    );
  }
  return (
    <div role="group" aria-label="Confirm cancellation" className="space-y-3">
      <p className="text-sm">
        Your plan stays active until {endsLabel}, then your club returns to Free. Nothing is
        deleted; you just can&apos;t add members past the Free limit.
      </p>
      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          className="hm-button hm-button-primary"
          onClick={cancel}
          disabled={busy}
          aria-busy={busy}
        >
          {busy ? "Cancelling…" : "Yes, cancel at period end"}
        </button>
        <button
          type="button"
          className="hm-button hm-button-secondary"
          onClick={() => setConfirming(false)}
          disabled={busy}
        >
          Keep my plan
        </button>
      </div>
      {error && (
        <p role="alert" className="text-sm" style={{ color: "var(--hm-terracotta)" }}>
          {error}
        </p>
      )}
    </div>
  );
}
