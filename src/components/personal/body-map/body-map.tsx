"use client";

import { useState, type CSSProperties, type KeyboardEvent } from "react";
import {
  MUSCLE_GROUPS,
  activitiesForMuscle,
  type MuscleId,
  type MuscleSide,
} from "@/lib/personal/muscle-map";
import {
  BACK_LINES,
  BACK_REGIONS,
  BODY_VIEWBOX,
  DECOR_CENTER,
  DECOR_LEFT_BACK,
  DECOR_LEFT_FRONT,
  FRONT_LINES,
  FRONT_REGIONS,
} from "./body-paths";
import "./body-map.css";

const MIRROR = "translate(200 0) scale(-1 1)";
const SIDES: { side: MuscleSide; label: string }[] = [
  { side: "front", label: "Front" },
  { side: "back", label: "Back" },
];

export interface BodyMapProps {
  /** Load per muscle on a 0..1 scale (see muscleLoad). Missing muscles count as 0. */
  load: Partial<Record<MuscleId, number>>;
  /** Optional short text per muscle, e.g. a recent girth measurement, shown in the detail panel. */
  notes?: Partial<Record<MuscleId, string>>;
}

export function BodyMap({ load, notes }: BodyMapProps) {
  const [side, setSide] = useState<MuscleSide>("front");
  const [selected, setSelected] = useState<MuscleId | null>(null);

  const regions = side === "front" ? FRONT_REGIONS : BACK_REGIONS;
  const lines = side === "front" ? FRONT_LINES : BACK_LINES;
  const decor = side === "front" ? DECOR_LEFT_FRONT : DECOR_LEFT_BACK;
  const muscles = MUSCLE_GROUPS.filter((m) => m.side === side);
  const percent = (id: MuscleId) => Math.round((load[id] ?? 0) * 100);

  function choose(id: MuscleId) {
    setSelected((cur) => (cur === id ? null : id));
  }
  function onKey(e: KeyboardEvent, id: MuscleId) {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      choose(id);
    }
  }

  // Each half is drawn once and mirrored; both halves select the same muscle group.
  const half = (flip: boolean) => (
    <g transform={flip ? MIRROR : undefined} key={flip ? "r" : "l"}>
      {decor.map((d) => (
        <path key={d} d={d} className="hm-bodymap-decor" />
      ))}
      {muscles.map((m) => (
        <g
          key={m.id}
          className="hm-bodymap-muscle"
          role="button"
          tabIndex={flip ? -1 : 0}
          aria-hidden={flip || undefined}
          aria-pressed={selected === m.id}
          aria-label={`${m.label}, ${percent(m.id)} percent training load`}
          style={{ "--load": load[m.id] ?? 0 } as CSSProperties}
          onClick={() => choose(m.id)}
          onKeyDown={(e) => onKey(e, m.id)}
        >
          {(regions[m.id] ?? []).map((d) => (
            <path key={d} d={d} />
          ))}
        </g>
      ))}
      {Object.values(lines)
        .flat()
        .map((d) => (
          <path key={d} d={d} className="hm-bodymap-line" />
        ))}
    </g>
  );

  const halo = (flip: boolean) => (
    <g transform={flip ? MIRROR : undefined} key={flip ? "hr" : "hl"} aria-hidden>
      {[...decor, ...Object.values(regions).flat()].map((d) => (
        <path key={d} d={d} className="hm-bodymap-halo" />
      ))}
    </g>
  );

  const selectedMuscle = selected ? MUSCLE_GROUPS.find((m) => m.id === selected) : undefined;

  return (
    <section className="hm-bodymap" aria-label="Muscle map">
      <div className="hm-bodymap-tabs" role="group" aria-label="Body side">
        {SIDES.map((s) => (
          <button
            key={s.side}
            type="button"
            className="hm-bodymap-tab"
            aria-pressed={side === s.side}
            onClick={() => {
              setSide(s.side);
              setSelected(null);
            }}
          >
            {s.label}
          </button>
        ))}
      </div>

      <svg
        className="hm-bodymap-figure"
        viewBox={BODY_VIEWBOX}
        role="group"
        aria-label={`${side} view`}
      >
        {halo(false)}
        {halo(true)}
        {DECOR_CENTER.map((d) => (
          <path key={d} d={d} className="hm-bodymap-decor" aria-hidden />
        ))}
        {half(false)}
        {half(true)}
      </svg>

      <div className="hm-bodymap-legend" aria-hidden>
        <span>Lighter load</span>
        <span className="hm-bodymap-ramp" />
        <span>Heavier load</span>
      </div>

      <div className="hm-bodymap-detail" aria-live="polite">
        {selectedMuscle ? (
          <>
            <h3>{selectedMuscle.label}</h3>
            <p>Training load {percent(selectedMuscle.id)}% of your most-worked muscle.</p>
            {notes?.[selectedMuscle.id] ? <p>{notes[selectedMuscle.id]}</p> : null}
            <ul>
              {activitiesForMuscle(selectedMuscle.id).map((a) => (
                <li key={a.key}>
                  {a.label} <span>({a.role})</span>
                </li>
              ))}
            </ul>
          </>
        ) : (
          <p>Tap a muscle to see which of your activities train it.</p>
        )}
      </div>

      <details className="hm-bodymap-all">
        <summary>All {side} muscles as a list</summary>
        <ul>
          {muscles.map((m) => (
            <li key={m.id}>
              <span>{m.label}</span>
              <span>{percent(m.id)}%</span>
            </li>
          ))}
        </ul>
      </details>
    </section>
  );
}
