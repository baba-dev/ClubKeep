import { MUSCLE_IDS, type MuscleId } from "./muscle-map";
import { trainingFromWorkouts, type WorkoutLike } from "./muscle-training";

// A day-by-day replay of the map: for each of the last N days, the training volume in the trailing
// window ending that day. Descriptive only, from the user's own completed workouts.

export interface TimelineDay {
  /** UTC calendar date of the "as of" moment, YYYY-MM-DD. */
  date: string;
  setEquivalents: Record<MuscleId, number>;
}
export interface MuscleTimeline {
  /** Oldest first, so playing the array forward replays history in order. */
  days: TimelineDay[];
  /** The largest single-muscle volume across the whole timeline; the shared scale for every day. */
  max: number;
}

const DAY_MS = 86_400_000;

export function muscleTimeline(
  workouts: readonly WorkoutLike[],
  dayCount: number,
  trailingDays: number,
  now: Date
): MuscleTimeline {
  const days: TimelineDay[] = [];
  let max = 0;
  for (let i = dayCount - 1; i >= 0; i--) {
    const asOf = new Date(now.getTime() - i * DAY_MS);
    const t = trainingFromWorkouts(workouts, trailingDays, asOf);
    for (const id of MUSCLE_IDS) max = Math.max(max, t.setEquivalents[id]);
    days.push({ date: asOf.toISOString().slice(0, 10), setEquivalents: t.setEquivalents });
  }
  return { days, max };
}
