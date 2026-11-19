"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { postJson } from "./post-json";

export function ClubSignalToggle({
  clubId,
  name,
  enabled,
  detail,
}: {
  clubId: string;
  name: string;
  enabled: boolean;
  detail: string;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  return (
    <div className="hm-me-row">
      <div>
        <strong>{name}</strong>
        <p className="hm-small" style={{ margin: 0 }}>
          {detail}
        </p>
        {error && <p className="hm-me-error">{error}</p>}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={enabled}
        aria-label={`Use my ${name} visits on my muscle map`}
        className={enabled ? "hm-button hm-button-primary" : "hm-button hm-button-secondary"}
        disabled={pending}
        onClick={() =>
          start(async () => {
            setError(null);
            const res = await postJson("/api/me/club-signals", { clubId, enabled: !enabled });
            if (res.ok) router.refresh();
            else setError(res.error);
          })
        }
      >
        {enabled ? "On" : "Off"}
      </button>
    </div>
  );
}
