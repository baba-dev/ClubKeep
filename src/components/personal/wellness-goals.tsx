"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { postJson } from "@/components/personal/post-json";

export function GoalForm() {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [message, setMessage] = useState("");
  function submit(data: FormData) {
    const metric = String(data.get("metric"));
    const title = String(data.get("title"));
    const cadence = String(data.get("cadence"));
    const target = Number(data.get("target"));
    start(async () => {
      const result = await postJson("/api/me/wellness/goals", { metric, title, cadence, target });
      setMessage(result.ok ? "Goal added." : result.error);
      if (result.ok) router.refresh();
    });
  }
  return (
    <form action={submit} className="hm-me-card" aria-busy={pending}>
      <h2>Set a personal goal</h2>
      <p className="hm-small">
        Only completed sessions and logged observations count toward your goal.
      </p>
      <label className="hm-me-field">
        Goal name
        <input name="title" maxLength={80} required placeholder="Move three times a week" />
      </label>
      <div className="hm-me-grid">
        <label className="hm-me-field">
          Track
          <select name="metric" defaultValue="WORKOUT_SESSIONS">
            <option value="WORKOUT_SESSIONS">Completed workouts</option>
            <option value="ACTIVITY_MINUTES">Activity minutes</option>
            <option value="SLEEP_MINUTES">Logged sleep minutes</option>
            <option value="HYDRATION_ML">Logged water (mL)</option>
          </select>
        </label>
        <label className="hm-me-field">
          Cadence
          <select name="cadence">
            <option value="WEEKLY">Each week</option>
            <option value="TOTAL">Since goal creation</option>
          </select>
        </label>
        <label className="hm-me-field">
          Target
          <input name="target" type="number" min={1} max={10000000} defaultValue={3} required />
        </label>
      </div>
      <button disabled={pending} className="hm-button hm-button-primary">
        Add goal
      </button>
      {message && (
        <span role="status" className="hm-small">
          {message}
        </span>
      )}
    </form>
  );
}

export function GoalActions({ id, status }: { id: string; status: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [message, setMessage] = useState("");
  function action(path: string, body: object) {
    start(async () => {
      const res = await postJson(path, body);
      setMessage(res.ok ? "Updated." : res.error);
      if (res.ok) router.refresh();
    });
  }
  return (
    <div className="hm-me-row">
      <button
        className="hm-button hm-button-secondary"
        type="button"
        disabled={pending}
        onClick={() =>
          action("/api/me/wellness/goals/change", {
            id,
            status: status === "ACTIVE" ? "PAUSED" : "ACTIVE",
          })
        }
      >
        {status === "ACTIVE" ? "Pause" : "Resume"}
      </button>
      <button
        className="hm-button hm-button-secondary"
        type="button"
        disabled={pending}
        onClick={() => action("/api/me/wellness/goals/change", { id, status: "ARCHIVED" })}
      >
        Archive
      </button>
      {message && (
        <span className="hm-small" role="status">
          {message}
        </span>
      )}
    </div>
  );
}
