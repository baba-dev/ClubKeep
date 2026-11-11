import assert from "node:assert/strict";
import test from "node:test";
import { isValidClubTimeZone, clubLocalDate } from "../../src/lib/attendance-calendar.ts";

test("club civil dates are independent of server timezone", () => {
  const now = new Date("2026-11-11T19:15:00.000Z");
  assert.equal(clubLocalDate(now, "UTC"), "2026-11-11");
  assert.equal(clubLocalDate(now, "Asia/Kolkata"), "2026-11-12");
  assert.equal(clubLocalDate(now, "America/New_York"), "2026-11-11");
  assert.equal(
    clubLocalDate(new Date("2026-03-08T07:30:00.000Z"), "America/New_York"),
    "2026-03-08"
  );
});

test("invalid timezone is never interpreted as a server-local fallback", () => {
  assert.equal(isValidClubTimeZone("Asia/Kolkata"), true);
  assert.equal(isValidClubTimeZone("America/New_York"), true);
  assert.equal(isValidClubTimeZone("fake/zone"), false);
  assert.equal(isValidClubTimeZone(""), false);
  assert.throws(() => clubLocalDate(new Date(), "not/a-timezone"));
});
