"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { MEASUREMENT_KINDS, displayUnit, type Units } from "@/lib/personal/measurements";
import { MEASUREMENT_LABEL } from "@/lib/personal/measurement-muscles";
import { postJson } from "./post-json";

export function MeasurementForm({
  units,
  enabled,
  reason,
}: {
  units: Units;
  enabled: boolean;
  reason: string;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [kind, setKind] = useState<(typeof MEASUREMENT_KINDS)[number]>("WEIGHT");
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  if (!enabled)
    return (
      <div className="hm-me-card">
        <h2>Log a measurement</h2>
        <p className="hm-small">{reason}</p>
      </div>
    );

  function submit(form: FormData) {
    const value = Number(form.get("value"));
    const date = String(form.get("date") ?? "");
    start(async () => {
      const res = await postJson("/api/me/measurements", {
        kind,
        value,
        ...(date ? { measuredAt: new Date(date + "T12:00:00").toISOString() } : {}),
      });
      setMessage(res.ok ? { ok: true, text: "Logged." } : { ok: false, text: res.error });
      if (res.ok) router.refresh();
    });
  }

  return (
    <form action={submit} className="hm-me-card" aria-busy={pending}>
      <h2>Log a measurement</h2>
      <div className="hm-me-grid">
        <label className="hm-me-field">
          What
          <select value={kind} onChange={(e) => setKind(e.target.value as typeof kind)}>
            {MEASUREMENT_KINDS.map((k) => (
              <option key={k} value={k}>
                {MEASUREMENT_LABEL[k]}
              </option>
            ))}
          </select>
        </label>
        <label className="hm-me-field">
          Value ({displayUnit(kind, units)})
          <input name="value" type="number" inputMode="decimal" step="0.1" min="0" required />
        </label>
        <label className="hm-me-field">
          Date
          <input name="date" type="date" max={new Date().toISOString().slice(0, 10)} />
        </label>
      </div>
      <div className="hm-me-row">
        <button className="hm-button hm-button-primary" disabled={pending}>
          {pending ? "Saving…" : "Log it"}
        </button>
        {message && (
          <span className={message.ok ? "hm-me-ok" : "hm-me-error"} role="status">
            {message.text}
          </span>
        )}
      </div>
    </form>
  );
}

export function RemoveMeasurement({ id, label }: { id: string; label: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      className="hm-button hm-button-secondary"
      disabled={pending}
      aria-label={`Delete ${label}`}
      onClick={() =>
        start(async () => {
          const res = await postJson("/api/me/measurements/remove", { id });
          if (res.ok) router.refresh();
        })
      }
    >
      Delete
    </button>
  );
}
