import assert from "node:assert/strict";
import test from "node:test";
import { register } from "node:module";

// Same loader hook the integration tests use: resolves extensionless imports inside src/.
register("../integration/helpers/src-alias-hook.mjs", import.meta.url);
const { EXERCISES, matchExercise } = await import("../../src/lib/personal/exercise-catalog.ts");
const { MUSCLE_IDS } = await import("../../src/lib/personal/muscle-map.ts");
const { daysAgoLabel, trainingFromWorkouts } =
  await import("../../src/lib/personal/muscle-training.ts");

const NOW = new Date("2026-11-19T12:00:00Z");
const daysAgo = (n) => new Date(NOW.getTime() - n * 86_400_000);
const workout = (over) => ({
  endedAt: daysAgo(1),
  activityKey: "gym-lifting",
  durationMinutes: 60,
  exercises: [],
  ...over,
});
const sets = (n) => Array.from({ length: n }, () => ({ reps: 8, weightGrams: 60000 }));

test("catalogue only refers to real muscles and has unique keys and no empty keywords", () => {
  const keys = new Set();
  for (const e of EXERCISES) {
    assert.ok(!keys.has(e.key), `duplicate key ${e.key}`);
    keys.add(e.key);
    assert.ok(e.primary.length > 0, `${e.key} has no primary muscle`);
    assert.ok(
      e.keywords.every((k) => k.trim().length > 1),
      `${e.key} has an empty keyword`
    );
    for (const id of [...e.primary, ...e.secondary])
      assert.ok(MUSCLE_IDS.includes(id), `${e.key}: ${id}`);
  }
});

test("matching handles casing, punctuation and plurals", () => {
  assert.equal(matchExercise("Barbell Bench Press").key, "bench-press");
  assert.equal(matchExercise("incline  bench-press!").key, "bench-press");
  assert.equal(matchExercise("Weighted Pull-ups").key, "pull-up");
  assert.equal(matchExercise("Seated cable rows").key, "row");
});

test("the longest keyword wins, so specific lifts are not read as generic ones", () => {
  assert.equal(matchExercise("Romanian Deadlift").key, "romanian-deadlift");
  assert.equal(matchExercise("Deadlift").key, "deadlift");
  assert.equal(matchExercise("Leg curl").key, "leg-curl"); // not a biceps curl
  assert.equal(matchExercise("Hammer curl").key, "biceps-curl");
  assert.equal(matchExercise("Bulgarian split squat").key, "lunge");
  assert.equal(matchExercise("Back squat").key, "squat");
});

test("keywords must start at a word boundary and unknown names stay unmatched", () => {
  assert.equal(matchExercise("Arrow practice"), null); // "row" inside a word
  assert.equal(matchExercise("Stretching"), null);
  assert.equal(matchExercise(""), null);
});

test("sets are weighted primary 1 and secondary 0.4 and load is normalised", () => {
  const t = trainingFromWorkouts(
    [workout({ exercises: [{ name: "Bench press", sets: sets(5) }] })],
    28,
    NOW
  );
  assert.equal(t.setEquivalents.pectorals, 5);
  assert.equal(t.setEquivalents.triceps, 2);
  assert.equal(t.load.pectorals, 1);
  assert.equal(t.load.triceps, 0.4);
  assert.equal(t.load.quadriceps, 0);
  assert.deepEqual(t.contributors.pectorals, ["Bench press"]);
  assert.equal(t.lastWorkedDaysAgo.pectorals, 1);
  assert.equal(t.lastWorkedDaysAgo.quadriceps, undefined);
});

test("the time window excludes older and future workouts", () => {
  const w = [
    workout({ endedAt: daysAgo(3), exercises: [{ name: "Squat", sets: sets(4) }] }),
    workout({ endedAt: daysAgo(20), exercises: [{ name: "Bench press", sets: sets(4) }] }),
    workout({
      endedAt: new Date(NOW.getTime() + 3_600_000),
      exercises: [{ name: "Row", sets: sets(9) }],
    }),
  ];
  const week = trainingFromWorkouts(w, 7, NOW);
  assert.equal(week.workouts, 1);
  assert.equal(week.setEquivalents.pectorals, 0);
  assert.equal(week.setEquivalents.lats, 0);
  const month = trainingFromWorkouts(w, 28, NOW);
  assert.equal(month.workouts, 2);
  assert.equal(month.setEquivalents.pectorals, 4);
  assert.equal(month.lastWorkedDaysAgo.quadriceps, 3);
});

test("empty sets add nothing, timed sets scale, and unmatched names are reported", () => {
  const t = trainingFromWorkouts(
    [
      workout({
        exercises: [
          { name: "Squat", sets: [{}, { reps: 0 }] },
          { name: "Treadmill", sets: [{ durationSeconds: 1800 }] },
          { name: "Mystery machine", sets: sets(3) },
        ],
      }),
    ],
    28,
    NOW
  );
  assert.equal(t.setEquivalents.glutes, 3 + 0); // treadmill 1800s -> 3 set-equivalents; empty squat -> 0
  assert.deepEqual(t.unmatchedExercises, ["Mystery machine"]);
});

test("a workout with no usable exercises falls back to its declared activity and length", () => {
  const t = trainingFromWorkouts(
    [workout({ activityKey: "yoga", durationMinutes: 60, exercises: [] })],
    28,
    NOW
  );
  assert.equal(t.setEquivalents.abs, 6); // 60 min / 10 = 6 set-equivalents, primary weight 1
  assert.deepEqual(t.contributors.abs, ["Yoga"]);
  const short = trainingFromWorkouts(
    [workout({ activityKey: "yoga", durationMinutes: 5, exercises: [] })],
    28,
    NOW
  );
  assert.equal(short.setEquivalents.abs, 3); // minimum of 3
  const unknown = trainingFromWorkouts(
    [workout({ activityKey: "curling", exercises: [] })],
    28,
    NOW
  );
  assert.ok(Object.values(unknown.load).every((v) => v === 0));
});

test("an empty history gives an all-zero map and day labels read naturally", () => {
  const t = trainingFromWorkouts([], 90, NOW);
  assert.ok(Object.values(t.load).every((v) => v === 0));
  assert.equal(t.workouts, 0);
  assert.equal(daysAgoLabel(0), "today");
  assert.equal(daysAgoLabel(1), "yesterday");
  assert.equal(daysAgoLabel(5), "5 days ago");
});
