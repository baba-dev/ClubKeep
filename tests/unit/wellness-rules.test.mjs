import assert from "node:assert/strict";
import test from "node:test";
import { register } from "node:module";
register("../integration/helpers/src-alias-hook.mjs", import.meta.url);
const { sleepMinutes, localDate, mondayUtc, safeRate } =
  await import("../../src/lib/personal/wellness-rules.ts");

test("overnight and daylight-saving timestamps use elapsed time not calendar subtraction", () => {
  assert.equal(
    sleepMinutes(new Date("2026-11-18T22:30:00Z"), new Date("2026-11-19T06:00:00Z")),
    450
  );
  assert.equal(
    sleepMinutes(new Date("2026-03-08T06:00:00Z"), new Date("2026-03-08T13:00:00Z")),
    420
  );
  assert.equal(localDate(new Date("2026-11-18T20:15:00Z"), "Asia/Kolkata"), "2026-11-19");
  assert.equal(localDate(new Date("2026-11-18T20:15:00Z"), "UTC"), "2026-11-18");
});
test("weekly boundary and unavailable denominator are explicit", () => {
  assert.equal(
    mondayUtc(new Date("2026-11-18T12:00:00Z")).toISOString(),
    "2026-11-16T00:00:00.000Z"
  );
  assert.equal(safeRate(1, 3), 33);
  assert.equal(safeRate(0, 0), null);
});
