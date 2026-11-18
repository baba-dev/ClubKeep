import assert from "node:assert/strict";
import test from "node:test";
import {
  ACTIVITIES,
  MUSCLE_IDS,
  activitiesForMuscle,
  muscleLoad,
} from "../../src/lib/personal/muscle-map.ts";

test("every catalogue muscle id exists in the registry and has no duplicates", () => {
  for (const a of ACTIVITIES) {
    const all = [...a.primary, ...a.secondary];
    assert.equal(new Set(all).size, all.length, `${a.key} repeats a muscle`);
    for (const id of all) assert.ok(MUSCLE_IDS.includes(id), `${a.key}: unknown muscle ${id}`);
  }
});

test("every muscle is loaded by at least one activity", () => {
  for (const id of MUSCLE_IDS)
    assert.ok(activitiesForMuscle(id).length > 0, `${id} is unreachable`);
});

test("no activities gives zero load everywhere", () => {
  const load = muscleLoad([]);
  assert.ok(Object.values(load).every((v) => v === 0));
});

test("load is normalised to 0..1 and primary outranks secondary", () => {
  const load = muscleLoad([{ key: "running", sessionsPerWeek: 3 }]);
  assert.equal(Math.max(...Object.values(load)), 1);
  assert.ok(load.quadriceps > load["hip-flexors"]);
  assert.equal(load.pectorals, 0);
});

test("bad frequencies are clamped and unknown keys ignored", () => {
  const load = muscleLoad([
    { key: "yoga", sessionsPerWeek: Number.NaN },
    { key: "nope", sessionsPerWeek: 5 },
    { key: "swimming", sessionsPerWeek: 999 },
  ]);
  assert.equal(load.lats, 1);
  assert.equal(load["lower-back"], 0);
});
