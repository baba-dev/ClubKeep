import assert from "node:assert/strict";
import test from "node:test";
import { termEnd, utcDate, utcToday, statusForTerm } from "../../src/lib/membership-dates.ts";

test("month durations clamp 31 Jan to last valid February day", () => {
  assert.equal(
    termEnd(utcDate("2026-01-31"), "MONTHS", 1).toISOString().slice(0, 10),
    "2026-02-28"
  );
  assert.equal(
    termEnd(utcDate("2028-01-31"), "MONTHS", 1).toISOString().slice(0, 10),
    "2028-02-29"
  );
  assert.equal(
    termEnd(utcDate("2028-02-29"), "MONTHS", 12).toISOString().slice(0, 10),
    "2029-02-28"
  );
  assert.equal(
    termEnd(utcDate("2026-12-31"), "MONTHS", 2).toISOString().slice(0, 10),
    "2027-02-28"
  );
});
test("daily/weekly periods use exclusive end dates", () => {
  assert.equal(termEnd(utcDate("2026-11-10"), "DAYS", 1).toISOString().slice(0, 10), "2026-11-11");
  assert.equal(termEnd(utcDate("2026-11-10"), "WEEKS", 2).toISOString().slice(0, 10), "2026-11-24");
});
test("rejects invalid calendar days and invalid durations", () => {
  for (const day of ["2026-02-30", "2025-13-01", "2024-02-30", "01-01-2026", ""])
    assert.throws(() => utcDate(day));
  for (const count of [0, -1, 1201, 1.5, Infinity])
    assert.throws(() => termEnd(utcToday(), "DAYS", count));
});
test("status is derived, expiring window seven days, and cancelled overrides active", () => {
  const today = utcDate("2026-11-10");
  const term = { startAt: utcDate("2026-11-01"), endAt: utcDate("2026-11-18"), cancelledAt: null };
  assert.equal(statusForTerm(term, today), "ACTIVE");
  assert.equal(statusForTerm({ ...term, endAt: utcDate("2026-11-17") }, today), "EXPIRING");
  assert.equal(statusForTerm({ ...term, endAt: today }, today), "EXPIRED");
  assert.equal(statusForTerm({ ...term, startAt: utcDate("2026-11-11") }, today), "SCHEDULED");
  assert.equal(statusForTerm({ ...term, cancelledAt: today }, today), "CANCELLED");
  assert.equal(statusForTerm(null, today), "NONE");
});
