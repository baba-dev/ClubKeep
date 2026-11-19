import assert from "node:assert/strict";
import test from "node:test";
import { register } from "node:module";

register("../integration/helpers/src-alias-hook.mjs", import.meta.url);
const bands = await import("../../src/lib/personal/load-bands.ts");
const { muscleTimeline } = await import("../../src/lib/personal/muscle-timeline.ts");
const { MUSCLE_IDS } = await import("../../src/lib/personal/muscle-map.ts");

test("volume bands split at 25, 50 and 75 percent and treat bad input as not worked", () => {
  assert.equal(bands.loadBand(0), 0);
  assert.equal(bands.loadBand(-1), 0);
  assert.equal(bands.loadBand(Number.NaN), 0);
  assert.equal(bands.loadBand(0.01), 1);
  assert.equal(bands.loadBand(0.25), 1);
  assert.equal(bands.loadBand(0.26), 2);
  assert.equal(bands.loadBand(0.5), 2);
  assert.equal(bands.loadBand(0.75), 3);
  assert.equal(bands.loadBand(0.751), 4);
  assert.equal(bands.loadBand(1), 4);
});

test("recency bands run from today down to not in this period", () => {
  assert.equal(bands.recencyBand(undefined), 0);
  assert.equal(bands.recencyBand(0), 4);
  assert.equal(bands.recencyBand(1), 3);
  assert.equal(bands.recencyBand(2), 3);
  assert.equal(bands.recencyBand(3), 2);
  assert.equal(bands.recencyBand(6), 2);
  assert.equal(bands.recencyBand(7), 1);
  assert.equal(bands.recencyBand(60), 1);
});

test("every band has a distinct text label so colour is never the only signal", () => {
  for (const list of [bands.VOLUME_BANDS, bands.RECENCY_BANDS]) {
    assert.equal(list.length, 5);
    assert.equal(new Set(list.map((b) => b.label)).size, 5);
    list.forEach((b, i) => assert.equal(b.band, i));
  }
  assert.equal(bands.bandInfo("volume", 4).label, "Peak");
  assert.equal(bands.bandInfo("recent", 4).label, "Today");
});

const NOW = new Date("2026-11-19T12:00:00Z");
const ago = (d) => new Date(NOW.getTime() - d * 86_400_000);
const bench = (d) => ({
  endedAt: ago(d),
  activityKey: "gym-lifting",
  durationMinutes: 60,
  exercises: [
    {
      name: "Bench press",
      sets: [
        { reps: 8, weightGrams: 60000 },
        { reps: 8, weightGrams: 60000 },
      ],
    },
  ],
});

test("the timeline is oldest first, ends today and shares one scale", () => {
  const t = muscleTimeline([bench(10), bench(2)], 28, 7, NOW);
  assert.equal(t.days.length, 28);
  assert.equal(t.days[27].date, "2026-11-19");
  assert.equal(t.days[0].date, "2026-10-23");
  assert.ok(t.max >= 2);
  for (const d of t.days)
    assert.deepEqual(Object.keys(d.setEquivalents).sort(), [...MUSCLE_IDS].sort());
});

test("a workout shows in the trailing window for exactly the days that include it", () => {
  const t = muscleTimeline([bench(10)], 28, 7, NOW);
  const chest = t.days.map((d) => d.setEquivalents.pectorals);
  // Workout was 10 days ago (index 17). It is inside the 7-day window for index 17 through 24.
  assert.equal(chest[16], 0);
  assert.equal(chest[17], 2);
  assert.equal(chest[24], 2);
  assert.equal(chest[25], 0);
});

test("with no workouts the timeline is all zero and max is 0", () => {
  const t = muscleTimeline([], 28, 7, NOW);
  assert.equal(t.max, 0);
  assert.ok(t.days.every((d) => Object.values(d.setEquivalents).every((v) => v === 0)));
});
