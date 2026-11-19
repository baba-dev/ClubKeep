"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { postJson } from "./post-json";

export function SleepForm() {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [message, setMessage] = useState("");
  const [requestId, setRequestId] = useState(() => crypto.randomUUID());
  function submit(data: FormData) {
    const startedAt = new Date(String(data.get("start")));
    const endedAt = new Date(String(data.get("end")));
    if (!Number.isFinite(startedAt.getTime()) || !Number.isFinite(endedAt.getTime())) {
      setMessage("Choose your sleep and wake times.");
      return;
    }
    const quality = Number(data.get("quality"));
    start(async () => {
      const res = await postJson("/api/me/wellness/sleep", {
        requestId,
        startedAt: startedAt.toISOString(),
        endedAt: endedAt.toISOString(),
        ...(quality ? { quality } : {}),
        isNap: data.get("nap") === "on",
      });
      setMessage(res.ok ? "Sleep recorded." : res.error);
      if (res.ok) {
        setRequestId(crypto.randomUUID());
        router.refresh();
      }
    });
  }
  return (
    <form action={submit} className="hm-me-card" aria-busy={pending}>
      <h2>Add sleep</h2>
      <p className="hm-small">
        Manual sleep journal. Duration is calculated from the selected times, including overnight.
      </p>
      <div className="hm-me-grid">
        <label className="hm-me-field">
          Fell asleep
          <input type="datetime-local" name="start" required />
        </label>
        <label className="hm-me-field">
          Woke up
          <input type="datetime-local" name="end" required />
        </label>
        <label className="hm-me-field">
          How did it feel?
          <select name="quality" defaultValue="">
            <option value="">Not rated</option>
            {[1, 2, 3, 4, 5].map((n) => (
              <option key={n} value={n}>
                {n} / 5
              </option>
            ))}
          </select>
        </label>
      </div>
      <label className="hm-me-row">
        <span>It was a nap</span>
        <input type="checkbox" name="nap" />
      </label>
      <div className="hm-me-row">
        <button disabled={pending} className="hm-button hm-button-primary">
          Log sleep
        </button>
        {message && (
          <span role="status" className="hm-small">
            {message}
          </span>
        )}
      </div>
    </form>
  );
}

export function RemoveSleep({ id }: { id: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [message, setMessage] = useState("");
  return (
    <div className="hm-me-row">
      <button
        type="button"
        disabled={pending}
        className="hm-button hm-button-secondary"
        onClick={() =>
          start(async () => {
            const res = await postJson("/api/me/wellness/sleep/remove", { id });
            setMessage(res.ok ? "Removed." : res.error);
            if (res.ok) router.refresh();
          })
        }
      >
        Remove
      </button>
      {message && (
        <span role="status" className="hm-small">
          {message}
        </span>
      )}
    </div>
  );
}
