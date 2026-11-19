"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ACTIVITIES, muscleLoad, type ActivityKey, type MuscleId } from "@/lib/personal/muscle-map";
import { MUSCLE_IDS } from "@/lib/personal/muscle-map";
import { loadBand, recencyBand, type Band, type ColorMode } from "@/lib/personal/load-bands";
import type { MuscleTimeline } from "@/lib/personal/muscle-timeline";
import { daysAgoLabel, type MuscleTraining } from "@/lib/personal/muscle-training";
import { BodyMap } from "./body-map";

type Source = "planned" | "logged" | "preview";
type Window = 7 | 28 | 90;
const WINDOWS: Window[] = [7, 28, 90];
const REPLAY_STEP_MS = 650;

export interface MuscleExplorerProps {
  /** Declared activities plus consented club visits, 0..1. */
  planned: Record<MuscleId, number>;
  /** Completed workouts per window; null when workout tracking is not available to this user. */
  logged: Record<Window, MuscleTraining> | null;
  /** Day-by-day trailing-week volume for the replay; null with `logged`. */
  timeline: MuscleTimeline | null;
  /** Latest logged girth per muscle, already worded (e.g. "Latest chest: 96 cm (2026-10-01)"). */
  measurementNotes: Partial<Record<MuscleId, string>>;
}

