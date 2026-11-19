"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { postJson } from "./post-json";

export function DataControls() {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [confirming, setConfirming] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  return (
    <section className="hm-me-card" aria-busy={pending}>
      <h2>Your data</h2>
      <p className="hm-small">
        Everything here is yours. Download a copy at any time, or erase it. Erasing keeps your
        account and club memberships.
      </p>
      <div className="hm-me-row">
        <a className="hm-button hm-button-secondary" href="/api/me/data/export" download>
          Download my data
        </a>
        {!confirming ? (
          <button
            type="button"
            className="hm-button hm-button-secondary"
            onClick={() => setConfirming(true)}
          >
            Erase my data…
          </button>
        ) : (
          <span style={{ display: "flex", gap: "0.5rem" }}>
            <button
              type="button"
              className="hm-button hm-button-primary"
              disabled={pending}
              onClick={() =>
                start(async () => {
                  const res = await postJson("/api/me/data/delete", { confirm: true });
                  setConfirming(false);
                  setMessage(
                    res.ok ? { ok: true, text: "Erased." } : { ok: false, text: res.error }
                  );
                  if (res.ok) router.refresh();
                })
              }
            >
              Yes, erase everything
            </button>
            <button
              type="button"
              className="hm-button hm-button-secondary"
              onClick={() => setConfirming(false)}
            >
              Cancel
            </button>
          </span>
        )}
      </div>
      {message && (
        <p className={message.ok ? "hm-me-ok" : "hm-me-error"} role="status">
          {message.text}
        </p>
      )}
    </section>
  );
}
