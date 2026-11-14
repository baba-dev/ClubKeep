import assert from "node:assert/strict";
import test from "node:test";
import {
  METRICS,
  supportsMetric,
  validScore,
  threeMonthEnd,
} from "../../src/lib/competition-catalog.ts";

test("B6 performance metrics exclude biometric/medical signals and have explicit bounds", () => {
  assert.equal(Object.keys(METRICS).length, 5);
  assert.equal(supportsMetric("GYM", "GYM_STRENGTH_KG"), true);
  assert.equal(supportsMetric("DANCE", "GYM_STRENGTH_KG"), false);
  assert.equal(supportsMetric("OTHER", "TRAINING_MINUTES"), true);
  assert.equal(validScore("DANCE_ROUTINE_SCORE", 100), true);
  assert.equal(validScore("DANCE_ROUTINE_SCORE", 101), false);
  assert.equal(validScore("DANCE_ROUTINE_SCORE", 0.75), false);
  assert.equal(validScore("TRAINING_MINUTES", -1), false);
  assert.equal(validScore("TRAINING_MINUTES", Number.MAX_SAFE_INTEGER + 1), false);
});
test("B6 seasons are owner-anchored exactly three UTC months, exclusive end", () => {
  assert.equal(threeMonthEnd("2026-11-01").toISOString(), "2027-02-01T00:00:00.000Z");
  assert.equal(threeMonthEnd("2028-02-01").toISOString(), "2028-05-01T00:00:00.000Z");
  assert.throws(() => threeMonthEnd("2026-11-14"));
  assert.throws(() => threeMonthEnd("2026-02-30"));
});
