"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { postJson } from "@/components/personal/post-json";

type Connection = {
  id: string; label: string; grantedTypes: string[];
  lastSyncAt: string | null; revokedAt: string | null; tokenExpiresAt: string;
};

export function HealthConnectControls({ connections }: { connections: Connection[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [code, setCode] = useState("");
  const [expiration, setExpiration] = useState("");
  const [message, setMessage] = useState("");
  const [confirmErase, setConfirmErase] = useState(false);
  const active = connections.filter(c => !c.revokedAt && new Date(c.tokenExpiresAt) > new Date());
  function pair() {
    start(async () => {
      setCode(""); setExpiration(""); setMessage("");
      try {
        const response = await fetch("/api/me/connections/health-connect/pair", {
          method: "POST", credentials: "same-origin", cache: "no-store",
          headers: { "content-type": "application/json" }, body: "{}",
        });
        const result = await response.json() as { pairCode?: string; expiresAt?: string; error?: string };
        if (!response.ok || !result.pairCode) {
          setMessage(result.error ?? "Unable to create pairing code."); return;
        }
        setCode(result.pairCode);
        setExpiration(result.expiresAt ?? "");
        setMessage("This code pairs one device and expires after 10 minutes. Keep it private.");
      } catch {
        setMessage("Connection failed. Try again.");
      }
    });
  }
  function revoke(id: string) {
    start(async () => {
      const result = await postJson("/api/me/connections/health-connect/revoke", { id });
      setMessage(result.ok ? "Device revoked. Existing imports remain until you delete them." : result.error);
      if (result.ok) router.refresh();
    });
  }
  function purge() {
    start(async () => {
      const result = await postJson("/api/me/connections/health-connect/purge", { confirm: true });
      setMessage(result.ok ? "Connections revoked and imported copies deleted." : result.error);
      setConfirmErase(false);
      setCode(""); setExpiration("");
      if (result.ok) router.refresh();
    });
  }
  return (
    <>
      <section className="hm-me-card">
        <h2>Pair your Android companion</h2>
        <p className="hm-small">
          Sign in to ClubKeep on the web, then copy this one-time code into the native Android companion.
          The companion is not available through Play yet; initial installation requires a reviewed test build.
          Health Connect permissions are requested only on your phone.
        </p>
        <button type="button" className="hm-button hm-button-primary"
          disabled={pending || active.length >= 4} onClick={pair}>
          {pending ? "Working…" : "Create one-time pairing code"}
        </button>
        {code && <div className="hm-me-card" aria-label="One-time secret pairing code">
          <p className="hm-small">One-time pairing code — never share it publicly</p>
          <code className="hm-hc-pair-code">{code}</code>
          <div className="hm-me-row">
            <button className="hm-button hm-button-secondary" type="button" onClick={() =>
              navigator.clipboard.writeText(code).then(() => setMessage("Code copied.")).catch(() => setMessage("Select and copy the code manually."))}>
              Copy code
            </button>
            {expiration && <span className="hm-small">Expires {new Date(expiration).toLocaleTimeString()}</span>}
          </div>
        </div>}
      </section>
      <section className="hm-me-card">
        <h2>Connected Android devices</h2>
        <p className="hm-small">Permission categories below are last reported by each device; manage actual grants in Android Health Connect settings.</p>
        {connections.length === 0 ? <p className="hm-small">No paired devices.</p> :
          connections.map(c => <article key={c.id} className="hm-me-card">
            <div className="hm-me-row"><strong>{c.label}</strong>
              <span className="hm-small">{c.revokedAt ? "Disconnected" :
                new Date(c.tokenExpiresAt) < new Date() ? "Re-pair required" : "Linked"}</span></div>
            <p className="hm-small">Last successful sync: {c.lastSyncAt ? new Date(c.lastSyncAt).toLocaleString() : "Not yet synced"}</p>
            <p className="hm-small">Last reported categories: {c.grantedTypes.length ? c.grantedTypes.join(", ") : "None"}</p>
            {!c.revokedAt && <button className="hm-button hm-button-secondary" disabled={pending}
              onClick={() => revoke(c.id)}>Revoke this device</button>}
          </article>)}
      </section>
      <section className="hm-me-card" aria-label="Delete imported data">
        <h2>Remove imported copies</h2>
        <p className="hm-small">Disconnects every Health Connect device, then permanently erases its imported records from ClubKeep Personal. It does not delete the originals stored on your phone. Manual entries and club membership remain intact.</p>
        {!confirmErase ?
          <button type="button" className="hm-button hm-button-secondary" onClick={() => setConfirmErase(true)}>
            Erase Health Connect copies…
          </button> :
          <div className="hm-me-row">
            <button type="button" className="hm-button hm-button-primary" disabled={pending} onClick={purge}>Yes, disconnect and erase</button>
            <button type="button" className="hm-button hm-button-secondary" onClick={() => setConfirmErase(false)}>Cancel</button>
          </div>}
      </section>
      {message && <p className="hm-small" role="status">{message}</p>}
    </>
  );
}
