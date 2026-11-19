"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ACTIVITIES } from "@/lib/personal/muscle-map";
import { postJson } from "./post-json";

export function WorkoutLogForm() {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [message, setMessage] = useState("");
  const [requestId, setRequestId] = useState(() => crypto.randomUUID());
  function submit(form: FormData) {
    const durationMinutes = Number(form.get("duration"));
    const endedAt = new Date();
    const startedAt = new Date(endedAt.getTime() - durationMinutes * 60000);
    const name = String(form.get("exercise") ?? "").trim();
    const reps = Number(form.get("reps"));
    const weight = Number(form.get("weight"));
    const exercises = name
      ? [{ name, sets: [{ ...(reps > 0 ? { reps } : {}), ...(weight > 0 ? { weightGrams: Math.round(weight * 1000) } : {}) }] }]
      : [];
    start(async () => {
      const result = await postJson("/api/me/wellness/workouts", {
        requestId, title: String(form.get("title")), activityKey: String(form.get("activity")),
        durationMinutes, startedAt: startedAt.toISOString(), endedAt: endedAt.toISOString(),
        exercises,
      });
      setMessage(result.ok ? "Workout saved." : result.error);
      if (result.ok) { setRequestId(crypto.randomUUID()); router.refresh(); }
    });
  }
  return <form action={submit} className="hm-me-card" aria-busy={pending}>
    <h2>Log a completed workout</h2>
    <p className="hm-small">Actual completed sessions count toward goals. Activities you simply select in your profile do not.</p>
    <label className="hm-me-field">Session title<input required name="title" maxLength={100} placeholder="Evening movement" /></label>
    <div className="hm-me-grid">
      <label className="hm-me-field">Activity<select name="activity">{ACTIVITIES.map(a => <option key={a.key} value={a.key}>{a.label}</option>)}</select></label>
      <label className="hm-me-field">Minutes<input name="duration" type="number" min={1} max={1440} defaultValue={30} required /></label>
    </div>
    <fieldset className="hm-me-card"><legend>Optional strength details</legend>
      <label className="hm-me-field">Exercise<input name="exercise" maxLength={100} placeholder="Squat" /></label>
      <div className="hm-me-grid">
        <label className="hm-me-field">Reps<input name="reps" type="number" min={0} max={1000} /></label>
        <label className="hm-me-field">Weight (kg)<input name="weight" type="number" min={0} max={1000} step="0.1" /></label>
      </div>
    </fieldset>
    <div className="hm-me-row"><button className="hm-button hm-button-primary" disabled={pending}>Save workout</button>
      {message && <span role="status" className="hm-small">{message}</span>}</div>
  </form>;
}
export function RemoveWorkout({ id }: { id: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [message, setMessage] = useState("");
  return <div className="hm-me-row">
    <button type="button" className="hm-button hm-button-secondary" disabled={pending}
      onClick={() => start(async () => {
        const res = await postJson("/api/me/wellness/workouts/remove", { id });
        setMessage(res.ok ? "Workout deleted." : res.error);
        if (res.ok) router.refresh();
      })}>Delete</button>
    {message && <span role="status" className="hm-small">{message}</span>}
  </div>;
}
