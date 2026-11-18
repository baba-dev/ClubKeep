"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { postJson } from "./post-json";

const GOALS = [
  ["", "No goal set"],
  ["STRENGTH", "Build strength"],
  ["ENDURANCE", "Build endurance"],
  ["FLEXIBILITY", "Improve flexibility"],
  ["WEIGHT_MANAGEMENT", "Manage weight"],
  ["GENERAL_FITNESS", "General fitness"],
] as const;

export interface BioFormProps {
  displayName: string | null;
  birthYear: number | null;
  heightCm: number | null;
  units: "METRIC" | "IMPERIAL";
  goal: string | null;
}

export function BioForm(props: BioFormProps) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  function submit(form: FormData) {
    const num = (k: string) => {
      const v = String(form.get(k) ?? "").trim();
      return v === "" ? null : Number(v);
    };
    const name = String(form.get("displayName") ?? "").trim();
    start(async () => {
      const res = await postJson("/api/me/bio", {
        displayName: name === "" ? null : name,
        birthYear: num("birthYear"),
        heightCm: num("heightCm"),
        units: form.get("units"),
        goal: String(form.get("goal") ?? "") || null,
      });
      setMessage(res.ok ? { ok: true, text: "Saved." } : { ok: false, text: res.error });
      if (res.ok) router.refresh();
    });
  }

  return (
    <form action={submit} className="hm-me-card" aria-busy={pending}>
      <h2>About you</h2>
      <p className="hm-small">
        Private to you. Clubs never see this. Birth year is needed before body measurements.
      </p>
      <div className="hm-me-grid">
        <label className="hm-me-field">
          Display name
          <input name="displayName" maxLength={60} defaultValue={props.displayName ?? ""} />
        </label>
        <label className="hm-me-field">
          Birth year
          <input
            name="birthYear"
            inputMode="numeric"
            min={1900}
            max={new Date().getFullYear()}
            type="number"
            defaultValue={props.birthYear ?? ""}
          />
        </label>
        <label className="hm-me-field">
          Height (cm)
          <input
            name="heightCm"
            inputMode="decimal"
            type="number"
            min={50}
            max={280}
            step="0.1"
            defaultValue={props.heightCm ?? ""}
          />
        </label>
        <label className="hm-me-field">
          Units
          <select name="units" defaultValue={props.units}>
            <option value="METRIC">Metric (kg, cm)</option>
            <option value="IMPERIAL">Imperial (lb, in)</option>
          </select>
        </label>
        <label className="hm-me-field">
          Main goal
          <select name="goal" defaultValue={props.goal ?? ""}>
            {GOALS.map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="hm-me-row">
        <button className="hm-button hm-button-primary" disabled={pending}>
          {pending ? "Saving…" : "Save"}
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