function Segmented<T extends string | number>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: { value: T; label: string; disabled?: boolean }[];
  onChange: (v: T) => void;
}) {
  return (
    <div className="hm-bodymap-tabs" role="group" aria-label={label}>
      {options.map((o) => (
        <button
          key={String(o.value)}
          type="button"
          className="hm-bodymap-tab"
          aria-pressed={value === o.value}
          disabled={o.disabled}
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function MuscleExplorer({
  planned,
  logged,
  timeline,
  measurementNotes,
}: MuscleExplorerProps) {
  const hasLogged = logged !== null && logged[28].workouts + logged[90].workouts > 0;
  const [source, setSource] = useState<Source>(hasLogged ? "logged" : "planned");
  const [days, setDays] = useState<Window>(28);
  const [colorMode, setColorMode] = useState<ColorMode>("volume");
  const [lens, setLens] = useState<ActivityKey>(ACTIVITIES[0].key);
  // Replay: null = off. Stepping through days is user-initiated, so it works under reduced motion too.
  const [replay, setReplay] = useState<{ index: number; playing: boolean } | null>(null);

  const training = logged?.[days] ?? null;
  const lensDef = ACTIVITIES.find((a) => a.key === lens) ?? ACTIVITIES[0];
  const canReplay = source === "logged" && timeline !== null && timeline.max > 0;
  const replayDay = replay && timeline ? timeline.days[replay.index] : null;

  useEffect(() => {
    if (!replay?.playing || !timeline) return;
    const id = window.setInterval(() => {
      setReplay((cur) => {
        if (!cur) return cur;
        if (cur.index >= timeline.days.length - 1) return { index: cur.index, playing: false };
        return { index: cur.index + 1, playing: true };
      });
    }, REPLAY_STEP_MS);
    return () => window.clearInterval(id);
  }, [replay?.playing, timeline]);

  const view = useMemo(() => {
    const out: Partial<Record<MuscleId, string[]>> = {};
    const push = (id: MuscleId, line: string) => (out[id] = [...(out[id] ?? []), line]);
    for (const [id, line] of Object.entries(measurementNotes) as [MuscleId, string][])
      push(id, line);

    if (source === "logged" && replayDay && timeline) {
      const load = {} as Record<MuscleId, number>;
      for (const id of MUSCLE_IDS) {
        const sets = replayDay.setEquivalents[id];
        load[id] = timeline.max === 0 ? 0 : Math.round((sets / timeline.max) * 1000) / 1000;
        push(
          id,
          sets > 0
            ? `${sets} set-equivalents in the 7 days to ${replayDay.date}.`
            : `Not worked in the 7 days to ${replayDay.date}.`
        );
      }
      return {
        load,
        bands: undefined,
        mode: "volume" as ColorMode,
        notes: out,
        phrase: "of the busiest muscle in these four weeks",
      };
    }
    if (source === "logged" && training) {
      const bands = {} as Record<MuscleId, Band>;
      for (const id of MUSCLE_IDS) {
        bands[id] =
          colorMode === "recent"
            ? recencyBand(training.lastWorkedDaysAgo[id])
            : loadBand(training.load[id]);
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
        bands,
        mode: colorMode,
        notes: out,
        phrase: "of your most-worked muscle in this period",
      };
    }
    if (source === "preview") {
      for (const id of lensDef.primary) push(id, `${lensDef.label} trains this as a main muscle.`);
      for (const id of lensDef.secondary) push(id, `${lensDef.label} also works this one.`);
      return {
        load: muscleLoad([{ key: lensDef.key, sessionsPerWeek: 1 }]),
        bands: undefined,
        mode: "volume" as ColorMode,
        notes: out,
        phrase: `of ${lensDef.label}'s heaviest muscle`,
      };
    }
    return {
      load: planned,
      bands: undefined,
      mode: "volume" as ColorMode,
      notes: out,
      phrase: "of your most-worked muscle",
    };
  }, [source, training, days, colorMode, lensDef, planned, measurementNotes, replayDay, timeline]);

  function chooseSource(next: Source) {
    setSource(next);
    setReplay(null);
  }

  return (
    <div className="hm-explorer">
      <div className="hm-explorer-controls">
        <Segmented<Source>
          label="What to show"
          value={source}
          onChange={chooseSource}
          options={[
            { value: "planned", label: "Planned" },
            { value: "logged", label: "Logged", disabled: logged === null },
            { value: "preview", label: "Preview" },
          ]}
        />

        {source === "logged" && training && !replay && (
          <>
            <Segmented<Window>
              label="Period"
              value={days}
              onChange={setDays}
              options={WINDOWS.map((w) => ({ value: w, label: `${w} days` }))}
            />
            <Segmented<ColorMode>
              label="Colour by"
              value={colorMode}
              onChange={setColorMode}
              options={[
                { value: "volume", label: "How much" },
                { value: "recent", label: "Last worked" },
              ]}
            />
          </>
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
        {source === "logged" &&
          replayDay &&
          "Replaying the last four weeks. Each day shows the week of training up to that day."}
        {source === "logged" && !replayDay && training && training.workouts > 0 && (
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
        {source === "logged" && !replayDay && training && training.workouts === 0 && (
          <>
            No workouts logged in the last {days} days.{" "}
            <Link href="/me/workouts">Log a workout</Link>
          </>
        )}
        {logged === null &&
          source !== "preview" &&
          " Workout-based mapping appears here once workout tracking is available for your account."}
      </p>

      <BodyMap
        load={view.load}
        bands={view.bands}
        mode={view.mode}
        notes={view.notes}
        loadPhrase={view.phrase}
      />

      {canReplay && timeline && (
        <section className="bm-replay" aria-label="Replay the last four weeks">
          {!replay ? (
            <button
              type="button"
              className="hm-button hm-button-secondary"
              onClick={() => setReplay({ index: 0, playing: true })}
            >
              Replay the last 4 weeks
            </button>
          ) : (
            <>
              <div className="bm-replay-row">
                <button
                  type="button"
                  className="hm-button hm-button-primary"
                  onClick={() =>
                    setReplay((cur) =>
                      !cur
                        ? cur
                        : cur.playing
                          ? { ...cur, playing: false }
                          : {
                              index: cur.index >= timeline.days.length - 1 ? 0 : cur.index,
                              playing: true,
                            }
                    )
                  }
                >
                  {replay.playing ? "Pause" : "Play"}
                </button>
                <input
                  type="range"
                  min={0}
                  max={timeline.days.length - 1}
                  value={replay.index}
                  aria-label="Day to show"
                  aria-valuetext={replayDay ? `7 days to ${replayDay.date}` : undefined}
                  onChange={(e) => setReplay({ index: Number(e.target.value), playing: false })}
                />
                <span className="bm-replay-date" aria-hidden>
                  {replayDay?.date}
                </span>
              </div>
              <button
                type="button"
                className="hm-button hm-button-secondary"
                onClick={() => setReplay(null)}
              >
                Back to now
              </button>
            </>
          )}
        </section>
      )}
    </div>
  );
}
