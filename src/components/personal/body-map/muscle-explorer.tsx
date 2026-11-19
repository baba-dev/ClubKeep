"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ACTIVITIES, muscleLoad, type ActivityKey, type MuscleId } from "@/lib/personal/muscle-map";
import { daysAgoLabel, type MuscleTraining } from "@/lib/personal/muscle-training";
import { BodyMap } from "./body-map";

type Source = "planned" | "logged" | "preview";
type Window = 7 | 28 | 90;
const WINDOWS: Window[] = [7, 28, 90];

export interface MuscleExplorerProps {
  /** Declared activities plus consented club visits, 0..1. */
  planned: Record<MuscleId, number>;
  /** Completed workouts per window; null when workout tracking is not available to this user. */
  logged: Record<Window, MuscleTraining> | null;
  /** Latest logged girth per muscle, already worded (e.g. "Latest chest: 96 cm (2026-10-01)"). */
  measurementNotes: Partial<Record<MuscleId, string>>;
}

export function MuscleExplorer({ planned, logged, measurementNotes }: MuscleExplorerProps) {
  const hasLogged = logged !== null && logged[28].workouts + logged[90].workouts > 0;
  const [source, setSource] = useState<Source>(hasLogged ? "logged" : "planned");
  const [days, setDays] = useState<Window>(28);
  const [lens, setLens] = useState<ActivityKey>(ACTIVITIES[0].key);

  const training = logged?.[days] ?? null;
  const lensDef = ACTIVITIES.find((a) => a.key === lens) ?? ACTIVITIES[0];

  const { load, notes, phrase } = useMemo(() => {
    const out: Partial<Record<MuscleId, string[]>> = {};
    const push = (id: MuscleId, line: string) => (out[id] = [...(out[id] ?? []), line]);
    for (const [id, line] of Object.entries(measurementNotes) as [MuscleId, string][])
      push(id, line);

    if (source === "logged" && training) {
      for (const id of Object.keys(training.load) as MuscleId[]) {
        const sets = training.setEquivalents[id];
        if (sets > 0) {
          const ago = training.lastWorkedDaysAgo[id];
          push(
            id,
            `${sets} set-equivalents in the last ${days} days` +
              (ago === undefined ? "" : `, last worked ${daysAgoLabel(ago)}.`)
          );
          const who = training.contributors[id];
          if (who?.length) push(id, `Mostly from: ${who.join(", ")}.`);
        } else {
          push(id, `Not worked in the last ${days} days.`);
        }
      }
      return {
        load: training.load,
        notes: out,
        phrase: "of your most-worked muscle in this period",
      };
    }
    if (source === "preview") {
      for (const id of lensDef.primary) push(id, `${lensDef.label} trains this as a main muscle.`);
      for (const id of lensDef.secondary) push(id, `${lensDef.label} also works this one.`);
      return {
        load: muscleLoad([{ key: lensDef.key, sessionsPerWeek: 1 }]),
        notes: out,
        phrase: `of ${lensDef.label}'s heaviest muscle`,
      };
    }
    return { load: planned, notes: out, phrase: "of your most-worked muscle" };
  }, [source, training, days, lensDef, planned, measurementNotes]);

  return (
    <div className="hm-explorer">
      <div className="hm-explorer-controls">
        <div className="hm-bodymap-tabs" role="group" aria-label="What to show">
          {(
            [
              ["planned", "Planned"],
              ["logged", "Logged"],
              ["preview", "Preview"],
            ] as [Source, string][]
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              className="hm-bodymap-tab"
              aria-pressed={source === value}
              disabled={value === "logged" && logged === null}
              onClick={() => setSource(value)}
            >
              {label}
            </button>
          ))}
        </div>

        {source === "logged" && training && (
          <div className="hm-bodymap-tabs" role="group" aria-label="Period">
            {WINDOWS.map((w) => (
              <button
                key={w}
                type="button"
                className="hm-bodymap-tab"
                aria-pressed={days === w}
                onClick={() => setDays(w)}
              >
                {w} days
              </button>
            ))}
          </div>
        )}

        {source === "preview" && (
          <label className="hm-me-field">
            Preview an activity
            <select value={lens} onChange={(e) => setLens(e.target.value as ActivityKey)}>
              {ACTIVITIES.map((a) => (
                <option key={a.key} value={a.key}>
                  {a.label}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>

      <p className="hm-small hm-explorer-summary" role="status">
        {source === "planned" &&
          "Your declared activities, plus club visits you have allowed. Tap a muscle for details."}
        {source === "preview" &&
          `What ${lensDef.label} trains. This is a preview, not your history.`}
        {source === "logged" && training && training.workouts > 0 && (
          <>
            {training.workouts} workout{training.workouts === 1 ? "" : "s"} in the last {days} days.
            {training.unmatchedExercises.length > 0 && (
              <>
                {" "}
                Not counted, because we could not place them:{" "}
                {training.unmatchedExercises.join(", ")}.
              </>
            )}
          </>
        )}
        {source === "logged" && training && training.workouts === 0 && (
          <>
            No workouts logged in the last {days} days.{" "}
            <Link href="/me/workouts">Log a workout</Link>
          </>
        )}
        {logged === null &&
          source !== "preview" &&
          " Workout-based mapping appears here once workout tracking is available for your account."}
      </p>

      <BodyMap load={load} notes={notes} loadPhrase={phrase} />
    </div>
  );
}
