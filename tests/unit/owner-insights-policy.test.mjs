import assert from "node:assert/strict";
import test from "node:test";
import {
  classifyMember,
  fillSeries,
  lastDays,
  lastMonths,
  renewalRatePercent,
  weekdayTotals,
} from "../../src/lib/insights-policy.ts";

const now = new Date("2026-11-17T10:00:00Z");
const day = (n) => new Date(now.getTime() + n * 86_400_000);

test("covered member ending within 7 days is lapsing, later is active", () => {
  assert.equal(classifyMember({ activeNow: true, lastEnd: day(7) }, now), "LAPSING");
  assert.equal(classifyMember({ activeNow: true, lastEnd: day(0.5) }, now), "LAPSING");
  assert.equal(classifyMember({ activeNow: true, lastEnd: day(7.01) }, now), "ACTIVE");
  assert.equal(classifyMember({ activeNow: true, lastEnd: day(90) }, now), "ACTIVE");
});

test("uncovered member is lapsed only within 30 days of the last term end", () => {
  assert.equal(classifyMember({ activeNow: false, lastEnd: day(-1) }, now), "LAPSED");
  assert.equal(classifyMember({ activeNow: false, lastEnd: day(-30) }, now), "LAPSED");
  assert.equal(classifyMember({ activeNow: false, lastEnd: day(-30.01) }, now), "INACTIVE");
  assert.equal(classifyMember({ activeNow: false, lastEnd: null }, now), "INACTIVE");
});

test("a future-only term is upcoming, never lapsed", () => {
  assert.equal(classifyMember({ activeNow: false, lastEnd: day(20) }, now), "UPCOMING");
});

test("renewal rate handles empty and over-counted input", () => {
  assert.equal(renewalRatePercent(0, 0), null);
  assert.equal(renewalRatePercent(1, 3), 33);
  assert.equal(renewalRatePercent(5, 4), 100);
});

test("lastDays and lastMonths are ordered, gap-free and cross boundaries", () => {
  assert.deepEqual(lastDays("2026-03-02", 4), [
    "2026-02-27",
    "2026-02-28",
    "2026-03-01",
    "2026-03-02",
  ]);
  assert.deepEqual(lastMonths("2026-02", 4), ["2025-11", "2025-12", "2026-01", "2026-02"]);
  assert.throws(() => lastDays("2026-3-2", 2));
  assert.throws(() => lastMonths("2026-13x", 2));
});

test("fillSeries zero-fills and drops keys outside the window", () => {
  assert.deepEqual(
    fillSeries(
      ["a", "b", "c"],
      [
        { key: "b", value: 4 },
        { key: "z", value: 9 },
      ]
    ),
    [
      { key: "a", value: 0 },
      { key: "b", value: 4 },
      { key: "c", value: 0 },
    ]
  );
});

test("weekdayTotals puts Monday first and sums matching weekdays", () => {
  // 2026-11-16 is a Monday, 2026-11-22 a Sunday, 2026-11-23 a Monday.
  const totals = weekdayTotals([
    { key: "2026-11-16", value: 3 },
    { key: "2026-11-22", value: 5 },
    { key: "2026-11-23", value: 2 },
  ]);
  assert.equal(totals[0].label, "Mon");
  assert.equal(totals[0].value, 5);
  assert.equal(totals[6].label, "Sun");
  assert.equal(totals[6].value, 5);
});
