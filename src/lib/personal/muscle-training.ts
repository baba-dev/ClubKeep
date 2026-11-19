import { matchExercise } from "./exercise-catalog";
import {
  ACTIVITIES,
  MUSCLE_IDS,
  PRIMARY_WEIGHT,
  SECONDARY_WEIGHT,
  type MuscleId,
} from "./muscle-map";

// Turns a user's own completed workouts into a per-muscle picture over a time window.
// Descriptive only: counts of work done, never advice, recovery scoring or a health judgement.

export interface WorkoutSet {
  reps?: number | null;
  weightGrams?: number | null;
  durationSeconds?: number | null;
  distanceMeters?: number | null;
}
export interface WorkoutLike {
  endedAt: Date;
  activityKey: string;
  durationMinutes: number;
  exercises: { name: string; sets: WorkoutSet[] }[];
}
export interface MuscleTraining {
  /** 0..1, relative to the most-worked muscle in this window. */
  load: Record<MuscleId, number>;
  /** Weighted set-equivalents, one decimal. A secondary muscle counts 0.4 of a set. */
  setEquivalents: Record<MuscleId, number>;
  /** Whole days since the muscle last got any work; absent when not worked in the window. */
  lastWorkedDaysAgo: Partial<Record<MuscleId, number>>;
  /** Up to three exercise or activity names that contributed most, biggest first. */
  contributors: Partial<Record<MuscleId, string[]>>;
  workouts: number;
  /** Logged exercise names the catalogue could not place; shown to the user, never guessed. */
  unmatchedExercises: string[];
}

const DAY_MS = 86_400_000;
/** A workout with no recognisable exercises counts as one set-equivalent per 10 minutes, at least 3. */
const FALLBACK_MINUTES_PER_SET = 10;
const FALLBACK_MIN_SETS = 3;
/** A timed set with no reps counts one set-equivalent per 10 minutes, at least 1. */
const TIMED_SECONDS_PER_SET = 600;
const MAX_UNMATCHED = 8;

function setCount(sets: WorkoutSet[]): number {
  let total = 0;
  for (const s of sets) {
    const reps = s.reps ?? 0;
    const grams = s.weightGrams ?? 0;
    const secs = s.durationSeconds ?? 0;
    const metres = s.distanceMeters ?? 0;
    if (reps > 0 || grams > 0) total += 1;
    else if (secs > 0) total += Math.max(1, Math.round(secs / TIMED_SECONDS_PER_SET));
    else if (metres > 0) total += 1;
  }
  return total;
}

export function trainingFromWorkouts(
  workouts: readonly WorkoutLike[],
  days: number,
  now: Date
): MuscleTraining {
  const since = now.getTime() - days * DAY_MS;
  const raw = Object.fromEntries(MUSCLE_IDS.map((id) => [id, 0])) as Record<MuscleId, number>;
  const last: Partial<Record<MuscleId, number>> = {};
  const by = new Map<MuscleId, Map<string, number>>();
  const unmatched = new Set<string>();
  let counted = 0;

  const add = (id: MuscleId, amount: number, name: string, endedAt: Date) => {
    if (amount <= 0) return;
    raw[id] += amount;
    const ago = Math.max(0, Math.floor((now.getTime() - endedAt.getTime()) / DAY_MS));
    last[id] = Math.min(last[id] ?? ago, ago);
    const names = by.get(id) ?? new Map<string, number>();
    names.set(name, (names.get(name) ?? 0) + amount);
    by.set(id, names);
  };

  for (const w of workouts) {
    const t = w.endedAt.getTime();
    if (t < since || t > now.getTime()) continue;
    counted += 1;
    let placed = false;
    for (const ex of w.exercises) {
      const def = matchExercise(ex.name);
      if (!def) {
        if (unmatched.size < MAX_UNMATCHED) unmatched.add(ex.name.trim());
        continue;
      }
      const sets = setCount(ex.sets);
      if (sets === 0) continue;
      placed = true;
      for (const id of def.primary) add(id, sets * PRIMARY_WEIGHT, def.label, w.endedAt);
      for (const id of def.secondary) add(id, sets * SECONDARY_WEIGHT, def.label, w.endedAt);
    }
    if (!placed) {
      // No exercise detail we can use: fall back to the workout's declared activity and its length.
      const activity = ACTIVITIES.find((a) => a.key === w.activityKey);
      if (activity) {
        const sets = Math.max(
          FALLBACK_MIN_SETS,
          Math.round(w.durationMinutes / FALLBACK_MINUTES_PER_SET)
        );
        for (const id of activity.primary)
          add(id, sets * PRIMARY_WEIGHT, activity.label, w.endedAt);
        for (const id of activity.secondary)
          add(id, sets * SECONDARY_WEIGHT, activity.label, w.endedAt);
      }
    }
  }

  const max = Math.max(0, ...Object.values(raw));
  const load = Object.fromEntries(
    MUSCLE_IDS.map((id) => [id, max === 0 ? 0 : Math.round((raw[id] / max) * 1000) / 1000])
  ) as Record<MuscleId, number>;
  const setEquivalents = Object.fromEntries(
    MUSCLE_IDS.map((id) => [id, Math.round(raw[id] * 10) / 10])
  ) as Record<MuscleId, number>;
  const contributors: Partial<Record<MuscleId, string[]>> = {};
  for (const [id, names] of by) {
    contributors[id] = [...names]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([n]) => n);
  }
  return {
    load,
    setEquivalents,
    lastWorkedDaysAgo: last,
    contributors,
    workouts: counted,
    unmatchedExercises: [...unmatched],
  };
}

export function daysAgoLabel(days: number): string {
  if (days <= 0) return "today";
  if (days === 1) return "yesterday";
  return `${days} days ago`;
}
