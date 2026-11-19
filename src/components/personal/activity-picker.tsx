"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ACTIVITIES, type ActivityKey } from "@/lib/personal/muscle-map";
import { postJson } from "./post-json";

export function ActivityPicker({
  initial,
}: {
  initial: { key: ActivityKey; sessionsPerWeek: number }[];
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [chosen, setChosen] = useState<Record<string, number>>(
    Object.fromEntries(initial.map((a) => [a.key, a.sessionsPerWeek]))
  );
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  function save() {
    start(async () => {
      const res = await postJson("/api/me/activities", {
        activities: Object.entries(chosen).map(([key, sessionsPerWeek]) => ({
          key,
          sessionsPerWeek,
        })),
      });
      setMessage(res.ok ? { ok: true, text: "Saved." } : { ok: false, text: res.error });
      if (res.ok) router.refresh();
    });
  }

  return (
    <section className="hm-me-card" aria-busy={pending}>
      <h2>Your activities</h2>
      <p className="hm-small">Pick what you do and how often. This colours your muscle map.</p>
      <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: "0.25rem" }}>
        {ACTIVITIES.map((a) => {
          const on = a.key in chosen;
          return (
            <li key={a.key} className="hm-me-row">
              <label className="hm-me-row" style={{ gap: "0.75rem", cursor: "pointer" }}>
                <input
                  type="checkbox"
                  checked={on}
                  style={{ width: 24, height: 24 }}
                  onChange={(e) =>
                    setChosen((cur) => {
                      const next = { ...cur };
                      if (e.target.checked) next[a.key] = 2;
                      else delete next[a.key];
                      return next;
                    })
                  }
                />
                {a.label}
              </label>
              {on && (
                <label
                  className="hm-small"
                  style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}
                >
                  <span>per week</span>
                  <input
                    type="number"
                    min={0}
                    max={14}
                    inputMode="numeric"
                    value={chosen[a.key]}
                    aria-label={`${a.label} sessions per week`}
                    className="hm-me-num"
                    onChange={(e) =>
                      setChosen((cur) => ({
                        ...cur,
                        [a.key]: Math.min(14, Math.max(0, Math.trunc(Number(e.target.value) || 0))),
                      }))
                    }
                  />
                </label>
              )}
            </li>
          );
        })}
      </ul>
      <div className="hm-me-row">
        <button
          type="button"
          className="hm-button hm-button-primary"
          onClick={save}
          disabled={pending}
        >
          {pending ? "Saving…" : "Save activities"}
        </button>
        {message && (
          <span className={message.ok ? "hm-me-ok" : "hm-me-error"} role="status">
            {message.text}
          </span>
        )}
      </div>
    </section>
  );
}
