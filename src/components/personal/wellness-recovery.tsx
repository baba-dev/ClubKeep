"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { postJson } from "./post-json";
const METRICS = [
  ["energy", "Energy"],
  ["soreness", "Muscle soreness"],
  ["stress", "Perceived stress"],
  ["satisfaction", "Sleep satisfaction"],
] as const;
export function RecoveryForm({ today }: { today: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [message, setMessage] = useState("");
  function submit(form: FormData) {
    const ratings = Object.fromEntries(
      METRICS.flatMap(([key]) => {
        const val = Number(form.get(key));
        return val ? [[key, val]] : [];
      })
    );
    start(async () => {
      const res = await postJson("/api/me/wellness/recovery", {
        localDate: String(form.get("localDate")),
        ...ratings,
        ...(String(form.get("notes") ?? "").trim()
          ? { notes: String(form.get("notes")).trim() }
          : {}),
      });
      setMessage(res.ok ? "Check-in saved." : res.error);
      if (res.ok) router.refresh();
    });
  }
  return (
    <form action={submit} className="hm-me-card" aria-busy={pending}>
      <h2>How do you feel?</h2>
      <p className="hm-small">
        An optional personal check-in, not a diagnosis or automatic readiness score.
      </p>
      <label className="hm-me-field">
        Date
        <input name="localDate" type="date" max={today} defaultValue={today} required />
      </label>
      <div className="hm-me-grid">
        {METRICS.map(([key, label]) => (
          <label key={key} className="hm-me-field">
            {label}
            <select name={key} defaultValue="">
              <option value="">Not recorded</option>
              {[1, 2, 3, 4, 5].map((n) => (
                <option key={n} value={n}>
                  {n} / 5
                </option>
              ))}
            </select>
          </label>
        ))}
      </div>
      <label className="hm-me-field">
        Notes (optional)
        <textarea name="notes" rows={2} maxLength={300} />
      </label>
      <div className="hm-me-row">
        <button disabled={pending} className="hm-button hm-button-primary">
          Save check-in
        </button>
        {message && (
          <span className="hm-small" role="status">
            {message}
          </span>
        )}
      </div>
    </form>
  );
}
