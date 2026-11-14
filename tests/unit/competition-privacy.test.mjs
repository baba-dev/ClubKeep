import test from "node:test";
import assert from "node:assert/strict";
import {
  leaderboardWhere,
  leaderboardOrder,
  attendanceProgressWhere,
  approvedScoreProgressWhere,
} from "../../src/lib/competition-policy.ts";

test("B6 private rankings require active linked members who opted in", () => {
  const where = leaderboardWhere("club-a", "metric-a");
  assert.deepEqual(where, {
    clubId: "club-a",
    seasonMetricId: "metric-a",
    member: {
      is: {
        status: "ACTIVE",
        membership: { is: { role: "MEMBER", status: "ACTIVE" } },
        rankingConsent: { is: { enabled: true } },
      },
    },
  });
  assert.deepEqual(leaderboardOrder, [
    { value: "desc" },
    { approvedAt: "asc" },
    { memberRecordId: "asc" },
  ]);
});
test("B6 challenge progress filters exact tenant/roster and authoritative event types", () => {
  const start = new Date("2026-11-01T00:00:00Z"),
    end = new Date("2027-02-01T00:00:00Z");
  assert.deepEqual(attendanceProgressWhere("club-a", "member-a", start, end), {
    clubId: "club-a",
    memberRecordId: "member-a",
    checkedInAt: { gte: start, lt: end },
  });
  assert.deepEqual(approvedScoreProgressWhere("club-b", "member-b", "season-b", start, end), {
    clubId: "club-b",
    memberRecordId: "member-b",
    status: "APPROVED",
    submittedAt: { gte: start, lt: end },
    seasonMetric: { seasonId: "season-b" },
  });
});
